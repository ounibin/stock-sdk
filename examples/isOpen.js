/**
 * isOpen 函数 Demo - 实际使用示例
 */

const isOpen = require('../lib/isOpen');

/**
 * Demo 1: 简单检查单个日期
 */
async function demo1() {
  console.log('=== Demo 1: 检查单个日期是否开盘 ===');
  try {
    const result = await isOpen('20240223');
    console.log('2024-02-23 是否开盘:', result ? '是' : '否');
  } catch (error) {
    console.error('错误:', error.message);
  }
}

/**
 * Demo 2: 检查多个日期
 */
async function demo2() {
  console.log('\n=== Demo 2: 检查多个日期 ===');
  const dates = [
    '20240219', // 周一
    '20240220', // 周二
    '20240224', // 周六
    '20240225', // 周日
  ];

  for (const date of dates) {
    try {
      const result = await isOpen(date);
      console.log(`${date}: ${result ? '开盘' : '休息'}`);
    } catch (error) {
      console.error(`${date}: 查询失败 -`, error.message);
    }
  }
}

/**
 * Demo 3: 判断今年是否还有开盘日期
 */
async function demo3() {
  console.log('\n=== Demo 3: 查询特定月份 ===');
  try {
    // 检查 2024 年 3 月的第一个交易日
    const result = await isOpen('20240301');
    console.log('2024-03-01 是否开盘:', result ? '是' : '否');
  } catch (error) {
    console.error('错误:', error.message);
  }
}

/**
 * Demo 4: 实时更新 - 定期检查开盘状态
 */
async function demo4() {
  console.log('\n=== Demo 4: 模拟定期检查 ===');
  const checkDates = ['20240223', '20240226'];

  for (const date of checkDates) {
    try {
      const result = await isOpen(date);
      console.log(`[${new Date().toLocaleTimeString()}] ${date}: ${result ? '✓ 开盘' : '✗ 休息'}`);
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString()}] ${date}: 查询失败`);
    }
  }
}

/**
 * Demo 5: 错误处理示例
 */
async function demo5() {
  console.log('\n=== Demo 5: 错误处理 ===');

  // 这里展示即使没有有效的日期也会尝试调用
  try {
    const result = await isOpen(''); // 空字符串
    console.log('空日期的结果:', result);
  } catch (error) {
    console.error('空日期错误:', error.message);
  }
}

// 运行所有 demos
async function runAllDemos() {
  await demo1();
  await demo2();
  await demo3();
  await demo4();
  await demo5();
}

// 导出 demos 以供注册到脚本中运行
module.exports = {
  demo1,
  demo2,
  demo3,
  demo4,
  demo5,
  runAllDemos
};

// 如果直接运行此文件
if (require.main === module) {
  runAllDemos().catch(console.error);
}