/**
 * 男友相机 - 认证上下文（CloudBase）
 *
 * 设计原则（长远统一）：
 * 1. 登录态唯一来源：onAuthStateChange(SIGNED_IN) 或「任意登录成功后的同步」。
 * 2. 任意登录方式成功后，统一用同一套「短延迟 + getLoginState 同步」作为兜底，避免依赖 SDK 是否触发事件。
 * 3. 跳转只由 AuthNavigationSync 根据 status 处理，登录页不主动 router.replace，避免和 Auth 状态不同步。
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { cloudbaseClient } from '../lib/cloudbase'
import { invalidateSubscriptionDisplay } from '../lib/subscription-invalidate'

/** 回前台 refreshSession 成功后刷新订阅展示的最小间隔，避免快速切前后台连打 check-subscription */
const FOREGROUND_SUBSCRIPTION_INVALIDATE_MIN_MS = 90_000

// 登录成功后延迟多久从 SDK 同步到 context（给 SDK 写入 token 的时间，统一常量）
const LOGIN_SYNC_DELAY_MS = 100

/**
 * 「已登录但 uid/id 为空」常见可能性（供对照日志排查，非定论）：
 * 1. 时序：hasLoginState 已 true 且挂了 user 壳子，profile/uid 异步未写入，首帧读不到 uid。
 * 2. 取值位置：uid 实际在 cache / credential / 内部字段，顶层 user.uid 未同步。
 * 3. 访问语义：uid 在原型 getter 上，或 HostObject/Proxy 导致 Object.keys 与直接读不一致。
 * 4. 空占位：存在名为 uid 的 own 属性但值为 undefined（与「无属性」日志上易混）。
 * 5. 多源不一致：hasLoginState().user 与 auth.currentUser（或 JWT sub）不同步。
 * 6. 序列化/展开：仅部分字段可枚举，展开后丢 uid（若依赖 {...raw} 传播需警惕）。
 *
 * 以下 logAuthUserProbe 会打印 keys、ownNames、descriptor、原型、cache 浅层、并与 getCurrentUser 对比。
 */
function safeKeys(obj: unknown): string[] {
  try {
    return obj != null && typeof obj === 'object' ? Object.keys(obj as object) : []
  } catch {
    return ['<Object.keys threw>']
  }
}

function safeOwnNames(obj: unknown): string[] {
  try {
    return obj != null && typeof obj === 'object' ? Object.getOwnPropertyNames(obj as object) : []
  } catch {
    return ['<getOwnPropertyNames threw>']
  }
}

/** 浅层可打印快照：避免深嵌套与循环引用；object 只记 constructor 与 key 数量 */
function pickShallowSnapshot(raw: any, maxKeys = 40): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const keys = safeKeys(raw).slice(0, maxKeys)
  for (const k of keys) {
    try {
      const v = raw[k]
      if (v == null) {
        out[k] = v
        continue
      }
      const t = typeof v
      if (t === 'function') out[k] = '[Function]'
      else if (t !== 'object') out[k] = v
      else {
        const ctor = (v as any)?.constructor?.name ?? '?'
        let nk = 0
        try {
          nk = Object.keys(v).length
        } catch {
          nk = -1
        }
        out[k] = `[object ${ctor} ~${nk} keys]`
      }
    } catch {
      out[k] = '[unreadable]'
    }
  }
  return out
}

function readNestedUidHints(raw: any): Record<string, unknown> {
  const hint: Record<string, unknown> = {}
  const tryRead = (label: string, get: () => unknown) => {
    try {
      hint[label] = get()
    } catch (e: any) {
      hint[label] = `<threw ${e?.message ?? e}>`
    }
  }
  tryRead('cache.uid', () => raw?.cache?.uid)
  tryRead('cache.userId', () => raw?.cache?.userId)
  tryRead('cache.user?.uid', () => raw?.cache?.user?.uid)
  tryRead('credential?.uid', () => raw?.credential?.uid)
  tryRead('userInfo?.uid', () => raw?.userInfo?.uid)
  if (raw?.oauthInstance != null && typeof raw.oauthInstance === 'object') {
    try {
      hint['oauthInstance.keys'] = safeKeys(raw.oauthInstance).slice(0, 25)
    } catch {
      hint['oauthInstance.keys'] = '<error>'
    }
  }
  return hint
}

