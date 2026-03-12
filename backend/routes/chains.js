const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

// GET /api/chains — list all chains with their steps
router.get('/', (req, res) => {
  try {
    const chains = db.prepare('SELECT * FROM chains ORDER BY updatedAt DESC').all();
    const result = chains.map(chain => {
      const steps = db.prepare(
        'SELECT cs.*, p.name as promptName FROM chain_steps cs LEFT JOIN prompts p ON cs.promptId = p.id WHERE cs.chainId = ? ORDER BY cs.stepOrder'
      ).all(chain.id);
      return { ...chain, steps };
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching chains:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/chains — create chain with steps
router.post('/', (req, res) => {
  const { name, description, steps } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const id = `chn-${crypto.randomUUID().substring(0, 8)}`;
  const now = new Date().toISOString();

  try {
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO chains (id, name, description, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, name, description || '', now, now);

      if (steps && steps.length > 0) {
        const insertStep = db.prepare(`
          INSERT INTO chain_steps (id, chainId, stepOrder, promptId, outputVariable)
          VALUES (?, ?, ?, ?, ?)
        `);
        steps.forEach((step, index) => {
          const stepId = `stp-${crypto.randomUUID().substring(0, 8)}`;
          insertStep.run(stepId, id, step.order || index + 1, step.promptId, step.outputVariable || '');
        });
      }
    });
    transaction();

    // Return the created chain with steps
    const chain = db.prepare('SELECT * FROM chains WHERE id = ?').get(id);
    const chainSteps = db.prepare(
      'SELECT cs.*, p.name as promptName FROM chain_steps cs LEFT JOIN prompts p ON cs.promptId = p.id WHERE cs.chainId = ? ORDER BY cs.stepOrder'
    ).all(id);
    res.status(201).json({ ...chain, steps: chainSteps });
  } catch (error) {
    console.error('Error creating chain:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/chains/:id — update chain
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, steps } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const existing = db.prepare('SELECT * FROM chains WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Chain not found' });

    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      db.prepare('UPDATE chains SET name = ?, description = ?, updatedAt = ? WHERE id = ?')
        .run(name, description || '', now, id);

      // Replace all steps
      db.prepare('DELETE FROM chain_steps WHERE chainId = ?').run(id);
      if (steps && steps.length > 0) {
        const insertStep = db.prepare(`
          INSERT INTO chain_steps (id, chainId, stepOrder, promptId, outputVariable)
          VALUES (?, ?, ?, ?, ?)
        `);
        steps.forEach((step, index) => {
          const stepId = `stp-${crypto.randomUUID().substring(0, 8)}`;
          insertStep.run(stepId, id, step.order || index + 1, step.promptId, step.outputVariable || '');
        });
      }
    });
    transaction();

    const chain = db.prepare('SELECT * FROM chains WHERE id = ?').get(id);
    const chainSteps = db.prepare(
      'SELECT cs.*, p.name as promptName FROM chain_steps cs LEFT JOIN prompts p ON cs.promptId = p.id WHERE cs.chainId = ? ORDER BY cs.stepOrder'
    ).all(id);
    res.json({ ...chain, steps: chainSteps });
  } catch (error) {
    console.error('Error updating chain:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/chains/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const result = db.prepare('DELETE FROM chains WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Chain not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chain:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
