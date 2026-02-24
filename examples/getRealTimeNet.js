const {
  getSectorRank,
  getRealTimeNet

} = require('../lib');






// 使用示例
(async () => {
  const data = await getRealTimeNet('002050');
  console.log('实时净流入:', data);
})();