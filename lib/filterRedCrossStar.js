function getRedCrossStar(list) {
  return list.filter((item) => {
    let {
      open,
      high,
      low,
      trade
    } = item
    const divH = Math.abs(trade - open)
    const lineUpH = Math.abs(high - trade)
    const lineDownH = Math.abs(open - low)
    return trade > open && (lineUpH / divH) > 2.5 && (lineDownH / divH) > 2.5
  })
}

module.exports = getRedCrossStar