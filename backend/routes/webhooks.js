const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

// GET /api/webhooks - List all webhooks
router.get('/', (req, res) => {
    try {
        const webhooks = db.prepare('SELECT * FROM webhooks').all();
        // Parse defaultKeys from JSON string to array
        const webhooksWithKeys = webhooks.map(wh => {
            try {
                wh.defaultKeys = JSON.parse(wh.defaultKeys);
            } catch (e) {
                wh.defaultKeys = [];
            }
            return wh;
        });
        // Exclude n8nWebhookUrl from listing if needed, but the prompt says 1. GET /api/webhooks Returns: array of all Webhook objects
        // However, it's safer not to send the internal URL to the frontend if not needed for execution.
        // The prompt says: "NEVER expose n8nWebhookUrl in the /api/execute/:id response". 
        // It doesn't explicitly forbid it in GET /api/webhooks, but it's a good practice to omit it unless the frontend needs to edit it.
        // The instructions say "Settings page (manage webhooks)", so the frontend probably needs it to populate the edit form.
        res.json(webhooksWithKeys);
    } catch (error) {
        console.error('Error fetching webhooks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/webhooks - Create a new webhook
router.post('/', (req, res) => {
    const { name, description, n8nWebhookUrl, status = 'active', defaultKeys = [], project = 'Mặc định' } = req.body;

    if (!name || !n8nWebhookUrl) {
        return res.status(400).json({ error: 'Name and n8nWebhookUrl are required' });
    }

    try {
        // Basic URL validation
        new URL(n8nWebhookUrl);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid n8nWebhookUrl' });
    }

    const id = `wh-${crypto.randomUUID().substring(0, 8)}`; // Generate a unique ID (e.g., wh-abc123yz)

    try {
        const stmt = db.prepare(`
      INSERT INTO webhooks (id, name, description, status, n8nWebhookUrl, defaultKeys, project)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, name, description || '', status, n8nWebhookUrl, JSON.stringify(defaultKeys), project || 'Mặc định');

        const newWebhook = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(id);
        try { newWebhook.defaultKeys = JSON.parse(newWebhook.defaultKeys); } catch (e) { newWebhook.defaultKeys = []; }
        res.status(201).json(newWebhook);
    } catch (error) {
        console.error('Error creating webhook:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /api/webhooks/:id - Update an existing webhook
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, n8nWebhookUrl, status, defaultKeys, project } = req.body;

    if (!name || !n8nWebhookUrl) {
        return res.status(400).json({ error: 'Name and n8nWebhookUrl are required' });
    }

    try {
        new URL(n8nWebhookUrl);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid n8nWebhookUrl' });
    }

    try {
        // Check if exists
        const existing = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Webhook not found' });
        }

        const stmt = db.prepare(`
      UPDATE webhooks 
      SET name = ?, description = ?, status = ?, n8nWebhookUrl = ?, defaultKeys = ?, project = ?
      WHERE id = ?
    `);
        stmt.run(name, description || '', status || 'active', n8nWebhookUrl, JSON.stringify(defaultKeys || []), project || 'Mặc định', id);

        const updatedWebhook = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(id);
        try { updatedWebhook.defaultKeys = JSON.parse(updatedWebhook.defaultKeys); } catch (e) { updatedWebhook.defaultKeys = []; }
        res.json(updatedWebhook);
    } catch (error) {
        console.error('Error updating webhook:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /api/webhooks/:id - Delete a webhook
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    try {
        const result = db.prepare('DELETE FROM webhooks WHERE id = ?').run(id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Webhook not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting webhook:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
