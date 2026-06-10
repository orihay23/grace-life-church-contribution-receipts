const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const utils = require('../../utils');
const config = require('../../config');
const { filterDeductible, matchContactsToTransactions, computeTotals } = require('../../readTransactions');

const ROOT = path.resolve(__dirname, '..', '..');

function computeStats(contacts) {
    const qualifying = contacts.filter((c) => parseFloat(c.total) >= 75);
    const skipped = contacts.filter((c) => c.items && c.items.length && parseFloat(c.total) < 75);
    const noTransactions = contacts.filter((c) => !c.items || !c.items.length);

    if (!qualifying.length) {
        return { qualifying: 0, skipped: skipped.length, noTransactions: noTransactions.length, totalRaised: 0 };
    }

    const totals = qualifying.map((c) => parseFloat(c.total));
    const totalRaised = totals.reduce((a, b) => a + b, 0);
    const avgDonation = totalRaised / qualifying.length;
    const largest = qualifying.reduce((a, b) => parseFloat(a.total) > parseFloat(b.total) ? a : b);
    const smallest = qualifying.reduce((a, b) => parseFloat(a.total) < parseFloat(b.total) ? a : b);
    const avgTransactions = _.meanBy(qualifying, (c) => c.items ? c.items.length : 0);

    return {
        qualifying: qualifying.length,
        skipped: skipped.length,
        noTransactions: noTransactions.length,
        totalRaised: totalRaised.toFixed(2),
        avgDonation: avgDonation.toFixed(2),
        avgTransactions: avgTransactions.toFixed(1),
        largest: { name: largest.name, total: largest.total },
        smallest: { name: smallest.name, total: smallest.total },
    };
}

// POST /api/generate — run receipt generation, return stats
router.post('/', async (req, res) => {
    const year = config.get('year') || new Date().getFullYear();
    const csvAccounts = path.resolve(ROOT, 'input', 'accounts.csv');
    const csvContacts = path.resolve(ROOT, 'input', `contacts${year}.csv`);

    if (!fs.existsSync(csvAccounts)) {
        return res.status(400).json({ error: `Missing file: input/accounts.csv` });
    }
    if (!fs.existsSync(csvContacts)) {
        return res.status(400).json({ error: `Missing file: input/contacts${year}.csv` });
    }

    try {
        const contacts = await utils.read(csvContacts);
        const accounts = await utils.read(csvAccounts);

        const matched = matchContactsToTransactions(contacts, accounts);
        const withTotals = computeTotals(matched);
        const stats = computeStats(withTotals);

        const templatePg1 = config.get('templatePg1') || `${year} Giving Receipts.docx`;
        const templatePg2 = config.get('templatePg2') || `${year} Giving ReceiptsPg2.docx`;
        const tpl1Path = path.resolve(ROOT, templatePg1);
        const tpl2Path = path.resolve(ROOT, templatePg2);

        if (!fs.existsSync(tpl1Path)) {
            return res.status(400).json({ error: `Template not found: ${templatePg1}` });
        }
        if (!fs.existsSync(tpl2Path)) {
            return res.status(400).json({ error: `Template not found: ${templatePg2}` });
        }

        const generated = [];
        for (const contact of withTotals) {
            if (!contact.items || !contact.items.length) continue;
            if (parseFloat(contact.total) < 75) continue;

            const doc = await utils.loadTemplate(tpl1Path);
            doc.setData({ name: contact.name });
            await utils.writeDoc(doc, contact.name, year);

            const doc2 = await utils.loadTemplate(tpl2Path);
            doc2.setData({ name: contact.name, items: contact.items, total: contact.total });
            await utils.writeDocPg2(doc2, contact.name, year);

            generated.push({ name: contact.name, total: contact.total, transactions: contact.items.length });
        }

        // Persist results for the results route
        const outDir = path.resolve(ROOT, 'out');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
        fs.writeFileSync(path.resolve(outDir, 'results.json'), JSON.stringify({ year, stats, donors: generated }, null, 2));

        res.json({ ok: true, stats, donors: generated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
