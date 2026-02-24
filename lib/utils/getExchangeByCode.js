/**
 * 根据股票代码判断所属交易所，返回 'sh' 或 'sz'
 * 规则（简化版）：以 '6' 或 '9' 开头的视为上海（'sh'），其他视为深圳（'sz'）。
 * 支持传入数字或字符串，会忽略非数字字符并去除空白。
 *
 * @param {string|number} code 股票代码，例如 '002001' 或 600519
 * @returns {'sh'|'sz'|''} 交易所代码，无法识别时返回空字符串
 */
function getExchangeByCode(code) {
  if (code === null || code === undefined) return '';
  const raw = String(code).trim();
  if (!raw) return '';
  // 只保留数字部分，以防传入 'SZ000001' 或类似格式
  const digits = raw.replace(/\D+/g, '');
  if (!digits) return '';
  const first = digits[0];
  // 以 '6' 或 '9' 开头的通常归属上海，否则归属深圳
  if (first === '6' || first === '9') return 'sh';
  return 'sz';
}

module.exports = getExchangeByCode;