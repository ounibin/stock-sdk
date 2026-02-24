const {
  getSectorRank,
  getRealTimeNet

} = require('../lib');



// 使用示例
(async () => {
  const data = await getSectorRank();
  console.log('板块排行:', data);
})();