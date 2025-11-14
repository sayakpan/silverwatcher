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
    const payload = { ids };
    fs.writeFileSync(FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
}