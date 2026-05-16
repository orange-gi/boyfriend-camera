# 📸 男友相机 - NanYou Camera

> 让男友镜头下的你更美

## 产品介绍

面向小红书女性用户的 AI 拍照提升工具。女生上传男友拍的照片，AI 从构图、用光、角度等多维度分析，给出评分和改进建议，帮助女生"教"男友拍出更好看的照片。

## 技术架构

复刻知与行（zhiyuxing）项目架构。

| 层级 | 技术选型 |
|------|---------|
| App | Expo + React Native（expo-router） |
| 状态 | Zustand + React Query |
| 后端 | CloudBase 云函数 + 关系数据库 |
| 认证 | CloudBase Auth（复用知与行登录环境 `jiulou-4gu5ljkpa1082b3c`） |
| AI 图像 | MiniMax VL |
| AI 文字 | DeepSeek（复用知与行云函数） |

## 核心功能

1. **照片上传** — 选图/拍照上传男友拍的照片
2. **AI 分析** — 构图/用光/角度/背景/表情引导五维评分
3. **改进建议** — 先夸亮点，再给具体可操作的建议
4. **今日技巧** — 每张照片附带一个可转发给男友的小技巧
5. **历史记录** — 查看历史分析（可选功能）

## 项目结构

```
nanyou-app/          # React Native App
cloudbase/           # 云函数 & 数据库 Schema
docs/                # 设计文档
```

## 项目成员

| 角色 | 路径 |
|------|------|
| 总理 | /root/.openclaw/agent-zongli/ |
| 小二（知与行） | /root/.openclaw/agent-xiaoer/ |
| 男友相机（你） | /root/.openclaw/agent-nanyou/ |

## 待定事项

- [ ] GitHub 仓库名确认
- [ ] 域名规划
- [ ] 照片存储策略
- [ ] 小程序 AppID（可选）
