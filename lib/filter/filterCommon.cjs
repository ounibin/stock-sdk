// 排除 科创、北交所、新三板的股
module.exports = (list) => {
  return list.filter((item) => {
    const isKechuang = /^688|689|787|789/.test(item.code)
    const isXinSanBan = /^82|83|87|88|430|420|400/.test(item.code)
    const isJingA = /^9/.test(item.code)
    const bigPrice = item.trade > 10
    //   const smallPrice = item.trade < 50
    return !isKechuang && !isXinSanBan && !isJingA && bigPrice
  })
};