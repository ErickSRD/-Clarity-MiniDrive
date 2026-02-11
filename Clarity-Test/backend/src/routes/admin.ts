import express from 'express';
import db from '../db';
import { requireRole } from '../middleware/requireRole';

const router = express.Router();

// List users (admin only)
router.get('/users', requireRole('owner_admin'), (req, res) => {
  db.all(`
    SELECT u.id, u.email, u.name, u.role, u.created_at, SUM(f.size) as storage_used 
    FROM users u 
    LEFT JOIN files f ON u.id = f.owner_id 
    GROUP BY u.id
  `, [], (err: any, rows: any) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

// Assign role
router.post('/users/:id/role', requireRole('owner_admin'), (req, res) => {
  const id = req.params.id;
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'role required' });
  db.run('UPDATE users SET role = ? WHERE id = ?', [role, id], function (err) {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json({ updated: this.changes });
  });
});

// Audit logs (admin only)
router.get('/audit', requireRole('owner_admin'), (req, res) => {
  db.all('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

export default router;
