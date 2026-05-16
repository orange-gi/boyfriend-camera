// Polyfill for Node.js crypto module in React Native
// This provides crypto.getRandomValues() which is needed by uuid
// Note: Main crypto polyfill logic is in index.js, this file is for metro.config.js resolution

// 导出 crypto 对象（作为模块）
// uuid 包可能会尝试从 'crypto' 或 'node:crypto' 导入
const fallbackGetRandomValues = function(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
};

const cryptoImpl = {
  getRandomValues: (typeof global !== 'undefined' && global.crypto && global.crypto.getRandomValues)
    ? global.crypto.getRandomValues.bind(global.crypto)
    : fallbackGetRandomValues,
  randomUUID: (typeof global !== 'undefined' && global.crypto && global.crypto.randomUUID)
    ? global.crypto.randomUUID.bind(global.crypto)
    : undefined,
};

module.exports = cryptoImpl;
