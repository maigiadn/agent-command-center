const Database = require('better-sqlite3');
const path = require('path');

// SQLite will create the .db file if it doesn't exist
const dbPath = path.resolve(__dirname, 'database.db');
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
