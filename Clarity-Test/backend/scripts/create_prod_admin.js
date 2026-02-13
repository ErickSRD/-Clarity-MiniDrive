const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
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
  
  // Ensure schema exists
  const schemaPath = path.resolve(__dirname, '..', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await new Promise((resolve, reject) => {
      db.exec(schema, (err) => {
        if (err) {
          console.error('Failed to initialize schema:', err);
          return reject(err);
        }
        resolve();
      });
    });
  }

  // Production Users
  const defaultPassword = 'Clarity$2026@!';
  
  const users = [
    { name: 'Clarity Admin', email: 'admin@clarity-system.pro', role: 'owner_admin', password: defaultPassword },
    { name: 'Clarity Editor', email: 'editor@clarity-system.pro', role: 'editor', password: defaultPassword },
    { name: 'Clarity Viewer', email: 'viewer@clarity-system.pro', role: 'viewer', password: defaultPassword }
  ];

  console.log('--- PRODUCTION USERS INITIALIZATION ---');

  for (const u of users) {
    try {
      const pwHash = await hash(u.password);
      await new Promise((resolve, reject) => {
        // delete any existing user with same email to reset
        db.run('DELETE FROM users WHERE email = ?', [u.email], (dErr) => {
          if (dErr) return reject(dErr);
          db.run('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)', [u.email, u.name, pwHash, u.role], function (err) {
            if (err) return reject(err);
            console.log(`CREATED USER: ${u.name} | Role: ${u.role} | Email: ${u.email}`);
            resolve();
          });
        });
      });
    } catch (e) {
      console.error(`Failed to create ${u.name}:`, e);
    }
  }

  console.log('--------------------------------------------------');
  console.log('ALL PASSWORDS SET TO: Clarity$2026@!');
  console.log('--------------------------------------------------');

  db.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
