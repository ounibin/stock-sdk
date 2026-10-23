const https = require('https');

function getJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                Referer: 'https://quote.eastmoney.com/',
                'User-Agent': 'Mozilla/5.0'
            }
        }, (response) => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => { body += chunk; });
            response.on('end', () => {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(`获取股票数据失败：HTTP ${response.statusCode}`));
                    return;
                }
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

/**
 * 获取指定日期的日线 MACD（DIF、DEA、MACD）。
 * @param {string|number} code 股票代码，如 000001
 * @param {string|number} dateStr 日期，格式 YYYYMMDD，如 20260721
 * @returns {Promise<{code: string, date: string, dif: number, dea: number, macd: number}|null>}
 */
async function macd(code, dateStr) {
    const stockCode = String(code).padStart(6, '0');
    const date = String(dateStr);
    if (!/^\d{6}$/.test(stockCode) || !/^\d{8}$/.test(date)) {
        throw new TypeError('code 应为股票代码，dateStr 应为 YYYYMMDD 格式');
    }

    const market = /^[569]/.test(stockCode) ? '1' : '0';
    const params = new URLSearchParams({
        fields1: 'f1,f2,f3,f4,f5,f6',
        fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
        secid: `${market}.${stockCode}`,
        klt: '101',
        fqt: '1',
        beg: '19900101',
        end: date,
        lmt: '10000'
    });
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?${params}`;
    const response = await getJson(url);
    const klines = response && response.data && response.data.klines;
    if (!Array.isArray(klines)) return null;

    const closes = klines.map((line) => {
        const fields = line.split(',');
        return { date: fields[0], close: Number(fields[2]) };
    }).filter((item) => Number.isFinite(item.close));

    const multiplier12 = 2 / 13;
    const multiplier26 = 2 / 27;
    const multiplier9 = 2 / 10;
    let ema12;
    let ema26;
    let dea;
    let result = null;

    for (const item of closes) {
        ema12 = ema12 === undefined ? item.close : (item.close - ema12) * multiplier12 + ema12;
        ema26 = ema26 === undefined ? item.close : (item.close - ema26) * multiplier26 + ema26;
        const dif = ema12 - ema26;
        dea = dea === undefined ? dif : (dif - dea) * multiplier9 + dea;
        if (item.date === `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`) {
            result = {
                code: stockCode,
                date,
                dif: Number(dif.toFixed(4)),
                dea: Number(dea.toFixed(4)),
                macd: Number(((dif - dea) * 2).toFixed(4))
            };
        }
    }

    return result;
}

module.exports = macd;
