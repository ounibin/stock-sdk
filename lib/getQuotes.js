const axios = require('axios')
const https = require('https')
const {
  EastmoneyClient
} = require('eastmoney-data-sdk')
const getExchangeByCode = require('./utils/getExchangeByCode');

/**
 * 新浪财经股票历史数据API调用
 * @param {string} symbol - 股票代码(如: sz000001)
 * @param {number} scale - 时间周期(5/15/30/60分钟, 240日线)
 * @param {number} ma - 均线周期(5/10/15/20/30)
 * @param {number} datalen - 数据长度(最大约1023)
 */
function getStockHistoryFromSina(code, datalen = 100, scale = 240, ma = 5) {
  const symbol_sina = getExchangeByCode(code) + String(code)
  const baseUrl = 'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData';
  const url = `${baseUrl}?symbol=${symbol_sina}&scale=${scale}&ma=${ma}&datalen=${datalen}`;
  // const demoUrl = 'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=sz002594&scale=240&ma=5&datalen=20'

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // console.log('状态码:', res.statusCode);
      // console.log('响应头:', res.headers);

      let data = '';
      res.on('data', (chunk) => {
        // console.log(`====`, chunk)
        data += chunk;
      });
      res.on('end', () => {
        // console.log('响应体:', data);
        const jsonData = JSON.parse(data)
        const data_reverse = jsonData.reverse()
        const data_format = data_reverse.map(item => ({
          date: item.day,
          open: Number(item.open),
          trade: Number(item.close),
          close: Number(item.close),
          high: Number(item.high),
          low: Number(item.low),
          volume: Number(item.volume) / 100
        }))
        resolve(data_format)

      });
    }).on('error', (e) => {
      console.error('请求出错:', e.message);
      reject(e)
    });
  })

  // try {

  //   const agent = new https.Agent({
  //     rejectUnauthorized: false // 关闭SSL证书验证（仅用于测试）
  //   });

  //   const response = await axios.get(url, {
  //     headers: {
  //       'Referer': 'https://finance.sina.com.cn',
  //       'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
  //     },
  //     httpsAgent: agent
  //   });

  //   const data = response.data
  //   if (!Array.isArray(data)) {
  //     throw new Error('获取数据错误')
  //   }

  //   const data_reverse = data.reverse()
  //   // const item = {
  //   //   "day": "2026-03-04",
  //   //   "open": "95.200",
  //   //   "high": "96.800",
  //   //   "low": "93.700",
  //   //   "close": "95.990",
  //   //   "volume": "70096892",
  //   //   "ma_price5": 93.432,
  //   //   "ma_volume5": 70244140
  //   // }
  //   return data_reverse.map(item => ({
  //     date: item.day,
  //     open: Number(item.open),
  //     close: Number(item.close),
  //     high: Number(item.high),
  //     low: Number(item.low),
  //     volume: Number(item.volume) / 100
  //   }))
  // } catch (error) {
  //   console.error('getStockHistoryFromSina获取数据失败:', error.message);
  //   return [];
  // }
}

// 东方财富获取股票历史数据API调用
async function getStockHistoryFromEastmoney(code, maxDays = 20) {
  const client = new EastmoneyClient();
  const stock = client.stock(code); // 自动识别市场

  const daily = await stock.daily(maxDays);
  const formatData = daily.map(item => {
    // const demoItem = {
    //   date: "20250925",
    //   open: 44.87,
    //   close: 43.93,
    //   high: 45.28,
    //   low: 42.7,
    //   volume: 2129901,
    //   amount: 9375430765.59,
    //   amplitude: 5.81,
    //   pct: -1.13,
    //   change: -0.5,
    //   turnover: 5.78,
    //   dateFormat: "2025-09-25",
    // }
    return {
      date: item.date,
      open: item.open,
      close: item.close,
      high: item.high,
      low: item.low,
      volume: Number(item.volume) / 100
    }
  })
  const res = formatData.reverse()
  return res
}


/**
 * 获取股票行情数据（优先使用新浪API，失败后使用东方财富API）
 * @async
 * @function getQuotes
 * @param {string} code - 股票代码（支持多种格式，如：000001、000001.SZ、600000.SH）
 * @param {number} [maxDays=20] - 获取的最大天数，默认20天
 * @returns {Promise<Array<Object>>} 返回股票日线数据数组，按时间正序排列
 * @returns {string} return[].date - 日期，格式为YYYYMMDD或YYYY-MM-DD
 * @returns {number} return[].open - 开盘价
 * @returns {number} return[].close - 收盘价
 * @returns {number} return[].high - 最高价
 * @returns {number} return[].low - 最低价
 * @returns {number} return[].volume - 成交量（单位：股）
 * @example
 * const quotes = await getQuotes('000001', 100);
 * console.log(quotes[0]);
 */
module.exports = async function (code, maxDays = 20) {
  try {

    // 先尝试使用新浪API
    // console.log(`尝试从新浪API获取数据: ${code}`);
    const sinaData = await getStockHistoryFromSina(code, maxDays);

    // 如果新浪API返回有效数据，则使用新浪数据
    if (sinaData && sinaData.length > 0) {
      // console.log(`新浪API获取成功，返回${sinaData.length}条数据`);
      return sinaData;
    }

    // 新浪API失败，使用东方财富API
    console.log(`新浪API获取失败，尝试从东方财富API获取数据: ${code}`);
    const eastmoneyData = await getStockHistoryFromEastmoney(code, maxDays);

    if (eastmoneyData && eastmoneyData.length > 0) {
      console.log(`东方财富API获取成功，返回${eastmoneyData.length}条数据`);
      return eastmoneyData;
    }

    // 两个API都失败
    console.error('所有API获取数据失败');
    return [];
  } catch (error) {
    console.error('getQuotes获取股票数据失败:', error.message);
    return []
  }
}