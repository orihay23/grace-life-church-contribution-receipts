const express = require('express');
const router = express.Router();
const path = require('path');
const { execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const LIBREOFFICE = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
const OUT_DIR = path.resolve(ROOT, 'out');

// POST /api/convert — convert all DOCX files in out/ to PDF using LibreOffice
router.post('/', (req, res) => {
    execFile(
        LIBREOFFICE,
        ['--headless', '--convert-to', 'pdf', '--outdir', OUT_DIR, path.join(OUT_DIR, '*.docx')],
        { cwd: OUT_DIR, shell: true },
        (err, stdout, stderr) => {
            if (err) {
                return res.status(500).json({ error: err.message, detail: stderr });
            }
            const converted = (stdout.match(/-> .+? using/g) || []).length;
            res.json({ ok: true, converted, output: stdout.trim() });
        }
    );
});

// GET /api/convert/available — check if LibreOffice is installed
router.get('/available', (req, res) => {
    const fs = require('fs');
    res.json({ available: fs.existsSync(LIBREOFFICE) });
});

module.exports = router;
