/**
 * 男友相机 - Cloudbase 客户端
 *
 * 使用官方推荐方式：
 * - @cloudbase/adapter-rn 自动管理 session 持久化
 * - auth.hasLoginState() 检查登录状态
 * - auth.currentUser 获取当前用户
 * - 自管 refresh_token：非企业版 SDK 不暴露 refresh_token，可用 HTTP 刷新并 setSession 注入（需自行在登录后保存 refresh_token）
 */

import cloudbaseSDK from "@cloudbase/js-sdk";
import { getStoredCredentials } from "./authStorage";
import { storage } from "./storage";
import { withTimeout } from "./timeout";

// Web 环境不需要 adapter，RN adapter 会干扰 Web SDK 的默认行为
// 只在 React Native 环境下加载 adapter
const g = globalThis as any;
const isReactNative = g.navigator?.product === "ReactNative" || typeof g.__fbBatchedBridge !== "undefined";
/** Metro / Node 预打包时会执行本模块，@cloudbase/js-sdk Web 适配器依赖 window；仅在 RN 或真实浏览器再 init。 */
function canInitCloudbaseSdk(): boolean {
  return isReactNative || typeof g.window !== "undefined";
}

// 等待 adapter 加载完成的 Promise
let adapterReadyPromise: Promise<void> = Promise.resolve();
if (isReactNative) {
  adapterReadyPromise = import("./cloudbaseAdapter")
    .then(({ default: adapter }) => {
      if (adapter) {
        cloudbaseSDK.useAdapters(adapter);
        console.log('[cloudbase] adapter 已加载');
      }
    })
    .catch((e) => {
      console.warn('[cloudbase] adapter 加载失败:', e);
    });
}

const cloudbaseConfig = {
  env: "jiulou-4gu5ljkpa1082b3c",
  region: "ap-shanghai",
  timeout: 180000, // 3分钟，支持报告生成等长时间操作
  accessKey:
    "eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJhdWQiOiJqaXVsb3UtNGd1NWxqa3BhMTA4MmIzYyIsImV4cCI6MjUzNDAyMzAwNzk5LCJpYXQiOjE3NzIyNzI4OTMsImF0X2hhc2giOiJTT1NUYXdRNVFtMjFXTmtXbG5ZMUhRIiwicHJvamVjdF9pZCI6ImppdWxvdS00Z3U1bGprcGExMDgyYjNjIiwibWV0YSI6eyJwbGF0Zm9ybSI6IkFwaUtleSJ9LCJhZG1pbmlzdHJhdG9yX2lkIjoiMjAyMjMzNDQ0NDI3NjYxMzEyMiIsInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3NlcnZlciIsImlzX3N5c3RlbV9hZG1pbiI6dHJ1ZX0.fK2lQ4WXwHgWy92T0qwj6tzMBlFuzUeXUTdLDk8ImtHV68kwf1nBpfoXH58Mk8abK97Cv-MKDKFE4s7ZdWs47XQmaxN7E9lgECAteAXrtpZkZY6hH-wST3wgTVisga_JWj4gprmzBoRl9gpFLLV8XqRgaswlDscScfx6i2Fv0efYjEJPk0ipJtISstnkjmLUqq-Xyv1DS52ghAay7Lrsf3dF2I0VYvjeE4nJEvwn-_uA_mKMHtUJ_ZTHOFgBlmVzAdP6pqFVWDq33zRDxTrugay7mIY7DiJcDcV5EMbZpYs5LDt9UJqIZeCphV8aCLPL-y8VjntPTJhYwB5pBY_WRg",
};

export { cloudbaseConfig };

export const CLOUDBASE_FUNCTION_BASE_URL = cloudbaseConfig.env
  ? `https://${cloudbaseConfig.env}.ap-shanghai.app.tcloudbase.com`
  : '';
export const isCloudbaseConfigured = Boolean(cloudbaseConfig.env);

// 自管 refresh_token：HTTP 刷新接口（官方文档 https://docs.cloudbase.net/http-api/auth/auth-grant-token）
const TOKEN_REFRESH_URL = cloudbaseConfig.env && cloudbaseConfig.region
  ? `https://${cloudbaseConfig.env}.${cloudbaseConfig.region}.tcb-api.tencentcloudapi.com/auth/v1/token`
  : '';
const REFRESH_TOKEN_STORAGE_KEY = 'cloudbase_refresh_token';

/**
 * 个人版/基础版：默认关闭。走 @cloudbase/js-sdk 内置续期；勿向 /auth/v1/token 发自管 refresh（易与套餐能力不匹配）。
 * 企业版等需自管 refresh_token 时：构建时设置 EXPO_PUBLIC_CLOUDBASE_USE_HTTP_TOKEN_REFRESH=true
 */
const USE_HTTP_TOKEN_REFRESH =
  typeof process !== 'undefined' &&
  process.env?.EXPO_PUBLIC_CLOUDBASE_USE_HTTP_TOKEN_REFRESH === 'true';

function isTokenEndpointRefreshFailure(err: unknown): boolean {
  if (err == null) return false;
  const o = err as Record<string, unknown>;
  if (typeof o === 'object' && o.error_uri === '/auth/v1/token') return true;
  const msg =
    typeof o.message === 'string'
      ? o.message
      : typeof o.error_description === 'string'
        ? o.error_description
        : String(err);
  return (
    msg.includes('json decode') ||
    msg.includes('invalid_argument') ||
    msg.includes('/auth/v1/token')
  );
}

// 类型定义
export interface User {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user: User;
}

export interface AuthStateChangeEvent {
  event: "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";
  user: User | null;
}

// 实例
let cloudbaseInstance: any = null;

// 初始化
let authReadyPromise: Promise<void> = Promise.resolve();
let cloudbaseAuth: any = null;

async function ensureAuth(): Promise<any> {
  await authReadyPromise;
  if (!cloudbaseAuth) {
    if (!cloudbaseInstance) {
      throw new Error('CloudBase SDK 未初始化成功');
    }
    cloudbaseAuth = (cloudbaseInstance as any).auth({ persistence: "local" });
  }
  return cloudbaseAuth;
}

// 保持向后兼容：同步版本用于不需要立即 auth 的场景
// 注意：只有在 initCloudbase 完成后的回调中使用
function getAuth(): any {
  return cloudbaseAuth;
}

// 获取 auth 的安全方式：确保初始化完成
async function safeGetAuth(): Promise<any> {
  await authReadyPromise;
  if (!cloudbaseAuth) {
    throw new Error('CloudBase auth 未初始化');
  }
  return cloudbaseAuth;
}

