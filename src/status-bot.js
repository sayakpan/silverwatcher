// src/status-bot.js
import fetch from 'node-fetch';
import { getStatusSnapshot } from './status-state.js';
import { sleep } from './util.js';

function parseChatIds(env) {
    if (!env.TELEGRAM_CHAT_IDS) return [];
    return env.TELEGRAM_CHAT_IDS
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
        .map(id => String(id));
}

function formatTimestamp(iso) {
    if (!iso) return 'never';

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;

    const datePart = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${datePart}, ${hours}:${minutes} ${ampm}`;
}

function formatDuration(seconds) {
    const total = Math.floor(seconds);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes || !parts.length) parts.push(`${minutes}m`);

    return parts.join(' ');
}

function formatStatus(snapshot) {
    const now = new Date();
    const uptime = formatDuration(process.uptime());

    const lines = [];
    lines.push('Silverwatcher status');
    lines.push('--------------------');
    lines.push(`Uptime:        ${uptime}`);
    lines.push('');
    lines.push(`Last run:      ${formatTimestamp(snapshot.lastRunAt)}`);
    lines.push(`Last success:  ${formatTimestamp(snapshot.lastSuccessAt)}`);
    lines.push(`New contests (last success): ${snapshot.lastNewCount || 0}`);
    lines.push(`Last error at: ${snapshot.lastErrorAt ? formatTimestamp(snapshot.lastErrorAt) : 'none'}`);

    if (snapshot.lastErrorMessage) {
        lines.push(`Last error msg: ${snapshot.lastErrorMessage}`);
    }

    return lines.join('\n');
}

export async function startStatusBot(env) {
    const botToken = env.TELEGRAM_BOT_TOKEN;
    const chatIds = parseChatIds(env);

    if (!botToken || chatIds.length === 0) {
        console.log('Status bot disabled: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS');
        return;
    }

    const baseUrl = `https://api.telegram.org/bot${botToken}`;
    let offset = 0;

    console.log('Status bot: starting long-poll loop');

    while (true) {
        try {
            const res = await fetch(`${baseUrl}/getUpdates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timeout: 30,
                    offset: offset ? offset + 1 : undefined,
                    allowed_updates: ['message']
                })
            });

            const data = await res.json();

            if (!data.ok) {
                console.error('Status bot getUpdates error:', data);
                await sleep(5000);
                continue;
            }

            for (const update of data.result) {
                offset = update.update_id;

                const msg = update.message;
                if (!msg || !msg.text) continue;

                const chatId = String(msg.chat.id);
                if (!chatIds.includes(chatId)) continue;

                const text = msg.text.trim().toLowerCase();

                if (text === 'status' || text === '/status') {
                    const snapshot = getStatusSnapshot();
                    const reply = formatStatus(snapshot);

                    try {
                        const sendRes = await fetch(`${baseUrl}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: chatId,
                                text: reply
                            })
                        });
                        const sendData = await sendRes.json();
                        if (!sendData.ok) {
                            console.error('Status bot sendMessage failed:', sendData);
                        }
                    } catch (err) {
                        console.error('Status bot sendMessage error:', err.message || err);
                    }
                }
            }
        } catch (err) {
            console.error('Status bot loop error:', err.message || err);
            await sleep(5000);
        }
    }
}