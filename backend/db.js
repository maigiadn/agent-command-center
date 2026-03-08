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
    lastRun TEXT,
    defaultKeys TEXT DEFAULT '[]'
  )
`);

// Simple migration: add defaultKeys and project columns to existing tables
try {
  const tableInfo = db.pragma('table_info(webhooks)');

  const hasDefaultKeys = tableInfo.some((col) => col.name === 'defaultKeys');
  if (!hasDefaultKeys) {
    db.exec(`ALTER TABLE webhooks ADD COLUMN defaultKeys TEXT DEFAULT '[]'`);
    console.log('Migration: Added defaultKeys column to webhooks table');
  }

  const hasProject = tableInfo.some((col) => col.name === 'project');
  if (!hasProject) {
    db.exec(`ALTER TABLE webhooks ADD COLUMN project TEXT DEFAULT 'Mặc định'`);
    console.log('Migration: Added project column to webhooks table');
  }
} catch (e) {
  // If PRAGMA or ALTER fails, ignore and assume either table doesn't exist yet or it already has it.
}

console.log('Database initialized at', dbPath);

module.exports = db;
