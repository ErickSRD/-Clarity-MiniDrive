import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const dataDir = path.resolve(__dirname, '..', '..', 'backend_data');
const dbFile = process.env.DATABASE_FILE || path.resolve(__dirname, '..', '..', 'backend', 'data', 'minidrive.db');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(path.dirname(dbFile));

const schemaPath = path.resolve(__dirname, '..', 'db', 'schema.sql');
const schema = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : '';

sqlite3.verbose();
export const db = new sqlite3.Database(dbFile);

if (schema) {
  db.exec(schema, (err) => {
    if (err) console.error('Failed to initialize DB schema:', err);
  });
}

// Ensure migrations: add folder_id to files if missing
db.serialize(() => {
  db.all("PRAGMA table_info(files)", (err, cols) => {
    if (err) return;
    const hasFolder = cols && cols.some((c: any) => c.name === 'folder_id');
    if (!hasFolder) {
      db.run('ALTER TABLE files ADD COLUMN folder_id INTEGER', (aerr) => {
        if (aerr) console.error('Failed to add folder_id column:', aerr);
      });
    }
    const hasChecksum = cols && cols.some((c: any) => c.name === 'checksum');
    if (!hasChecksum) {
      db.run('ALTER TABLE files ADD COLUMN checksum TEXT', (cerr) => {
        if (cerr) console.error('Failed to add checksum column:', cerr);
      });
    }
    const hasDept = cols && cols.some((c: any) => c.name === 'department');
    if (!hasDept) {
      db.run('ALTER TABLE files ADD COLUMN department TEXT', (derr) => {
        if (derr) console.error('Failed to add department column:', derr);
      });
    }
    const hasTags = cols && cols.some((c: any) => c.name === 'tags');
    if (!hasTags) {
      db.run('ALTER TABLE files ADD COLUMN tags TEXT', (terr) => {
        if (terr) console.error('Failed to add tags column:', terr);
      });
    }
  });

  db.all("PRAGMA table_info(folders)", (err, cols) => {
    if (err) return;
    const hasColor = cols && cols.some((c: any) => c.name === 'color');
    if (!hasColor) {
      db.run('ALTER TABLE folders ADD COLUMN color TEXT', (aerr) => {
        if (aerr) console.error('Failed to add color column to folders:', aerr);
      });
    }
    const hasIcon = cols && cols.some((c: any) => c.name === 'icon');
    if (!hasIcon) {
      db.run('ALTER TABLE folders ADD COLUMN icon TEXT', (ierr) => {
        if (ierr) console.error('Failed to add icon column to folders:', ierr);
      });
    }
  });

  // Ensure Taxonomy tables (extra check)
  db.run(`CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS global_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT
  )`);
});

export function logAudit(userId: number | null, action: string) {
  return new Promise<void>((resolve, reject) => {
    db.run('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [userId, action], function (err) {
      if (err) {
        console.error('Failed to write audit log:', err);
        return reject(err);
      }
      resolve();
    });
  });
}

export function grantPermission(granterId: number | null, userId: number, resourceType: string, resourceId: number | null, permissionType: string) {
  return new Promise<void>((resolve, reject) => {
    db.run('INSERT INTO permissions (user_id, resource_type, resource_id, permission_type) VALUES (?, ?, ?, ?)', [userId, resourceType, resourceId, permissionType], function (err) {
      if (err) return reject(err);
      // optionally audit grant
      db.run('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [granterId, `grant:${permissionType}:${resourceType}:${resourceId}->user:${userId}`], () => {});
      resolve();
    });
  });
}

export function revokePermission(granterId: number | null, userId: number, resourceType: string, resourceId: number | null, permissionType: string) {
  return new Promise<void>((resolve, reject) => {
    db.run('DELETE FROM permissions WHERE user_id = ? AND resource_type = ? AND resource_id IS ? AND permission_type = ?', [userId, resourceType, resourceId, permissionType], function (err) {
      if (err) return reject(err);
      db.run('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [granterId, `revoke:${permissionType}:${resourceType}:${resourceId}->user:${userId}`], () => {});
      resolve();
    });
  });
}

export function checkPermission(userId: number | null, resourceType: string, resourceId: number | null, permissionType: string) {
  return new Promise<boolean>((resolve) => {
    if (!userId) return resolve(false);
    // role bypass (admin/owner_admin)
    db.get('SELECT role FROM users WHERE id = ?', [userId], (err: any, urow: any) => {
      if (!err && urow && (urow.role === 'owner_admin' || urow.role === 'admin')) return resolve(true);

      // if checking a file or folder, owner also bypasses
      if ((resourceType === 'file' || resourceType === 'folder') && resourceId != null) {
        const table = resourceType === 'file' ? 'files' : 'folders';
        db.get(`SELECT owner_id FROM ${table} WHERE id = ?`, [resourceId], (ferr: any, frow: any) => {
          if (!ferr && frow && frow.owner_id === userId) return resolve(true);
          // otherwise check explicit permission
          db.get('SELECT 1 FROM permissions WHERE user_id = ? AND resource_type = ? AND (resource_id IS ? OR resource_id IS NULL) AND permission_type = ? LIMIT 1', [userId, resourceType, resourceId, permissionType], (perr: any, prow: any) => {
            if (!perr && prow) return resolve(true);
            return resolve(false);
          });
        });
      } else {
        // non-file resource or no specific resource id
        db.get('SELECT 1 FROM permissions WHERE user_id = ? AND resource_type = ? AND (resource_id IS ? OR resource_id IS NULL) AND permission_type = ? LIMIT 1', [userId, resourceType, resourceId, permissionType], (perr: any, prow: any) => {
          if (!perr && prow) return resolve(true);
          return resolve(false);
        });
      }
    });
  });
}

export default db;
