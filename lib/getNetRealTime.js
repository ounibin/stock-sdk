const axios = require('axios');
const getExchangeByCode = require('./utils/getExchangeByCode');
/**
 * 获取股票实时资金流向（超大单、大单、中单、小单净流入）
 * @param {string} code 股票代码，如 '600519'（茅台）
 * @returns {Promise<Object|null>} 返回资金流向数据对象，失败返回null
 */

// 主数据源：东方财富
async function getRealTimeNetFromEastMoney(code) {
  // 转换市场代码：sh = 沪市, sz = 深市
  const market = getExchangeByCode(code) === 'sh' ? '1' : '0';
  const secid = `${market}.${code}`;

  const url = `https://push2.eastmoney.com/api/qt/stock/fflow/kline/get?secid=${secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65&klt=101&fqt=1`;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;
    if (data.data && data.data.klines) {
      // 最新一条数据（当前交易日）
      const latest = data.data.klines[0].split(',');
      const result = {
        code: code,
        name: data.data.name,
        netInflow: Math.round((+latest[1]) / 10000), // 主力净流入(万元)
        extraLargeNetInflow: Math.round((+latest[5]) / 10000), // 超大单净流入(万元)
        largeNetInflow: Math.round((+latest[4]) / 10000), // 大单净流入(万元)
        mediumNetInflow: Math.round((+latest[3]) / 10000), // 中单净流入(万元)
        smallNetInflow: Math.round((+latest[2]) / 10000), // 小单净流入(万元)
      };
      return result;
    } else {
      throw new Error(`未获取到股票(${code})资金情况数据`);
    }
  } catch (error) {
    console.error('东方财富接口获取股票实时资金流向失败:', error.message);
    return null;
  }
}

module.exports = async function (code) {
  try {
    // 首先尝试使用东方财富接口
    const eastMoneyData = await getRealTimeNetFromEastMoney(code);
    if (eastMoneyData) {
      return eastMoneyData;
    }

    // 所有接口都失败
    throw new Error(`所有接口都无法获取股票(${code})资金流向`);
  } catch (error) {
    console.error('获取股票实时资金流向失败:', error.message);
    return null;
  }
}