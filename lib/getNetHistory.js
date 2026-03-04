const axios = require('axios');
const getExchangeByCode = require('./utils/getExchangeByCode');


module.exports = async function (code, dateStr) {
  try {
    const exchange = getExchangeByCode(code);
    const symbol = `${exchange}${code}`;

    // 使用新浪财经的另一个接口，获取更详细的资金流向数据
    const url = `http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/MoneyFlow.ssl_qsfx_lscjfb?page=1&num=100&sort=opendate&asc=0&daima=${symbol}`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;
    if (data && data.length > 0) {
      const fundData = data.find(item => item.opendate === dateStr);
      if (!fundData) {
        throw new Error(`未找到股票(${code})在${dateStr}的资金流向数据`);
      }

      // 计算各资金流向
      const extraLargeNet = Math.round((+fundData.r0_net || 0) / 10000); // 超大单净流入(万元)
      const largeNet = Math.round((+fundData.r1_net || 0) / 10000); // 大单净流入(万元)
      const mediumNet = Math.round((+fundData.r2_net || 0) / 10000); // 中单净流入(万元)
      const smallNet = Math.round((+fundData.r3_net || 0) / 10000); // 小单净流入(万元)


      const netInflow = extraLargeNet + largeNet + mediumNet + smallNet; // 主力净流入(万元)

      const result = {
        code: code,
        netInflow: netInflow, // 主力净流入(万元)
        extraLargeNetInflow: extraLargeNet, // 超大单净流入(万元)
        largeNetInflow: largeNet, // 大单净流入(万元)
        mediumNetInflow: mediumNet, // 中单净流入(万元)
        smallNetInflow: smallNet, // 小单净流入(万元)
      };
      return result;
    }
  } catch (error) {
    console.error('getNetHistory fail:', error.message);
    return null;
  }
}