const dayjs = require('dayjs')
const { chooseStockV2 } = require('../lib/index')

// console.log('sdk.version====', sdk.version)


const today = dayjs().format('20261019')
// const today = dayjs().format('YYYYMMDD')
chooseStockV2(today).catch(console.error)
