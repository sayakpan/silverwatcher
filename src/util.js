import fs from 'fs';
import path from 'path';

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function jitter(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function readJSON(p) {
    const abs = path.resolve(p);
    const raw = fs.readFileSync(abs, 'utf-8');
    return JSON.parse(raw);
}

export function nowIST() {
    return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true
    });
}