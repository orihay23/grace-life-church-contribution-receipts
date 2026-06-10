const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.resolve(__dirname, 'config.json');

function load() {
    if (!fs.existsSync(CONFIG_PATH)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function save(data) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

function get(key) {
    return load()[key];
}

function set(key, value) {
    const data = load();
    data[key] = value;
    save(data);
}

function setAll(obj) {
    const data = load();
    Object.assign(data, obj);
    save(data);
}

function all() {
    return load();
}

module.exports = { get, set, setAll, all };