function logAuthUserProbe(raw: any, tag: string): void {
  if (raw == null) {
    console.warn('[AuthProbe]', tag, 'raw is null/undefined')
    return
  }
  let uidDescriptor: Record<string, unknown> | null = null
  try {
    const d = Object.getOwnPropertyDescriptor(raw, 'uid')
    if (d) {
      uidDescriptor = {
        enumerable: d.enumerable,
        configurable: d.configurable,
        writable: 'writable' in d ? (d as PropertyDescriptor).writable : undefined,
        hasGetter: typeof d.get === 'function',
        hasSetter: typeof d.set === 'function',
        valueType: 'value' in d ? typeof d.value : undefined,
        valuePreview:
          'value' in d && d.value != null && typeof d.value !== 'object'
            ? String(d.value).slice(0, 64)
            : 'value' in d && d.value != null
              ? `[${typeof d.value}]`
              : undefined,
      }
    }
  } catch (e: any) {
    uidDescriptor = { error: e?.message ?? String(e) }
  }

  let inOperator = false
  let hasOwn = false
  try {
    inOperator = 'uid' in raw
  } catch {
    inOperator = false
  }
  try {
    hasOwn = Object.prototype.hasOwnProperty.call(raw, 'uid')
  } catch {
    hasOwn = false
  }

  let reflectUid: unknown = undefined
  try {
    reflectUid = typeof Reflect !== 'undefined' ? Reflect.get(raw, 'uid') : undefined
  } catch {
    reflectUid = '<Reflect.get threw>'
  }

  const proto = (() => {
    try {
      const p = Object.getPrototypeOf(raw)
      return p?.constructor?.name ?? String(p)
    } catch {
      return '<prototype error>'
    }
  })()

  console.warn('[AuthProbe] 用户对象结构', {
    tag,
    typeofRaw: typeof raw,
    ctor: raw?.constructor?.name,
    proto,
    keys: safeKeys(raw),
    ownNames: safeOwnNames(raw),
    keyCount: safeKeys(raw).length,
    inOperatorUid: inOperator,
    hasOwnPropertyUid: hasOwn,
    directUid: raw.uid,
    reflectUid,
    uidStrictEqUndefined: raw.uid === undefined,
    uidStrictEqNull: raw.uid === null,
    uidStringLength: raw?.uid != null ? String(raw.uid).length : null,
    uidDescriptor,
    nestedUidHints: readNestedUidHints(raw),
    shallowSnapshot: pickShallowSnapshot(raw),
  })
}

/** SDK User 是否有可用的 uid（与 userForContext 判定一致） */
function isValidCloudbaseUid(raw: any): boolean {
  if (!raw) return false
  const v = raw.uid ?? raw.user_id ?? raw.sub
  return v != null && String(v).trim() !== ''
}

/** CloudBase 登录用户：id = uid；新对象避免 setState 引用不更新。 */
function userForContext(raw: any, tag: string): any {
  if (!raw) return null
  const idRaw = raw.uid ?? raw.user_id ?? raw.sub
  const id = idRaw != null && String(idRaw).trim() !== '' ? String(idRaw).trim() : undefined
  if (!id) {
    console.warn('[Auth] userForContext uid 为空', { tag, uid: raw.uid, user_id: raw.user_id, sub: raw.sub })
    logAuthUserProbe(raw, tag)
  }
  return id ? { ...raw, id } : { ...raw }
}

