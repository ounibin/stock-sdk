const {
  getNetRealTime
} = require('../lib');






// 使用示例
(async () => {
  const data = await getNetRealTime('002843');
  console.log('实时净流入:', data);
})();