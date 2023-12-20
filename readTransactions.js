var utils = require('./utils');
const path = require('path');
const csvAccounts = path.resolve(__dirname, 'input', 'accounts.csv');
const csvFilePath = path.resolve(__dirname, 'input', 'contacts2023.csv');
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

async function run() {
    const contacts = await utils.read(csvFilePath);
    const accounts = await utils.read(csvAccounts);
    try {
        accounts.forEach((account) => {
            if (_.includes(deductibleCodes, account.code)) {
                account.name = _.split(account.Transaction, ' - ')[0];
                const contact = _.find(contacts, (c) => { 
                    return c.name?.toLowerCase() === account.name.toLowerCase();
                });
                if (contact) {
                    // console.log(contact.items);
                    if (!Array.isArray(contact.items)) {
                        contact.items = [];
                    }
                    // console.log(contact);
                    // console.log(account);
                    contact.items.push(account);
                }
            }
        });
        contacts.forEach(async (contact) => {
            contact.total = _.sumBy(contact.items, (account) => {
                return parseFloat(account.Gross);
            });
            contact.total = contact.total.toFixed();
            console.log(contact.total);
            if (contact.total >= 75) {
                const doc = await utils.loadTemplate(path.resolve(__dirname, '2023 Giving Receipts.docx'));
                doc.setData({
                    name: contact.name,
                });
                await utils.writeDoc(doc, contact.name);
                const doc2 = await utils.loadTemplate(path.resolve(__dirname, '2023 Giving ReceiptsPg2.docx'));
            
                doc2.setData({
                    name: contact.name,
                    items: contact.items,
                    total: contact.total,
                });
                await utils.writeDocPg2(doc2, contact.name);
            }
        });
    } catch (err) {
        console.log(err);
    }

    //console.log(contact);
}

run();


//set the templateVariables
