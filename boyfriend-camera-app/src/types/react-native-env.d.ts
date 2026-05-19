/**
 * React Native 环境类型声明
 * Metro bundler 注入 process 全局变量，此处提供类型支持
 */
declare const process: {
  env: Record<string, string | undefined>
}
