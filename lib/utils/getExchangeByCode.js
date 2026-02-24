/**
 * 根据股票代码判断所属交易所
 * @param {string|number} stockCode - 股票代码
 * @returns {Object} 包含交易所信息的对象
 */
function getExchangeByCode(stockCode) {
  // 确保输入为字符串并去除空格
  const code = String(stockCode).trim();
  
  // 验证股票代码格式
  if (!isValidStockCode(code)) {
    throw new Error('无效的股票代码格式');
  }
  
  const exchangeInfo = identifyExchange(code);
  
  return {
    code: code,
    exchange: exchangeInfo.exchange,
    exchangeName: exchangeInfo.exchangeName,
    market: exchangeInfo.market,
    marketName: exchangeInfo.marketName,
    isValid: true
  };
}

/**
 * 验证股票代码格式是否正确
 * @param {string} code - 股票代码
 * @returns {boolean} 是否有效
 */
function isValidStockCode(code) {
  // 检查是否为6位数字
  if (!/^\d{6}$/.test(code)) {
    return false;
  }
  
  // 检查是否为有效的股票代码范围
  const validPrefixes = [
    '000', '001', '002', '003',  // 深圳主板和中小板
    '300', '301',               // 深圳创业板
    '600', '601', '603', '605', // 上海主板
    '688', '689',               // 上海科创板
    '430',                      // 北京股转系统
    '820', '821', '822', '823', '824', '825', '826', '827', '828', '829', // 北交所
    '830', '831', '832', '833', '834', '835', '836', '837', '838', '839',
    '870', '871', '872', '873', '874', '875', '876', '877', '878', '879'
  ];
  
  return validPrefixes.some(prefix => code.startsWith(prefix));
}

/**
 * 识别股票所属交易所和板块
 * @param {string} code - 股票代码
 * @returns {Object} 交易所信息
 */
function identifyExchange(code) {
  // 上海证券交易所
  if (code.startsWith('6')) {
    if (code.startsWith('688') || code.startsWith('689')) {
      return {
        exchange: 'SH',
        exchangeName: '上海证券交易所',
        market: 'STAR',
        marketName: '科创板'
      };
    } else {
      return {
        exchange: 'SH',
        exchangeName: '上海证券交易所',
        market: 'MAIN',
        marketName: '主板'
      };
    }
  }
  
  // 深圳证券交易所
  if (code.startsWith('0') || code.startsWith('3')) {
    if (code.startsWith('000') || code.startsWith('001')) {
      return {
        exchange: 'SZ',
        exchangeName: '深圳证券交易所',
        market: 'MAIN',
        marketName: '主板'
      };
    } else if (code.startsWith('002') || code.startsWith('003')) {
      return {
        exchange: 'SZ',
        exchangeName: '深圳证券交易所',
        market: 'SME',
        marketName: '中小板'
      };
    } else if (code.startsWith('300') || code.startsWith('301')) {
      return {
        exchange: 'SZ',
        exchangeName: '深圳证券交易所',
        market: 'GEM',
        marketName: '创业板'
      };
    }
  }
  
  // 北京证券交易所
  if (code.startsWith('430') || code.startsWith('8')) {
    return {
      exchange: 'BJ',
      exchangeName: '北京证券交易所',
      market: 'BSE',
      marketName: '北交所'
    };
  }
  
  // 如果没有匹配到任何交易所
  return {
    exchange: 'UNKNOWN',
    exchangeName: '未知交易所',
    market: 'UNKNOWN',
    marketName: '未知板块'
  };
}

/**
 * 批量判断多个股票代码的交易所
 * @param {Array<string|number>} stockCodes - 股票代码数组
 * @returns {Array<Object>} 交易所信息数组
 */
function batchGetExchange(stockCodes) {
  if (!Array.isArray(stockCodes)) {
    throw new Error('参数必须是数组');
  }
  
  return stockCodes.map(code => {
    try {
      return getExchangeByCode(code);
    } catch (error) {
      return {
        code: String(code),
        exchange: 'ERROR',
        exchangeName: '错误',
        market: 'ERROR',
        marketName: '无效代码',
        isValid: false,
        error: error.message
      };
    }
  });
}

/**
 * 获取指定交易所的所有股票代码前缀
 * @param {string} exchange - 交易所代码 ('SH', 'SZ', 'BJ')
 * @returns {Array<string>} 对应的股票代码前缀数组
 */
function getExchangePrefixes(exchange) {
  const prefixes = {
    'SH': ['600', '601', '603', '605', '688', '689'], // 上海
    'SZ': ['000', '001', '002', '003', '300', '301'], // 深圳
    'BJ': ['430', '820', '821', '822', '823', '824', '825', '826', '827', '828', '829',
           '830', '831', '832', '833', '834', '835', '836', '837', '838', '839',
           '870', '871', '872', '873', '874', '875', '876', '877', '878', '879'] // 北京
  };
  
  return prefixes[exchange.toUpperCase()] || [];
}

module.exports = {
  getExchangeByCode,
  batchGetExchange,
  getExchangePrefixes,
  isValidStockCode
};