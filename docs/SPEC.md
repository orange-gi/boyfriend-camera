# SPEC.md - 男友相机完整规格

## 1. 概念与愿景

男友相机是一款 AI 拍照教练工具，帮助女生教会男友拍出更好看的照片。

**核心情感价值**：让拍照变成情侣互动的一部分，而不是吵架的导火索。

**产品主张**：不修图，只改进拍照技能。先夸再建议，让男友越拍越好。

## 2. 设计语言

### 视觉风格
- 温暖、柔和，像闺蜜聊天
- 粉色/珊瑚色系为主色调（女性用户友好）
- 圆润卡片 + 柔和阴影

### 字体
- 主字体：系统默认
- 强调：加粗

### 颜色
- Primary: #FF8A9B（珊瑚粉）
- Background: #FFF5F6（淡粉白）
- Text: #2D2D2D
- Secondary: #F5F5F5

## 3. 产品结构

### 页面

#### 首页（/）
- Hero区：上传按钮（选图/拍照）
- 示例展示：展示一张分析结果示例
- 底部：使用说明

#### 分析结果页（/result）
- 总体评分（大字）
- 亮点夸夸（绿色标签）
- 改进建议（列表）
- 今日技巧（卡片，可复制/分享）
- 分享按钮

#### 历史页（/history）
- 分析记录列表
- 可重新查看分析结果

#### 我的（/profile）
- 用户信息
- 设置
- 退出登录

#### 登录页（/auth）
- 邮箱登录（验证码）
- 邮箱+密码登录

## 4. AI 分析维度

| 维度 | 权重 | 说明 |
|------|------|------|
| 构图 | 25% | 三分法、中心构图、引导线 |
| 用光 | 20% | 顺光/逆光/侧光，光线方向与强度 |
| 角度 | 20% | 俯拍/仰拍/平视，是否扬长避短 |
| 背景 | 15% | 杂乱元素、景深、背景选择 |
| 表情引导 | 20% | 人物表情自然度、眼神 |

## 5. 数据库 Schema

### photo_analysis（新建）
```json
{
  "name": "photo_analysis",
  "columns": [
    {"name": "id", "type": "varchar", "primary": true},
    {"name": "user_id", "type": "varchar", "not_null": true},
    {"name": "score", "type": "decimal"},
    {"name": "highlights", "type": "text"},
    {"name": "suggestions", "type": "text"},
    {"name": "tip", "type": "text"},
    {"name": "image_url", "type": "varchar"},
    {"name": "created_at", "type": "datetime", "default": "CURRENT_TIMESTAMP"}
  ]
}
```

## 6. 云函数

### analyze-photo
- 输入：base64 图片
- 调用 MiniMax VL 分析
- 组装 JSON 返回
- 超时：60s

## 7. 技术栈

与知与行完全一致，详见 docs/技术方案.md

## 8. 里程碑

- [ ] M1: App 初始化，跑通登录流程
- [ ] M2: 照片上传 + AI 分析核心流程
- [ ] M3: 分析结果页 UI
- [ ] M4: 历史记录页
- [ ] M5: 小红书推广
