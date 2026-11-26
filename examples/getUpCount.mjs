import dayjs from 'dayjs'
import getUpCount from '../lib/getter/getUpCount.js'


// console.log('sdk.version====', sdk.version)


// const today = dayjs().format('20261019')
const today = dayjs().format('YYYYMMDD')
getUpCount(today).then(console.log).catch(console.error)
