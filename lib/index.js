const fs = require('fs');
const path = require('path');

/**
 * 自动扫描指定子目录下的所有 JS/CJS 模块，并汇总导出
 * 约定：将功能模块按目录分类存放，新增文件无需手动维护导出列表
 *
 * 支持两种导出风格：
 *   1. module.exports = fn          → 以文件名（去后缀）作为 key
 *   2. module.exports = { a, b }    → 将对象属性合并到导出中
 *
 * @param {string} directory - 相对于当前文件的子目录名，如 'filter'、'strategy'
 * @returns {Object} 该目录下所有模块导出的扁平化合集；目录不存在时返回 {}
 */
function importMethods(directory) {
  // 拼接目标目录的绝对路径（相对于当前 index.js 所在目录）
  const directoryPath = path.join(__dirname, directory);

  // 防御性检查：目录不存在则直接返回空对象，避免程序崩溃
  if (!fs.existsSync(directoryPath)) return {};

  // 同步读取目录 → 过滤 .js/.cjs 文件 → 汇总所有模块导出
  return fs.readdirSync(directoryPath)
    // 正则匹配：只保留 .js 或 .cjs 文件，排除 .json、.gitkeep 等其他文件
    .filter(file => /\.(?:c?js)$/.test(file))
    .reduce((methods, file) => {
      // 加载当前文件的导出内容
      const exported = require(path.join(directoryPath, file));

      if (typeof exported === 'function') {
        // 导出的是函数 → 用文件名（去掉扩展名）作为方法名
        // 例如 filterGreenT.cjs → { filterGreenT: [Function] }
        methods[path.basename(file, path.extname(file))] = exported;
      } else if (exported && typeof exported === 'object') {
        // 导出的是对象 → 将对象的所有属性合并进来
        Object.assign(methods, exported);
      }
      // 既不是函数也不是对象 → 静默跳过
      return methods;
    }, {});
}

// Export functions
module.exports = {
  version: '1.0.0',
  ...importMethods('filter'),
  ...importMethods('getter'),
  ...importMethods('strategy'),
  ...importMethods('utils')
};