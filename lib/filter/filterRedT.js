module.exports = (list) => {
  return list.filter((item) => {
    let {
      open,
      high,
      low,
      trade
    } = item
    const divH = Math.abs(trade - open)
    // const lineUpH = Math.abs(high - trade)
    const lineDownH = Math.abs(open - low)
    return trade === high && (lineDownH / divH) > 2
  })
};