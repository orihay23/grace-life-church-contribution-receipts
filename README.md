# GLC Contribution Receipts

Annual giving receipt generator for Grace Life Church. Reads donor and transaction data from Xero, generates two-page DOCX receipts, converts them to PDF, and emails them to donors.

---

## Quick Start

```bash
npm install
npm start
```

This opens the web interface at `http://localhost:3737`. Follow the six steps in the UI.

---

## Annual Checklist (Before Running)

- [ ] Reconcile all INCOMING transactions in Xero for the year
- [ ] Add/verify email addresses in Xero for all givers
- [ ] Create a new Word template for the year (update the year in both Pg1 and Pg2 `.docx` files)
- [ ] Create `input/` and `out/` folders if they don't exist (they are git-ignored)

---

## Web UI Workflow

### Step 1 — Configure
Set the tax year and paste your Gmail OAuth credentials. These are saved locally in `config.json` (git-ignored, never committed).

### Step 2 — Select Templates
Choose which `.docx` files to use as the Pg1 (summary) and Pg2 (itemized) templates. The UI lists all `.docx` files in the project root automatically.

### Step 3 — Fetch Data from Xero
Either use the Xero integration (once configured) or place the files manually in `input/`:

**Manual file prep:**

**`accounts.csv`** — Export "Detailed Account Transaction Report" from Xero:
- Rename columns to: `code  account  Date  Type  Transaction  Reference  Gross  Sales Tax  Net  Sales Tax Rate  Sales Tax Name  Fund  Department`
- Delete header rows above the data
- Ensure `Gross` column is numeric (not currency-formatted)
- Rename `Account Code` → `code`, `Account` → `account`
- Sort by date

**`contacts{year}.csv`** — Export "Income by Contact" report:
- Add headers: `name  amount`
- Save as e.g. `contacts2024.csv`

**`emailList{year}.csv`** — Export from Xero "Contact List":
- Rename columns to: `name  email`
- Save as e.g. `emailList2024.csv`

Click "Check Manual Files" to verify the app can find them.

### Step 4 — Generate Receipts
Click "Generate Receipts". DOCX files are written to `out/`. A summary card shows:
- Number of receipts generated / donors skipped (below $75 threshold)
- Total raised, average donation, average transactions per donor
- Largest and smallest giver

### Step 5 — Convert to PDF

**macOS (LibreOffice):**
```bash
cd out
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to pdf *.docx
```

**Windows:**
Run `toPdfOnWindows/doc2pdf.vbs`

> Note: Donor names must not contain `/` or other special characters that would break file paths.

### Step 6 — Send Emails
- **Send Sample to Myself** — sends the first donor's receipt to your own address for a formatting check
- **Send Next N** — sends to the next N unsent donors (configurable batch size)
- **Send All Remaining** — sends to everyone not yet sent (requires confirmation)

Sent status is tracked in `out/sent.json` so batches resume correctly across sessions.

---

## Gmail OAuth Setup

The app uses Gmail OAuth2 via the Google OAuth Playground (no Google Cloud billing required).

1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. In settings (⚙️), check "Use your own OAuth credentials" and enter your Client ID + Secret
3. Step 1: Select `https://mail.google.com/` and click Authorize
4. Step 2: Click "Exchange authorization code for tokens" — copy the **Refresh Token** and **Access Token**
5. Paste all four values (Client ID, Client Secret, Refresh Token, Access Token) into the web UI

**Where to find Client ID / Secret:**
[Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) — look for the OAuth 2.0 Client ID for the `glc-mailer` project.

### Optional: Upgrade to a Proper Google Cloud App

The OAuth Playground approach works fine for once-a-year use. For a more robust setup (tokens that never expire and refresh automatically):

1. In Google Cloud Console, create a new OAuth 2.0 Client (type: Web Application)
2. Set the OAuth consent screen to **Internal** (requires Google Workspace — which GLC already has)
   - Internal apps skip Google's verification process entirely
   - Only users in your Google Workspace org can authorize
3. Add `http://localhost:3737/auth/callback` as an authorized redirect URI
4. Enable the Gmail API

This is free and takes about 15 minutes. No app review or billing required for internal apps.

---

## Development

```bash
npm test          # Run all tests
npm run test:watch  # Watch mode
```

Tests live in `tests/`. Fixtures are in `tests/fixtures/`.

---

## Notes

- `input/`, `out/`, and `config.json` are all git-ignored
- The $75 minimum threshold for receipt generation is defined in `readTransactions.js`
- Deductible account codes are listed in `readTransactions.js` (`deductibleCodes` array)
- DOCX output filenames: `GLC_Contribution_Receipt_{year}_{name}.docx` and `..._pg2_{name}.docx`
