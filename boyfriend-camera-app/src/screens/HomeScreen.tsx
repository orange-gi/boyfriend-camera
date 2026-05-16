/**
 * HomeScreen - 首页
 * 引导用户进入拍照或查看历史
 */
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📸 男友相机</Text>
      <Text style={styles.subtitle}>让男友镜头下的你更美</Text>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate('Camera')}
      >
        <Text style={styles.primaryBtnText}>开始拍照</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate('Diary')}
      >
        <Text style={styles.secondaryBtnText}>📈 进步日记</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 40,
  },
  primaryBtn: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#FF6B6B',
    fontSize: 16,
  },
})
