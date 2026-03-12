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

// ─── Prompt Manager Tables ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS prompt_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT 'folder',
    parentId TEXT,
    sortOrder INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (parentId) REFERENCES prompt_folders(id) ON DELETE SET NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    folderId TEXT,
    name TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tags TEXT DEFAULT '[]',
    isFavorite INTEGER DEFAULT 0,
    usageCount INTEGER DEFAULT 0,
    avgRating REAL DEFAULT 0,
    currentVersion INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (folderId) REFERENCES prompt_folders(id) ON DELETE SET NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS prompt_versions (
    id TEXT PRIMARY KEY,
    promptId TEXT NOT NULL,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    changeNote TEXT DEFAULT '',
    createdAt TEXT NOT NULL,
    FOREIGN KEY (promptId) REFERENCES prompts(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS chains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS chain_steps (
    id TEXT PRIMARY KEY,
    chainId TEXT NOT NULL,
    stepOrder INTEGER NOT NULL,
    promptId TEXT NOT NULL,
    outputVariable TEXT DEFAULT '',
    FOREIGN KEY (chainId) REFERENCES chains(id) ON DELETE CASCADE,
    FOREIGN KEY (promptId) REFERENCES prompts(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS prompt_usage_logs (
    id TEXT PRIMARY KEY,
    promptId TEXT NOT NULL,
    rating INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    resultPreview TEXT DEFAULT '',
    usedAt TEXT NOT NULL,
    FOREIGN KEY (promptId) REFERENCES prompts(id) ON DELETE CASCADE
  )
`);

console.log('Database initialized at', dbPath);

module.exports = db;
