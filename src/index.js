import 'dotenv/config';
import { chromium } from 'playwright';
import { monitorOnce } from './monitor.js';
import { nowIST, readJSON, sleep } from './util.js';
import { notifyError, sendTelegramMessage } from './notifier.js';
import { startStatusBot } from './status-bot.js';

async function main() {
    const HEADLESS = String(process.env.HEADLESS || 'false') === 'true';
    const INTERVAL_MS = Number(process.env.INTERVAL_MS || 10000); // 10s default
    const selectors = readJSON('config/selectors.json');

    console.log('Launching browser. Headless =', HEADLESS);
    const text = `*Watcher Started*`;
    await sendTelegramMessage(text, process.env);

    const browser = await chromium.launch({
        headless: HEADLESS,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        viewport: { width: 1300, height: 850 }
    });

    const page = await context.newPage();

    // fire-and-forget status bot
    startStatusBot(process.env).catch(err => {
        console.error('Status bot crashed:', err);
    });

    try {
        while (true) {
            console.log('-----------------------------');
            console.log('Silverwatcher: New iteration at', nowIST());

            try {
                await monitorOnce({ page, env: process.env, selectors });
            } catch (err) {
                await notifyError(err, process.env, 'monitorOnce');
                console.error('Silverwatcher: monitorOnce error:', err);
            }

            console.log(`Silverwatcher: sleeping for ${INTERVAL_MS} ms`);
            await sleep(INTERVAL_MS);
        }
    } finally {
        console.log('Closing browser (process ending)');
        await browser.close();
        const text = `*Watcher Stopped:*`;
        await sendTelegramMessage(text, process.env);
    }
}

main().catch(async err => {
    await notifyError(err, process.env, 'main() top-level');
    process.exit(1);
});