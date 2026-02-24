const axios = require('axios');
const dayjs = require('dayjs');

/**
 * 查看指定日期是否开盘
 * @param {String} date 日期，如'20210808'
 * @returns {Promise<Boolean>} true or false
 */
async function isOpen(date = '') {
  // 1. 按 'YYYYMMDD' 格式解析字符串
  const dateObj = dayjs(date, 'YYYYMMDD');
  // 2. 再格式化为 'YYYY-MM-DD' 格式
  const output = dateObj.format('YYYY-MM-DD');
  const res = await axios.get(`http://tool.bitefu.net/jiari/?d=${output}`)
  return Number(res.data) === 0
}

module.exports = isOpen;