const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Store database in /app/data/ directory (for Docker volume mount)
const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'database.db');
const db = new Database(dbPath, { verbose: console.log });

// Create the webhooks table
db.exec(`
  CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    n8nWebhookUrl TEXT NOT NULL,
    lastRun TEXT
  )
`);

console.log('Database initialized at', dbPath);

module.exports = db;
