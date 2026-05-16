/**
 * 男友相机 - 分析历史
 */
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'

interface HistoryItem {
  id: string
  score?: number
  highlights?: string[]
  image_url?: string
  created_at?: string
  tip?: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: 从 CloudBase 加载历史记录
    // 暂时显示空状态
    setLoading(false)
  }, [])

  const handleItemPress = (item: HistoryItem) => {
    router.push({
      pathname: '/result',
      params: {
        imageUri: item.image_url || '',
        analysis: JSON.stringify(item),
      },
    })
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF8A9B" />
      </View>
    )
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📁</Text>
        <Text style={styles.emptyTitle}>还没有分析记录</Text>
        <Text style={styles.emptyDesc}>上传第一张照片，开始分析吧～</Text>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.push('/home')}
        >
          <Text style={styles.startBtnText}>去分析</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => handleItemPress(item)}>
            {item.image_url && (
              <Image source={{ uri: item.image_url }} style={styles.thumb} />
            )}
            <View style={styles.itemInfo}>
              {item.score != null && (
                <Text style={styles.itemScore}>⭐ {item.score}/10</Text>
              )}
              {item.highlights?.[0] && (
                <Text style={styles.itemHighlight} numberOfLines={1}>
                  {item.highlights[0]}
                </Text>
              )}
              {item.created_at && (
                <Text style={styles.itemDate}>{item.created_at}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F6',
    padding: 24,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#2D2D2D', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  startBtn: {
    backgroundColor: '#FF8A9B',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  startBtnText: { color: '#fff', fontWeight: '600' },
  list: { padding: 16 },
  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
  },
  thumb: { width: 60, height: 60, borderRadius: 8 },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemScore: { fontSize: 16, fontWeight: '600', color: '#FF8A9B', marginBottom: 4 },
  itemHighlight: { fontSize: 13, color: '#666', marginBottom: 4 },
  itemDate: { fontSize: 12, color: '#aaa' },
})
