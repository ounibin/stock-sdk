const {
  getAllQuotesRealTime
} = require('../lib');

/**
 * 调用 getAllQuotesRealTime 函数获取 A 股市场实时行情的示例
 */
async function runDemo() {
  try {
    console.log('开始获取 A 股市场实时行情...');
    const startTime = Date.now();

    // 调用函数获取实时行情
    const quotes = await getAllQuotesRealTime();

    const endTime = Date.now();
    console.log(`获取完成，耗时 ${endTime - startTime}ms`);
    console.log(`共获取到 ${quotes.length} 条股票实时行情数据`);

    // 打印前 5 条数据作为示例
    if (quotes.length > 0) {
      console.log('\n前 5 条实时行情数据：');
      quotes.slice(0, 5).forEach((quote, index) => {
        console.log(`${index + 1}. ${quote.code} ${quote.name}: ${quote.trade}元 (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent}%)`);
        console.log(`   开盘: ${quote.open}元, 最高: ${quote.high}元, 最低: ${quote.low}元`);
        console.log(`   成交量: ${(quote.volume / 10000).toFixed(2)}万手, 成交额: ${(quote.amount / 10000).toFixed(2)}万元`);
        console.log(`   时间: ${quote.ticktime}`);
        console.log('---');
      });
    }
  } catch (error) {
    console.error('获取实时行情失败:', error);
  }
}

// 运行示例
runDemo();