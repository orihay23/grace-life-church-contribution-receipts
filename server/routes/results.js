const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');

// GET /api/results — return last generation results and sent status
router.get('/', (req, res) => {
    const resultsPath = path.resolve(ROOT, 'out', 'results.json');
    const sentPath = path.resolve(ROOT, 'out', 'sent.json');

    if (!fs.existsSync(resultsPath)) {
        return res.json({ ready: false });
    }

    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const sent = fs.existsSync(sentPath) ? JSON.parse(fs.readFileSync(sentPath, 'utf8')) : {};

    // Annotate each donor with sent status
    results.donors = results.donors.map((d) => ({
        ...d,
        sent: !!sent[d.name],
        sentAt: sent[d.name] || null,
    }));

    res.json({ ready: true, ...results });
});

module.exports = router;
