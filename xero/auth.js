/**
 * Xero OAuth2 PKCE authentication.
 *
 * Flow:
 *  1. Call startAuthFlow(app) to register /xero-callback on the Express app
 *  2. Call getAuthUrl() to get the URL to redirect the user's browser to
 *  3. After the user authorizes, the callback stores tokens in config.json
 *  4. Call getClient() anywhere to get an authenticated XeroClient
 */

const { XeroClient } = require('xero-node');
const config = require('../config');

const REDIRECT_URI = 'http://localhost:3737/xero-callback';
const SCOPES = [
    'accounting.contacts.read',
    'accounting.journals.read',
    'accounting.reports.read',
    'offline_access',
];

function buildClient() {
    const cfg = config.all();
    return new XeroClient({
        clientId: cfg.xeroClientId,
        clientSecret: cfg.xeroClientSecret,
        redirectUris: [REDIRECT_URI],
        scopes: SCOPES,
    });
}

/**
 * Register the OAuth callback route on the Express app.
 * Must be called once when the server starts.
 */
function startAuthFlow(app) {
    app.get('/xero-callback', async (req, res) => {
        try {
            const client = buildClient();
            const tokenSet = await client.apiCallback(req.url);
            await client.updateTenants();

            const tenants = client.tenants;
            const tenantId = tenants[0]?.tenantId;

            config.setAll({
                xeroTokenSet: tokenSet,
                xeroTenantId: tenantId,
            });

            res.send(`
                <html><body style="font-family:sans-serif;padding:40px">
                <h2 style="color:#2c5f2e">&#10003; Xero Connected</h2>
                <p>Connected to: <strong>${tenants[0]?.tenantName || 'your organization'}</strong></p>
                <p>You can close this tab and return to the app.</p>
                <script>window.opener && window.opener.postMessage('xero-connected', '*');</script>
                </body></html>
            `);
        } catch (err) {
            console.error('Xero callback error:', err);
            res.status(500).send(`<html><body><p>Error: ${err.message}</p></body></html>`);
        }
    });
}

/**
 * Returns an authenticated XeroClient, refreshing the token if needed.
 */
async function getClient() {
    const cfg = config.all();
    if (!cfg.xeroClientId || !cfg.xeroClientSecret) {
        throw new Error('Xero Client ID and Secret are not configured. Add them in Step 1 of the app.');
    }

    const client = buildClient();

    if (cfg.xeroTokenSet) {
        await client.setTokenSet(cfg.xeroTokenSet);

        // Refresh if expired (Xero access tokens last 30 min)
        if (client.isTokenExpired()) {
            const refreshed = await client.refreshToken();
            config.set('xeroTokenSet', refreshed);
        }

        await client.updateTenants();
    }

    return client;
}

/**
 * Returns the URL the user must visit to authorize Xero access.
 */
async function getAuthUrl() {
    const client = buildClient();
    return await client.buildConsentUrl();
}

module.exports = { startAuthFlow, getClient, getAuthUrl };
