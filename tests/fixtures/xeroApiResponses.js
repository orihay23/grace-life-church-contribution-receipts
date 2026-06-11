// Fixtures shaped like xero-node v18 accountingApi response bodies.
// Used by tests/xeroReports.test.js.

exports.accounts = [
    { code: '1000', name: 'General Offering' },
    { code: '4000', name: 'Building Fund' },
    { code: '9999', name: 'Non-Deductible' },
];

exports.contacts = [
    { contactID: 'abc', name: 'John Smith',   emailAddress: 'john@example.com' },
    { contactID: 'def', name: 'Jane Doe',     emailAddress: 'jane@example.com' },
    { contactID: 'ghi', name: 'No Email Guy', emailAddress: '' },
];

// Two transactions, three line items total.
// First uses an ISO date string; second uses Xero's /Date(ms)/ format.
// 1704326400000 ms = 2024-01-04 00:00:00 UTC
exports.bankTransactions = [
    {
        date: '2024-03-15T00:00:00',
        reference: 'REF-001',
        contact: { name: 'John Smith' },
        lineItems: [
            { accountCode: '1000', description: 'Weekly tithe',    lineAmount: 500.00 },
            { accountCode: '4000', description: 'Building pledge', lineAmount: 200.00 },
        ],
    },
    {
        date: '/Date(1704326400000)/',
        reference: 'REF-002',
        contact: { name: 'Jane Doe' },
        lineItems: [
            { accountCode: '1000', description: 'Donation', lineAmount: 250.00 },
        ],
    },
];
