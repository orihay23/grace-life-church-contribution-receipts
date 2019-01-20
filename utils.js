const csv = require('csvtojson');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const Docxtemplater = require('docxtemplater');

async function read(csvFilePath) {
    return await csv().fromFile(csvFilePath);
}

async function loadTemplate(docPath) {
    var content = fs
    .readFileSync(docPath, 'binary');
    var zip = new JSZip(content);

    var doc = new Docxtemplater();
    doc.loadZip(zip);
    return doc;
}

async function writeDoc(doc, name) {
    try {
        // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
        doc.render()
    }
    catch (error) {
        var e = {
            message: error.message,
            name: error.name,
            stack: error.stack,
            properties: error.properties,
        }
        console.log(JSON.stringify({error: e}));
        // The error thrown here contains additional information when logged with JSON.stringify (it contains a property object).
        throw error;
    }
    
    var buf = doc.getZip()
                 .generate({type: 'nodebuffer'});
    
    // buf is a nodejs buffer, you can either write it to a file or do anything else with it.
    // console.log(path.resolve(__dirname, 'out', `GLC_Contribution_Receipt_2019_${name}.docx`));
    fs.writeFileSync(path.resolve(__dirname, 'out', `GLC_Contribution_Receipt_2019_pg2_${name}.docx`), buf);
}

async function writeDocPg2(doc, name) {
    try {
        // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
        doc.render()
    }
    catch (error) {
        var e = {
            message: error.message,
            name: error.name,
            stack: error.stack,
            properties: error.properties,
        }
        console.log(JSON.stringify({error: e}));
        // The error thrown here contains additional information when logged with JSON.stringify (it contains a property object).
        throw error;
    }
    
    var buf = doc.getZip()
                 .generate({type: 'nodebuffer'});
    
    // buf is a nodejs buffer, you can either write it to a file or do anything else with it.
    // console.log(path.resolve(__dirname, 'out', `GLC_Contribution_Receipt_2019_${name}.docx`));
    fs.writeFileSync(path.resolve(__dirname, 'out', `GLC_Contribution_Receipt_2019_pg2_${name}.docx`), buf);
}
 
module.exports = {
    loadTemplate,
    read,
    writeDoc,
    writeDocPg2,
}