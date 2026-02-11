import express from 'express';
import { authMiddleware } from '../middleware/auth';
import ExcelJS from 'exceljs';
import db from '../db';

const router = express.Router();

// Helper for DB queries
const query = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: any, rows: any) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// GET /api/reports/stats - General statistics
router.get('/stats', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  
  try {
    // 1. Storage Usage (Global if admin, otherwise user specific)
    const storageSql = user.role === 'admin' 
      ? 'SELECT SUM(size) as total FROM files'
      : 'SELECT SUM(size) as total FROM files WHERE owner_id = ?';
    const storageParams = user.role === 'admin' ? [] : [user.id];
    const storageRes = await query(storageSql, storageParams);

    // 2. Activity by Department
    const deptSql = user.role === 'admin'
      ? 'SELECT department, COUNT(*) as count, SUM(size) as size FROM files GROUP BY department'
      : 'SELECT department, COUNT(*) as count, SUM(size) as size FROM files WHERE owner_id = ? GROUP BY department';
    const deptParams = user.role === 'admin' ? [] : [user.id];
    const depts = await query(deptSql, deptParams);

    // 3. User activity (Admin only: Total active users vs total users)
    let usersStats = null;
    if (user.role === 'admin') {
      const activeUsers = await query(`
        SELECT COUNT(DISTINCT user_id) as active 
        FROM audit_logs 
        WHERE timestamp > date('now', '-7 days')
      `);
      const totalUsers = await query('SELECT COUNT(*) as total FROM users');
      usersStats = {
        active: activeUsers[0].active,
        total: totalUsers[0].total
      };
    }

    res.json({
      storage: storageRes[0].total || 0,
      departments: depts.map(d => ({
        name: d.department || 'Sin departamento',
        count: d.count,
        size: d.size
      })),
      users: usersStats
    });

  } catch (error) {
    console.error('Reports Error:', error);
    res.status(500).json({ error: 'failed to fetch reports' });
  }
});

// GET /api/reports/export/excel - Export report to Excel
router.get('/export/excel', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Clarity Report');

  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Nombre', key: 'name', width: 30 },
    { header: 'Tipo', key: 'type', width: 15 },
    { header: 'Tamaño (KB)', key: 'size', width: 15 },
    { header: 'Departamento', key: 'department', width: 20 },
    { header: 'Etiquetas', key: 'tags', width: 20 },
    { header: 'Fecha Creación', key: 'created_at', width: 25 },
    { header: 'Público', key: 'is_public', width: 10 }
  ];

  try {
    const sql = user.role === 'admin'
      ? 'SELECT id, name, type, size, department, tags, created_at, is_public FROM files'
      : 'SELECT id, name, type, size, department, tags, created_at, is_public FROM files WHERE owner_id = ?';
    const params = user.role === 'admin' ? [] : [user.id];
    const files = await query(sql, params);

    files.forEach(f => {
      sheet.addRow({
        ...f,
        size: (f.size / 1024).toFixed(2),
        is_public: f.is_public ? 'Sí' : 'No'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Clarity.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'failed to export excel' });
  }
});

export default router;
