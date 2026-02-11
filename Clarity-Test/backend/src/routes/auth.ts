import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const hash = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [email, hash, 'viewer'], function (err) {
    if (err) return res.status(500).json({ error: 'could not create user' });
    res.json({ id: this.lastID, email });
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err: any, row: any) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (!row) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ sub: row.id, role: row.role }, process.env.JWT_SECRET || 'change-me', { expiresIn: '8h' });
    res.json({ token });
  });
});

router.get('/me', authMiddleware, (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: 'not authenticated' });
  db.get('SELECT id, email, name, role FROM users WHERE id = ?', [userId], (err: any, row: any) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (!row) return res.status(404).json({ error: 'user not found' });
    res.json(row);
  });
});

// Update profile (name and email)
router.patch('/profile', authMiddleware, (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: 'not authenticated' });
  
  const { name, email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  
  // Check if email is already taken by another user
  db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err: any, row: any) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (row) return res.status(400).json({ error: 'email already taken' });
    
    db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', [name || null, email, userId], function (uerr: any) {
      if (uerr) return res.status(500).json({ error: 'db error' });
      
      // Return updated user info
      db.get('SELECT id, email, name, role FROM users WHERE id = ?', [userId], (gerr: any, user: any) => {
        if (gerr) return res.status(500).json({ error: 'db error' });
        res.json(user);
      });
    });
  });
});

// Change password
router.patch('/password', authMiddleware, async (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: 'not authenticated' });
  
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'current and new password required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
  
  // Verify current password
  db.get('SELECT password_hash FROM users WHERE id = ?', [userId], async (err: any, row: any) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (!row) return res.status(404).json({ error: 'user not found' });
    
    const isValid = await bcrypt.compare(currentPassword, row.password_hash);
    if (!isValid) return res.status(401).json({ error: 'current password is incorrect' });
    
    // Hash and update new password
    const newHash = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId], function (uerr: any) {
      if (uerr) return res.status(500).json({ error: 'db error' });
      res.json({ success: true, message: 'password updated' });
    });
  });
});

export default router;