async function initCloudbase() {
  if (!canInitCloudbaseSdk()) {
    return;
  }
  try {
    // 等待 adapter 加载完成
    await adapterReadyPromise;
    cloudbaseInstance = cloudbaseSDK.init(cloudbaseConfig);
    // 初始化成功立即创建 auth 实例
    cloudbaseAuth = cloudbaseInstance.auth({ persistence: "local" });
    console.log('[cloudbase] initCloudbase: SDK 初始化成功');
    if (!USE_HTTP_TOKEN_REFRESH) {
      clearStoredRefreshToken();
    }
  } catch (err) {
    console.error('[cloudbase] initCloudbase: SDK 初始化失败', err);
  }
}

authReadyPromise = initCloudbase().then(() => {
  applyRdbAccessTokenPatch();
});

// ==================== 认证 API ====================

function toUser(sdkUser: any): User {
  if (!sdkUser) return { id: "" };
  return {
    id: String(sdkUser.uid ?? sdkUser.sub ?? sdkUser.id ?? sdkUser._id ?? ""),
    email: sdkUser.email,
    phone: sdkUser.phone ?? sdkUser.phone_number,
    created_at: sdkUser.created_at,
    updated_at: sdkUser.updated_at,
  };
}

/**
 * 将 SDK / 接口返回的 message 规范为可读字符串。
 * 避免 res.message 为对象时 `new Error(obj)` 变成 "[object Object]"。
 */
function normalizeAuthApiMessage(raw: unknown, fallback: string): string {
  const pick = (v: unknown): string | null => {
    if (v == null) return null;
    if (typeof v === "string") {
      const t = v.trim();
      if (!t.length || t === "[object Object]") return null;
      return t;
    }
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      for (const k of ["message", "msg", "error_description", "detail", "reason"]) {
        const s = pick(o[k]);
        if (s) return s;
      }
      const err = o.error;
      if (err && typeof err === "object") {
        const s = pick((err as any).message ?? (err as any).msg);
        if (s) return s;
      }
      try {
        const j = JSON.stringify(o);
        if (j && j !== "{}" && j.length <= 400) return j;
        if (j && j.length > 400) return `${j.slice(0, 400)}…`;
      } catch {
        /* ignore */
      }
    }
    return null;
  };
  return pick(raw) ?? fallback;
}

/**
 * 检查当前登录状态（官方推荐方式）
 * 返回 boolean，表示是否有登录状态
 */
async function hasLoginState(): Promise<boolean> {
  const auth = await safeGetAuth();
  const result = auth.hasLoginState();
  // SDK 可能返回对象或布尔值，需要正确判断
  // 注意：result 可能是 HostObject，不要传给 console.log 或序列化，否则会触发 Symbol.toStringTag 异常
  const isLoggedIn = !!result && (typeof result === 'boolean' ? result : !!result.user);
  console.log('[cloudbase] hasLoginState()', { isLoggedIn });
  return isLoggedIn;
}

/**
 * 仅用于排查：结构化打印 hasLoginState() 返回值（避免整对象 log 触发 HostObject 序列化异常）
 */
function logHasLoginStateResultProbe(result: unknown, source: string): void {
  if (result == null) {
    console.log('[cloudbase] getLoginState probe', source, { result });
    return;
  }
  if (typeof result === 'boolean') {
    console.log('[cloudbase] getLoginState probe', source, { typeofResult: 'boolean', value: result });
    return;
  }
  if (typeof result !== 'object') {
    console.log('[cloudbase] getLoginState probe', source, { typeofResult: typeof result });
    return;
  }
  const r = result as Record<string, unknown>;
  const user = r.user as any;
  let userProbe: Record<string, unknown> = {};
  try {
    userProbe = {
      typeofUser: typeof user,
      userCtor: user?.constructor?.name,
      userKeys: user != null && typeof user === 'object' ? Object.keys(user) : [],
      userOwnNames:
        user != null && typeof user === 'object' ? Object.getOwnPropertyNames(user).slice(0, 60) : [],
      userUid: user?.uid,
      userHasUidKey: user != null && typeof user === 'object' ? 'uid' in user : false,
    };
  } catch (e: any) {
    userProbe = { userProbeError: e?.message ?? String(e) };
  }
  try {
    console.log('[cloudbase] getLoginState probe', source, {
      resultKeys: Object.keys(r),
      hasUserField: 'user' in r,
      ...userProbe,
    });
  } catch (e: any) {
    console.log('[cloudbase] getLoginState probe', source, { logError: e?.message ?? String(e) });
  }
}

/**
 * 获取登录状态对象
 * 返回 LoginState 对象，包含 user 信息
 */
async function getLoginState(): Promise<{ user: any } | null> {
  const auth = await safeGetAuth();
  const result = auth.hasLoginState();
  console.log('[cloudbase] getLoginState()', {
    hasResult: !!result,
    hasUser: !!(result as any)?.user,
  });
  logHasLoginStateResultProbe(result, 'getLoginState:afterHasLoginState');
  if (!result) return null;
  if (typeof result === 'boolean') return null;
  return result as { user: any } | null;
}

/**
 * CloudBase Auth v2：当前会话的 loginScope（匿名发码前 signInAnonymously 为 anonymous）。
 * 无 API 时返回 null，调用方按「非匿名」处理，避免误判真实用户。
 */
async function getLoginScope(): Promise<string | null> {
  try {
    const auth = await safeGetAuth();
    if (typeof auth.loginScope !== "function") {
      console.warn("[cloudbase] getLoginScope: SDK 无 loginScope，返回 null");
      return null;
    }
    const scope = await auth.loginScope();
    if (scope == null) return null;
    return typeof scope === "string" ? scope : String(scope);
  } catch (e: any) {
    console.warn("[cloudbase] getLoginScope 异常", e?.message ?? e);
    return null;
  }
}

/**
 * 是否为「仅匿名」SDK 会话（发邮箱/手机验证码前临时匿名登录）。
 * 应用层不得映射为已登录；勿对此调用 signOut，否则会打断验证码流程。
 */
async function isAnonymousAuthSession(): Promise<boolean> {
  const scope = await getLoginScope();
  return typeof scope === "string" && scope.toLowerCase() === "anonymous";
}

/**
 * 获取当前用户
 */
