import 'dotenv/config';
import { chromium } from 'playwright';
import { monitorOnce } from './monitor.js';
import { nowIST, readJSON, sleep } from './util.js';
import { notifyError, sendTelegramMessage } from './notifier.js';
import { startStatusBot } from './status-bot.js';


function isCrashError(err) {
    if (!err) return false;
    const msg = String(err.message || err);
    return (
        msg.includes('Page crashed') ||
        msg.includes('Target closed') ||
        msg.includes('browser has been closed') ||
        msg.includes('CRASHED')
    );
}

async function launchBrowser(env) {
    const HEADLESS = String(env.HEADLESS || 'false') === 'true';

    console.log('Launching browser. Headless =', HEADLESS);

    const browser = await chromium.launch({
        headless: HEADLESS,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        viewport: { width: 1300, height: 850 }
    });

    const page = await context.newPage();
    return { browser, context, page };
}


async function main() {
    const HEADLESS = String(process.env.HEADLESS || 'false') === 'true';
    const INTERVAL_MS = Number(process.env.INTERVAL_MS || 10000); // 10s default
    const selectors = readJSON('config/selectors.json');

    const text = `*Watcher Restarted*`;
    await sendTelegramMessage(text, process.env);

    let { browser, context, page } = await launchBrowser(process.env);

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

                if (isCrashError(err)) {
                    console.error('Silverwatcher: CRASH DETECTED — restarting browser...');

                    try {
                        await context.close().catch(() => { });
                        await browser.close().catch(() => { });
                    } catch { }

                    const fresh = await launchBrowser(process.env);
                    browser = fresh.browser;
                    context = fresh.context;
                    page = fresh.page;
                    console.log('Silverwatcher: Browser recreated successfully');
                }
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