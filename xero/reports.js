/**
 * Xero report downloads.
 *
 * Builds the three CSV files the app needs from Xero API data:
 *
 *  accounts.csv        — one row per line item on a RECEIVE bank transaction,
 *                        matching the shape readTransactions.js expects:
 *                        code, account, Date, Type, Transaction, Reference, Gross, Name
 *
 *  contacts{year}.csv  — aggregated total per contact name for the year:
 *                        name, amount
 *
 *  emailList{year}.csv — contact list with email addresses:
 *                        name, email
 *
 * Notes:
 *  - Uses the Bank Transactions API (accounting.banktransactions.read scope),
 *    which works under Xero's granular scopes available to all apps created
 *    on or after 2 March 2026. The previous Journals approach required a
 *    premium scope that is no longer available to new apps.
 *  - Donations must be entered as Receive Money / bank transactions in Xero,
 *    coded to income account codes.
 *  - Pagination: Bank Transactions uses page-based pagination (100/page).
 *  - getContacts is called once and shared between downloadAccountsAndContacts
 *    and downloadEmailList to avoid a redundant API round-trip.
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

function formatDate(xeroDate) {
    if (!xeroDate) return '';
    // Xero returns dates as "/Date(ms)/" or ISO strings depending on SDK version
    if (typeof xeroDate === 'string' && xeroDate.startsWith('/Date(')) {
        const ms = parseInt(xeroDate.replace(/\/Date\((\d+)[^)]*\)\//, '$1'));
        return new Date(ms).toISOString().split('T')[0];
    }
    return new Date(xeroDate).toISOString().split('T')[0];
}

/**
 * Fetch all RECEIVE bank transactions for the year and write accounts.csv +
 * contacts{year}.csv. Returns the contacts list so downloadEmailList can reuse it.
 */
async function downloadAccountsAndContacts(year) {
    ensureInputDir();

    const client = await getClient();
    const cfg = config.all();
    const tenantId = cfg.xeroTenantId;
    if (!tenantId) throw new Error('No Xero tenant found. Reconnect via "Connect & Download from Xero".');

    // Fetch account code → name map for populating the 'account' column
    const accountsResp = await client.accountingApi.getAccounts(tenantId);
    const accountMap = {};
    for (const a of (accountsResp.body?.accounts || [])) {
        if (a.code) accountMap[a.code] = a.name || '';
    }

    // Fetch all contacts once — reused by downloadEmailList
    const contactsResp = await client.accountingApi.getContacts(tenantId);
    const allContacts = contactsResp.body?.contacts || [];

    // Page through RECEIVE bank transactions for the year.
    // Xero date filter uses its own DateTime() syntax in the where clause.
    const nextYear = parseInt(year) + 1;
    const where = `Type=="RECEIVE"&&Date>=DateTime(${year},01,01)&&Date<DateTime(${nextYear},01,01)`;

    let page = 1;
    const allLines = [];

    while (true) {
        const resp = await client.accountingApi.getBankTransactions(
            tenantId,
            undefined, // ifModifiedSince
            where,
            undefined, // order
            page,
        );
        const txns = resp.body?.bankTransactions || [];
        if (!txns.length) break;

        for (const txn of txns) {
            const dateStr = formatDate(txn.date);
            const contactName = txn.contact?.name || '';
            const reference = txn.reference || '';

            for (const line of (txn.lineItems || [])) {
                allLines.push({
                    code: line.accountCode || '',
                    account: accountMap[line.accountCode] || '',
                    Date: dateStr,
                    Type: 'RECEIVE',
                    Transaction: line.description || '',
                    Reference: reference,
                    Gross: line.lineAmount != null ? line.lineAmount : '',
                    Name: contactName,
                });
            }
        }

        if (txns.length < 100) break;
        page += 1;
    }

    // Write accounts.csv
    const accountsPath = path.resolve(ROOT, 'input', 'accounts.csv');
    writeCsv(
        accountsPath,
        ['code', 'account', 'Date', 'Type', 'Transaction', 'Reference', 'Gross', 'Name'],
        allLines.map((l) => [l.code, l.account, l.Date, l.Type, l.Transaction, l.Reference, l.Gross, l.Name])
    );

    // Build contacts{year}.csv by aggregating Gross per contact name
    const totalsMap = {};
    for (const line of allLines) {
        if (!line.Name) continue;
        if (!totalsMap[line.Name]) totalsMap[line.Name] = 0;
        totalsMap[line.Name] += parseFloat(line.Gross) || 0;
    }

    const contactsPath = path.resolve(ROOT, 'input', `contacts${year}.csv`);
    const contactRows = Object.entries(totalsMap).map(([name, amount]) => [name, amount.toFixed(2)]);
    writeCsv(contactsPath, ['name', 'amount'], contactRows);

    return { accountsPath, contactsPath, txnLines: allLines.length, contacts: allContacts };
}

/**
 * Write emailList{year}.csv from a contacts list.
 * Accepts the contacts array returned by downloadAccountsAndContacts to avoid
 * a second getContacts API call when both are run together.
 */
async function downloadEmailList(year, contacts) {
    ensureInputDir();

    let contactList = contacts;
    if (!contactList) {
        // Standalone call — fetch contacts ourselves
        const client = await getClient();
        const cfg = config.all();
        const tenantId = cfg.xeroTenantId;
        if (!tenantId) throw new Error('No Xero tenant found.');
        const resp = await client.accountingApi.getContacts(tenantId);
        contactList = resp.body?.contacts || [];
    }

    const rows = contactList
        .filter((c) => c.name && c.emailAddress)
        .map((c) => [c.name, c.emailAddress]);

    const emailListPath = path.resolve(ROOT, 'input', `emailList${year}.csv`);
    writeCsv(emailListPath, ['name', 'email'], rows);

    return { emailListPath, count: rows.length };
}

module.exports = { downloadAccountsAndContacts, downloadEmailList };
