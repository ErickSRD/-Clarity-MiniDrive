import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { grantPermission, revokePermission, checkPermission } from '../db';
import db from '../db';

const router = express.Router();

interface AuthRequest extends express.Request {
  user: {
    id: number;
    role: string;
  };
}

// List permissions for a resource
router.get('/', authMiddleware, async (req, res) => {
  const { resource_type, resource_id } = req.query;
  if (!resource_type || !resource_id) return res.status(400).json({ error: 'missing search params' });

  const authReq = req as unknown as AuthRequest;

  try {
    // Check if the user has permission to see management details
    const canManage = await checkPermission(authReq.user.id, resource_type as string, Number(resource_id), 'manage');
    if (!canManage) {
        return res.status(403).json({ error: 'forbidden' });
    }

    db.all(`
      SELECT p.*, u.email, u.name 
      FROM permissions p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.resource_type = ? AND p.resource_id = ?
    `, [resource_type, resource_id], (err: any, rows: any) => {
      if (err) return res.status(500).json({ error: 'db error' });
      res.json(rows);
    });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

// Grant permission: Must be owner or admin
router.post('/', authMiddleware, async (req, res) => {
  const { user_id, resource_type, resource_id, permission_type } = req.body;
  if (!user_id || !resource_type || !permission_type) return res.status(400).json({ error: 'missing fields' });
  
  const authReq = req as unknown as AuthRequest;
  
  try {
    // Check if the granter has permission to manage this resource
    // For now, only owners (handled by checkPermission internal logic) or admins can grant.
    // Actually, checkPermission returns true if owner/admin.
    const canManage = await checkPermission(authReq.user.id, resource_type, resource_id ?? null, 'manage');
    if (!canManage) {
        return res.status(403).json({ error: 'forbidden' });
    }

    await grantPermission(authReq.user.id, user_id, resource_type, resource_id ?? null, permission_type);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

// Revoke permission
router.delete('/', authMiddleware, async (req, res) => {
  const { user_id, resource_type, resource_id, permission_type } = req.body;
  if (!user_id || !resource_type || !permission_type) return res.status(400).json({ error: 'missing fields' });
  
  const authReq = req as unknown as AuthRequest;

  try {
    const canManage = await checkPermission(authReq.user.id, resource_type, resource_id ?? null, 'manage');
    if (!canManage) {
        return res.status(403).json({ error: 'forbidden' });
    }

    await revokePermission(authReq.user.id, user_id, resource_type, resource_id ?? null, permission_type);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

export default router;
