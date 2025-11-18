import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');
const FILE_PATH = path.join(DATA_DIR, 'contests.json');

export async function loadKnownContests() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(FILE_PATH)) {
        return { knownIds: new Set() };
    }

    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    try {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed.ids) ? parsed.ids : [];
        return { knownIds: new Set(arr) };
    } catch {
        return { knownIds: new Set() };
    }
}

export async function saveKnownContests(idSet) {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const ids = Array.from(idSet);

    if (ids.length === 0 && fs.existsSync(FILE_PATH)) {
        try {
            const raw = fs.readFileSync(FILE_PATH, 'utf-8');
            const parsed = JSON.parse(raw);
            const existingIds = Array.isArray(parsed.ids) ? parsed.ids : [];

            if (existingIds.length > 0) {
                console.warn(
                    'saveKnownContests: refusing to overwrite non-empty contests.json with empty ids[]'
                );
                return;
            }
        } catch (e) {
            console.warn(
                'saveKnownContests: error reading existing contests.json, proceeding with write',
                e?.message || e
            );
        }
    }

    const payload = { ids };
    fs.writeFileSync(FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
}