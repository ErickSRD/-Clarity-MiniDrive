const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const dbFile = path.resolve(__dirname, '..', 'data', 'minidrive.db');

async function hash(pw) {
  return new Promise((res, rej) => {
    bcrypt.hash(pw, 10, (err, hash) => (err ? rej(err) : res(hash)));
  });
}

async function run() {
  const db = new sqlite3.Database(dbFile);
  const users = [
    { name: 'admin', email: 'admin@example.local', role: 'owner_admin', password: 'admin123' },
    { name: 'editor', email: 'editor@example.local', role: 'editor', password: 'editor123' },
    { name: 'viewer', email: 'viewer@example.local', role: 'viewer', password: 'viewer123' }
  ];

  for (const u of users) {
    try {
      const pwHash = await hash(u.password);
      await new Promise((resolve, reject) => {
        // delete any existing user with same email or name
        db.run('DELETE FROM users WHERE email = ? OR name = ?', [u.email, u.name], (dErr) => {
          if (dErr) return reject(dErr);
          db.run('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)', [u.email, u.name, pwHash, u.role], function (err) {
            if (err) return reject(err);
            console.log(`created user: ${u.name} <${u.email}> with password: ${u.password}`);
            resolve();
          });
        });
      });
    } catch (e) {
      console.error('failed to create', u.name, e);
    }
  }

  db.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
