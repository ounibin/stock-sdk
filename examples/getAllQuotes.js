/**
 * getAllQuotes 函数 Demo - 实际使用示例
 */

const getAllQuotes = require('../lib/getAllQuotes');

/**
 * Demo 1: 获取单个交易日期的所有股票行情
 */
async function demo1() {
  console.log('=== Demo 1: 获取单个交易日期的所有股票行情 ===');
  try {
    const quotes = await getAllQuotes('20260224');

    if (quotes) {
      console.log(`成功获取 ${quotes.length} 只股票的行情数据\n`);

      // 显示前5只股票的信息
      console.log('前5只股票信息:');
      quotes.slice(0, 5).forEach((quote, index) => {
        console.log(`${index + 1}. 代码: ${quote.code}, 收盘价: ${quote.close}, 成交量: ${quote.volume}, 成交额: ${quote.amount}万元`);
      });
    } else {
      console.log('获取数据失败，请检查日期是否正确');
    }
  } catch (error) {
    console.error('错误:', error.message);
  }
}

/**
 * Demo 2: 查找特定股票的行情
 */
async function demo2() {
  console.log('\n=== Demo 2: 查找特定股票的行情 ===');
  try {
    const quotes = await getAllQuotes('20260224');

    if (quotes) {
      // 查找比亚迪（001696）
      const byd = quotes.find(q => q.code === '001696');

      if (byd) {
        console.log('比亚迪（001696）的行情:');
        console.log(`  开盘价: ${byd.open}`);
        console.log(`  最高价: ${byd.high}`);
        console.log(`  最低价: ${byd.low}`);
        console.log(`  收盘价: ${byd.close}`);
        console.log(`  成交量: ${byd.volume} 手`);
        console.log(`  成交额: ${byd.amount} 万元`);
      } else {
        console.log('未找到比亚迪的行情数据');
      }
    }
  } catch (error) {
    console.error('错误:', error.message);
  }
}

/**
 * Demo 3: 统计市场数据
 */
async function demo3() {
  console.log('\n=== Demo 3: 统计市场数据 ===');
  try {
    const quotes = await getAllQuotes('20260224');

    if (quotes) {
      // 统计上升和下降的股票
      const rises = quotes.filter(q => q.close > q.open);
      const falls = quotes.filter(q => q.close < q.open);
      const flat = quotes.filter(q => q.close === q.open);

      console.log(`总股票数: ${quotes.length}`);
      console.log(`上升: ${rises.length} 只 (${(rises.length / quotes.length * 100).toFixed(2)}%)`);
      console.log(`下降: ${falls.length} 只 (${(falls.length / quotes.length * 100).toFixed(2)}%)`);
      console.log(`平盘: ${flat.length} 只 (${(flat.length / quotes.length * 100).toFixed(2)}%)`);
    }
  } catch (error) {
    console.error('错误:', error.message);
  }
}

/**
 * Demo 4: 找出成交额最大的前10只股票
 */
async function demo4() {
  console.log('\n=== Demo 4: 找出成交额最大的前10只股票 ===');
  try {
    const quotes = await getAllQuotes('20260224');

    if (quotes) {
      const top10 = quotes
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      console.log('成交额最大的前10只股票:');
      top10.forEach((quote, index) => {
        console.log(`${index + 1}. ${quote.code} - 成交额: ${quote.amount} 万元, 收盘价: ${quote.close}`);
      });
    }
  } catch (error) {
    console.error('错误:', error.message);
  }
}

/**
 * Demo 5: 计算市场平均涨跌幅
 */
async function demo5() {
  console.log('\n=== Demo 5: 计算市场平均涨跌幅 ===');
  try {
    const quotes = await getAllQuotes('20260224');

    if (quotes && quotes.length > 0) {
      // 计算涨幅（这里用close和open的差值，实际应该用前一日close）
      const avgChange = quotes.reduce((sum, q) => {
        return sum + ((q.close - q.open) / q.open * 100);
      }, 0) / quotes.length;

      console.log(`市场平均涨幅: ${avgChange.toFixed(2)}%`);

      // 找出涨幅最大和最小的股票
      const maxRise = quotes.reduce((max, q) => {
        const change = (q.close - q.open) / q.open * 100;
        return change > ((max.close - max.open) / max.open * 100) ? q : max;
      });

      const maxFall = quotes.reduce((min, q) => {
        const change = (q.close - q.open) / q.open * 100;
        return change < ((min.close - min.open) / min.open * 100) ? q : min;
      });

      console.log(`涨幅最大: ${maxRise.code} (${((maxRise.close - maxRise.open) / maxRise.open * 100).toFixed(2)}%)`);
      console.log(`跌幅最大: ${maxFall.code} (${((maxFall.close - maxFall.open) / maxFall.open * 100).toFixed(2)}%)`);
    }
  } catch (error) {
    console.error('错误:', error.message);
  }
}

/**
 * 运行所有示例
 */
async function runAllDemos() {
  await demo1();
  await demo2();
  await demo3();
  await demo4();
  await demo5();
}

// 执行所有演示
// runAllDemos().catch(console.error);

// 或者根据需要单独运行某个 demo:
demo1();
// demo2();
// demo3();
// demo4();
// demo5();