async function getCurrentUser(): Promise<User | null> {
  const auth = await safeGetAuth();
  try {
    const user = auth.currentUser;
    console.log('[cloudbase] getCurrentUser() from currentUser', {
      hasUser: !!user,
      rawId: (user as any)?.uid ?? (user as any)?.sub ?? (user as any)?.id ?? null,
    });
    return user ? toUser(user) : null;
  } catch {
    // 即使出错，也尝试从 hasLoginState 中获取用户
    try {
      const state = auth.hasLoginState();
      if (state && state.user) {
        console.log('[cloudbase] getCurrentUser() fallback to hasLoginState.user', {
          hasState: !!state,
          hasUser: !!state.user,
        });
        return toUser(state.user);
      }
    } catch {
      // ignore
    }
    return null;
  }
}

/**
 * 等待认证初始化完成
 */
async function waitForAuth(): Promise<void> {
  await authReadyPromise;
}

/**
 * 发送手机验证码
 * 需要先登录（匿名登录）才能获取验证码
 */
export async function sendPhoneCode(
  phoneNumber: string
): Promise<{ data: { verification_id: string; verification_info?: any; is_user?: boolean } | null; error: Error | null }> {
  console.log('[手机号登录] sendPhoneCode 开始:', phoneNumber);
  try {
    const auth = await safeGetAuth();
    const hasLogin = auth.hasLoginState();
    console.log('[手机号登录] 当前登录状态:', hasLogin ? '已登录' : '未登录');

    // 确保已登录（通过匿名登录获取 accessToken）
    if (!hasLogin) {
      console.log('[手机号登录] 未登录，执行匿名登录...');
      await auth.signInAnonymously();
      console.log('[手机号登录] 匿名登录完成');
    }

    const normalizedPhone = phoneNumber.replace(/^\s*\+?86\s*/, "").trim();
    const phoneForApi = normalizedPhone.startsWith("+")
      ? normalizedPhone
      : `+86 ${normalizedPhone}`;
    console.log('[手机号登录] 发送验证码到:', phoneForApi);

    const res = (await auth.getVerification({
      phone_number: phoneForApi,
    })) as any;
    console.log('[手机号登录] getVerification 返回, code:', res?.code, 'hasData:', !!res?.data);

    if (!res || (res.code !== undefined && res.code !== 0)) {
      const rawMsg = res?.message ?? res?.msg ?? res?.data?.message ?? res?.error;
      const msg = normalizeAuthApiMessage(rawMsg, "发送验证码失败");
      console.error('[手机号登录] 发送验证码失败:', msg);
      return { data: null, error: new Error(msg) };
    }
    const verificationId =
      res.verification_id ??
      res.data?.verification_id ??
      res.ver ??
      res.data?.ver;
    const isUser = res.is_user ?? res.data?.is_user;
    console.log('[手机号登录] 获取验证码成功, verificationId:', verificationId ? '存在' : '不存在', 'is_user:', isUser);
    // 返回完整的 verification 信息
    return { data: { verification_id: verificationId, verification_info: res, is_user: isUser }, error: null };
  } catch (error: any) {
    const msg = normalizeAuthApiMessage(
      error instanceof Error ? error.message : error,
      "发送验证码失败"
    );
    console.error('[手机号登录] sendPhoneCode 异常:', msg);
    return { data: null, error: new Error(msg) };
  }
}

/**
 * 手机号验证码登录
 */
export async function signInWithPhoneSms(
  phoneNumber: string,
  phoneCode: string,
  verificationInfo: any
): Promise<{ data: { user: User | null }; error: Error | null }> {
  console.log('[手机号登录] signInWithPhoneSms 开始');
  console.log('[手机号登录] phoneNumber:', phoneNumber);
  console.log('[手机号登录] phoneCode:', phoneCode);
  console.log('[手机号登录] verificationInfo type:', typeof verificationInfo);
  console.log('[手机号登录] verificationInfo keys:', verificationInfo ? Object.keys(verificationInfo) : 'null');

  try {
    if (!phoneNumber || !phoneCode || !verificationInfo) {
      console.error('[手机号登录] 参数缺失, phoneNumber:', !!phoneNumber, 'phoneCode:', !!phoneCode, 'verificationInfo:', !!verificationInfo);
      return { data: { user: null }, error: new Error("缺少手机号、验证码或验证信息") };
    }
    const auth = await safeGetAuth();
    const normalizedPhone = phoneNumber.replace(/^\s*\+?86\s*/, "").trim();
    const phoneForApi = normalizedPhone.startsWith("+")
      ? normalizedPhone
      : `+86 ${normalizedPhone}`;

    console.log('[手机号登录] 调用 signInWithSms, phoneNum:', phoneForApi);

    // 根据官方文档，verificationInfo 是 getVerification 的返回值
    // 只传递必要的属性，避免 SDK 内部序列化问题
    const loginParams = {
      phoneNum: phoneForApi,
      verificationCode: phoneCode,
      verificationInfo: {
        verification_id: verificationInfo.verification_id,
        is_user: verificationInfo.is_user,
      },
    };
    console.log('[手机号登录] loginParams:', JSON.stringify(loginParams));

    const res = await auth.signInWithSms(loginParams);
    console.log('[手机号登录] signInWithSms 返回, res存在:', !!res, 'res.code:', res?.code);

    const user = getCurrentUser();
    console.log('[手机号登录] 登录成功, user:', JSON.stringify(user));
    return { data: { user }, error: null };
  } catch (error: any) {
    const msg = normalizeAuthApiMessage(
      error instanceof Error ? error.message : error,
      "手机号登录失败"
    );
    console.error('[手机号登录] signInWithPhoneSms 异常:', msg);
    return { data: { user: null }, error: new Error(msg) };
  }
}

/**
 * 获取邮箱验证码
 */
export async function getVerification(params: {
  email: string;
}): Promise<{ data: { verification_id: string; is_user: boolean } | null; error: Error | null }> {
  try {
    const auth = await safeGetAuth();

    // 确保已登录（通过匿名登录获取 accessToken）
    if (!auth.hasLoginState()) {
      await auth.signInAnonymously();
    }

    if (typeof auth.getVerification !== "function") {
      return { data: null, error: new Error("当前环境未支持邮箱验证码") };
    }
    const res = (await auth.getVerification({ email: params.email })) as any;
    if (!res || (res.code !== undefined && res.code !== 0)) {
      const rawMsg = res?.message ?? res?.msg ?? res?.data?.message ?? res?.error;
      const msg = normalizeAuthApiMessage(rawMsg, "获取验证码失败");
      return { data: null, error: new Error(msg) };
    }
    const d = res.data ?? res;
    const verification_id = d.verification_id ?? d.verificationId;
    const is_user = d.is_user ?? d.isUser ?? false;
    if (!verification_id) return { data: null, error: new Error("未返回 verification_id") };
    return { data: { verification_id, is_user }, error: null };
  } catch (error: any) {
    const msg = normalizeAuthApiMessage(
      error instanceof Error ? error.message : error,
      "获取验证码失败"
    );
    return {
      data: null,
      error: new Error(msg),
    };
  }
}

