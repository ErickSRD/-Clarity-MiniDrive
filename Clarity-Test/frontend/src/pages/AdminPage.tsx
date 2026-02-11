import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Navigate } from 'react-router-dom';
import { UserIcon, ShieldCheckIcon, ChartBarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { toastSuccess, toastError } from '../utils/swal';

export default function AdminPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const [uRes, aRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/audit')
      ]);
      setUsers(uRes.data);
      setAuditLogs(aRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'owner_admin') {
      fetchAdminData();
    }
  }, [user]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.post(`/api/admin/users/${userId}/role`, { role: newRole });
      toastSuccess('Rol actualizado');
      fetchAdminData();
    } catch (err) {
      toastError('Error actualizando rol');
    }
  };

  if (userLoading) return <div>Cargando...</div>;
  if (user?.role !== 'owner_admin') return <Navigate to="/board" />;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">Panel de Administración</h1>
          <p className="text-slate-500">Gestiona usuarios, roles y monitoriza la actividad del sistema.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Usuarios Totales</p>
                <p className="text-2xl font-bold text-slate-800">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <ChartBarIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Espacio Usado</p>
                <p className="text-2xl font-bold text-slate-800">
                  {(users.reduce((acc, u) => acc + (Number(u.storage_used) || 0), 0) / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-600" /> Gestionar Usuarios
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Usuario</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Rol</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Almacenamiento</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                          {u.name?.[0] || u.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{u.name || 'Sin nombre'}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        u.role === 'owner_admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">
                        {(Number(u.storage_used || 0) / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        className="text-sm border-none bg-slate-100 px-3 py-1 rounded-lg outline-none"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        title="Cambiar rol"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="owner_admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-indigo-600" /> Registro de Actividad
            </h2>
          </div>
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex gap-4 text-sm border-l-2 border-slate-200 pl-4 py-1 hover:bg-slate-50 transition-colors">
                <span className="text-slate-400 tabular-nums w-40 shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <span className="text-slate-700 font-bold min-w-[120px]">
                  {log.user_name || log.user_email || `Usuario #${log.user_id}`}
                </span>
                <span className="text-slate-600 italic">{log.action}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
  );
}
