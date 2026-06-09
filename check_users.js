const Database = require('better-sqlite3');
const db = new Database('backend/scheduler.sqlite');
const users = db.prepare("SELECT * FROM user").all();
console.log('Users in SQLite:', users);
db.close();
