const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'minidrive.db');
console.log('Database path:', dbPath);
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.log('Tables:', rows.map(r => r.name).join(', '));
      
      // If files table exists, check for is_public column
      if (rows.some(r => r.name === 'files')) {
        db.all("PRAGMA table_info(files)", (err2, cols) => {
          if (err2) {
            console.error('Error checking columns:', err2.message);
          } else {
            console.log('Files table columns:', cols.map(c => c.name).join(', '));
            const hasIsPublic = cols.some(c => c.name === 'is_public');
            
            if (!hasIsPublic) {
              console.log('Adding is_public column...');
              db.run(`ALTER TABLE files ADD COLUMN is_public INTEGER DEFAULT 0`, (err3) => {
                if (err3) {
                  console.error('Error adding column:', err3.message);
                } else {
                  console.log('✓ Column is_public added successfully');
                }
                db.close();
              });
            } else {
              console.log('✓ Column is_public already exists');
              db.close();
            }
          }
        });
      } else {
        console.log('Files table not found');
        db.close();
      }
    }
  });
});
