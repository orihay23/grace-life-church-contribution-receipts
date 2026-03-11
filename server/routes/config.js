const express = require('express');
const router = express.Router();
const config = require('../../config');
const path = require('path');
const fs = require('fs');

// GET /api/config — return current config (omit secrets)
router.get('/', (req, res) => {
    const data = config.all();
    // Mask secrets
    const safe = { ...data };
    ['clientSecret', 'refreshToken', 'accessToken', 'xeroClientSecret', 'xeroRefreshToken'].forEach((k) => {
        if (safe[k]) safe[k] = '••••••••';
    });
    res.json(safe);
});

// POST /api/config — save config values
router.post('/', (req, res) => {
    const allowed = [
        'year', 'templatePg1', 'templatePg2',
        'email', 'clientId', 'clientSecret', 'refreshToken', 'accessToken',
        'xeroClientId', 'xeroClientSecret', 'xeroTenantId', 'xeroRefreshToken',
    ];
    const updates = {};
    allowed.forEach((key) => {
        if (req.body[key] !== undefined && req.body[key] !== '••••••••') {
            updates[key] = req.body[key];
        }
    });
    config.setAll(updates);
    res.json({ ok: true });
});

module.exports = router;
