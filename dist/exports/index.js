import readline from 'readline';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { text } from 'stream/consumers';
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
export const question = (query) => {
    return new Promise(resolve => rl.question(query, resolve));
};
export const logger = pino({ level: 'silent' });
//# sourceMappingURL=index.js.map