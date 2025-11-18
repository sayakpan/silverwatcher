// src/notify.js
import fetch from 'node-fetch';

export async function sendTelegramMessage(text, env, parse_mode = 'Markdown') {
    const botToken = env.TELEGRAM_BOT_TOKEN;
    let chatIds = [];
    if (env.TELEGRAM_CHAT_IDS) {
        chatIds = env.TELEGRAM_CHAT_IDS
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);
    }

    if (!botToken || chatIds.length === 0) {
        console.error('Telegram not configured: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS');
        return;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
        const tasks = chatIds.map(chatId =>
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                    parse_mode: parse_mode || '',
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (!data.ok) {
                        console.error(`Failed for ${chatId}:`, data);
                    }
                })
                .catch(err => {
                    console.error(`Telegram send error for ${chatId}:`, err.message || err);
                })
        );

        await Promise.all(tasks);
    } catch (err) {
        console.error('Telegram sendMessage error:', err.message || err);
    }
}

export async function notifyNewContests(newContests, env) {
    if (!newContests.length) {
        return;
    }

    console.log('New contests detected:');
    for (const c of newContests) {
        console.log(
            `  [${c.id}] ${c.matchType} ${c.teamLeft} vs ${c.teamRight} (${c.timeLeft}) -> ${c.href}`
        );
    }

    const lines = newContests.map(c => {
        return `• *${c.matchType}* ${c.teamLeft} vs ${c.teamRight} [#${c.id}] `;
    });

    const text = `*New Contests Detected:*\n\n${lines.join('\n\n')}`;
    await sendTelegramMessage(text, env);
}

export async function notifyError(error, env, contextLabel = 'runtime') {
    const err = error instanceof Error ? error : new Error(String(error));
    const parts = [
        `*Silverwatcher – ERROR*`,
        ``,
        `*Context:* ${contextLabel}`,
        `*Message:* ${err.message || 'Unknown error'}`,
    ];

    if (err.stack) {
        const trimmed = err.stack.split('\n').slice(0, 6).join('\n');
        parts.push('');
        parts.push('```');
        parts.push(trimmed);
        parts.push('```');
    }

    const text = parts.join('\n');
    console.error('Silverwatcher error:', err);
    // await sendTelegramMessage(text, env, false);
}