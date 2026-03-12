const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

// ─── Helper: parse JSON fields ─────────────────────────────────
function parsePrompt(row) {
  if (!row) return null;
  try { row.tags = JSON.parse(row.tags); } catch { row.tags = []; }
  row.isFavorite = !!row.isFavorite;
  return row;
}

// ═══════════════════════════════════════════════════════════════
// FOLDERS
// ═══════════════════════════════════════════════════════════════

// GET /api/prompts/folders
router.get('/folders', (req, res) => {
  try {
    const folders = db.prepare('SELECT * FROM prompt_folders ORDER BY sortOrder, name').all();
    res.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/prompts/folders
router.post('/folders', (req, res) => {
  const { name, description, icon, parentId, sortOrder } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const id = `fld-${crypto.randomUUID().substring(0, 8)}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO prompt_folders (id, name, description, icon, parentId, sortOrder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description || '', icon || 'folder', parentId || null, sortOrder || 0, now, now);

    const folder = db.prepare('SELECT * FROM prompt_folders WHERE id = ?').get(id);
    res.status(201).json(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/prompts/folders/:id
router.put('/folders/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, icon, parentId, sortOrder } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const existing = db.prepare('SELECT * FROM prompt_folders WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Folder not found' });

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE prompt_folders SET name = ?, description = ?, icon = ?, parentId = ?, sortOrder = ?, updatedAt = ?
      WHERE id = ?
    `).run(name, description || '', icon || 'folder', parentId || null, sortOrder || 0, now, id);

    const folder = db.prepare('SELECT * FROM prompt_folders WHERE id = ?').get(id);
    res.json(folder);
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/prompts/folders/:id
router.delete('/folders/:id', (req, res) => {
  const { id } = req.params;
  try {
    // Set prompts in this folder to null folderId
    db.prepare('UPDATE prompts SET folderId = NULL WHERE folderId = ?').run(id);
    const result = db.prepare('DELETE FROM prompt_folders WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Folder not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════

// GET /api/prompts — list with filters
router.get('/', (req, res) => {
  const { folderId, search, tag } = req.query;
  try {
    let query = 'SELECT * FROM prompts WHERE 1=1';
    const params = [];

    if (folderId) {
      if (folderId === '__none__') {
        query += ' AND folderId IS NULL';
      } else {
        query += ' AND folderId = ?';
        params.push(folderId);
      }
    }
    if (search) {
      query += ' AND (name LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (tag) {
      // SQLite JSON: search within the tags JSON array
      query += " AND tags LIKE ?";
      params.push(`%"${tag}"%`);
    }

    query += ' ORDER BY isFavorite DESC, updatedAt DESC';
    const prompts = db.prepare(query).all(...params).map(parsePrompt);
    res.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/prompts/tags — all unique tags
router.get('/tags', (req, res) => {
  try {
    const rows = db.prepare('SELECT tags FROM prompts').all();
    const tagSet = new Set();
    rows.forEach(row => {
      try {
        const tags = JSON.parse(row.tags);
        tags.forEach(t => tagSet.add(t));
      } catch {}
    });
    res.json([...tagSet].sort());
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/prompts/:id
router.get('/:id', (req, res) => {
  try {
    const prompt = parsePrompt(db.prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id));
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    res.json(prompt);
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/prompts — create prompt (auto-creates version 1)
router.post('/', (req, res) => {
  const { folderId, name, content, tags } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const id = `pmt-${crypto.randomUUID().substring(0, 8)}`;
  const verId = `ver-${crypto.randomUUID().substring(0, 8)}`;
  const now = new Date().toISOString();
  const tagsJson = JSON.stringify(tags || []);

  try {
    const insertPrompt = db.prepare(`
      INSERT INTO prompts (id, folderId, name, content, tags, isFavorite, usageCount, avgRating, currentVersion, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 0, 0, 0, 1, ?, ?)
    `);
    const insertVersion = db.prepare(`
      INSERT INTO prompt_versions (id, promptId, version, content, changeNote, createdAt)
      VALUES (?, ?, 1, ?, 'Phiên bản đầu tiên', ?)
    `);

    const transaction = db.transaction(() => {
      insertPrompt.run(id, folderId || null, name, content || '', tagsJson, now, now);
      insertVersion.run(verId, id, content || '', now);
    });
    transaction();

    const prompt = parsePrompt(db.prepare('SELECT * FROM prompts WHERE id = ?').get(id));
    res.status(201).json(prompt);
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/prompts/:id — update prompt (auto-creates new version if content changed)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { folderId, name, content, tags, changeNote } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const existing = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Prompt not found' });

    const now = new Date().toISOString();
    const tagsJson = JSON.stringify(tags || []);
    const contentChanged = content !== undefined && content !== existing.content;

    const transaction = db.transaction(() => {
      let newVersion = existing.currentVersion;

      if (contentChanged) {
        newVersion = existing.currentVersion + 1;
        const verId = `ver-${crypto.randomUUID().substring(0, 8)}`;
        db.prepare(`
          INSERT INTO prompt_versions (id, promptId, version, content, changeNote, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(verId, id, newVersion, content, changeNote || '', now);
      }

      db.prepare(`
        UPDATE prompts SET folderId = ?, name = ?, content = ?, tags = ?, currentVersion = ?, updatedAt = ?
        WHERE id = ?
      `).run(folderId || null, name, content !== undefined ? content : existing.content, tagsJson, newVersion, now, id);
    });
    transaction();

    const prompt = parsePrompt(db.prepare('SELECT * FROM prompts WHERE id = ?').get(id));
    res.json(prompt);
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/prompts/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const result = db.prepare('DELETE FROM prompts WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Prompt not found' });
    // Cascade deletes versions and usage logs via FK
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// VERSIONS
// ═══════════════════════════════════════════════════════════════

// GET /api/prompts/:id/versions
router.get('/:id/versions', (req, res) => {
  try {
    const versions = db.prepare(
      'SELECT * FROM prompt_versions WHERE promptId = ? ORDER BY version DESC'
    ).all(req.params.id);
    res.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/prompts/:id/restore/:versionId
router.post('/:id/restore/:versionId', (req, res) => {
  const { id, versionId } = req.params;
  try {
    const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

    const version = db.prepare('SELECT * FROM prompt_versions WHERE id = ? AND promptId = ?').get(versionId, id);
    if (!version) return res.status(404).json({ error: 'Version not found' });

    const now = new Date().toISOString();
    const newVersionNum = prompt.currentVersion + 1;
    const newVerId = `ver-${crypto.randomUUID().substring(0, 8)}`;

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO prompt_versions (id, promptId, version, content, changeNote, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(newVerId, id, newVersionNum, version.content, `Khôi phục từ phiên bản ${version.version}`, now);

      db.prepare('UPDATE prompts SET content = ?, currentVersion = ?, updatedAt = ? WHERE id = ?')
        .run(version.content, newVersionNum, now, id);
    });
    transaction();

    const updated = parsePrompt(db.prepare('SELECT * FROM prompts WHERE id = ?').get(id));
    res.json(updated);
  } catch (error) {
    console.error('Error restoring version:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// USAGE / ANALYTICS
// ═══════════════════════════════════════════════════════════════

// POST /api/prompts/:id/usage
router.post('/:id/usage', (req, res) => {
  const { id } = req.params;
  const { rating, note, resultPreview } = req.body;

  try {
    const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

    const logId = `log-${crypto.randomUUID().substring(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO prompt_usage_logs (id, promptId, rating, note, resultPreview, usedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(logId, id, rating || 0, note || '', resultPreview || '', now);

    // Update usage count + avg rating on prompt
    const newCount = prompt.usageCount + 1;
    let newAvg = prompt.avgRating;
    if (rating && rating > 0) {
      const allRatings = db.prepare(
        'SELECT rating FROM prompt_usage_logs WHERE promptId = ? AND rating > 0'
      ).all(id);
      const sum = allRatings.reduce((s, r) => s + r.rating, 0);
      newAvg = Math.round((sum / allRatings.length) * 10) / 10;
    }

    db.prepare('UPDATE prompts SET usageCount = ?, avgRating = ? WHERE id = ?')
      .run(newCount, newAvg, id);

    const log = db.prepare('SELECT * FROM prompt_usage_logs WHERE id = ?').get(logId);
    res.status(201).json(log);
  } catch (error) {
    console.error('Error logging usage:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/prompts/:id/usage
router.get('/:id/usage', (req, res) => {
  try {
    const logs = db.prepare(
      'SELECT * FROM prompt_usage_logs WHERE promptId = ? ORDER BY usedAt DESC'
    ).all(req.params.id);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching usage logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/prompts/:id/favorite
router.patch('/:id/favorite', (req, res) => {
  const { id } = req.params;
  try {
    const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

    const newFav = prompt.isFavorite ? 0 : 1;
    db.prepare('UPDATE prompts SET isFavorite = ? WHERE id = ?').run(newFav, id);

    const updated = parsePrompt(db.prepare('SELECT * FROM prompts WHERE id = ?').get(id));
    res.json(updated);
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
