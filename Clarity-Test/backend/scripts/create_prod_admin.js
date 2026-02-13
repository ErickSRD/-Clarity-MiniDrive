const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Take DB path from env or default
const dbFile = process.env.DATABASE_FILE || path.resolve(__dirname, '..', 'data', 'minidrive.db');

async function hash(pw) {
  return new Promise((res, rej) => {
    bcrypt.hash(pw, 12, (err, hash) => (err ? rej(err) : res(hash))); // Increased salt rounds for prod
  });
}

function generateRandomPassword(length = 16) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

async function run() {
  const db = new sqlite3.Database(dbFile);
  
  // High-security Owner Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@clarity-system.pro';
  const adminPass = process.env.ADMIN_PASSWORD || generateRandomPassword(20);

  const users = [
    { name: 'Clarity Admin', email: adminEmail, role: 'owner_admin', password: adminPass }
  ];

  console.log('--- PRODUCTION USER INITIALIZATION ---');

  for (const u of users) {
    try {
      const pwHash = await hash(u.password);
      await new Promise((resolve, reject) => {
        // delete any existing user with same email or name to reset
        db.run('DELETE FROM users WHERE email = ?', [u.email], (dErr) => {
          if (dErr) return reject(dErr);
          db.run('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)', [u.email, u.name, pwHash, u.role], function (err) {
            if (err) return reject(err);
            console.log('--------------------------------------------------');
            console.log(`CREATED PRODUCTION OWNER ADMIN`);
            console.log(`Email:    ${u.email}`);
            console.log(`Password: ${u.password}`);
            console.log('IMPORTANT: Save these credentials immediately!');
            console.log('--------------------------------------------------');
            resolve();
          });
        });
      });
    } catch (e) {
      console.error('Failed to create admin user:', e);
    }
  }

  db.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