/**
 * 验证邮箱验证码
 */
export async function verify(params: {
  verification_id: string;
  verification_code: string;
}): Promise<{ data: { verification_token: string } | null; error: Error | null }> {
  try {
    const auth = await safeGetAuth();
    if (typeof auth.verify !== "function") {
      return { data: null, error: new Error("当前环境未支持验证码校验") };
    }
    const res = (await auth.verify({
      verification_id: params.verification_id,
      verification_code: params.verification_code,
    })) as any;
    if (!res || (res.code !== undefined && res.code !== 0)) {
      const rawMsg = res?.message ?? res?.msg ?? res?.data?.message ?? res?.error;
      const msg = normalizeAuthApiMessage(rawMsg, "验证码错误或已过期");
      return { data: null, error: new Error(msg) };
    }
    const d = res.data ?? res;
    const verification_token = d.verification_token ?? d.verificationToken;
    if (!verification_token) return { data: null, error: new Error("未返回 verification_token") };
    return { data: { verification_token }, error: null };
  } catch (error: any) {
    const msg = normalizeAuthApiMessage(
      error instanceof Error ? error.message : error,
      "验证码错误或已过期"
    );
    return { data: null, error: new Error(msg) };
  }
}

/**
 * 邮箱验证码登录
 */
export async function signInWithVerificationToken(
  email: string,
  verification_token: string
): Promise<{ data: { user: User | null }; error: Error | null }> {
  try {
    const auth = await safeGetAuth();
    if (typeof auth.signIn !== "function") {
      return { data: { user: null }, error: new Error("当前环境未支持验证码登录") };
    }
    const res = (await auth.signIn({
      username: email,
      verification_token,
    })) as any;
    if (!res || (res.code !== undefined && res.code !== 0)) {
      const rawMsg = res?.message ?? res?.msg ?? res?.data?.message ?? res?.error;
      const msg = normalizeAuthApiMessage(rawMsg, "登录失败");
      return { data: { user: null }, error: new Error(msg) };
    }
    const user = getCurrentUser();
    return { data: { user }, error: null };
  } catch (error: any) {
    const msg = normalizeAuthApiMessage(
      error instanceof Error ? error.message : error,
      "登录失败"
    );
    return { data: { user: null }, error: new Error(msg) };
  }
}

/**
 * 邮箱密码注册
 */
export async function signUp(
  email: string,
  password: string,
  verification: { verification_id: string; verification_code: string; verification_token: string }
): Promise<{ data: { user: User | null }; error: Error | null }> {
  try {
    const auth = await safeGetAuth();
    if (typeof auth.signUp !== "function") {
      return { data: { user: null }, error: new Error("当前环境未支持注册") };
    }
    // @cloudbase/auth 的 Auth.signUp 在带 verification_* 时会执行 formatPhone(phone_number)；
    // 纯邮箱注册无手机号时会把 undefined/"" 格式化成 "+86 " / "+86 undefined"，触发服务端
    // invalid SignUpRequest.PhoneNumber。底层 oauth authApi.signUp 直接 POST body，无此逻辑。
    const oauthAuth = auth as any;
    const authApi = oauthAuth?.oauthInstance?.authApi;
    const createLoginState = oauthAuth?.createLoginState;
    if (typeof authApi?.signUp === "function" && typeof createLoginState === "function") {
      try {
        await authApi.signUp({
          email,
          password,
          verification_code: verification.verification_code,
          verification_token: verification.verification_token,
        });
      } catch (apiErr: any) {
        const rawMsg =
          apiErr?.error_description ?? apiErr?.message ?? apiErr?.msg ?? apiErr?.error ?? apiErr;
        const msg = normalizeAuthApiMessage(rawMsg, "注册失败");
        return { data: { user: null }, error: new Error(msg) };
      }
      await createLoginState.call(oauthAuth);
      const user = await getCurrentUser();
      return { data: { user }, error: null };
    }

    const res = (await auth.signUp({
      email,
      password,
      verification_code: verification.verification_code,
      verification_token: verification.verification_token,
    })) as any;
    if (!res || (res.code !== undefined && res.code !== 0)) {
      const rawMsg = res?.message ?? res?.msg ?? res?.data?.message ?? res?.error;
      const msg = normalizeAuthApiMessage(rawMsg, "注册失败");
      return { data: { user: null }, error: new Error(msg) };
    }
    const user = await getCurrentUser();
    return { data: { user }, error: null };
  } catch (error: any) {
    const msg = normalizeAuthApiMessage(
      error instanceof Error ? error.message : error,
      "注册失败"
    );
    return { data: { user: null }, error: new Error(msg) };
  }
}

/**
 * 邮箱密码登录
 * 支持两种调用方式：
 * - signInWithPassword(email, password)
 * - signInWithPassword({ email, password })
 */
export async function signInWithPassword(
  emailOrOpts: string | { email: string; password: string },
  password?: string
): Promise<{ data: { user: User | null }; error: Error | null }> {
  try {
    const email = typeof emailOrOpts === "string" ? emailOrOpts : emailOrOpts?.email;
    const pwd = typeof emailOrOpts === "string" ? password : emailOrOpts?.password;

    if (!email || !pwd) {
      return { data: { user: null }, error: new Error("缺少邮箱或密码") };
    }

    const auth = await safeGetAuth();
    if (typeof auth.signInWithPassword !== "function") {
      return { data: { user: null }, error: new Error("当前环境未支持邮箱密码登录") };
    }
    const res = (await auth.signInWithPassword({ email, password: pwd })) as any;
    if (!res || (res.code !== undefined && res.code !== 0)) {
      const rawMsg = res?.message ?? res?.msg ?? res?.data?.message ?? res?.error;
      const msg = normalizeAuthApiMessage(rawMsg, "登录失败");
      return { data: { user: null }, error: new Error(msg) };
    }
    const user = getCurrentUser();
    return { data: { user }, error: null };
  } catch (error: any) {
    const msg = normalizeAuthApiMessage(
      error instanceof Error ? error.message : error,
      "登录失败"
    );
    return { data: { user: null }, error: new Error(msg) };
  }
}

