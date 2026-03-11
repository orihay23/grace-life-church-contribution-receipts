const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const config = require('../../config');

const ROOT = path.resolve(__dirname, '..', '..');

async function createTransporter() {
    const cfg = config.all();
    const oauth2Client = new google.auth.OAuth2(
        cfg.clientId,
        cfg.clientSecret,
        'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({ refresh_token: cfg.refreshToken });

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: cfg.email,
            accessToken: cfg.accessToken,
            clientId: cfg.clientId,
            clientSecret: cfg.clientSecret,
            refreshToken: cfg.refreshToken,
        },
        tls: { rejectUnauthorized: false },
    });
}

function emailBody(name, year) {
    return `Dear ${name},

Attached please find your ${year} GLC Contribution Receipt. We are so grateful for your faithful support of the Grace Life Church.

If you believe there are any errors with your receipt (including any contact information that has changed in the past year), please do not hesitate to email us and we will work to fix it quickly.

Also, if you would like a copy of the receipt mailed to you, please let us know.

Thank you for supporting Grace Life Church!
GLC Finance Team`;
}

function buildMessage(person, year, toOverride) {
    const cfg = config.all();
    const pg1Path = path.resolve(ROOT, 'out', `GLC_Contribution_Receipt_${year}_${person.name}.pdf`);
    const pg2Path = path.resolve(ROOT, 'out', `GLC_Contribution_Receipt_${year}_pg2_${person.name}.pdf`);

    if (!fs.existsSync(pg1Path)) {
        throw new Error(`PDF not found for ${person.name} (page 1). Convert DOCX to PDF first.`);
    }

    const attachments = [{ filename: 'receiptPg1.pdf', content: fs.readFileSync(pg1Path) }];
    if (fs.existsSync(pg2Path)) {
        attachments.push({ filename: 'receiptPg2.pdf', content: fs.readFileSync(pg2Path) });
    }

    return {
        from: cfg.email,
        to: toOverride || person.email,
        subject: `${year} Grace Life Church Contribution Receipt`,
        text: emailBody(person.name, year),
        attachments,
    };
}

function markSent(name) {
    const sentPath = path.resolve(ROOT, 'out', 'sent.json');
    const sent = fs.existsSync(sentPath) ? JSON.parse(fs.readFileSync(sentPath, 'utf8')) : {};
    sent[name] = new Date().toISOString();
    fs.writeFileSync(sentPath, JSON.stringify(sent, null, 2));
}

function getEmailList(year) {
    const csvPath = path.resolve(ROOT, 'input', `emailList${year}.csv`);
    if (!fs.existsSync(csvPath)) {
        throw new Error(`Email list not found: input/emailList${year}.csv`);
    }
    const csv = require('../../utils');
    return csv.read(csvPath);
}

function getResultsDonors() {
    const resultsPath = path.resolve(ROOT, 'out', 'results.json');
    if (!fs.existsSync(resultsPath)) throw new Error('No results found. Run generation first.');
    return JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
}

function getSentMap() {
    const sentPath = path.resolve(ROOT, 'out', 'sent.json');
    return fs.existsSync(sentPath) ? JSON.parse(fs.readFileSync(sentPath, 'utf8')) : {};
}

// POST /api/email/test — send a sample to your own address
router.post('/test', async (req, res) => {
    try {
        const cfg = config.all();
        const year = cfg.year || new Date().getFullYear();
        const { donorName } = req.body;

        const { donors } = getResultsDonors();
        const donor = donorName
            ? donors.find((d) => d.name === donorName)
            : donors[0];

        if (!donor) return res.status(404).json({ error: 'No donor found' });

        const transporter = await createTransporter();
        const message = buildMessage(donor, year, cfg.email); // send to self
        await transporter.sendMail(message);
        res.json({ ok: true, sentTo: cfg.email, donor: donor.name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/email/send — send to next N unsent donors (or specific name)
router.post('/send', async (req, res) => {
    try {
        const cfg = config.all();
        const year = cfg.year || new Date().getFullYear();
        const batchSize = req.body.batchSize || 10;
        const targetName = req.body.donorName; // optional: send to one specific person

        const emailList = await getEmailList(year);
        const { donors } = getResultsDonors();
        const sent = getSentMap();

        // Build a name→email map
        const emailMap = {};
        emailList.forEach((p) => { if (p.name && p.email) emailMap[p.name.toLowerCase()] = p.email; });

        let queue = donors.filter((d) => !sent[d.name]);
        if (targetName) queue = queue.filter((d) => d.name === targetName);
        const batch = queue.slice(0, targetName ? queue.length : batchSize);

        if (!batch.length) return res.json({ ok: true, sent: [], message: 'No unsent donors in queue' });

        const transporter = await createTransporter();
        const results = [];

        for (const donor of batch) {
            const email = emailMap[donor.name.toLowerCase()];
            if (!email) {
                results.push({ name: donor.name, error: 'No email address found' });
                continue;
            }
            try {
                const message = buildMessage({ ...donor, email }, year);
                await transporter.sendMail(message);
                markSent(donor.name);
                results.push({ name: donor.name, email, ok: true });
            } catch (err) {
                results.push({ name: donor.name, email, error: err.message });
            }
        }

        res.json({ ok: true, sent: results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
