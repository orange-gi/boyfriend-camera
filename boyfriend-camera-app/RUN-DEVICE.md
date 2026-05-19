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
- **签名失败（requires a development team）**：项目已配置 `DEVELOPMENT_TEAM`（Team `U298GYL33F`，账号 `mwq5211314@163.com`，见 `app.json` → `ios`）。若仍失败：
  1. 用 Xcode 打开 `ios/BoyfriendCamera.xcworkspace`
  2. 选中 **BoyfriendCamera** target → **Signing & Capabilities** → 确认 **Automatically manage signing** 已勾选且 Team 正确
  3. Bundle ID 为 `com.orange.boyfriendcamera`（与 App Store Connect 一致），首次真机构建需登录 Apple ID，Xcode 会自动生成描述文件
  4. 再在终端执行 `pnpm ios:device`
- **相机黑屏**：确认 Info.plist 已有相机权限（已配置）
- **Reanimated 报错**：确认 `babel.config.js` 含 `react-native-reanimated/plugin` 且为 plugins 最后一项
- **MMKV / TurboModules 报错**（`react-native-mmkv 3.x requires TurboModules`）：`@cloudbase/adapter-rn` 依赖 MMKV，pnpm 下需把 `react-native-mmkv` 写在 `package.json` 直接依赖里才能被原生自动链接。执行 `pnpm install && pnpm pod-install` 后，在 Xcode 中 **Product → Clean Build Folder**，再重新真机构建
- **模板与 CloudBase**：默认使用 App 内置离线模板，**无需登录**。若要从云端同步 100+ 模板，在 `src/services/cloudbase.ts` 填入 Publishable API Key（控制台 → ApiKey 管理 → 创建 publishable key），不是用户账号登录
- **误报「相机设备不可用」**：进入拍照页时若短暂出现该提示、实际能预览/拍照，属初始化误报，已改为相机就绪后自动清除；若持续出现再检查权限
- **`Unimplemented component: RNSScreenStack`**：`@react-navigation/native-stack` 依赖 `react-native-screens`，pnpm 下需写在 `package.json` 直接依赖里。执行 `pnpm install && pnpm pod-install` 后 Clean Build 再运行

## 智能模板推荐

进入拍照页后会根据场景启发式自动推荐模板；手动选择模板后不再自动覆盖。后续可在 Frame Processor 中调用 `useSceneRecommendation().updateFromFrame(brightness)` 接入实时光线分析。
