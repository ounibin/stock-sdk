const macd = require('../lib/macd')

async function main() {
  try {
    // 示例：计算 000001 在 20240224 的 macd
    const {
      macds,
      diffs,
      deas
    } = await macd('000001', '20240224')
    console.log('数据点数量:', diffs.length)
    console.log('最新 DIF:', diffs[diffs.length - 1])
    console.log('最新 DEA:', deas[deas.length - 1])
    console.log('最新 MACD:', macds[macds.length - 1])

    // 如果需要查看全部数组，可以取消下面注释
    console.log('diffs:', diffs)
    console.log('deas:', deas)
    console.log('macds:', macds)
  } catch (err) {
    console.error('demo 运行出错:', err)
  }
}

main()