const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'minidrive.db');
const storageDir = path.resolve(__dirname, '..', 'data', 'storage');

console.log('Database path:', dbPath);
console.log('Storage dir:', storageDir);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Get all files with owner_id
  db.all("SELECT id, name, path, owner_id FROM files WHERE owner_id IS NOT NULL", (err, files) => {
    if (err) {
      console.error('Error getting files:', err.message);
      db.close();
      return;
    }
    
    console.log(`Found ${files.length} files to organize`);
    
    // Group files by owner
    const userFiles = {};
    files.forEach(file => {
      if (!userFiles[file.owner_id]) {
        userFiles[file.owner_id] = [];
      }
      userFiles[file.owner_id].push(file);
    });
    
    // Create user directories and move files
    Object.keys(userFiles).forEach(ownerId => {
      const userDir = path.join(storageDir, `user_${ownerId}`);
      
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
        console.log(`Created directory: ${userDir}`);
      }
      
      userFiles[ownerId].forEach(file => {
        const oldPath = file.path;
        const fileName = path.basename(oldPath);
        const newPath = path.join(userDir, fileName);
        
        // Check if file exists and needs to be moved
        if (fs.existsSync(oldPath) && oldPath !== newPath) {
          try {
            fs.renameSync(oldPath, newPath);
            console.log(`Moved: ${fileName} -> user_${ownerId}/`);
            
            // Update database with new path
            db.run('UPDATE files SET path = ? WHERE id = ?', [newPath, file.id], (err) => {
              if (err) {
                console.error(`Error updating path for file ${file.id}:`, err.message);
              }
            });
          } catch (mvErr) {
            console.error(`Error moving ${fileName}:`, mvErr.message);
          }
        } else if (!fs.existsSync(oldPath)) {
          console.warn(`File not found: ${oldPath}`);
        }
      });
    });
    
    console.log('Organization complete!');
    setTimeout(() => db.close(), 1000);
  });
});
