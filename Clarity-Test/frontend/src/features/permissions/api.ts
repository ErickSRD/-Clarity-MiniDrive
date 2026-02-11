import api from '../../services/api';

export const listPermissions = async (resourceType: string, resourceId: string) => {
  const res = await api.get(`/api/permissions?resource_type=${resourceType}&resource_id=${resourceId}`);
  return res.data;
}

export const grantPermission = async (userId: string, resourceType: string, resourceId: string, permissionType: string) => {
  const res = await api.post('/api/permissions', {
    user_id: userId,
    resource_type: resourceType,
    resource_id: resourceId,
    permission_type: permissionType
  });
  return res.data;
}

export const revokePermission = async (userId: string, resourceType: string, resourceId: string, permissionType: string) => {
  const res = await api.delete('/api/permissions', {
    data: {
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      permission_type: permissionType
    }
  });
  return res.data;
}

export const searchUsers = async (query: string) => {
  const res = await api.get(`/api/auth?q=${encodeURIComponent(query)}`);
  return res.data;
}
