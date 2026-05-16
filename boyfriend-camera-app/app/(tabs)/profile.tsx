/**
 * 男友相机 - 个人设置
 */
import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from 'react-native'
import { useAuth } from '../../src/contexts/AuthContext'

export default function ProfilePage() {
  const { user, signOut } = useAuth()

  const handleSignOut = () => {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut()
          } catch (e) {
            // ignore
          }
        },
      },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 用户信息 */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.email}>{user?.email || '未登录'}</Text>
        <Text style={styles.uid}>UID: {user?.id || '-'}</Text>
      </View>

      {/* 设置项 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>

        <TouchableOpacity
          style={styles.item}
          onPress={() => Linking.openURL('https://boyfriend.camera.yuchengji.com/privacy')}
        >
          <Text style={styles.itemText}>📜 隐私政策</Text>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => Linking.openURL('https://boyfriend.camera.yuchengji.com/terms')}
        >
          <Text style={styles.itemText}>📄 用户协议</Text>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.item}>
          <Text style={styles.itemText}>📱 版本</Text>
          <Text style={styles.itemValue}>1.0.0</Text>
        </View>
      </View>

      {/* 退出登录 */}
      {user && (
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>退出登录</Text>
        </TouchableOpacity>
      )}

      {/* 底部 */}
      <Text style={styles.footer}>
        📸 男友相机 · 让男友镜头下的你更美
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F6' },
  content: { padding: 16, paddingBottom: 40 },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF8A9B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  email: { fontSize: 16, fontWeight: '600', color: '#2D2D2D', marginBottom: 4 },
  uid: { fontSize: 12, color: '#aaa' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    color: '#aaa',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f0',
  },
  itemText: { fontSize: 15, color: '#2D2D2D' },
  itemArrow: { fontSize: 18, color: '#ccc' },
  itemValue: { fontSize: 15, color: '#aaa' },
  signOutBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
    marginBottom: 20,
  },
  signOutText: { color: '#ff4444', fontSize: 15, fontWeight: '600' },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#ccc',
    marginTop: 8,
  },
})
