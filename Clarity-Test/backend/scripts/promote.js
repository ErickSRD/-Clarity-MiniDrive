const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbFile = process.env.DATABASE_FILE || path.resolve(__dirname, '..', 'data', 'minidrive.db');
const email = process.argv[2] || 'admin@example.local';
const role = process.argv[3] || 'owner_admin';

const db = new sqlite3.Database(dbFile);
db.run('UPDATE users SET role = ? WHERE email = ?', [role, email], function (err) {
  if (err) {
    console.error('Error updating role:', err);
    process.exit(1);
  }
  console.log(`Updated ${this.changes} row(s) for ${email} -> ${role}`);
  db.close();
});
