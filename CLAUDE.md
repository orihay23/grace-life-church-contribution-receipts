# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

Annual contribution receipt generator for Grace Life Church. Reads donor and transaction data exported from Xero accounting software, generates two-page DOCX receipts per donor (summary + itemized), converts them to PDF, and optionally emails them via Gmail OAuth2.

## Commands

```bash
npm install        # Install dependencies
npm start          # Launch web UI at http://localhost:3737 (auto-opens browser)
npm test           # Run Jest tests
npm run test:watch # Watch mode

# Legacy CLI (still works):
node readTransactions.js   # Generate receipts without the web UI
```

PDF conversion (after generating DOCX files in `out/`):
- **macOS**: `cd out && /Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to pdf *.docx`
- **Windows**: Run `toPdfOnWindows/doc2pdf.vbs`

## New Files (webapp-ideas branch)

- `start.js` — entry point for `npm start`; launches Express + opens browser
- `config.js` — read/write `config.json` (git-ignored); replaces `.env`
- `server/index.js` — Express app; routes: `/api/config`, `/api/generate`, `/api/results`, `/api/email`, `/api/templates`, `/api/xero`
- `server/public/index.html` — single-page web UI
- `xero/auth.js` — Xero OAuth2 PKCE flow; registers `/xero-callback` on the Express app
- `xero/reports.js` — downloads Journals + Contacts from Xero API → writes `input/accounts.csv`, `input/contacts{year}.csv`, `input/emailList{year}.csv`
- `tests/` — Jest tests; fixtures in `tests/fixtures/`

## Architecture

**Data flow:**
1. `input/accounts.csv` — Xero "Detailed Account Transaction Report" (account code, date, description, gross amount)
2. `input/contacts2024.csv` — Xero "Income by Contact" report (donor names + totals)
3. `readTransactions.js` reads both CSVs, matches transactions to donors by name, filters deductible account codes, and generates two DOCX files per donor into `out/`
4. Templates: `2024 Giving Receipts.docx` (page 1) and `2024 Giving ReceiptsPg2.docx` (page 2) — populated via docxtemplater
5. `emailer/index.js` reads `input/emailList2024.csv`, attaches PDFs, sends via nodemailer + Gmail OAuth2

**Key business rules:**
- Only account codes `1000, 1001, 1002, 1003, 3000–3005, 4000, 4001, 5002` are tax-deductible
- Only donors with total contributions >= $75 get a receipt
- Donor/transaction names must not contain forward slashes (breaks file output paths)

**Emailer OAuth setup** requires environment variables in `emailer/.env`:
`REFRESH_TOKEN`, `ACCESS_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`

## Annual Update Checklist

Each year, update:
- Word templates (year references inside both `.docx` files)
- Hardcoded year strings in `readTransactions.js` (output filenames reference the year)
- CSV filenames referenced in the scripts (e.g., `contacts2024.csv` → `contacts2025.csv`)
- `emailList` filename in `emailer/index.js`

## Notes

- The `input/` and `out/` directories are git-ignored — create them locally before running
- The emailer's send call is currently commented out; uncomment only after testing with a test recipient
- Output files are named `<donorName>.docx` and `<donorName>Pg2.docx`
