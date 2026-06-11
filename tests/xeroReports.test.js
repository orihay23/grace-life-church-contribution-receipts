const fs = require('fs');
const path = require('path');

jest.mock('../xero/auth', () => ({
    getClient: jest.fn(),
    getAuthUrl: jest.fn(),
    startAuthFlow: jest.fn(),
}));

jest.mock('../config', () => ({
    all: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setAll: jest.fn(),
}));

const { getClient } = require('../xero/auth');
const config = require('../config');
const { downloadAccountsAndContacts, downloadEmailList } = require('../xero/reports');
const fixtures = require('./fixtures/xeroApiResponses');

// Parse a CSV string into an array of objects keyed by header name.
// NOTE: does not handle quoted fields containing commas — sufficient for these fixtures.
function parseCsv(content) {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map((line) => {
        const values = line.split(',');
        return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });
}

function csvLines(content) {
    return content.trim().split('\n');
}

// ─── downloadAccountsAndContacts ─────────────────────────────────────────────

describe('downloadAccountsAndContacts', () => {
    let mockClient;
    let writtenFiles;

    beforeEach(() => {
        writtenFiles = {};
        jest.spyOn(fs, 'writeFileSync').mockImplementation((filePath, content) => {
            writtenFiles[path.basename(String(filePath))] = content;
        });
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});

        mockClient = {
            accountingApi: {
                getAccounts: jest.fn().mockResolvedValue({ body: { accounts: fixtures.accounts } }),
                getContacts: jest.fn().mockResolvedValue({ body: { contacts: fixtures.contacts } }),
                getBankTransactions: jest.fn().mockResolvedValue({ body: { bankTransactions: fixtures.bankTransactions } }),
            },
        };
        getClient.mockResolvedValue(mockClient);
        config.all.mockReturnValue({ xeroTenantId: 'tenant-123' });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('writes accounts.csv with correct headers and one row per line item', async () => {
        await downloadAccountsAndContacts(2024);

        expect(writtenFiles['accounts.csv']).toBeDefined();
        const lines = csvLines(writtenFiles['accounts.csv']);
        expect(lines[0]).toBe('code,account,Date,Type,Transaction,Reference,Gross,Name');
        expect(lines).toHaveLength(4); // header + 3 line items across 2 transactions
    });

    it('sets Type to RECEIVE for every row', async () => {
        await downloadAccountsAndContacts(2024);
        const rows = parseCsv(writtenFiles['accounts.csv']);
        rows.forEach((row) => expect(row.Type).toBe('RECEIVE'));
    });

    it('populates Name from bankTransaction.contact.name (not description)', async () => {
        await downloadAccountsAndContacts(2024);
        const rows = parseCsv(writtenFiles['accounts.csv']);
        expect(rows.filter((r) => r.Name === 'John Smith')).toHaveLength(2);
        expect(rows.filter((r) => r.Name === 'Jane Doe')).toHaveLength(1);
    });

    it('populates the account column from the accounts code→name map', async () => {
        await downloadAccountsAndContacts(2024);
        const rows = parseCsv(writtenFiles['accounts.csv']);
        const row1000 = rows.find((r) => r.code === '1000');
        expect(row1000.account).toBe('General Offering');
        const row4000 = rows.find((r) => r.code === '4000');
        expect(row4000.account).toBe('Building Fund');
    });

    it('parses an ISO date string to YYYY-MM-DD', async () => {
        await downloadAccountsAndContacts(2024);
        const rows = parseCsv(writtenFiles['accounts.csv']);
        // First fixture transaction: 2024-03-15T00:00:00
        const johnRow = rows.find((r) => r.Name === 'John Smith');
        expect(johnRow.Date).toBe('2024-03-15');
    });

    it('parses a /Date(ms)/ string to YYYY-MM-DD', async () => {
        await downloadAccountsAndContacts(2024);
        const rows = parseCsv(writtenFiles['accounts.csv']);
        // Second fixture transaction: /Date(1704326400000)/ = 2024-01-04 UTC
        const janeRow = rows.find((r) => r.Name === 'Jane Doe');
        expect(janeRow.Date).toBe('2024-01-04');
    });

    it('aggregates contacts.csv totals per contact name', async () => {
        await downloadAccountsAndContacts(2024);

        expect(writtenFiles['contacts2024.csv']).toBeDefined();
        const rows = parseCsv(writtenFiles['contacts2024.csv']);
        const john = rows.find((r) => r.name === 'John Smith');
        const jane = rows.find((r) => r.name === 'Jane Doe');
        expect(john.amount).toBe('700.00'); // 500 + 200
        expect(jane.amount).toBe('250.00');
    });

    it('paginates: fetches subsequent pages until a short page is returned', async () => {
        const page1 = Array.from({ length: 100 }, (_, i) => ({
            date: '2024-06-01T00:00:00',
            reference: '',
            contact: { name: `Donor ${i}` },
            lineItems: [{ accountCode: '1000', description: '', lineAmount: 10 }],
        }));

        mockClient.accountingApi.getBankTransactions
            .mockResolvedValueOnce({ body: { bankTransactions: page1 } })
            .mockResolvedValueOnce({ body: { bankTransactions: fixtures.bankTransactions } }); // 2 txns = short page

        const result = await downloadAccountsAndContacts(2024);

        expect(mockClient.accountingApi.getBankTransactions).toHaveBeenCalledTimes(2);
        expect(mockClient.accountingApi.getBankTransactions).toHaveBeenNthCalledWith(
            1, 'tenant-123', undefined, expect.any(String), undefined, 1
        );
        expect(mockClient.accountingApi.getBankTransactions).toHaveBeenNthCalledWith(
            2, 'tenant-123', undefined, expect.any(String), undefined, 2
        );
        expect(result.txnLines).toBe(103); // 100 from page1 + 3 line items from page2
    });

    it('handles empty results — writes header-only CSVs and returns txnLines: 0', async () => {
        mockClient.accountingApi.getBankTransactions.mockResolvedValue({ body: { bankTransactions: [] } });

        const result = await downloadAccountsAndContacts(2024);

        expect(result.txnLines).toBe(0);
        expect(csvLines(writtenFiles['accounts.csv'])).toHaveLength(1);
        expect(csvLines(writtenFiles['contacts2024.csv'])).toHaveLength(1);
    });

    it('returns contacts for the caller to pass to downloadEmailList', async () => {
        const result = await downloadAccountsAndContacts(2024);
        expect(result.contacts).toEqual(fixtures.contacts);
    });
});

