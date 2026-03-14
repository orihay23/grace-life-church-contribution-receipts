const {
    filterDeductible,
    matchContactsToTransactions,
    computeTotals,
    deductibleCodes,
} = require('../readTransactions');

const accounts = require('./fixtures/accounts');
const contacts = require('./fixtures/contacts');

describe('filterDeductible', () => {
    it('keeps only accounts with deductible codes', () => {
        const result = filterDeductible(accounts);
        const codes = result.map((a) => a.code);
        codes.forEach((code) => expect(deductibleCodes).toContain(code));
    });

    it('removes accounts with non-deductible codes', () => {
        const result = filterDeductible(accounts);
        expect(result.find((a) => a.code === '9999')).toBeUndefined();
    });

    it('returns empty array when no accounts match', () => {
        const result = filterDeductible([{ code: '8888', Name: 'X', Gross: '100' }]);
        expect(result).toHaveLength(0);
    });

    it('returns empty array for empty input', () => {
        expect(filterDeductible([])).toHaveLength(0);
    });
});

describe('matchContactsToTransactions', () => {
    it('attaches matching transactions to contacts', () => {
        const result = matchContactsToTransactions(contacts, accounts);
        const john = result.find((c) => c.name === 'John Smith');
        expect(john.items).toHaveLength(2); // code 1000 twice
    });

    it('is case-insensitive when matching names', () => {
        const lowerContacts = [{ name: 'john smith' }];
        const result = matchContactsToTransactions(lowerContacts, accounts);
        expect(result[0].items).toHaveLength(2);
    });

    it('does not attach transactions for unmatched names', () => {
        const result = matchContactsToTransactions(contacts, accounts);
        // "No Match Person" is in accounts but not in contacts
        const noMatch = result.find((c) => c.name === 'No Match Person');
        expect(noMatch).toBeUndefined();
    });

    it('leaves contact without items when no transactions match', () => {
        const result = matchContactsToTransactions(contacts, accounts);
        // Alice Johnson only has one transaction (code 3000, $50)
        const alice = result.find((c) => c.name === 'Alice Johnson');
        expect(alice.items).toHaveLength(1);
    });

    it('does not mutate the original contacts array', () => {
        const original = contacts.map((c) => ({ ...c }));
        matchContactsToTransactions(contacts, accounts);
        contacts.forEach((c, i) => {
            expect(c.name).toBe(original[i].name);
            expect(c.items).toBeUndefined();
        });
    });

    it('skips non-deductible transactions', () => {
        const result = matchContactsToTransactions(contacts, accounts);
        const john = result.find((c) => c.name === 'John Smith');
        // code 9999 should be excluded
        john.items.forEach((item) => expect(deductibleCodes).toContain(item.code));
    });
});

describe('computeTotals', () => {
    it('sums items correctly', () => {
        const matched = matchContactsToTransactions(contacts, accounts);
        const result = computeTotals(matched);
        const john = result.find((c) => c.name === 'John Smith');
        expect(john.total).toBe('800.00'); // 500 + 300
    });

    it('returns "0.00" for contacts with no items', () => {
        const result = computeTotals([{ name: 'Empty Person' }]);
        expect(result[0].total).toBe('0.00');
    });

    it('formats total to 2 decimal places', () => {
        const contact = { name: 'Test', items: [{ Gross: '33.333' }, { Gross: '33.334' }] };
        const result = computeTotals([contact]);
        expect(result[0].total).toMatch(/^\d+\.\d{2}$/);
    });

    it('handles comma-formatted Gross values (e.g. "10,000.00")', () => {
        const contact = { name: 'Test', items: [{ Gross: '10,000.00' }] };
        const result = computeTotals([contact]);
        expect(result[0].total).toBe('10000.00');
    });

    it('does not mutate original contacts', () => {
        const input = [{ name: 'Test', items: [{ Gross: '100.00' }] }];
        computeTotals(input);
        expect(input[0].total).toBeUndefined();
    });

    it('correctly identifies donors at or above the $75 threshold', () => {
        const matched = matchContactsToTransactions(contacts, accounts);
        const withTotals = computeTotals(matched);
        const qualifying = withTotals.filter((c) => parseFloat(c.total) >= 75);
        const names = qualifying.map((c) => c.name);
        expect(names).toContain('John Smith');
        expect(names).toContain('Jane Doe');
        expect(names).toContain('Bob Williams');
        // Alice Johnson ($50) and Carol Brown ($60) are below threshold
        expect(names).not.toContain('Alice Johnson');
        expect(names).not.toContain('Carol Brown');
    });
});
