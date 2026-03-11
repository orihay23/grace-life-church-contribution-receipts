var utils = require('./utils');
const path = require('path');
const _ = require('lodash');

const deductibleCodes = [
    '1000',
    '1001',
    '1002',
    '1003',
    '3000',
    '3001',
    '3002',
    '3003',
    '3004',
    '3005',
    '4000',
    '4001',
    '5002',
];

function filterDeductible(accounts) {
    return accounts.filter((account) => _.includes(deductibleCodes, account.code));
}

function matchContactsToTransactions(contacts, accounts) {
    const result = contacts.map((c) => ({ ...c }));
    const deductible = filterDeductible(accounts);
    deductible.forEach((account) => {
        const contact = _.find(result, (c) => {
            return c.name?.toLowerCase() === account.Name?.toLowerCase();
        });
        if (contact) {
            if (!Array.isArray(contact.items)) {
                contact.items = [];
            }
            contact.items.push(account);
        }
    });
    return result;
}

function computeTotals(contacts) {
    return contacts.map((contact) => {
        if (!(contact.items && contact.items.length)) {
            return { ...contact, total: '0.00' };
        }
        let runningSum = 0.0;
        for (const item of contact.items) {
            runningSum += parseFloat(item.Gross);
        }
        return { ...contact, total: runningSum.toFixed(2) };
    });
}

async function run() {
    const config = require('./config');
    const year = config.get('year') || new Date().getFullYear();
    const csvAccounts = path.resolve(__dirname, 'input', 'accounts.csv');
    const csvFilePath = path.resolve(__dirname, 'input', `contacts${year}.csv`);

    const contacts = await utils.read(csvFilePath);
    const accounts = await utils.read(csvAccounts);
    try {
        const matched = matchContactsToTransactions(contacts, accounts);
        const withTotals = computeTotals(matched);

        for (const contact of withTotals) {
            console.log(`${contact.name} ${contact.total}`);
            if (contact.total >= 75) {
                const doc = await utils.loadTemplate(
                    path.resolve(__dirname, config.get('templatePg1') || `${year} Giving Receipts.docx`)
                );
                doc.setData({ name: contact.name });
                await utils.writeDoc(doc, contact.name, year);

                const doc2 = await utils.loadTemplate(
                    path.resolve(__dirname, config.get('templatePg2') || `${year} Giving ReceiptsPg2.docx`)
                );
                doc2.setData({
                    name: contact.name,
                    items: contact.items,
                    total: contact.total,
                });
                await utils.writeDocPg2(doc2, contact.name, year);
            }
        }
    } catch (err) {
        console.log(err);
    }
}

if (require.main === module) {
    run();
}

module.exports = { filterDeductible, matchContactsToTransactions, computeTotals, deductibleCodes };

//set the templateVariables
