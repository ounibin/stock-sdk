import getCycle from '../lib/getter/getCycle.js';

async function main() {
	try {
		const cycle = await getCycle();
		console.log(cycle);
	} catch (error) {
		console.error('获取周期信息失败：', error);
	}
}

main();
