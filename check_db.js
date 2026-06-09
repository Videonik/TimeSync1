const Database = require('better-sqlite3');
const db = new Database('backend/scheduler.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);
if (tables.some(t => t.name === 'busy_slot')) {
  const rows = db.prepare("SELECT * FROM busy_slot").all();
  console.log('Busy Slots Count:', rows.length);
  console.log('Last 5 rows:', rows.slice(-5));
} else {
  console.log('Table busy_slot NOT FOUND');
}
db.close();