let silentReloginInFlight: Promise<boolean> | null = null;

/**
 * 使用登录页「记住密码」保存的邮箱+密码再次 signIn（无 UI）。
 * 并发调用合并为同一次尝试。
 */
export async function trySilentReloginWithStoredPassword(): Promise<boolean> {
  if (silentReloginInFlight) return silentReloginInFlight;
  silentReloginInFlight = (async () => {
    try {
      const cred = await getStoredCredentials();
      if (!cred) {
        console.log('[cloudbase] silentRelogin: 无记住的账号密码');
        return false;
      }
      const { error } = await signInWithPassword(cred.email, cred.password);
      if (error) {
        console.warn('[cloudbase] silentRelogin: 失败', (error as Error)?.message ?? error);
        return false;
      }
      console.log('[cloudbase] silentRelogin: 成功');
      return true;
    } finally {
      silentReloginInFlight = null;
    }
  })();
  return silentReloginInFlight;
}

async function getAccessTokenForRdb(): Promise<{ accessToken: string; env: string }> {
  const auth = await safeGetAuth();
  const env = cloudbaseConfig.env;
  const readToken = async (): Promise<string> => {
    try {
      const result = await auth.getAccessToken();
      return result.accessToken ?? "";
    } catch {
      return "";
    }
  };

  let token = await readToken();
  if (token.length > 0) {
    console.log('[cloudbase] [RDB] getAccessToken 拦截:', {
      hasToken: true,
      tokenLength: token.length,
      tokenPrefix: `${token.slice(0, 15)}...`,
    });
    return { accessToken: token, env };
  }

  console.warn('[cloudbase] [RDB] token 为空，尝试 refreshSession');
  try {
    if (typeof auth.refreshSession === "function") {
      await auth.refreshSession();
    }
  } catch (e: any) {
    console.warn('[cloudbase] [RDB] refreshSession 失败', e?.message ?? e);
  }
  token = await readToken();
  if (token.length > 0) {
    console.log('[cloudbase] [RDB] getAccessToken 拦截:', {
      hasToken: true,
      tokenLength: token.length,
      recoveredBy: 'refreshSession',
    });
    return { accessToken: token, env };
  }

  console.warn('[cloudbase] [RDB] 仍无 token，尝试记住密码静默重登');
  const reloginOk = await trySilentReloginWithStoredPassword();
  if (reloginOk) {
    token = await readToken();
  }
  console.log('[cloudbase] [RDB] getAccessToken 拦截:', {
    hasToken: !!token,
    tokenLength: token.length,
    afterSilentRelogin: reloginOk,
  });
  return { accessToken: token, env };
}

function applyRdbAccessTokenPatch(): void {
  if (!cloudbaseInstance) return;
  try {
    const rdb = (cloudbaseInstance as any).rdb?.();
    if (!rdb || typeof rdb.getAccessToken !== "function") return;
    rdb.getAccessToken = async () => {
      try {
        return await getAccessTokenForRdb();
      } catch (e: any) {
        console.error('[cloudbase] [RDB] getAccessToken 拦截异常:', e?.message ?? e);
        return { accessToken: "", env: cloudbaseConfig.env };
      }
    };
    const Ctor = rdb.constructor;
    if (Ctor && typeof (Ctor as any).getAccessToken === "function") {
      (Ctor as any).getAccessToken = rdb.getAccessToken;
    }
  } catch {
    // ignore
  }
}

/**
 * 退出登录
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const auth = await safeGetAuth();
    if (typeof auth.signOut === "function") {
      await auth.signOut();
    }
    clearStoredRefreshToken();
    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

// ==================== 自管 refresh_token（HTTP 刷新 + 存储） ====================

async function getStoredRefreshToken(): Promise<string | null> {
  try {
    return await storage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function setStoredRefreshToken(token: string): Promise<void> {
  try {
    await storage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  } catch (e) {
    console.warn('[cloudbase] setStoredRefreshToken 失败', e);
  }
}

function clearStoredRefreshToken(): void {
  storage.removeItem(REFRESH_TOKEN_STORAGE_KEY).catch(() => {});
}

/**
 * 使用 refresh_token 调用 CloudBase /auth/v1/token 获取新的 access_token。
 * 成功时返回新 access_token、新 refresh_token（若有）；失败返回 null。
 */
async function refreshAccessTokenByHttp(
  refreshToken: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number } | null> {
  if (!TOKEN_REFRESH_URL || !refreshToken) return null;
  try {
    const res = await fetch(TOKEN_REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: cloudbaseConfig.env,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn('[cloudbase] refreshAccessTokenByHttp 失败', res.status, data);
      return null;
    }
    const access_token = data?.access_token ?? data?.accessToken;
    const refresh_token = data?.refresh_token ?? data?.refreshToken;
    if (!access_token) {
      console.warn('[cloudbase] refreshAccessTokenByHttp 响应无 access_token', Object.keys(data || {}));
      return null;
    }
    return {
      access_token,
      refresh_token: typeof refresh_token === 'string' ? refresh_token : undefined,
      expires_in: data?.expires_in ?? data?.expiresIn,
    };
  } catch (e) {
    console.warn('[cloudbase] refreshAccessTokenByHttp 异常', e);
    return null;
  }
}

/**
 * 将 access_token（及可选 refresh_token）写入 SDK 当前会话，供 RDB/getAccessToken 使用。
 */
