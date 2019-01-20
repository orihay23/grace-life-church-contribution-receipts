var utils = require('./utils');
const path = require('path');
const csvAccounts = path.resolve(__dirname, 'input', 'accounts.csv');
const csvFilePath = path.resolve(__dirname, 'input', 'contacts2018.csv');
const _ = require('lodash');

const deductibleCodes = [
    '1000',
    '1001',
    '1002',
    '1003',
    '3000',
    '3001',
    '3002',
    '3004',
    '4000',
    '4001',
    '5002',
];

async function run() {
    const contacts = await utils.read(csvFilePath);
    const accounts = await utils.read(csvAccounts);
    // console.log(accounts[0]);
    accounts.forEach((account) => {
        if (_.includes(deductibleCodes, account.code)) {
            account.name = _.split(account.Transaction, ' - ')[0];
            const contact = _.find(contacts, { name: account.name });
            if (contact) {
                if (contact.items === '') {
                    contact.items = [];
                }
                contact.items.push(account);
            }
        }
    });
    const first = contacts[0];
    first.total = _.sumBy(first.items, (item) => {
        return parseFloat(item.Gross);
    });
    const doc = await utils.loadTemplate(path.resolve(__dirname, '2018 Giving ReceiptsPg2.docx'));

    doc.setData({
        name: first.name,
        items: first.items,
        fund: first.Fund,
        fund: first.Gross,
    });
    await utils.writeDocPg2(doc, first.name);
    console.log(first);
}

run();


//set the templateVariables
