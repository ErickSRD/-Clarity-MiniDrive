import api from '../../services/api';

export const listFiles = async (folderId?: string) => {
  const url = folderId ? `/api/files?folder=${encodeURIComponent(folderId)}` : '/api/files';
  const res = await api.get(url);
  return res.data;
}

export const uploadFiles = async (fd: FormData, folderId?: string) => {
  // append folder_id if provided so backend stores file in correct folder
  if (folderId) fd.append('folder_id', folderId);
  const res = await api.post('/api/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export const getFileDetails = async (id: string) => {
  const res = await api.get(`/api/files/${id}`);
  return res.data;
}

export const moveFile = async (id: string, folderId?: string) => {
  const res = await api.patch(`/api/files/${id}/move`, { folder_id: folderId });
  return res.data;
}

export const deleteFile = async (id: string) => {
  const res = await api.delete(`/api/files/${id}`);
  return res.data;
}

export const toggleFileVisibility = async (id: string, isPublic: boolean) => {
  const res = await api.patch(`/api/files/${id}/visibility`, { is_public: isPublic });
  return res.data;
}
