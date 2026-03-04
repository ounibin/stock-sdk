const {
  getNetHistory
} = require('../lib');

/**
 * 调用 getNetHistory 函数获取股票历史资金流向的示例
 */
async function runDemo() {
  try {
    // 股票代码：贵州茅台
    const stockCode = '600519';
    // 日期：2026年3月3日
    const dateStr = '2026-03-03';

    console.log(`开始获取股票 ${stockCode} 在 ${dateStr} 的资金流向历史数据...`);
    const startTime = Date.now();

    // 调用函数获取历史资金流向数据
    const fundData = await getNetHistory(stockCode, dateStr);

    const endTime = Date.now();
    console.log(`获取完成，耗时 ${endTime - startTime}ms`);

    if (fundData) {
      console.log('\n资金流向历史数据：');
      console.log(`股票代码：${fundData.code}`);
      console.log(`主力净流入：${fundData.netInflow} 万元`);
      console.log(`超大单净流入：${fundData.extraLargeNetInflow} 万元`);
      console.log(`大单净流入：${fundData.largeNetInflow} 万元`);
      console.log(`中单净流入：${fundData.mediumNetInflow} 万元`);
      console.log(`小单净流入：${fundData.smallNetInflow} 万元`);
    } else {
      console.log('未获取到资金流向历史数据');
    }
  } catch (error) {
    console.error('获取历史资金流向失败:', error);
  }
}

// 运行示例
runDemo();