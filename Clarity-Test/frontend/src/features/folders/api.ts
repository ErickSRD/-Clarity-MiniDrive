import api from '../../services/api';

export const listFolders = async (parentId?: string) => {
  const url = parentId ? `/api/files/folders?parent=${encodeURIComponent(parentId)}` : '/api/files/folders';
  const res = await api.get(url);
  return res.data;
}

export const createFolder = async (name: string, parentId?: string, color?: string, icon?: string) => {
  const payload: any = { name };
  if (parentId) payload.parent_id = parentId;
  if (color) payload.color = color;
  if (icon) payload.icon = icon;
  const res = await api.post('/api/files/folders', payload);
  return res.data;
}

export const renameFolder = async (id: string, name?: string, color?: string, icon?: string) => {
  const payload: any = {};
  if (name !== undefined) payload.name = name;
  if (color !== undefined) payload.color = color;
  if (icon !== undefined) payload.icon = icon;
  const res = await api.patch(`/api/files/folders/${id}`, payload);
  return res.data;
}

export const deleteFolder = async (id: string) => {
  const res = await api.delete(`/api/files/folders/${id}`);
  return res.data;
}

export const getFolder = async (id: string) => {
  const res = await api.get(`/api/files/folders/${id}`);
  return res.data;
}
