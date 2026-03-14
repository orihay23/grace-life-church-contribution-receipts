const express = require('express');
const path = require('path');
const app = express();
const PORT = 3737;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/config', require('./routes/config'));
app.use('/api/generate', require('./routes/generate'));
app.use('/api/results', require('./routes/results'));
app.use('/api/email', require('./routes/email'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/xero', require('./routes/xero'));
app.use('/api/convert', require('./routes/convert'));

// Register Xero OAuth callback route
require('../xero/auth').startAuthFlow(app);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = { app, PORT };

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Contribution Receipts running at http://localhost:${PORT}`);
    });
}