// ─── downloadEmailList ────────────────────────────────────────────────────────

describe('downloadEmailList', () => {
    let mockClient;
    let writtenFiles;

    beforeEach(() => {
        jest.clearAllMocks();
        writtenFiles = {};
        jest.spyOn(fs, 'writeFileSync').mockImplementation((filePath, content) => {
            writtenFiles[path.basename(String(filePath))] = content;
        });
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});

        mockClient = {
            accountingApi: {
                getContacts: jest.fn().mockResolvedValue({ body: { contacts: fixtures.contacts } }),
            },
        };
        getClient.mockResolvedValue(mockClient);
        config.all.mockReturnValue({ xeroTenantId: 'tenant-123' });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('writes only contacts that have an email address', async () => {
        await downloadEmailList(2024, fixtures.contacts);

        const lines = csvLines(writtenFiles['emailList2024.csv']);
        expect(lines[0]).toBe('name,email');
        expect(lines).toHaveLength(3); // header + 2 contacts with email
        expect(writtenFiles['emailList2024.csv']).toContain('John Smith');
        expect(writtenFiles['emailList2024.csv']).toContain('Jane Doe');
        expect(writtenFiles['emailList2024.csv']).not.toContain('No Email Guy');
    });

    it('does NOT call getClient or getContacts when contacts are passed in', async () => {
        await downloadEmailList(2024, fixtures.contacts);
        expect(getClient).not.toHaveBeenCalled();
    });

    it('calls getContacts itself when no contacts argument is provided', async () => {
        await downloadEmailList(2024);
        expect(mockClient.accountingApi.getContacts).toHaveBeenCalledTimes(1);
        expect(writtenFiles['emailList2024.csv']).toBeDefined();
    });
});
