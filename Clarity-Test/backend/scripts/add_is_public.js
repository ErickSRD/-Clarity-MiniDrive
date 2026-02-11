const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'minidrive.db');
console.log('Database path:', dbPath);
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Check if column exists first
  db.all("PRAGMA table_info(files)", (err, rows) => {
    if (err) {
      console.error('Error checking table:', err.message);
      db.close();
      return;
    }
    
    const hasIsPublic = rows.some((row) => row.name === 'is_public');
    
    if (hasIsPublic) {
      console.log('Column is_public already exists');
      db.close();
    } else {
      // Add is_public column to files table
      db.run(`ALTER TABLE files ADD COLUMN is_public INTEGER DEFAULT 0`, (err) => {
        if (err) {
          console.error('Error adding column:', err.message);
        } else {
          console.log('Column is_public added successfully');
        }
        db.close();
      });
    }
  });
});
