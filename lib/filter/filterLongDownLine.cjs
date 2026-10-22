module.exports = (list) => {
  return list.filter((item) => {
    let {
      open,
      high,
      low,
      trade
    } = item
    const divH = Math.abs(trade - open)
    const lineDownH = trade > open ? Math.abs(low - open) : Math.abs(low - trade)
    const range = trade > open ? Math.abs(low - open) / open : Math.abs(low - trade) / open
    return (lineDownH / divH) > 2 && range > 0.01
  })
};