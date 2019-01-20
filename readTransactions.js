var utils = require('./utils');
const path = require('path');
const csvAccounts = path.resolve(__dirname, 'input', 'accounts.csv');
const csvFilePath = path.resolve(__dirname, 'input', 'contacts2018.csv');
const _ = require('lodash');

async function run() {
    const contacts = await utils.read(csvFilePath);
    const accounts = await utils.read(csvAccounts);
    // console.log(accounts[0]);
    accounts.forEach((account) => {
        account.name = _.split(account.Transaction, ' - ')[0];
        const contact = _.find(contacts, { name: account.name });
        if (contact) {
            if (contact.items === '') {
                contact.items = [];
            }
            contact.items.push(account);
        }
        // console.log(contacts);
    //     if (parseFloat(contact.amount) >= 75) {
    //         const doc = await utils.loadTemplate(path.resolve(__dirname, '2018 Giving Receipts.docx'));
    //         doc.setData({
    //             name: contact.name,
    //         });
    //         await utils.writeDoc(doc, contact.name);
    //     }
    });
    const first = contacts[0];
    const doc = await utils.loadTemplate(path.resolve(__dirname, '2018 Giving ReceiptsPg2.docx'));
    doc.setData({
        name: first.name,
        items: first.items,
    });
    await utils.writeDocPg2(doc, first.name);
    console.log(first);
}

run();


//set the templateVariables


