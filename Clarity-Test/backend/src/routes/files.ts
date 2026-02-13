import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import db, { logAudit, checkPermission } from '../db';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import mime from 'mime-types';

const router = express.Router();

// Middleware para parsear JSON solo donde se necesita
const jsonParser = bodyParser.json();

const storageDir = process.env.STORAGE_DIR || path.resolve(__dirname, '..', '..', 'data', 'storage');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

const upload = multer({ dest: storageDir });

function sanitizeName(name: string) {
  return path.basename(name).replace(/[\/:"<>|?\\*]/g, '_');
}

function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

router.get('/', (req, res) => {
  const folder = req.query.folder ? Number(req.query.folder) : null;
  if (folder != null) {
    db.all('SELECT id, name, type, size, owner_id, is_public, created_at, folder_id, department, tags FROM files WHERE folder_id IS ? ORDER BY created_at DESC', [folder], (err: any, rows: any) => {
      if (err) return res.status(500).json({ error: 'db error' });
      res.json(rows);
    });
    return;
  }
  db.all('SELECT id, name, type, size, owner_id, is_public, created_at, folder_id, department, tags FROM files ORDER BY created_at DESC', [], (err: any, rows: any) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

// Advanced search
router.get('/search', authMiddleware, (req, res) => {
  const { q, type, department, tags, startDate, endDate } = req.query;
  const user = (req as any).user;
  
  let sql = 'SELECT id, name, type, size, owner_id, is_public, created_at, folder_id, department, tags FROM files WHERE (owner_id = ? OR is_public = 1)';
  const params: any[] = [user.id];

  if (q) {
    sql += ' AND (name LIKE ? OR department LIKE ? OR tags LIKE ?)';
    params.push(`%${q}%`);
    params.push(`%${q}%`);
    params.push(`%${q}%`);
  }
  if (type) {
    sql += ' AND type LIKE ?';
    params.push(`%${type}%`);
  }
  if (department) {
    sql += ' AND department LIKE ?';
    params.push(`%${department}%`);
  }
  if (tags) {
    sql += ' AND tags LIKE ?';
    params.push(`%${tags}%`);
  }
  if (startDate) {
    sql += ' AND created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND created_at <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'db error' });
    }
    res.json(rows);
  });
});

// create folder
router.post('/folders', jsonParser, authMiddleware, requireRole('admin', 'editor', 'owner_admin'), (req, res) => {
  const { name, parent_id, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const ownerId = (req as any).user?.id || null;
  db.run('INSERT INTO folders (name, parent_id, owner_id, color, icon) VALUES (?, ?, ?, ?, ?)', [name, parent_id || null, ownerId, color || null, icon || null], function (err) {
    if (err) return res.status(500).json({ error: 'db error' });
    logAudit(ownerId, `create:folder:${this.lastID}:${name}`);
    res.json({ id: this.lastID, name, color, icon });
  });
});

// list folders
router.get('/folders', authMiddleware, (req, res) => {
  const parent = req.query.parent ? Number(req.query.parent) : null;
  if (parent != null) {
    db.all('SELECT id, name, parent_id, owner_id, color, icon FROM folders WHERE parent_id IS ? ORDER BY name', [parent], (err, rows) => {
      if (err) return res.status(500).json({ error: 'db error' });
      res.json(rows);
    });
    return;
  }
  db.all('SELECT id, name, parent_id, owner_id, color, icon FROM folders ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

// rename folder (PATCH /api/files/folders/:id)
router.patch('/folders/:id', jsonParser, authMiddleware, requireRole('admin', 'editor', 'owner_admin'), (req, res) => {
  const id = req.params.id;
  const { name, color, icon } = req.body;
  
  db.get('SELECT owner_id, name, color, icon FROM folders WHERE id = ?', [id], async (err: any, row: any) => {
    if (err || !row) return res.status(404).json({ error: 'not found' });
    const user = (req as any).user;
    const allowed = await checkPermission(user.id, 'folder', Number(id), 'edit');
    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    const newName = name !== undefined ? name : row.name;
    const newColor = color !== undefined ? color : row.color;
    const newIcon = icon !== undefined ? icon : row.icon;

    db.run('UPDATE folders SET name = ?, color = ?, icon = ? WHERE id = ?', [newName, newColor, newIcon, id], function (uerr: any) {
      if (uerr) return res.status(500).json({ error: 'db error' });
      logAudit(user.id, `update:folder:${id}:${row.name}->${newName}`);
      res.json({ updated: this.changes });
    });
  });
});

// delete folder (DELETE /api/files/folders/:id) - recursive delete
router.delete('/folders/:id', authMiddleware, requireRole('admin', 'owner_admin'), async (req, res) => {
  const id = req.params.id;
  const user = (req as any).user;

  try {
    // 1. Check existence and permissions
    const folder = await new Promise<any>((resolve, reject) => {
      db.get('SELECT id, name, owner_id FROM folders WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!folder) return res.status(404).json({ error: 'not found' });
    
    const allowed = await checkPermission(user.id, 'folder', Number(id), 'delete');
    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    // 2. Recursive deletion helper
    const deleteFolderRecursive = async (fid: number) => {
      // Find subfolders
      const subfolders = await new Promise<any[]>((resolve, reject) => {
        db.all('SELECT id FROM folders WHERE parent_id = ?', [fid], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      for (const sf of subfolders) {
        await deleteFolderRecursive(sf.id);
      }

      // Find and delete files in this folder
      const files = await new Promise<any[]>((resolve, reject) => {
        db.all('SELECT id, path FROM files WHERE folder_id = ?', [fid], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      for (const file of files) {
        try {
          if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (e) {
          console.error(`Failed to delete file on disk: ${file.path}`, e);
        }
        await new Promise<void>((resolve, reject) => {
          db.run('DELETE FROM files WHERE id = ?', [file.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // Finally delete the folder itself
      await new Promise<void>((resolve, reject) => {
        db.run('DELETE FROM folders WHERE id = ?', [fid], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      logAudit(user.id, `delete:folder_recursive:${fid}`);
    };

    await deleteFolderRecursive(Number(id));
    res.json({ deleted: 1 });

  } catch (error: any) {
    console.error('Error during recursive folder deletion:', error);
    res.status(500).json({ error: 'failed to delete folder and contents' });
  }
});

router.post('/', authMiddleware, requireRole('admin', 'editor', 'owner_admin'), upload.array('files'), async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) return res.status(400).json({ error: 'no files uploaded' });

  const ownerId = (req as any).user?.id || null;
  const folderId = req.body.folder_id ? Number(req.body.folder_id) : null;
  const isPublic = req.body.is_public === 'true' || req.body.is_public === true ? 1 : 0;

  // Create user-specific directory
  const userStorageDir = path.join(storageDir, `user_${ownerId}`);
  if (!fs.existsSync(userStorageDir)) {
    fs.mkdirSync(userStorageDir, { recursive: true });
  }

  const tasks = files.map((f) => {
    return new Promise<any>(async (resolve) => {
      const safe = sanitizeName(f.originalname);
      const destName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safe}`;
      const destPath = path.join(userStorageDir, destName);
      try {
        fs.renameSync((f as any).path, destPath);
      } catch (err) {
        // If moving fails, resolve with error info
        return resolve({ error: 'move_failed', originalName: f.originalname });
      }
      let checksum: string;
      try {
        checksum = await computeFileSha256(destPath);
      } catch (hashErr) {
        return resolve({ error: 'hash_failed', originalName: f.originalname });
      }
      db.run('INSERT INTO files (name, path, size, type, owner_id, folder_id, is_public, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [f.originalname, destPath, f.size, f.mimetype, ownerId, folderId, isPublic, checksum], function (err: any) {
        if (err) return resolve({ error: 'db_insert_failed', originalName: f.originalname });
        resolve({ id: this.lastID, name: f.originalname });
      });
    });
  });

  const created = await Promise.all(tasks);
  // audit each successful upload and wait for logs to be written
  const auditPromises = created.map((c) => {
    if (!c || c.error) return Promise.resolve();
    return logAudit(ownerId, `upload:file:${c.id}:${c.name}`).catch(() => {});
  });
  await Promise.all(auditPromises);
  res.json({ uploaded: created });
});

// GET /api/files/:id/download
router.get('/:id/download', optionalAuth, async (req, res) => {
  const id = Number(req.params.id);

  db.get(
    'SELECT path, name, type, is_public, owner_id FROM files WHERE id = ?',
    [id],
    async (err: any, row: any) => {
      if (err || !row) {
        return res.status(404).json({ error: 'not found' });
      }

      const userId = (req as any).user?.id || null;

      // Permisos
      if (!row.is_public) {
        const allowed = await checkPermission(userId, 'file', id, 'download');
        if (!allowed) {
          return res.status(403).json({ error: 'forbidden' });
        }
      }

      // 1. Verificación de ruta y normalización dinámica (Evita corrupción por rutas rotas)
      let actualPath = row.path;
      if (!fs.existsSync(actualPath)) {
        const fileName = path.basename(row.path);
        const ownerDir = row.owner_id ? `user_${row.owner_id}` : '';
        const possiblePath = path.join(storageDir, ownerDir, fileName);
        
        if (fs.existsSync(possiblePath)) {
          actualPath = possiblePath;
        } else if (fs.existsSync(path.join(storageDir, fileName))) {
          actualPath = path.join(storageDir, fileName);
        } else {
          console.error(`Download Error: File not found on disk. Tried: ${row.path} and ${possiblePath}`);
          return res.status(410).json({ error: 'file missing on disk' });
        }
      }

      // 2. Obtener estadísticas del archivo para Content-Length
      let stat;
      try {
        stat = fs.statSync(actualPath);
      } catch (statErr) {
        return res.status(500).json({ error: 'cannot read file storage' });
      }

      // 3. Configurar Headers Binarios Seguros
      const contentType = row.type || mime.lookup(row.name) || 'application/octet-stream';

      // Importante: No usar res.download() ni res.sendFile() para tener control total del stream
      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="${encodeURIComponent(row.name)}"; filename*=UTF-8''${encodeURIComponent(row.name)}"`
      );
      res.setHeader('Content-Length', stat.size);
      
      // Desactivar cualquier middleware de transformación o caché
      res.setHeader('Content-Transfer-Encoding', 'binary');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // 🔥 CRÍTICO: Forzar identidad para evitar que middlewares de compresión (como compression()) 
      // intenten re-procesar el stream binario y lo corrompan.
      res.setHeader('Content-Encoding', 'identity');

      // 4. Auditoría (Async)
      logAudit(userId || 0, `download:file:${id}:${row.name}`).catch(() => {});

      // 5. Streaming Directo (Memory safe & Corruption proof)
      const stream = fs.createReadStream(actualPath, {
        highWaterMark: 128 * 1024 // Buffer de 128KB para mejor throughput
      });

      stream.on('error', (streamErr) => {
        console.error('Streaming Error:', streamErr);
        if (!res.headersSent) {
          res.status(500).end();
        }
        stream.destroy();
      });

      // Manejo de cierre de conexión para liberar recursos
      req.on('close', () => {
        stream.destroy();
      });

      // 🔥 Pipe directo al Response de Express
      stream.pipe(res);
    }
  );
});

// GET /:id/raw-download - direct disk stream (no checksum verification)
router.get('/:id/raw-download', optionalAuth, (req, res) => {
  const id = req.params.id;

  db.get(
    'SELECT path, name, type, is_public, owner_id FROM files WHERE id = ?',
    [id],
    async (err: any, row: any) => {
      if (err || !row) {
        return res.status(404).json({ error: 'not found' });
      }

      const userId = (req as any).user?.id || null;

      if (!row.is_public) {
        const allowed = await checkPermission(userId, 'file', Number(id), 'download');
        if (!allowed) {
          return res.status(403).json({ error: 'forbidden' });
        }
      }

      if (!fs.existsSync(row.path)) {
        return res.status(410).json({ error: 'file missing on disk' });
      }

      let stat;
      try {
        stat = fs.statSync(row.path);
      } catch (statErr) {
        return res.status(500).json({ error: 'cannot read file stats' });
      }

      const contentType = row.type || mime.lookup(row.name) || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.name)}"`);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Encoding', 'identity');

      const stream = fs.createReadStream(row.path, { highWaterMark: 64 * 1024 });
      stream.on('error', (streamErr) => {
        console.error('Stream error during raw download:', streamErr);
        if (res.headersSent) {
          res.end();
        } else {
          res.status(500).json({ error: 'file read error' });
        }
        stream.destroy();
      });

      req.on('aborted', () => {
        stream.destroy();
      });

      req.on('close', () => {
        if (!res.writableEnded) {
          stream.destroy();
        }
      });

      stream.pipe(res);
    }
  );
});

// GET /:id/view - image-only preview (allows public files without auth)
router.get('/:id/view', optionalAuth, (req, res) => {
  const id = req.params.id;

  db.get(
    'SELECT path, name, type, is_public, owner_id, checksum FROM files WHERE id = ?',
    [id],
    async (err: any, row: any) => {
      if (err || !row) {
        return res.status(404).json({ error: 'not found' });
      }

      const userId = (req as any).user?.id || null;

      if (!row.is_public) {
        const allowed = await checkPermission(userId, 'file', Number(id), 'download');
        if (!allowed) {
          return res.status(403).json({ error: 'forbidden' });
        }
      }

      const detectedType = row.type || mime.lookup(row.name) || '';
      const isImage = typeof detectedType === 'string' && detectedType.startsWith('image/');
      if (!isImage) {
        return res.status(415).json({ error: 'unsupported media type' });
      }

      if (!fs.existsSync(row.path)) {
        return res.status(410).json({ error: 'file missing on disk' });
      }

      if (row.checksum) {
        try {
          const computed = await computeFileSha256(row.path);
          if (computed !== row.checksum) {
            return res.status(500).json({ error: 'file integrity check failed' });
          }
        } catch (hashErr) {
          return res.status(500).json({ error: 'file integrity check failed' });
        }
      }

      try {
        await logAudit(userId || 0, `view:file:${id}:${row.name}`);
      } catch (auditErr) {
        console.error('Audit log failed for view:', auditErr);
      }

      let stat;
      try {
        stat = fs.statSync(row.path);
      } catch (statErr) {
        return res.status(500).json({ error: 'cannot read file stats' });
      }

      res.setHeader('Content-Type', detectedType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.name)}"`);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Cache-Control', 'private, max-age=600');

      const stream = fs.createReadStream(row.path, {
        highWaterMark: 64 * 1024
      });

      stream.on('error', (streamErr) => {
        console.error('Stream error during image view:', streamErr);
        if (res.headersSent) {
          res.end();
        } else {
          res.status(500).json({ error: 'file read error' });
        }
        stream.destroy();
      });

      req.on('aborted', () => {
        stream.destroy();
      });

      req.on('close', () => {
        if (!res.writableEnded) {
          stream.destroy();
        }
      });

      stream.pipe(res);
    }
  );
});

// GET /:id/raw-view - direct disk stream for images (no checksum verification)
router.get('/:id/raw-view', optionalAuth, (req, res) => {
  const id = req.params.id;

  db.get(
    'SELECT path, name, type, is_public, owner_id FROM files WHERE id = ?',
    [id],
    async (err: any, row: any) => {
      if (err || !row) {
        return res.status(404).json({ error: 'not found' });
      }

      const userId = (req as any).user?.id || null;

      if (!row.is_public) {
        const allowed = await checkPermission(userId, 'file', Number(id), 'download');
        if (!allowed) {
          return res.status(403).json({ error: 'forbidden' });
        }
      }

      const detectedType = row.type || mime.lookup(row.name) || '';
      const isImage = typeof detectedType === 'string' && detectedType.startsWith('image/');
      if (!isImage) {
        return res.status(415).json({ error: 'unsupported media type' });
      }

      if (!fs.existsSync(row.path)) {
        return res.status(410).json({ error: 'file missing on disk' });
      }

      let stat;
      try {
        stat = fs.statSync(row.path);
      } catch (statErr) {
        return res.status(500).json({ error: 'cannot read file stats' });
      }

      res.setHeader('Content-Type', detectedType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.name)}"`);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Cache-Control', 'private, max-age=600');

      const stream = fs.createReadStream(row.path, { highWaterMark: 64 * 1024 });
      stream.on('error', (streamErr) => {
        console.error('Stream error during raw view:', streamErr);
        if (res.headersSent) {
          res.end();
        } else {
          res.status(500).json({ error: 'file read error' });
        }
        stream.destroy();
      });

      req.on('aborted', () => {
        stream.destroy();
      });

      req.on('close', () => {
        if (!res.writableEnded) {
          stream.destroy();
        }
      });

      stream.pipe(res);
    }
  );
});

// GET /:id/hash - return SHA-256 checksum (allows public files without auth)
router.get('/:id/hash', optionalAuth, (req, res) => {
  const id = req.params.id;

  db.get(
    'SELECT checksum, is_public, owner_id, name, path FROM files WHERE id = ?',
    [id],
    async (err: any, row: any) => {
      if (err || !row) {
        return res.status(404).json({ error: 'not found' });
      }

      const userId = (req as any).user?.id || null;

      if (!row.is_public) {
        const allowed = await checkPermission(userId, 'file', Number(id), 'download');
        if (!allowed) {
          return res.status(403).json({ error: 'forbidden' });
        }
      }

      if (!row.checksum) {
        if (!row.path || !fs.existsSync(row.path)) {
          return res.status(410).json({ error: 'file missing on disk' });
        }
        try {
          const computed = await computeFileSha256(row.path);
          db.run('UPDATE files SET checksum = ? WHERE id = ?', [computed, id], (uerr: any) => {
            if (uerr) {
              return res.status(500).json({ error: 'failed to store checksum' });
            }
            return res.json({ checksum: computed, name: row.name });
          });
          return;
        } catch (hashErr) {
          return res.status(500).json({ error: 'file integrity check failed' });
        }
      }

      res.json({ checksum: row.checksum || null, name: row.name });
    }
  );
});


// PATCH /:id/visibility - must be before /:id
router.patch('/:id/visibility', jsonParser, authMiddleware, requireRole('admin', 'editor', 'owner_admin'), (req, res) => {
  const id = req.params.id;
  const { is_public } = req.body;
  if (typeof is_public !== 'boolean' && typeof is_public !== 'number') {
    return res.status(400).json({ error: 'is_public must be boolean or number' });
  }
  const isPublicValue = is_public ? 1 : 0;
  
  db.get('SELECT owner_id, name, is_public FROM files WHERE id = ?', [id], async (err: any, row: any) => {
    if (err || !row) return res.status(404).json({ error: 'not found' });
    const user = (req as any).user;
    const allowed = await checkPermission(user.id, 'file', Number(id), 'edit');
    if (!allowed) return res.status(403).json({ error: 'forbidden' });
    
    db.run('UPDATE files SET is_public = ? WHERE id = ?', [isPublicValue, id], function (uerr: any) {
      if (uerr) return res.status(500).json({ error: 'db error' });
      logAudit(user.id, `visibility:file:${id}:${row.is_public ? 'public' : 'private'}->${isPublicValue ? 'public' : 'private'}`);
      res.json({ updated: this.changes, is_public: isPublicValue });
    });
  });
});

// PATCH /:id/move - must be before /:id
router.patch('/:id/move', jsonParser, authMiddleware, requireRole('admin', 'editor', 'owner_admin'), (req, res) => {
  const id = req.params.id;
  const { folder_id } = req.body;
  db.get('SELECT owner_id, name FROM files WHERE id = ?', [id], async (err: any, row: any) => {
    if (err || !row) return res.status(404).json({ error: 'not found' });
    const user = (req as any).user;
    const allowed = await checkPermission(user.id, 'file', Number(id), 'edit');
    if (!allowed) return res.status(403).json({ error: 'forbidden' });
    db.run('UPDATE files SET folder_id = ? WHERE id = ?', [folder_id || null, id], function (uerr: any) {
      if (uerr) return res.status(500).json({ error: 'db error' });
      logAudit(user.id, `move:file:${id}:folder->${folder_id}`);
      res.json({ moved: this.changes });
    });
  });
});

// GET /:id - file details (after specific routes)
router.get('/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  db.get('SELECT id, name, type, size, owner_id, is_public, created_at, folder_id, department, tags FROM files WHERE id = ?', [id], (err: any, row: any) => {
    if (err || !row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  });
});

// PATCH /:id - update file metadata (after specific routes)
router.patch('/:id', jsonParser, authMiddleware, requireRole('admin', 'editor', 'owner_admin'), (req, res) => {
  const id = req.params.id;
  const { name, department, tags } = req.body;
  
  db.get('SELECT owner_id, name, department, tags FROM files WHERE id = ?', [id], async (err: any, row: any) => {
    if (err || !row) return res.status(404).json({ error: 'not found' });
    const user = (req as any).user;
    const allowed = await checkPermission(user.id, 'file', Number(id), 'edit');
    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    const newName = name !== undefined ? name : row.name;
    const newDept = department !== undefined ? department : row.department;
    const newTags = tags !== undefined ? tags : row.tags;

    db.run('UPDATE files SET name = ?, department = ?, tags = ? WHERE id = ?', [newName, newDept, newTags, id], function (uerr: any) {
      if (uerr) return res.status(500).json({ error: 'db error' });
      logAudit(user.id, `update:file:${id}:${row.name}->${newName}`);
      res.json({ updated: this.changes });
    });
  });
});

// DELETE /:id - delete file (after specific routes)
router.delete('/:id', authMiddleware, requireRole('admin', 'owner_admin'), (req, res) => {
  const id = req.params.id;
  db.get('SELECT path, owner_id, name FROM files WHERE id = ?', [id], async (err: any, row: any) => {
    if (err || !row) return res.status(404).json({ error: 'not found' });
    const user = (req as any).user;
    const allowed = await checkPermission(user.id, 'file', Number(id), 'delete');
    if (!allowed) return res.status(403).json({ error: 'forbidden' });
    // delete file blob
    try {
      if (row.path && fs.existsSync(row.path)) fs.unlinkSync(row.path);
    } catch (fsErr) {
      console.error('Failed to remove blob:', fsErr);
    }
    db.run('DELETE FROM files WHERE id = ?', [id], function (derr: any) {
      if (derr) return res.status(500).json({ error: 'db error' });
      logAudit(user.id, `delete:file:${id}:${row.name}`);
      res.json({ deleted: this.changes });
    });
  });
});

export default router;
