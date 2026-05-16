# AGENTS.md - 项目成员

## 成员

| 角色 | 路径 | 职责 |
|------|------|------|
| 总理 | /root/.openclaw/agent-zongli/ | 全局协调、项目管理 |
| 小二 | /root/.openclaw/agent-xiaoer/ | 知与行 App 开发（参考架构） |
| 男友相机 | /root/.openclaw/agent-nanyou/ | 男友相机 App 开发 |

## 项目关联

男友相机复刻知与行的架构：
- 复用 `jiulou-4gu5ljkpa1082b3c` CloudBase 环境
- 复用知与行的登录/认证模块
- 新建 `analyze-photo` 云函数
- 新建 `photo_analysis` 数据库表
