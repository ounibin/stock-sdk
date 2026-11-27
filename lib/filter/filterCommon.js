// 排除 科创、北交所、新三板的股
module.exports = (list) => {
  console.log('原始数据长度====', list.length)
  const res = list.filter((item) => {
    const isKechuang = /^688|689|787|789/.test(item.code)
    const isXinSanBan = /^82|83|87|88|430|420|400/.test(item.code)
    const isJingA = /^9/.test(item.code)
    const bigPrice = item.trade > 5
    //   const smallPrice = item.trade < 50
    return !isKechuang && !isXinSanBan && !isJingA && bigPrice
  })
  console.log('排除后的数据长度====', res.length)
  return res
}
