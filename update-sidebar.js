const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'frontend', 'public');

const filesToUpdate = [
  'add-medicine.html',
  'alerts.html',
  'bill-success.html',
  'billing-history.html',
  'generate-bill.html',
  'locations.html',
  'medicines.html'
];

const targetNav = `<a href="alerts.html" class="nav-item">Expiry Alerts</a>`;
const targetNavActive = `<a href="alerts.html" class="nav-item active">Expiry Alerts</a>`;

const replacement = `<a href="alerts.html" class="nav-item">Expiry Alerts</a>
                <a href="remove-expired.html" class="nav-item">Remove Expired</a>`;

const replacementActive = `<a href="alerts.html" class="nav-item active">Expiry Alerts</a>
                <a href="remove-expired.html" class="nav-item">Remove Expired</a>`;

for (const file of filesToUpdate) {
  const filePath = path.join(publicDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already added
    if (!content.includes('remove-expired.html')) {
      if (content.includes(targetNav)) {
        content = content.replace(targetNav, replacement);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
      } else if (content.includes(targetNavActive)) {
        content = content.replace(targetNavActive, replacementActive);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file} (active)`);
      } else {
        console.log(`Could not find anchor in ${file}`);
      }
    } else {
        console.log(`Already has remove-expired in ${file}`);
    }
  }
}
