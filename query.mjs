import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const d1Dir = path.join(__dirname, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
let dbFiles = fs.readdirSync(d1Dir).filter(f => f.endsWith('.sqlite') && !f.includes('metadata'));
const db = new Database(path.join(d1Dir, dbFiles[0]));

console.log("Industries:");
console.log(db.prepare('SELECT id, name FROM industries').all());

console.log("Domains:");
console.log(db.prepare('SELECT id, name FROM knowledge_domains').all());
