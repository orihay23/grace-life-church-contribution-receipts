var utils = require('./utils');
const path = require('path');
const csvFilePath = path.resolve(__dirname, 'input', 'contacts2022.csv');

async function run() {
    const contacts = await utils.read(csvFilePath);
    contacts.forEach(async (contact) => {
        if (parseFloat(contact.amount) >= 75) {
            // console.log(contact.name);
            const doc = await utils.loadTemplate(path.resolve(__dirname, '2022 Giving Receipts.docx'));
            doc.setData({
                name: contact.name,
            });
            await utils.writeDoc(doc, contact.name);
        }
    });
}

run();


//set the templateVariables


