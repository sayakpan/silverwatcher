// src/status-state.js

let scriptStartTime = Date.now();

const status = {
    lastRunAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    lastNewCount: 0
};

// --- Helpers --- //

function formatDate(d) {
    if (!d) return "never";

    try {
        const date = new Date(d);

        const options = {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        };

        return date.toLocaleString("en-IN", options);
    } catch {
        return d;
    }
}

function getUptime() {
    const ms = Date.now() - scriptStartTime;

    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / (1000 * 60)) % 60;
    const hr  = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hr > 0) parts.push(`${hr}h`);
    if (min > 0) parts.push(`${min}m`);
    parts.push(`${sec}s`);

    return parts.join(" ");
}

// --- State Updates --- //

export function markRunStart() {
    status.lastRunAt = new Date().toISOString();
}

export function markRunSuccess(newCount) {
    status.lastSuccessAt = new Date().toISOString();
    status.lastNewCount = typeof newCount === "number" ? newCount : 0;

    status.lastErrorAt = null;
    status.lastErrorMessage = null;
}

export function markRunError(err) {
    status.lastErrorAt = new Date().toISOString();
    status.lastErrorMessage =
        (err && err.message) ? err.message : String(err);
}

// --- Snapshot for Telegram display --- //

export function getStatusSnapshot() {
    return {
        lastRunAt: formatDate(status.lastRunAt),
        lastSuccessAt: formatDate(status.lastSuccessAt),
        lastErrorAt: formatDate(status.lastErrorAt),
        lastErrorMessage: status.lastErrorMessage || "none",
        lastNewCount: status.lastNewCount,
        uptime: getUptime(),
    };
}