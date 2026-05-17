# 真机运行指南（裸 React Native）

## 前置条件

- Node.js >= 22.11
- Xcode（iOS 真机）
- CocoaPods：`sudo gem install cocoapods` 或 `brew install cocoapods`
- iPhone 数据线连接 Mac，手机上信任此电脑

## 首次安装

```bash
cd boyfriend-camera-app
pnpm install       # 自动执行 install-skia（postinstall）
pnpm pod-install   # 或: cd ios && pod install
```

若 `bundle exec pod install` 失败，可尝试：

```bash
cd ios && pod install && cd ..
```

## 启动

终端 1 — Metro：

```bash
pnpm start
```

终端 2 — 真机安装运行：

```bash
pnpm ios:device
```

或在 Xcode 打开 `ios/BoyfriendCamera.xcworkspace`，选择你的 iPhone，点击 Run。

## 常见问题

- **找不到设备**：`xcrun xctrace list devices` 查看是否识别 iPhone
- **签名失败**：Xcode → 项目 → Signing & Capabilities → 选择你的 Team
- **相机黑屏**：确认 Info.plist 已有相机权限（已配置）
- **Reanimated 报错**：确认 `babel.config.js` 含 `react-native-reanimated/plugin` 且为 plugins 最后一项

## 智能模板推荐

进入拍照页后会根据场景启发式自动推荐模板；手动选择模板后不再自动覆盖。后续可在 Frame Processor 中调用 `useSceneRecommendation().updateFromFrame(brightness)` 接入实时光线分析。
