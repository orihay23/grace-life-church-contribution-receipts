/**
 * Xero report downloads.
 *
 * Reconstructs the two CSV files the app needs from Xero API data:
 *
 *  accounts.csv  — built from Journal lines filtered to the given year,
 *                  matching the "Detailed Account Transaction Report" shape:
 *                  code, account, Date, Type, Transaction, Reference, Gross, Name
 *
 *  contacts{year}.csv — built from aggregating journal lines per contact:
 *                  name, amount (total for year)
 *
 *  emailList{year}.csv — built from the Contacts API:
 *                  name, email
 *
 * Notes:
 *  - Xero Journals API paginates at 100 records; we fetch all pages.
 *  - Journal lines don't always carry a contact name; we cross-reference
 *    with the Contacts API using ContactID where available.
 *  - The caller should catch and surface errors.
 */

const fs = require('fs');
const path = require('path');
const { getClient } = require('./auth');
const config = require('../config');

const ROOT = path.resolve(__dirname, '..');

function ensureInputDir() {
    const dir = path.resolve(ROOT, 'input');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
}

function toCsvRow(values) {
    return values.map((v) => {
        const s = String(v == null ? '' : v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    }).join(',');
}

function writeCsv(filePath, headers, rows) {
    const lines = [headers.join(','), ...rows.map(toCsvRow)];
    fs.writeFileSync(filePath, lines.join('\n'));
}

/**
 * Fetch all journals for the year from Xero and write accounts.csv.
 * Returns an array of { name, total } objects for building contacts CSV.
 */
async function downloadAccountsAndContacts(year) {
    ensureInputDir();

    const client = await getClient();
    const cfg = config.all();
    const tenantId = cfg.xeroTenantId;
    if (!tenantId) throw new Error('No Xero tenant found. Reconnect via "Connect & Download from Xero".');

    // Date range for the year
    const fromDate = `${year}-01-01`;
    const toDate = `${year}-12-31`;

    // Fetch contacts map (id → name) for cross-referencing
    const contactsResp = await client.accountingApi.getContacts(tenantId);
    const contactMap = {};
    for (const c of (contactsResp.body?.contacts || [])) {
        if (c.contactID && c.name) {
            contactMap[c.contactID] = { name: c.name, email: c.emailAddress || '' };
        }
    }

    // Fetch all journal pages
    let offset = 0;
    const allJournalLines = [];

    while (true) {
        const resp = await client.accountingApi.getJournals(
            tenantId,
            undefined, // ifModifiedSince
            offset,
        );
        const journals = resp.body?.journals || [];
        if (!journals.length) break;

        for (const journal of journals) {
            const journalDate = journal.journalDate ? new Date(journal.journalDate) : null;
            if (!journalDate) continue;
            if (journalDate.getFullYear() !== parseInt(year)) continue;

            const dateStr = journalDate.toISOString().split('T')[0];

            for (const line of (journal.journalLines || [])) {
                // Resolve contact name
                let contactName = '';
                if (line.contactID && contactMap[line.contactID]) {
                    contactName = contactMap[line.contactID].name;
                } else if (line.description) {
                    // Some orgs embed the name in the description
                    contactName = line.description;
                }

                allJournalLines.push({
                    code: line.accountCode || '',
                    account: line.accountName || '',
                    Date: dateStr,
                    Type: journal.sourceType || '',
                    Transaction: line.description || '',
                    Reference: journal.reference || '',
                    Gross: line.grossAmount != null ? line.grossAmount : (line.netAmount || ''),
                    Name: contactName,
                });
            }
        }

        if (journals.length < 100) break;
        offset += journals.length;
    }

    // Write accounts.csv
    const accountsPath = path.resolve(ROOT, 'input', 'accounts.csv');
    writeCsv(
        accountsPath,
        ['code', 'account', 'Date', 'Type', 'Transaction', 'Reference', 'Gross', 'Name'],
        allJournalLines.map((l) => [l.code, l.account, l.Date, l.Type, l.Transaction, l.Reference, l.Gross, l.Name])
    );

    // Build contacts{year}.csv by aggregating Gross per contact name
    const totalsMap = {};
    for (const line of allJournalLines) {
        if (!line.Name) continue;
        if (!totalsMap[line.Name]) totalsMap[line.Name] = 0;
        totalsMap[line.Name] += parseFloat(line.Gross) || 0;
    }

    const contactsPath = path.resolve(ROOT, 'input', `contacts${year}.csv`);
    const contactRows = Object.entries(totalsMap).map(([name, amount]) => [name, amount.toFixed(2)]);
    writeCsv(contactsPath, ['name', 'amount'], contactRows);

    return { accountsPath, contactsPath, journalLines: allJournalLines.length };
}

/**
 * Download the contact list with emails and write emailList{year}.csv.
 */
async function downloadEmailList(year) {
    ensureInputDir();

    const client = await getClient();
    const cfg = config.all();
    const tenantId = cfg.xeroTenantId;
    if (!tenantId) throw new Error('No Xero tenant found.');

    const resp = await client.accountingApi.getContacts(tenantId);
    const contacts = resp.body?.contacts || [];

    const rows = contacts
        .filter((c) => c.name && c.emailAddress)
        .map((c) => [c.name, c.emailAddress]);

    const emailListPath = path.resolve(ROOT, 'input', `emailList${year}.csv`);
    writeCsv(emailListPath, ['name', 'email'], rows);

    return { emailListPath, count: rows.length };
}

module.exports = { downloadAccountsAndContacts, downloadEmailList };
