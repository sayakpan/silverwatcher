import { sleep } from './util.js';

export async function scrapeContestsFromFrame(frame, selectors) {
    const s = selectors?.game;
    if (!s || !s.matchListContainer) {
        throw new Error('selectors.game.matchListContainer missing');
    }

    // Wait for the list container to be visible
    await frame.locator(s.matchListContainer).first().waitFor({
        state: 'visible',
        timeout: 15000
    });

    const anchorSelector = `${s.matchListContainer} a`;
    await sleep(400);
    // Optional debug: how many anchors did we find?
    const count = await frame.locator(anchorSelector).count();

    const contests = await frame.locator(anchorSelector).evaluateAll(anchors => {
        function extractIdFromHref(href) {
            const m = href && href.match(/league\/contests\/(\d+)\/contests/);
            return m ? m[1] : href || '';
        }

        return anchors.map(a => {
            const href = a.getAttribute('href') || '';
            const id = extractIdFromHref(href);

            const matchBox = a.querySelector('.match-box');
            const matchTypeEl = matchBox ? matchBox.querySelector('.match-type div') : null;
            const matchType = matchTypeEl ? matchTypeEl.textContent.trim() : '';

            const teamLeftEl = matchBox ? matchBox.querySelector('.team-name.team-left') : null;
            const teamRightEl = matchBox ? matchBox.querySelector('.team-name.team-right') : null;

            const teamLeft = teamLeftEl ? teamLeftEl.textContent.trim() : '';
            const teamRight = teamRightEl ? teamRightEl.textContent.trim() : '';

            const timeLeftEl = matchBox ? matchBox.querySelector('.time-left') : null;
            const timeLeft = timeLeftEl ? timeLeftEl.textContent.trim() : '';

            return {
                id,
                href,
                matchType,
                teamLeft,
                teamRight,
                timeLeft
            };
        });
    });

    return contests;
}