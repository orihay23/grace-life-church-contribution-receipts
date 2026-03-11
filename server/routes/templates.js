const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// GET /api/templates — list all .docx files in project root
router.get('/', (req, res) => {
    const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.docx'));
    // Split into pg1 and pg2 by naming convention
    const pg1 = files.filter((f) => !f.toLowerCase().includes('pg2'));
    const pg2 = files.filter((f) => f.toLowerCase().includes('pg2'));
    res.json({ pg1, pg2, all: files });
});

module.exports = router;
