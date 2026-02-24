const dayjs = require('dayjs');
const isOpen = require('./isOpen')

/**
 * 获取上一个股票开盘日
 * @param {string} dateStr - 输入日期，格式 'YYYYMMDD'
 * @returns {string} - 上一个交易日，格式 'YYYYMMDD'
 */
module.exports = async function getPreviousTradingDay(dateStr) {
  // 解析输入日期，例如 '20260224'
  let currentDate = dayjs(dateStr, 'YYYYMMDD');

  // 边界条件：如果输入无效，可以抛出错误或返回null
  if (!currentDate.isValid()) {
    throw new Error('无效的日期输入');
  }

  // 从输入日期的前一天开始向前查找
  let checkDate = currentDate.subtract(1, 'day');

  // 循环查找，直到找到一个交易日
  // 为了防止无限循环（例如查找范围超出公元纪年），可以设置一个最大查找次数，比如向后查找 30 天
  let maxAttempts = 60;
  while (maxAttempts-- > 0) {
    const trading = await isOpen(checkDate);
    if (trading) {
      return checkDate.format('YYYYMMDD');
    }
    checkDate = checkDate.subtract(1, 'day');
  }

  throw new Error('无法找到上一个交易日（超出查找范围）');
}