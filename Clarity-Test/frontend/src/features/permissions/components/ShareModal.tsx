import React, { useState, useEffect } from 'react';
import { UserPlusIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline';
import { listPermissions, grantPermission, revokePermission, searchUsers } from '../api';
import { toastSuccess, toastError } from '../../../utils/swal';

type ShareModalProps = {
  resourceType: 'file' | 'folder';
  resourceId: string;
  resourceName: string;
  onClose: () => void;
};

export default function ShareModal({ resourceType, resourceId, resourceName, onClose }: ShareModalProps) {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPermissions = async () => {
    try {
      const data = await listPermissions(resourceType, resourceId);
      setPermissions(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [resourceId]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.length > 1) {
        const results = await searchUsers(search);
        // filter out users who already have permission
        const existingIds = permissions.map(p => p.user_id);
        setUsers(results.filter((u: any) => !existingIds.includes(u.id)));
      } else {
        setUsers([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, permissions]);

  const handleGrant = async (userId: string, permissionType: string) => {
    try {
      setLoading(true);
      await grantPermission(userId, resourceType, resourceId, permissionType);
      toastSuccess('Permiso otorgado');
      await fetchPermissions();
      setSearch('');
    } catch (err) {
      toastError('No se pudo otorgar el permiso');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (userId: string, permissionType: string) => {
    try {
      setLoading(true);
      await revokePermission(userId, resourceType, resourceId, permissionType);
      toastSuccess('Permiso revocado');
      await fetchPermissions();
    } catch (err) {
      toastError('No se pudo revocar el permiso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800">Compartir "{resourceName}"</h2>
          <p className="text-sm text-slate-500 mt-1">Gestiona quién tiene acceso a este {resourceType === 'file' ? 'archivo' : 'carpeta'}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Search Section */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Agregar personas</label>
            <div className="relative">
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {users.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                  {users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleGrant(user.id, 'read')}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-slate-800">{user.name || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                      <UserPlusIcon className="w-5 h-5 ml-auto text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Members List */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Personas con acceso</label>
            <div className="space-y-3">
              {permissions.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Nadie más tiene acceso.</p>
              ) : (
                permissions.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <UserIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{p.name || 'Usuario'}</p>
                      <p className="text-xs text-slate-500">{p.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                            {p.permission_type}
                        </span>
                        <button 
                            onClick={() => handleRevoke(p.user_id, p.permission_type)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Revocar acceso"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="sq-btn green"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
