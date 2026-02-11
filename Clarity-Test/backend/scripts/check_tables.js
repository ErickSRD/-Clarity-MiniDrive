const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'minidrive.db');
console.log('Database path:', dbPath);
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.log('Tables in database:', rows);
    }
    db.close();
  });
});