// 类型定义 - 直接使用 SDK 的 User 类型
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextType {
  user: any
  loading: boolean
  status: AuthStatus
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signUp: (
    email: string,
    password: string,
    verification: {
      verification_id: string
      verification_code: string
      verification_token: string
    }
  ) => Promise<{ data: any; error: any }>
  signOut: () => Promise<void>
  // 登录页需要的 auth 方法，从 cloudbaseClient.auth 透传
  getVerification: (params: { email: string }) => Promise<{ data: any; error: any }>
  verify: (params: { verification_id: string; verification_code: string }) => Promise<{ data: any; error: any }>
  signInWithVerificationToken: (email: string, verification_token: string) => Promise<{ data: any; error: any }>
  sendPhoneCode: (phoneNumber: string) => Promise<{ data: any; error: any }>
  signInWithPhoneSms: (phoneNumber: string, phoneCode: string, verificationInfo: any) => Promise<{ data: any; error: any }>
  /** 使用登录页「记住密码」保存的凭据静默重登（无 UI），成功时同步 Context */
  trySilentReloginWithStoredPassword: () => Promise<boolean>
  /** 永久删除账户及所有关联数据，删除后自动登出 */
  deleteAccount: () => Promise<{ data: any; error: any }>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const loading = status === 'loading'
  const lastForegroundSubscriptionInvalidateAtRef = useRef(0)

  useEffect(() => {
    let isMounted = true

    const maybeInvalidateSubscriptionAfterForeground = () => {
      const now = Date.now()
      if (now - lastForegroundSubscriptionInvalidateAtRef.current < FOREGROUND_SUBSCRIPTION_INVALIDATE_MIN_MS) {
        console.log('[Auth] 跳过 invalidateSubscriptionDisplay（距上次不足间隔）', {
          elapsedMs: now - lastForegroundSubscriptionInvalidateAtRef.current,
          minMs: FOREGROUND_SUBSCRIPTION_INVALIDATE_MIN_MS,
        })
        return
      }
      lastForegroundSubscriptionInvalidateAtRef.current = now
      invalidateSubscriptionDisplay()
      console.log('[Auth] 回前台 refreshSession 成功 → invalidateSubscriptionDisplay')
    }

    // 1. 初始化：检查当前登录状态
    // SDK persistence: 'local' 会尝试恢复会话；若未恢复（如个人版续期失败、重装），且用户曾勾选「记住密码」，则冷启动静默密码登录。
    const checkInitialState = async () => {
      const loginState = await cloudbaseClient.auth.getLoginState()
      const lsUser = loginState?.user as any
      let currentUserNormalized: { id: string; email?: string } | null = null
      let getCurrentUserError: string | undefined
      try {
        currentUserNormalized = await cloudbaseClient.auth.getCurrentUser()
      } catch (e: any) {
        getCurrentUserError = e?.message ?? String(e)
      }
      console.log('[Auth] checkInitialState', {
        hasLoginState: !!loginState,
        hasUser: !!lsUser,
        loginStateUserUid: lsUser?.uid ?? null,
        getCurrentUserId: currentUserNormalized?.id ?? null,
        getCurrentUserEmail: currentUserNormalized?.email ?? null,
        getCurrentUserError: getCurrentUserError ?? null,
      })
      if (lsUser != null && currentUserNormalized != null) {
        console.log('[AuthProbe] checkInitialState 双源对比', {
          'loginState.user.uid': lsUser.uid,
          'getCurrentUser().id': currentUserNormalized.id,
          match: String(lsUser?.uid ?? '') === String(currentUserNormalized.id ?? ''),
        })
      }
      const bailToLogin = async () => {
        await cloudbaseClient.auth.signOut()
        setUser(null)
        setStatus('unauthenticated')
      }

      /** 记住密码静默重登 + sync；返回是否已取得有效 uid */
      const trySilentReloginForValidUid = async (reason: string): Promise<boolean> => {
        const silentOk = await cloudbaseClient.auth.trySilentReloginWithStoredPassword()
        if (!silentOk) {
          console.warn('[Auth] checkInitialState 静默重登不可用或未勾选记住密码', { reason })
          return false
        }
        console.log('[Auth] checkInitialState 尝试记住密码静默重登', { reason })
        await new Promise((r) => setTimeout(r, LOGIN_SYNC_DELAY_MS))
        await syncUserFromSDK()
        const again = await cloudbaseClient.auth.getLoginState()
        if (!isValidCloudbaseUid(again?.user)) return false
        if (await cloudbaseClient.auth.isAnonymousAuthSession()) return false
        return true
      }

      if (loginState?.user) {
        if (isValidCloudbaseUid(lsUser)) {
          if (await cloudbaseClient.auth.isAnonymousAuthSession()) {
            setUser(null)
            setStatus('unauthenticated')
            return
          }
          setUser(userForContext(lsUser, 'checkInitialState'))
          setStatus('authenticated')
          return
        }
        console.warn('[Auth] checkInitialState SDK 有 user 但 uid 无效，走静默重登或回登录页')
        const recovered = await trySilentReloginForValidUid('hollow-login-state-user')
        if (recovered) return
        await bailToLogin()
        return
      }

      const silentOk = await cloudbaseClient.auth.trySilentReloginWithStoredPassword()
      if (silentOk) {
        console.log('[Auth] checkInitialState 冷启动静默登录成功（记住密码）')
        await new Promise((r) => setTimeout(r, LOGIN_SYNC_DELAY_MS))
        await syncUserFromSDK()
        const again = await cloudbaseClient.auth.getLoginState()
        if (!again?.user || !isValidCloudbaseUid(again.user)) {
          await bailToLogin()
        }
        return
      }
      setStatus('unauthenticated')
    }
    checkInitialState()

    // 2. 监听 SDK 登录状态变化
    const { data } = cloudbaseClient.auth.onAuthStateChange((event) => {
      if (!isMounted) return

      console.log('[Auth] onAuthStateChange:', event.event, {
        hasUser: !!event.user,
        userId: (event.user as any)?.id,
      })

      switch (event.event) {
        case 'SIGNED_IN':
          if (event.user) {
            if (!isValidCloudbaseUid(event.user)) {
              void (async () => {
                const silentOk = await cloudbaseClient.auth.trySilentReloginWithStoredPassword()
                if (silentOk) {
                  await new Promise((r) => setTimeout(r, LOGIN_SYNC_DELAY_MS))
                  await syncUserFromSDK()
                  const st = await cloudbaseClient.auth.getLoginState()
                  if (!isValidCloudbaseUid(st?.user)) {
                    await cloudbaseClient.auth.signOut()
                    setUser(null)
                    setStatus('unauthenticated')
                  }
                } else {
                  await cloudbaseClient.auth.signOut()
                  setUser(null)
                  setStatus('unauthenticated')
                }
              })()
              break
            }
            void (async () => {
              if (!isMounted) return
              const anon = await cloudbaseClient.auth.isAnonymousAuthSession()
              if (!isMounted) return
              if (anon) {
                setUser(null)
                setStatus('unauthenticated')
                return
              }
              setUser(userForContext(event.user, 'onAuthStateChange:SIGNED_IN'))
              setStatus('authenticated')

              // 新登录成功后，详细打印一次会话与 token 状态（不输出完整敏感信息）
              try {
                const sessionRes = await cloudbaseClient.auth.getSession?.()
                const inner = (sessionRes as any)?.data ?? sessionRes
                const session = inner?.session ?? inner
                const refreshToken =
                  typeof session?.refresh_token === 'string'
                    ? session.refresh_token
                    : typeof inner?.refresh_token === 'string'
                      ? inner.refresh_token
                      : undefined
                const refreshPreview = refreshToken ? `${String(refreshToken).slice(0, 12)}...` : null
                console.log('[Auth] SIGNED_IN getSession', {
                  hasSessionRes: !!sessionRes,
                  hasInner: !!inner,
                  innerKeys: inner && typeof inner === 'object' ? Object.keys(inner) : [],
                  sessionKeys: session && typeof session === 'object' ? Object.keys(session) : [],
                  hasRefreshToken: !!refreshToken,
                  refreshPreview,
                })
              } catch (e: any) {
                console.warn('[Auth] SIGNED_IN getSession 失败', e?.message ?? e)
              }

              try {
                const token = await cloudbaseClient.auth.getAccessToken()
                const tokenPreview = token ? `${String(token).slice(0, 12)}...` : null
                console.log('[Auth] SIGNED_IN getAccessToken', {
                  hasToken: !!token,
                  tokenPreview,
                })
              } catch (e: any) {
                console.warn('[Auth] SIGNED_IN getAccessToken 失败', e?.message ?? e)
              }
            })()
          }
          break
        case 'SIGNED_OUT':
          setUser(null)
          setStatus('unauthenticated')
          break
        case 'TOKEN_REFRESHED':
          console.log('[Auth] Token 已刷新')
          break
      }
    })

    // 3. AppState 监听：回前台时检测登录状态
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (!isMounted) return

      if (nextState === 'active') {
        console.log('[Auth] App 回前台，检测登录状态')
        void (async () => {
          const loginState: any = await cloudbaseClient.auth.getLoginState()
          console.log('[Auth] AppState active loginState', {
            hasLoginState: !!loginState,
            hasUser: !!loginState?.user,
            userId: (loginState?.user as any)?.uid ?? null,
          })
          const bail = async () => {
            await cloudbaseClient.auth.signOut()
            setUser(null)
            setStatus('unauthenticated')
          }
          if (loginState?.user) {
            if (!isValidCloudbaseUid(loginState.user)) {
              console.warn('[Auth] App 回前台 user 无有效 uid，静默重登或回登录页')
              const silentOk = await cloudbaseClient.auth.trySilentReloginWithStoredPassword()
              if (silentOk) {
                await new Promise((r) => setTimeout(r, LOGIN_SYNC_DELAY_MS))
                await syncUserFromSDK()
                const again = await cloudbaseClient.auth.getLoginState()
                if (!isValidCloudbaseUid(again?.user)) await bail()
              } else {
                await bail()
              }
              return
            }
            if (await cloudbaseClient.auth.isAnonymousAuthSession()) {
              setUser(null)
              setStatus('unauthenticated')
              return
            }
            setUser(userForContext(loginState.user, 'AppState:active'))
            setStatus('authenticated')
            void cloudbaseClient.auth.refreshSession().then(async (r) => {
              if (r.error) {
                console.warn('[Auth] App 回前台 refreshSession 失败', (r.error as Error)?.message ?? r.error)
                const ok = await trySilentReloginWithStoredPasswordWrapped()
                if (ok) console.log('[Auth] App 回前台 静默重登成功')
              } else {
                console.log('[Auth] App 回前台 refreshSession 成功', { hasData: !!r.data })
                maybeInvalidateSubscriptionAfterForeground()
              }
            })
          } else {
            setUser(null)
            setStatus('unauthenticated')
          }
        })()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      isMounted = false
      data?.subscription?.unsubscribe?.()
      subscription?.remove?.()
    }
  }, [])

  async function syncUserFromSDK() {
    const state = await cloudbaseClient.auth.getLoginState()
    console.log('[Auth] syncUserFromSDK', {
      hasLoginState: !!state,
      hasUser: !!state?.user,
      userId: (state?.user as any)?.uid ?? null,
    })
    if (state?.user) {
      if (!isValidCloudbaseUid(state.user)) {
        console.warn('[Auth] syncUserFromSDK user 无有效 uid，登出')
        await cloudbaseClient.auth.signOut()
        setUser(null)
        setStatus('unauthenticated')
        return
      }
      if (await cloudbaseClient.auth.isAnonymousAuthSession()) {
        console.log('[Auth] syncUserFromSDK 跳过匿名会话（不发码链 signOut）')
        setUser(null)
        setStatus('unauthenticated')
        return
      }
      setUser(userForContext(state.user, 'syncUserFromSDK'))
      setStatus('authenticated')

      // 登录成功同步后打全量 auth 日志：getSession 结构 + getAccessToken（仅预览，不输出完整 token）
      ;(async () => {
        try {
          const sessionRes = await cloudbaseClient.auth.getSession?.()
          const raw = sessionRes != null && typeof sessionRes === 'object' ? sessionRes : {}
          const topKeys = Object.keys(raw)
          const inner = (raw as any)?.data ?? raw
          const session = inner?.session ?? inner
          const innerKeys = inner && typeof inner === 'object' ? Object.keys(inner) : []
          const sessionKeys = session && typeof session === 'object' ? Object.keys(session) : []
          const hasRefresh = typeof session?.refresh_token === 'string' || typeof (inner as any)?.refresh_token === 'string'
          const refreshPreview = typeof session?.refresh_token === 'string'
            ? `${session.refresh_token.slice(0, 12)}...`
            : typeof (inner as any)?.refresh_token === 'string'
              ? `${(inner as any).refresh_token.slice(0, 12)}...`
              : null
          console.log('[Auth] syncUserFromSDK getSession 全量', {
            topKeys,
            innerKeys,
            sessionKeys,
            hasRefreshToken: hasRefresh,
            refreshPreview,
          })
          const refreshToken =
            typeof session?.refresh_token === 'string'
              ? session.refresh_token
              : typeof (inner as any)?.refresh_token === 'string'
                ? (inner as any).refresh_token
                : null
          if (refreshToken) {
            void cloudbaseClient.auth.saveRefreshToken(refreshToken)
          }
        } catch (e: any) {
          console.warn('[Auth] syncUserFromSDK getSession 失败', e?.message ?? e)
        }
        try {
          const token = await cloudbaseClient.auth.getAccessToken()
          const tokenStr = typeof token === 'string' ? token : (token as any)?.accessToken
          const tokenPreview = tokenStr ? `${String(tokenStr).slice(0, 12)}...` : null
          console.log('[Auth] syncUserFromSDK getAccessToken', {
            hasToken: !!tokenStr,
            tokenPreview,
          })
        } catch (e: any) {
          console.warn('[Auth] syncUserFromSDK getAccessToken 失败', e?.message ?? e)
        }
      })()
    }
  }

  /** 任意登录方式成功后的统一兜底：延迟后从 SDK 同步，不依赖 onAuthStateChange 是否触发 */
  function scheduleSyncAfterLogin() {
    console.log('[Auth] scheduleSyncAfterLogin - will sync after delay', LOGIN_SYNC_DELAY_MS)
    setTimeout(syncUserFromSDK, LOGIN_SYNC_DELAY_MS)
  }

  async function trySilentReloginWithStoredPasswordWrapped(): Promise<boolean> {
    const ok = await cloudbaseClient.auth.trySilentReloginWithStoredPassword()
    if (ok) scheduleSyncAfterLogin()
    return ok
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await cloudbaseClient.auth.signInWithPassword({
      email,
      password,
    })
    if (error) return { data: null, error }
    if (data?.user) scheduleSyncAfterLogin()
    return { data, error: null }
  }

  async function signUp(
    email: string,
    password: string,
    verification: {
      verification_id: string
      verification_code: string
      verification_token: string
    }
  ) {
    const { error, data } = await cloudbaseClient.auth.signUp(email, password, verification)
    if (error) return { data: null, error }
    if (data?.user) scheduleSyncAfterLogin()
    return { data, error: null }
  }

  async function signOut() {
    console.log('[Auth] signOut called', {
      prevStatus: status,
      hasUser: !!user,
      userId: user?.id,
    })
    await cloudbaseClient.auth.signOut()
    setUser(null)
    setStatus('unauthenticated')
    console.log('[Auth] signOut finished, status set to unauthenticated')
  }

  async function signInWithVerificationTokenWrapped(email: string, verification_token: string) {
    const result = await cloudbaseClient.auth.signInWithVerificationToken(email, verification_token)
    if (!result.error && result.data?.user) scheduleSyncAfterLogin()
    return result
  }

  async function signInWithPhoneSmsWrapped(
    phoneNumber: string,
    phoneCode: string,
    verificationInfo: any
  ) {
    const result = await cloudbaseClient.auth.signInWithPhoneSms(
      phoneNumber,
      phoneCode,
      verificationInfo
    )
    if (!result.error && result.data?.user) scheduleSyncAfterLogin()
    return result
  }

  async function deleteAccount(): Promise<{ data: any; error: any }> {
    // 先调云函数删除 MySQL 中的所有用户数据
    const { data: fnResult, error: fnError } = await cloudbaseClient.functions.invoke('delete-account', { body: {} })
    if (fnError || !fnResult?.success) {
      return { data: null, error: fnError || new Error(fnResult?.message || '删除账号失败') }
    }
    // 数据删除完成后清理 Auth 身份并登出
    await cloudbaseClient.auth.signOut()
    setUser(null)
    setStatus('unauthenticated')
    return { data: fnResult, error: null }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        status,
        signIn,
        signUp,
        signOut,
        getVerification: cloudbaseClient.auth.getVerification,
        verify: cloudbaseClient.auth.verify,
        signInWithVerificationToken: signInWithVerificationTokenWrapped,
        sendPhoneCode: cloudbaseClient.auth.sendPhoneCode,
        signInWithPhoneSms: signInWithPhoneSmsWrapped,
        trySilentReloginWithStoredPassword: trySilentReloginWithStoredPasswordWrapped,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
