import { sleep } from './util.js';

function ensureString(name, v) {
    if (typeof v !== 'string' || !v.trim()) {
        throw new Error(`selector "${name}" is missing or not a non-empty string`);
    }
}

export async function openDiam11Frame(page, selectors) {
    if (!page) {
        throw new Error('page not provided');
    }

    const s = selectors?.game;
    if (!s) {
        throw new Error('selectors.game is missing');
    }

    ensureString('game.ourUrl', s.ourUrl);
    ensureString('game.ourContainer', s.ourContainer);
    ensureString('game.diam11Card', s.diam11Card);
    ensureString('game.diam11PlayIcon', s.diam11PlayIcon);
    ensureString('game.matchListContainer', s.matchListContainer);

    await page.goto(s.ourUrl, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const ourRoot = page.locator(s.ourContainer).first();
    await ourRoot.waitFor({ state: 'visible', timeout: 15000 });

    const diamCard = page.locator(s.diam11Card).first();
    await diamCard.waitFor({ state: 'visible', timeout: 10000 });
    await diamCard.hover({ timeout: 5000 }).catch(() => {});

    const playIcon = page.locator(s.diam11PlayIcon).first();
    await playIcon.click({ timeout: 8000 });

    const iframeEl = page.locator('iframe[src*="realteam11.com"]').first();
    await iframeEl.waitFor({ state: 'visible', timeout: 20000 });

    const frame = await iframeEl.contentFrame();
    if (!frame) {
        throw new Error('embedded_frame_not_found');
    }

    await sleep(400);

    // Do NOT call frame.waitForSelector here; let the scraper handle visibility.
    return frame;
}