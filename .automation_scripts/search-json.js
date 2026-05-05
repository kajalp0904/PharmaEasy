const fs = require('fs');
try {
    let content = fs.readFileSync('local_meds.json', 'utf16le');
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    const meds = JSON.parse(content);
    const matches = meds.filter(m => m.name && m.name.toLowerCase().includes('abc'));
    console.log('Matches:', JSON.stringify(matches, null, 2));
} catch (e) {
    console.error(e);
}
