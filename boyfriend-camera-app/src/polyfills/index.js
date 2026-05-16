// Polyfills initialization - must be imported before any other code
// This file ensures all Node.js polyfills are loaded before other dependencies

// 1. 先设置 fallback crypto，避免 react-native-get-random-values 失败时没有备用方案
// 必须在任何其他导入之前设置，包括 uuid
if (typeof global !== 'undefined') {
  // 确保 global.crypto 存在
  if (!global.crypto) {
    global.crypto = {};
  }
  
  // 设置 fallback getRandomValues 实现
  // 这个实现会在 react-native-get-random-values 不可用时使用
  const fallbackGetRandomValues = function(arr) {
    // Fallback: 使用 Math.random（不是加密安全的，但可以工作）
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };
  
  // 如果还没有 getRandomValues，设置 fallback
  if (!global.crypto.getRandomValues) {
    global.crypto.getRandomValues = fallbackGetRandomValues;
  }
  
  // 保存原始的 getRandomValues（如果有）
  const originalGetRandomValues = global.crypto.getRandomValues;
  
  // 包装 getRandomValues，如果原生模块失败则使用 fallback
  global.crypto.getRandomValues = function(arr) {
    // 如果 react-native-get-random-values 可用，使用它
    if (originalGetRandomValues && originalGetRandomValues !== fallbackGetRandomValues) {
      try {
        return originalGetRandomValues.call(global.crypto, arr);
      } catch (e) {
        // 如果失败，使用 fallback
        return fallbackGetRandomValues(arr);
      }
    }
    
    // 使用 fallback
    return fallbackGetRandomValues(arr);
  };
}

// 2. 尝试导入 react-native-get-random-values（如果可用）
// 如果原生模块未链接，这会失败，但我们已经有 fallback
try {
  require('react-native-get-random-values');
  // 如果成功导入，它会覆盖我们的 fallback
  // react-native-get-random-values 会自动设置 global.crypto.getRandomValues
} catch (e) {
  // 原生模块未链接，使用 fallback
  // fallback 已经在上面设置好了
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('[Polyfills] react-native-get-random-values not available, using fallback');
  }
}

// 3. 确保 crypto 对象在 global 和 window 上都可用
if (typeof global !== 'undefined' && global.crypto) {
  // 确保 window.crypto 也存在（某些库可能检查 window.crypto）
  if (typeof window !== 'undefined' && !window.crypto) {
    window.crypto = global.crypto;
  }
}

// 4. Polyfill AbortSignal（用于保持兼容性）
if (typeof global !== 'undefined') {
  // 如果 AbortSignal 不存在，创建一个简单的 polyfill
  if (typeof AbortSignal === 'undefined') {
    class AbortSignalPolyfill {
      constructor() {
        this.aborted = false;
        this.reason = undefined;
        this._abortListeners = [];
      }

      addEventListener(event, listener) {
        if (event === 'abort') {
          this._abortListeners.push(listener);
        }
      }

      removeEventListener(event, listener) {
        if (event === 'abort') {
          const index = this._abortListeners.indexOf(listener);
          if (index > -1) {
            this._abortListeners.splice(index, 1);
          }
        }
      }

      throwIfAborted() {
        if (this.aborted) {
          throw this.reason || new Error('Aborted');
        }
      }
    }

    global.AbortSignal = AbortSignalPolyfill;
    
    // 如果 AbortController 也不存在，创建一个简单的 polyfill
    if (typeof AbortController === 'undefined') {
      class AbortControllerPolyfill {
        constructor() {
          this.signal = new AbortSignalPolyfill();
        }

        abort(reason) {
          if (!this.signal.aborted) {
            this.signal.aborted = true;
            this.signal.reason = reason;
            this.signal._abortListeners.forEach(listener => {
              try {
                listener();
              } catch (e) {
                // 忽略错误
              }
            });
          }
        }
      }

      global.AbortController = AbortControllerPolyfill;
    }
  }
}

// Export to ensure this module is executed
export default {};
