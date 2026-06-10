const { app, PORT } = require('./server/index');

app.listen(PORT, async () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\nGLC Contribution Receipts is running at ${url}\n`);
    try {
        const open = await import('open');
        await open.default(url);
    } catch {
        console.log('Open your browser to:', url);
    }
});
