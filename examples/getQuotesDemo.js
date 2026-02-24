/**
 * getQuotes Demo - 使用示例
 *
 * 说明：本示例演示如何调用 `getQuotes(code, maxDays)` 来获取指定股票的日线数据。
 */

const getQuotes = require('../lib/getQuotes');

async function demoSimple() {
  console.log('=== Demo: 获取单只股票最近 30 天日线数据 ===');
  try {
    // 示例：平安银行（000001.SZ）或根据需要替换为其他代码，如 600519（贵州茅台）
    const code = '000001';
    const days = 30;

    const quotes = await getQuotes(code, days);

    if (!quotes || quotes.length === 0) {
      console.log('未获取到数据，可能是代码不正确或网络问题。');
      return;
    }

    console.log(`共返回 ${quotes.length} 条记录，按时间正序（历史->最近）：`);

    // 打印最近 5 个交易日的关键字段
    console.log('\n最近 5 个交易日：');
    quotes.forEach(q => {
      console.log(`${q.date}  开: ${q.open}  高: ${q.high}  低: ${q.low}  收: ${q.close}  成交量: ${q.volume}`);
    });

    // 计算并打印最近 5 日的平均收盘价
    const last5 = quotes.slice(-5);
    const avgClose = (last5.reduce((s, r) => s + r.close, 0) / last5.length).toFixed(2);
    console.log(`\n最近 5 日平均收盘价: ${avgClose}`);

  } catch (err) {
    console.error('示例运行出错:', err.message || err);
  }
}

async function demoMultipleCodes() {
  console.log('\n=== Demo: 批量获取多个股票的最近 10 天数据（并比较收盘价） ===');
  try {
    const codes = ['000001', '600519']; // 可按需调整
    const days = 10;

    const results = await Promise.all(codes.map(code => getQuotes(code, days).then(data => ({
      code,
      data
    })).catch(err => ({
      code,
      err
    }))));

    results.forEach(r => {
      if (r.err) {
        console.log(`${r.code} 获取失败: ${r.err.message || r.err}`);
        return;
      }
      const latest = r.data[r.data.length - 1];
      console.log(`${r.code} 最近交易日 ${latest.dateFormat} 收盘: ${latest.close}`);
    });

  } catch (err) {
    console.error('批量示例出错:', err.message || err);
  }
}

// 运行示例（将 demoSimple 或 demoMultipleCodes 注释/取消注释以选择要运行的示例）
demoSimple();
// demoMultipleCodes();

// 如果需要将结果保存为 CSV，可以在此扩展：将 quotes 映射为 CSV 字符串并写入文件