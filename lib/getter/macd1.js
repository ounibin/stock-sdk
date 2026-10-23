const https = require('https');
const retryRequest = require('../utils/retryRequest.cjs');

const REQUEST_TIMEOUT_MS = 10000;

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { Referer: 'https://quote.eastmoney.com/' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('error', reject);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(`Eastmoney returned HTTP ${res.statusCode}`);
          error.statusCode = res.statusCode;
          reject(error);
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`Eastmoney request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
    request.on('error', reject);
  });
}

/** 获取指定日期的日线 MACD（DIF、DEA、MACD）。 */
async function macd1(code, dateStr) {
  const symbol = String(code).replace(/\D/g, '').padStart(6, '0');
  if (!/^\d{6}$/.test(symbol) || !/^\d{8}$/.test(String(dateStr))) {
    throw new TypeError('code 应为股票代码，dateStr 应为 YYYYMMDD');
  }

  const market = /^[569]/.test(symbol) ? 1 : 0;
  const params = new URLSearchParams({
    secid: `${market}.${symbol}`,
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
    klt: '101', fqt: '1', beg: '19900101', end: String(dateStr),
  });
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?${params}`;
  const result = await retryRequest(() => getJson(url));
  const rows = result && result.data && result.data.klines;
  if (!rows || !rows.length) return null;

  const closes = rows.map((row) => Number(row.split(',')[2]));
  const alpha12 = 2 / 13;
  const alpha26 = 2 / 27;
  const alpha9 = 2 / 10;
  let ema12 = closes[0];
  let ema26 = closes[0];
  let dea = 0;
  let target = null;

  rows.forEach((row, index) => {
    if (index > 0) {
      ema12 = closes[index] * alpha12 + ema12 * (1 - alpha12);
      ema26 = closes[index] * alpha26 + ema26 * (1 - alpha26);
    }
    const dif = ema12 - ema26;
    dea = dif * alpha9 + dea * (1 - alpha9);
    const date = row.slice(0, 10).replace(/-/g, '');
    if (date === String(dateStr)) {
      target = { code: symbol, date, dif, dea, macd: 2 * (dif - dea) };
    }
  });

  return target;
}

module.exports = macd1;
