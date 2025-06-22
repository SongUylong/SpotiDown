const fs = require('fs');
const path = require('path');

async function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

async function loadJsonFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading file ${filePath}:`, err.message);
        return null;
    }
}

async function saveJsonFile(filePath, data) {
    try {
        await ensureDirectoryExists(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error(`Error writing file ${filePath}:`, err.message);
        return false;
    }
}

module.exports = {
    ensureDirectoryExists,
    loadJsonFile,
    saveJsonFile
}; 