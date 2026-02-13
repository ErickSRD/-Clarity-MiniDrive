import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import db, { logAudit } from '../db';

const router = express.Router();

// --- DEPARTMENTS ---

router.get('/departments', authMiddleware, (req, res) => {
  db.all('SELECT * FROM departments ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

router.post('/departments', authMiddleware, requireRole('admin', 'owner_admin'), (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  db.run('INSERT INTO departments (name, description, color) VALUES (?, ?, ?)', [name, description, color], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'department already exists' });
      return res.status(500).json({ error: 'db error' });
    }
    const user = (req as any).user;
    logAudit(user.id, `create:department:${this.lastID}:${name}`);
    res.json({ id: this.lastID, name, description, color });
  });
});

router.delete('/departments/:id', authMiddleware, requireRole('admin', 'owner_admin'), (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM departments WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: 'db error' });
    const user = (req as any).user;
    logAudit(user.id, `delete:department:${id}`);
    res.json({ deleted: this.changes });
  });
});

// --- TAGS ---

router.get('/tags', authMiddleware, (req, res) => {
  db.all('SELECT * FROM global_tags ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

router.post('/tags', authMiddleware, requireRole('admin', 'owner_admin'), (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  db.run('INSERT INTO global_tags (name, color) VALUES (?, ?)', [name, color], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'tag already exists' });
      return res.status(500).json({ error: 'db error' });
    }
    const user = (req as any).user;
    logAudit(user.id, `create:tag:${this.lastID}:${name}`);
    res.json({ id: this.lastID, name, color });
  });
});

router.delete('/tags/:id', authMiddleware, requireRole('admin', 'owner_admin'), (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM global_tags WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: 'db error' });
    const user = (req as any).user;
    logAudit(user.id, `delete:tag:${id}`);
    res.json({ deleted: this.changes });
  });
});

export default router;
