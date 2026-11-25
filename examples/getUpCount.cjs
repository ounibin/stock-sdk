const dayjs = require('dayjs')
const { chooseStockV1 } = require('../lib/index')
const getUpCount = require('../lib/getter/getUpCount');


// console.log('sdk.version====', sdk.version)


// const today = dayjs().format('20261019')
const today = dayjs().format('YYYYMMDD')
getUpCount(today).then(console.log).catch(console.error)