async function setSession(
  access_token: string,
  refresh_token?: string
): Promise<{ error: Error | null }> {
  const auth = await safeGetAuth();
  if (typeof auth.setSession !== 'function') {
    return { error: new Error('当前环境不支持 setSession') };
  }
  try {
    await auth.setSession({
      access_token,
      ...(typeof refresh_token === 'string' ? { refresh_token } : {}),
    } as any);
    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * 监听认证状态变化
 *
 * 简化版：直接透传 SDK 事件，不做额外处理
 */
export function onAuthStateChange(
  callback: (event: AuthStateChangeEvent) => void
): { data: { subscription: { unsubscribe: () => void } } } {
  // 等待 auth 初始化完成后再执行
  authReadyPromise.then(() => {
    if (!cloudbaseAuth) return;

    let unsubscribe: any = null;

    if (typeof cloudbaseAuth.onLoginStateChanged === "function") {
      unsubscribe = cloudbaseAuth.onLoginStateChanged((params: any) => {
        const { eventType, loginState } = params?.data || {};

        // credentials_error 时，检查用户是否仍然有效，如果有效则忽略
        if (eventType === 'credentials_error') {
          const state = cloudbaseAuth.hasLoginState()
          if (state?.user) {
            // 忽略误报
            return
          }
          // 用户无效，确认是真正的 credentials_error，触发登出
        }

        // 直接透传事件
        if (eventType === "sign_in") {
          callback({ event: "SIGNED_IN", user: loginState?.user ? toUser(loginState.user) : null });
        } else if (eventType === "token_refreshed") {
          callback({ event: "TOKEN_REFRESHED", user: loginState?.user ? toUser(loginState.user) : null });
        } else if (eventType === "sign_out" || eventType === "credentials_error") {
          callback({ event: "SIGNED_OUT", user: null });
        }
      });
    }

    // 存储 unsubscribe 函数供外部调用
    if (unsubscribe) {
      (callback as any).__unsubscribe = unsubscribe;
    }
  }).catch(() => {});

  const handleUnsubscribe = () => {
    const unsub = (callback as any).__unsubscribe;
    if (typeof unsub === 'function') {
      unsub();
    } else if (unsub && typeof unsub.unsubscribe === 'function') {
      unsub.unsubscribe();
    }
  };

  return {
    data: {
      subscription: {
        unsubscribe: handleUnsubscribe,
      },
    },
  };
}

/**
 * 获取 accessToken（用于云函数调用）
 */
export async function getAccessToken(): Promise<string> {
  await waitForAuth();
  const auth = await safeGetAuth();
  const result = await auth.getAccessToken();
  const token = result.accessToken ?? "";
  console.log('[cloudbase] getAccessToken:', {
    hasToken: !!token,
    tokenLength: token.length,
    tokenPrefix: token ? `${token.slice(0, 15)}...` : null,
    resultKeys: result ? Object.keys(result) : [],
  });
  return token;
}

/** 并发多处 `waitForAuthToken` 时合并为单次轮询，避免重复狂打 getAccessToken */
let waitForAuthTokenInFlight: Promise<void> | null = null;

/**
 * 等待认证 token 就绪（登录后 SDK 可能异步写入，RDB 请求前调用可避免首请求拿不到 token）
 * 最多等待约 1 秒，超时后仍返回（不抛错）。
 */
export async function waitForAuthToken(): Promise<void> {
  if (waitForAuthTokenInFlight) {
    return waitForAuthTokenInFlight;
  }
  waitForAuthTokenInFlight = (async () => {
    const deadline = Date.now() + 1000;
    let attempts = 0;
    while (Date.now() < deadline) {
      attempts++;
      try {
        const token = await getAccessToken();
        if (token && token.length > 0) {
          console.log('[cloudbase] waitForAuthToken: 成功获取 token, 尝试次数:', attempts);
          return;
        }
        console.log('[cloudbase] waitForAuthToken: token 为空, 重试...');
      } catch (e: any) {
        if (isTokenEndpointRefreshFailure(e)) {
          console.warn(
            '[cloudbase] waitForAuthToken: Token 刷新被服务端拒绝（个人版常见）。已停止重试；请重新登录或检查套餐。详情:',
            e?.message ?? e,
          );
          break;
        }
        console.warn('[cloudbase] waitForAuthToken: 获取 token 异常:', e?.message ?? e);
      }
      await new Promise((r) => setTimeout(r, 80));
    }
    console.warn('[cloudbase] waitForAuthToken: 超时未获取到有效 token, attempts:', attempts);
    const reopened = await trySilentReloginWithStoredPassword();
    if (reopened) {
      try {
        const token = await getAccessToken();
        if (token && token.length > 0) {
          console.log('[cloudbase] waitForAuthToken: 静默重登后已拿到 token');
        }
      } catch (e: any) {
        console.warn('[cloudbase] waitForAuthToken: 静默重登后仍失败', e?.message ?? e);
      }
    }
  })().finally(() => {
    waitForAuthTokenInFlight = null;
  });
  return waitForAuthTokenInFlight;
}

/**
 * 永久删除账户及所有关联数据
 */
export async function deleteAccount(): Promise<{ data: { deleted: boolean; totalDeleted?: number } | null; error: Error | null }> {
  try {
    const res = await cloudbase.callFunction({
      name: "delete-account",
      data: {},
    }) as any;
    const data = res?.result ?? res;
    if (data?.error) return { data: null, error: new Error(data.error) };
    return { data: { deleted: true, totalDeleted: data.totalDeleted }, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// ==================== 数据库 API ====================

function getRdbWithAuth(): any {
  const app = cloudbase as any;
  if (!app?.rdb) {
    throw new Error("[cloudbase] app.rdb() 不可用");
  }
  return app.rdb();
}

function wrapRdbChain(chain: any): any {
  if (chain == null || typeof chain !== "object") return chain;
  return new Proxy(chain, {
    get(target, prop) {
      const val = (target as any)[prop];
      if (prop === "then" && typeof val === "function") {
        return function (onFulfilled?: any, onRejected?: any) {
          return authReadyPromise.then(() =>
            (target as PromiseLike<any>).then(onFulfilled, onRejected)
          );
        };
      }
      if (prop === "catch" && typeof val === "function") {
        return function (onRejected?: any) {
          return authReadyPromise.then(() => (target as any).catch(onRejected));
        };
      }
      if (typeof val === "function") {
        return function (...args: any[]) {
          const result = val.apply(target, args);
          return result != null && typeof result === "object"
            ? wrapRdbChain(result)
            : result;
        };
      }
      return val;
    },
  });
}

// ==================== Cloudbase 客户端对象 ====================

export const cloudbaseClient = {
  auth: {
    hasLoginState: () => hasLoginState(),
    getLoginState: () => getLoginState(),
    getLoginScope: () => getLoginScope(),
    isAnonymousAuthSession: () => isAnonymousAuthSession(),
    getCurrentUser: () => getCurrentUser(),
    onAuthStateChange: (callback: (event: AuthStateChangeEvent) => void) =>
      onAuthStateChange(callback),
    signOut: () => signOut(),
    getVerification: (params: { email: string }) => getVerification(params),
    verify: (params: { verification_id: string; verification_code: string }) =>
      verify(params),
    signUp: (email: string, password: string, verification: any) =>
      signUp(email, password, verification),
    signInWithPassword: (emailOrOpts: string | { email: string; password: string }, password?: string) =>
      signInWithPassword(emailOrOpts, password),
    signInWithVerificationToken: (email: string, verification_token: string) =>
      signInWithVerificationToken(email, verification_token),
    sendPhoneCode: (phoneNumber: string) => sendPhoneCode(phoneNumber),
    signInWithPhoneSms: (
      phoneNumber: string,
      phoneCode: string,
      verificationInfo: any
    ) => signInWithPhoneSms(phoneNumber, phoneCode, verificationInfo),
    getAccessToken: () => getAccessToken(),
    trySilentReloginWithStoredPassword: () => trySilentReloginWithStoredPassword(),
    deleteAccount: () => deleteAccount(),
    getSession: async () => {
      const auth = await safeGetAuth();
      if (typeof auth.getSession !== 'function') {
        return { data: null, error: new Error('当前环境不支持 getSession') };
      }
      try {
        const result = await auth.getSession();
        return { data: result, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    updateUser: async (data: { full_name?: string; name?: string; avatar_url?: string }) => {
      const auth = await safeGetAuth();
      if (typeof auth.updateUser !== 'function') {
        return { error: new Error('当前环境不支持更新用户') };
      }
      try {
        const result = await auth.updateUser({ data });
        return { data: result, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    refreshSession: async () => {
      const auth = await safeGetAuth();
      console.log('[cloudbase] refreshSession: 开始');

      // 1) 仅在企业版等显式开启时：自管 refresh_token + HTTP 刷新（个人版勿开，易触发 /auth/v1/token 与套餐不兼容）
      const storedRefresh = USE_HTTP_TOKEN_REFRESH ? await getStoredRefreshToken() : null;
      if (USE_HTTP_TOKEN_REFRESH && storedRefresh && TOKEN_REFRESH_URL) {
        console.log('[cloudbase] refreshSession: 使用自管 refresh_token 做 HTTP 刷新');
        const tokens = await refreshAccessTokenByHttp(storedRefresh);
        if (tokens) {
          const { error: setErr } = await setSession(tokens.access_token, tokens.refresh_token);
          if (!setErr) {
            if (tokens.refresh_token) await setStoredRefreshToken(tokens.refresh_token);
            console.log('[cloudbase] refreshSession: 自管 HTTP 刷新成功');
            try {
              const t = await getAccessToken();
              console.log('[cloudbase] refreshSession: 完成后 getAccessToken 前12位:', t ? `${String(t).slice(0, 12)}...` : 'null');
            } catch (e: any) {
              console.warn('[cloudbase] refreshSession: 完成后 getAccessToken 失败', e?.message ?? e);
            }
            return { data: { access_token: tokens.access_token, refresh_token: tokens.refresh_token }, error: null };
          }
          console.warn('[cloudbase] refreshSession: setSession 失败', setErr);
        }
      }

      // 2) 回退到 SDK 的 refreshSession（无参或传 getSession 拿到的 refresh_token）
      if (typeof auth.refreshSession !== 'function') {
        console.warn('[cloudbase] refreshSession: SDK 无此方法');
        return { data: null, error: new Error('当前环境不支持刷新会话') };
      }
      try {
        let refreshTokenToUse: string | undefined;
        if (USE_HTTP_TOKEN_REFRESH && typeof auth.getSession === 'function') {
          try {
            const sessionRes = await auth.getSession();
            const inner = (sessionRes as any)?.data ?? sessionRes;
            const session = inner?.session ?? inner;
            refreshTokenToUse =
              typeof session?.refresh_token === 'string'
                ? session.refresh_token
                : typeof inner?.refresh_token === 'string'
                  ? inner.refresh_token
                  : typeof (sessionRes as any)?.refresh_token === 'string'
                    ? (sessionRes as any).refresh_token
                    : undefined;
            console.log('[cloudbase] refreshSession: getSession 完成', {
              hasSession: !!sessionRes,
              hasRefreshToken: !!refreshTokenToUse,
              innerKeys: inner && typeof inner === 'object' ? Object.keys(inner) : [],
              sessionKeys: session && typeof session === 'object' ? Object.keys(session) : [],
            });
          } catch (getSessionErr: any) {
            console.warn('[cloudbase] refreshSession: getSession 失败', getSessionErr?.message ?? getSessionErr);
          }
        } else if (!USE_HTTP_TOKEN_REFRESH) {
          console.log('[cloudbase] refreshSession: 个人版模式，使用无参 refreshSession（不传 refresh_token）');
        } else {
          console.log('[cloudbase] refreshSession: SDK 无 getSession，使用无参 refreshSession');
        }

        const result =
          USE_HTTP_TOKEN_REFRESH && refreshTokenToUse
            ? await auth.refreshSession(refreshTokenToUse)
            : await auth.refreshSession();
        console.log('[cloudbase] refreshSession: 调用完成', { hasResult: !!result });

        try {
          const tokenResult = await auth.getAccessToken();
          const tokenStr = typeof tokenResult === 'string' ? tokenResult : (tokenResult as any)?.accessToken;
          const tokenPreview = tokenStr ? `${String(tokenStr).slice(0, 12)}...` : 'null';
          console.log('[cloudbase] refreshSession: 完成后 getAccessToken 前12位:', tokenPreview);
        } catch (e: any) {
          console.warn('[cloudbase] refreshSession: 完成后 getAccessToken 失败', e?.message ?? e);
        }
        return { data: result, error: null };
      } catch (error: any) {
        console.warn('[cloudbase] refreshSession: 调用失败', error?.message ?? error);
        return { data: null, error };
      }
    },
    /** 登录成功后若拿到 refresh_token（如企业版或自定义登录），可调用此方法保存，供自管 HTTP 刷新使用 */
    saveRefreshToken: (token: string) => setStoredRefreshToken(token),
  },

  from: (table: string) => wrapRdbChain(getRdbWithAuth().from(table)),

  functions: {
    invoke: (name: string, options?: { body?: Record<string, any> }) => {
      const body = options?.body || {};
      return (async () => {
        try {
          // waitForAuthToken 内部已包含 authReadyPromise 的等待，同时确保 SDK token 就绪后发请求，
          // 消除 authReadyPromise 完成但 token 尚未写入 callFunction 头部的 race condition。
          await waitForAuthToken();
          const res = await withTimeout(
            cloudbase.callFunction({ name, data: body }),
            5 * 60 * 1000,
            `云函数 ${name} 调用超时 (5min)`
          );
          return { data: res?.result ?? res, error: null };
        } catch (error: any) {
          console.error(`[cloudbase] invoke ${name} failed:`, error?.message ?? error);
          return { data: null, error };
        }
      })();
    },
  },

  storage: {
    from: (bucketName?: string) => ({
      upload: async (cloudPath: string, filePath: string, options?: any) => {
        const app = cloudbase as any
        const safeType = (v: any) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)
        const safePreview = (v: any) => {
          const t = safeType(v)
          if (t === 'string') return `string(len=${(v as string).length})`
          if (t === 'number' || t === 'boolean' || t === 'undefined' || t === 'null') return String(v)
          if (t === 'function') return 'function'
          // RN Hermes/HostObject: 绝不直接 stringify/console.log 整个对象
          try {
            const keys = Object.getOwnPropertyNames(v).slice(0, 12)
            return `object(keys=${keys.join(',')}${keys.length >= 12 ? ',...' : ''})`
          } catch {
            return `object(type=${Object.prototype.toString.call(v)})`
          }
        }

        console.log('[storage.upload] 开始上传:', {
          cloudPath,
          filePath: typeof filePath === 'string' ? filePath : safePreview(filePath),
          bucketName,
        })
        console.log('[storage.upload] cloudbaseInstance:', cloudbaseInstance ? '已初始化' : 'null')

        if (!app) {
          console.error('[storage.upload] app 为空')
          return { data: null, error: new Error('CloudBase 未初始化') }
        }

        if (typeof app.uploadFile !== 'function') {
          console.error('[storage.upload] uploadFile 不可用, app.uploadFile:', typeof app.uploadFile)
          console.error('[storage.upload] app 是否有 uploadFile:', 'uploadFile' in app)
          console.error('[storage.upload] app 是否有 storage:', 'storage' in app)
          console.error('[storage.upload] app 是否有 cloudStorage:', 'cloudStorage' in app)
          // 列出 app 上所有方法
          try {
            const methods = Object.getOwnPropertyNames(app).filter(k => typeof (app as any)[k] === 'function')
            console.error('[storage.upload] app 方法列表:', methods.slice(0, 40).join(', '))
          } catch (e: any) {
            console.error('[storage.upload] 枚举 app 方法失败:', e?.message ?? e)
          }
          return { data: null, error: new Error('uploadFile 方法不可用') }
        }

        try {
          console.log('[storage.upload] === 开始上传流程 ===')

          // 诊断：避免直接打印 auth/host objects（Hermes 会因 Symbol.toStringTag 崩溃）
          try {
            const auth = app.auth?.()
            console.log('[storage.upload] auth:', auth ? safePreview(auth) : 'null')
            const hasLogin = auth?.hasLoginState?.()
            console.log('[storage.upload] hasLoginState:', safeType(hasLogin) === 'boolean' ? hasLogin : safePreview(hasLogin))
            const uid = auth?.currentUser?.uid ?? auth?.currentUser?.userId ?? auth?.currentUser?.id
            console.log('[storage.upload] currentUserId:', uid ?? '无')
          } catch (e: any) {
            console.warn('[storage.upload] auth 诊断失败:', e?.message ?? e)
          }

          // React Native: 将文件转换为 base64
          let fileContent: string = filePath

          if (filePath.startsWith('file://') || filePath.startsWith('/')) {
            console.log('[storage.upload] 读取本地文件:', filePath)
            const response = await fetch(filePath)
            console.log('[storage.upload] fetch response status:', response.status)
            const blob = await response.blob()
            console.log('[storage.upload] blob size:', blob.size, 'type:', blob.type)
            fileContent = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onloadend = () => {
                const result = reader.result as string
                const base64Data = result.split(',')[1] || result
                console.log('[storage.upload] base64 长度:', base64Data.length)
                resolve(base64Data)
              }
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
          }

          console.log('[storage.upload] 调用 uploadFile, cloudPath:', cloudPath, 'fileContent 长度:', fileContent.length)
          const result = await app.uploadFile({
            cloudPath,
            filePath: fileContent,
          })
          console.log('[storage.upload] 上传成功:', result)
          return { data: result, error: null }
        } catch (error: any) {
          // 注意：Hermes 下 error 也可能是 HostObject，避免直接打印整个对象
          try {
            console.error('[storage.upload] 上传失败 message:', error?.message ?? String(error))
          } catch {
            console.error('[storage.upload] 上传失败 (message 读取失败)')
          }
          try {
            console.error('[storage.upload] error stack:', error?.stack ?? '(no stack)')
          } catch {
            console.error('[storage.upload] error stack: (读取失败)')
          }
          try {
            console.error('[storage.upload] error preview:', safePreview(error))
          } catch {
            // ignore
          }

          let errorMsg = '上传失败'
          if (error?.message) {
            errorMsg = error.message
          } else if (typeof error === 'string') {
            errorMsg = error
          }
          return { data: null, error: new Error(errorMsg) }
        }
      },
      getPublicUrl: (cloudPath: string) => {
        // 使用正确的 bucket 域名格式
        const bucket = '6a69-jiulou-4gu5ljkpa1082b3c-1257615712'
        const publicUrl = `https://${bucket}.tcb.qcloud.la/${cloudPath}`
        console.log('[storage.getPublicUrl] 生成URL:', publicUrl)
        return { data: { publicUrl }, error: null }
      },
    }),
    getPublicUrl: (path: string) => {
      const bucket = '6a69-jiulou-4gu5ljkpa1082b3c-1257615712'
      const publicUrl = `https://${bucket}.tcb.qcloud.la/${path}`
      return { data: { publicUrl }, error: null }
    },
  },
};

export const cloudbaseDb = cloudbaseClient;

export function checkCloudbaseConfigured(): boolean {
  return isCloudbaseConfigured;
}

export async function cloudbaseHealthCheck(): Promise<void> {
  if (!isCloudbaseConfigured) {
    throw new Error("Cloudbase 未配置");
  }
}

// 获取带有自定义超时的 cloudbase client（用于长时间运行的请求）
export function getCloudbaseWithTimeout(timeoutMs: number = 60000) {
  // 目前直接返回 cloudbaseClient，实际的超时由调用方通过 withTimeout 控制
  return cloudbaseClient
}

export { withTimeout, normalizeError } from "./timeout";

// 导出 cloudbase 实例代理
export const cloudbase = new Proxy({} as ReturnType<typeof cloudbaseSDK.init>, {
  get(_, prop) {
    return (cloudbaseInstance as any)?.[prop];
  },
});
