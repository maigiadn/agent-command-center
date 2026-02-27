const express = require('express');
const db = require('../db');

const router = express.Router();

// Auto-rewrite public n8n URL to internal Docker URL
// e.g. https://n8n.maivangia.com/webhook/xxx → http://n8n_n8n:5678/webhook/xxx
const N8N_PUBLIC_URL = process.env.N8N_PUBLIC_URL || '';   // e.g. "https://n8n.maivangia.com"
const N8N_INTERNAL_URL = process.env.N8N_INTERNAL_URL || ''; // e.g. "http://n8n_n8n:5678"

function rewriteUrl(originalUrl) {
    if (N8N_PUBLIC_URL && N8N_INTERNAL_URL && originalUrl.startsWith(N8N_PUBLIC_URL)) {
        return originalUrl.replace(N8N_PUBLIC_URL, N8N_INTERNAL_URL);
    }
    return originalUrl;
}

// POST /api/execute/:id - Proxy to n8n
router.post('/:id', async (req, res) => {
    const { id } = req.params;
    const payload = req.body;

    try {
        const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(id);

        if (!webhook) {
            return res.status(404).json({
                success: false,
                error: `Webhook with ID ${id} not found`,
                duration: '0.0s'
            });
        }

        if (webhook.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: `Webhook ${id} is currently inactive`,
                duration: '0.0s'
            });
        }

        // Rewrite URL: public → internal Docker hostname
        const n8nUrl = rewriteUrl(webhook.n8nWebhookUrl);
        console.log(`Executing webhook ${id}: ${webhook.n8nWebhookUrl} → ${n8nUrl}`);

        // 3. Forward request to n8nWebhookUrl & Measure execution time
        const startTime = performance.now();
        let durationStr = '0.0s';

        try {
            // Set up options for the fetch request
            const fetchOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            // Only include body if there's actual data
            if (payload && Object.keys(payload).length > 0) {
                fetchOptions.body = JSON.stringify(payload);
            }

            // Controller for timeout (15 seconds)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            fetchOptions.signal = controller.signal;

            const n8nResponse = await fetch(n8nUrl, fetchOptions);
            clearTimeout(timeoutId);

            const endTime = performance.now();
            const durationMs = endTime - startTime;
            durationStr = `${(durationMs / 1000).toFixed(1)}s`;

            // 4. Update lastRun timestamp
            const lastRunIso = new Date().toISOString();
            db.prepare('UPDATE webhooks SET lastRun = ? WHERE id = ?').run(lastRunIso, id);

            // Handle non-2xx n8n responses
            if (!n8nResponse.ok) {
                let errorMsg = `n8n returned status ${n8nResponse.status}`;
                try {
                    const errorTx = await n8nResponse.text();
                    if (errorTx) errorMsg += `: ${errorTx.substring(0, 100)}`; // Trim long errors
                } catch (e) { }

                return res.status(502).json({
                    success: false,
                    error: errorMsg,
                    duration: durationStr
                });
            }

            // 5. Wrap successful n8n response in WorkflowResult
            let data = null;
            const contentType = n8nResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await n8nResponse.json();
            } else {
                data = await n8nResponse.text();
            }

            return res.json({
                success: true,
                data: data,
                duration: durationStr
            });

        } catch (fetchError) {
            // Handle network errors, timeouts
            const endTime = performance.now();
            const durationMs = endTime - startTime;
            durationStr = `${(durationMs / 1000).toFixed(1)}s`;

            let errorMsg = fetchError.message;
            if (fetchError.name === 'AbortError') {
                errorMsg = 'Request to n8n timed out after 15 seconds';
            }

            const lastRunIso = new Date().toISOString();
            db.prepare('UPDATE webhooks SET lastRun = ? WHERE id = ?').run(lastRunIso, id);

            return res.status(502).json({ // 502 Bad Gateway
                success: false,
                error: `Failed to reach n8n: ${errorMsg}`,
                duration: durationStr
            });
        }

    } catch (error) {
        console.error('Error executing webhook proxy:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error processing execution',
            duration: '0.0s'
        });
    }
});

module.exports = router;
