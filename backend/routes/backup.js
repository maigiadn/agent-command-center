const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

// GET /api/backup/export — export all prompt data as JSON
router.get('/export', (req, res) => {
  try {
    const folders = db.prepare('SELECT * FROM prompt_folders ORDER BY sortOrder, name').all();

    const prompts = db.prepare('SELECT * FROM prompts ORDER BY name').all().map(p => {
      try { p.tags = JSON.parse(p.tags); } catch { p.tags = []; }
      p.isFavorite = !!p.isFavorite;
      return p;
    });

    const versions = db.prepare('SELECT * FROM prompt_versions ORDER BY promptId, version').all();
    const chains = db.prepare('SELECT * FROM chains ORDER BY name').all();
    const chainSteps = db.prepare('SELECT * FROM chain_steps ORDER BY chainId, stepOrder').all();
    const usageLogs = db.prepare('SELECT * FROM prompt_usage_logs ORDER BY usedAt DESC').all();

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        folders,
        prompts,
        versions,
        chains,
        chainSteps,
        usageLogs,
      }
    };

    res.setHeader('Content-Disposition', `attachment; filename=prompt-backup-${Date.now()}.json`);
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/backup/import — import from JSON
router.post('/import', (req, res) => {
  const { data } = req.body;

  if (!data) return res.status(400).json({ error: 'No data provided' });

  try {
    const stats = { folders: 0, prompts: 0, versions: 0, chains: 0, chainSteps: 0, usageLogs: 0 };

    const transaction = db.transaction(() => {
      // Import folders
      if (data.folders && data.folders.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO prompt_folders (id, name, description, icon, parentId, sortOrder, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        data.folders.forEach(f => {
          stmt.run(f.id, f.name, f.description || '', f.icon || 'folder', f.parentId || null, f.sortOrder || 0, f.createdAt, f.updatedAt);
          stats.folders++;
        });
      }

      // Import prompts
      if (data.prompts && data.prompts.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO prompts (id, folderId, name, content, tags, isFavorite, usageCount, avgRating, currentVersion, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        data.prompts.forEach(p => {
          const tagsJson = typeof p.tags === 'string' ? p.tags : JSON.stringify(p.tags || []);
          stmt.run(p.id, p.folderId || null, p.name, p.content || '', tagsJson, p.isFavorite ? 1 : 0, p.usageCount || 0, p.avgRating || 0, p.currentVersion || 1, p.createdAt, p.updatedAt);
          stats.prompts++;
        });
      }

      // Import versions
      if (data.versions && data.versions.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO prompt_versions (id, promptId, version, content, changeNote, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        data.versions.forEach(v => {
          stmt.run(v.id, v.promptId, v.version, v.content, v.changeNote || '', v.createdAt);
          stats.versions++;
        });
      }

      // Import chains
      if (data.chains && data.chains.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO chains (id, name, description, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `);
        data.chains.forEach(c => {
          stmt.run(c.id, c.name, c.description || '', c.createdAt, c.updatedAt);
          stats.chains++;
        });
      }

      // Import chain steps
      if (data.chainSteps && data.chainSteps.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO chain_steps (id, chainId, stepOrder, promptId, outputVariable)
          VALUES (?, ?, ?, ?, ?)
        `);
        data.chainSteps.forEach(s => {
          stmt.run(s.id, s.chainId, s.stepOrder, s.promptId, s.outputVariable || '');
          stats.chainSteps++;
        });
      }

      // Import usage logs
      if (data.usageLogs && data.usageLogs.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO prompt_usage_logs (id, promptId, rating, note, resultPreview, usedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        data.usageLogs.forEach(l => {
          stmt.run(l.id, l.promptId, l.rating || 0, l.note || '', l.resultPreview || '', l.usedAt);
          stats.usageLogs++;
        });
      }
    });

    transaction();
    res.json({ success: true, imported: stats });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Import failed: ' + error.message });
  }
});

module.exports = router;
