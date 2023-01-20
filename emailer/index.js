require('dotenv').config();
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const fs = require('fs');
const path = require('path');

const createTransporter = async () => {
    const oauth2Client = new OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        "https://developers.google.com/oauthplayground",
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.REFRESH_TOKEN
    });

    // const accessToken = await new Promise((resolve, reject) => {
    //     oauth2Client.getAccessToken((err, token) => {
    //         if (err) {
    //             reject(`Failed to create access token :( ${err}`);
    //         }
    //         resolve(token);
    //     });
    // });

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.EMAIL,
            accessToken: process.env.ACCESS_TOKEN,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    return transporter;
};



const body = (name) => {
    return `Dear ${name},

Attached please find your 2022 GLC Contribution Receipt. We are so grateful for your faithful support of the Grace Life Church.

If you believe there are any errors with your receipt (including any contact information that has changed in the past year), please do not hesitate to email us and we will work to fix it quickly.

Also, if you would like a copy of the receipt mailed to you, please let us know.

Thank you for supporting Grace Life Church!
GLC Finance Team`;
};

const getPage1 = (person) => {
    try {
        return fs.readFileSync(path.resolve('..', 'out', `GLC_Contribution_Receipt_2022_${person.name}.pdf`));
    } catch (err) {
        console.log(`Error reading page 1 for ${person.name} ${err}`);
    }
};

const getPage2 = (person) => {
    try {
        return fs.readFileSync(path.resolve('..', 'out', `GLC_Contribution_Receipt_2022_pg2_${person.name}.pdf`));
    } catch (err) {
        console.log(`Error reading page 1 for ${person.name} ${err}`);
    }
};

const getMessage = (person) => {
    const pg1 = getPage1(person);
    const pg2 = getPage2(person);

    return {
        from: process.env.EMAIL,
        to: person.email,
        subject: "2022 Grace Life Church Contribution Receipt",
        text: body(person.name),
        attachments: [
            {
                filename: 'receiptPg1.pdf',
                content: pg1
            },
            {
                filename: 'receiptPg1.pdf',
                content: pg2
            },
        ]
    };
}

const run = async () => {
    const transporter = await createTransporter();

    // const people = readPeople(csv);
    const people = [{ name: 'John and Felicia Yahiro', email: 'orihay23@gmail.com' }];
    for (const person of people) {
        const message = await getMessage(person);
        console.log(message);
        await transporter.sendMail(getMessage(person));
    }
};

run();