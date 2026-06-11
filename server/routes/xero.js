const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const config = require('../../config');
const { getAuthUrl } = require('../../xero/auth');
const { downloadAccountsAndContacts, downloadEmailList } = require('../../xero/reports');

const ROOT = path.resolve(__dirname, '..', '..');

// GET /api/xero/check — verify manual CSV files are present
router.get('/check', (req, res) => {
    const year = config.get('year') || new Date().getFullYear();
    const required = [
        path.resolve(ROOT, 'input', 'accounts.csv'),
        path.resolve(ROOT, 'input', `contacts${year}.csv`),
        path.resolve(ROOT, 'input', `emailList${year}.csv`),
    ];
    const missing = required.filter((f) => !fs.existsSync(f)).map((f) => path.basename(f));
    if (missing.length) {
        return res.json({ ok: false, missing });
    }
    res.json({ ok: true, files: required.map((f) => path.basename(f)) });
});

// GET /api/xero/auth-url — return the URL to kick off OAuth
router.get('/auth-url', async (req, res) => {
    try {
        const cfg = config.all();
        if (!cfg.xeroClientId || !cfg.xeroClientSecret) {
            return res.status(400).json({ error: 'Enter Xero Client ID and Secret in Step 1 and save before connecting.' });
        }
        const url = await getAuthUrl();
        res.json({ url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/xero/connect — download all required files from Xero
router.post('/connect', async (req, res) => {
    try {
        const year = config.get('year') || new Date().getFullYear();
        const result = await downloadAccountsAndContacts(year);
        // Pass the already-fetched contacts list to avoid a second getContacts API call
        const emailResult = await downloadEmailList(year, result.contacts);
        res.json({
            ok: true,
            files: [
                path.basename(result.accountsPath),
                path.basename(result.contactsPath),
                path.basename(emailResult.emailListPath),
            ],
            txnLines: result.txnLines,
            emailContacts: emailResult.count,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
