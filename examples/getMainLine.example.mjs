import getMainLine from '../lib/getter/getMainLine.js'

// 用法：node examples/getMainLine.example.mjs [YYYYMMDD] [副线数量]
const date = process.argv[2]
const topNArg = process.argv[3]
const topN = topNArg ? Number(topNArg) : 3

async function main() {
  try {
    const result = date
      ? await getMainLine(date, { topN })
      : await getMainLine(undefined, { topN })

    console.log('\n主线板块：')
    console.log(result.mainLine)
    console.log('\n副线板块：')
    console.log(result.subLines)
    console.log('\n完整板块排行：')
    console.log(result.boards)
  } catch (error) {
    console.error('获取主线板块失败：', error.message)
  }
}

main()