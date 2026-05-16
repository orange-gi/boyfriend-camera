const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 配置 resolver 来处理 Node.js 标准库模块
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    // 将 Node.js 标准库模块映射到对应的 polyfill
    punycode: path.resolve(__dirname, 'node_modules/punycode'),
    buffer: path.resolve(__dirname, 'node_modules/buffer'),
    // 映射 crypto 到我们的 polyfill
    'node:crypto': path.resolve(__dirname, 'src/polyfills/crypto.js'),
    'crypto': path.resolve(__dirname, 'src/polyfills/crypto.js'),
  },
};

module.exports = config;
