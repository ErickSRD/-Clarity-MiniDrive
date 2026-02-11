import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { grantPermission, revokePermission } from '../db';

const router = express.Router();

// Grant permission: only owner_admin for now
router.post('/', authMiddleware, requireRole('owner_admin'), async (req, res) => {
  const { user_id, resource_type, resource_id, permission_type } = req.body;
  if (!user_id || !resource_type || !permission_type) return res.status(400).json({ error: 'missing fields' });
  try {
    await grantPermission((req as any).user.id, user_id, resource_type, resource_id ?? null, permission_type);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

// Revoke permission
router.delete('/', authMiddleware, requireRole('owner_admin'), async (req, res) => {
  const { user_id, resource_type, resource_id, permission_type } = req.body;
  if (!user_id || !resource_type || !permission_type) return res.status(400).json({ error: 'missing fields' });
  try {
    await revokePermission((req as any).user.id, user_id, resource_type, resource_id ?? null, permission_type);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

export default router;
