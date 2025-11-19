import { ensureLoggedIn, loginWithModal } from './login-modal.js';
import { openDiam11Frame } from './open-game.js';
import { scrapeContestsFromFrame } from './scrape-contests.js';
import { loadKnownContests, saveKnownContests } from './storage.js';
import { notifyNewContests } from './notifier.js';
import { markRunError, markRunStart, markRunSuccess } from './status-state.js';

export async function monitorOnce({ page, env, selectors }) {
    const baseUrl = env.BASE_URL || 'https://allpanel777.now/';
    const username = env.USERNAME;
    const password = env.PASSWORD;

    if (!username || !password) {
        throw new Error('USERNAME or PASSWORD missing in .env');
    }

    console.log('Silverwatcher: Initializing...');
    console.log('Silverwatcher: Base URL - ', baseUrl);

    markRunStart();

    try {
        await ensureLoggedIn(page, baseUrl, selectors, username, password);
        console.log('Silverwatcher: LOGGED IN successfully');

        const frame = await openDiam11Frame(page, selectors);
        console.log('Silverwatcher: DIAM11 frame ready, scraping contests');

        const contests = await scrapeContestsFromFrame(frame, selectors);
        console.log(`Silverwatcher: Scraped ${contests.length} contests`);

        const { knownIds } = await loadKnownContests();
        const currentIds = new Set(contests.map(c => c.id));
        const newContests = contests.filter(c => !knownIds.has(c.id));

        if (newContests.length > 0) {
            console.log(`Silverwatcher: ${newContests.length} New contests found`);
            await notifyNewContests(newContests, env);
        } else {
            console.log('Silverwatcher: No New Contests');
        }

        await saveKnownContests(currentIds);
        markRunSuccess(newContests.length);
    } catch (err) {
        markRunError(err);
        console.error('Silverwatcher: monitorOnce error:', err);
        throw err;
    }
}