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

export const updateFileMetadata = async (id: string, metadata: { name?: string, department?: string, tags?: string }) => {
  const res = await api.patch(`/api/files/${id}`, metadata);
  return res.data;
}

export const toggleFileVisibility = async (id: string, isPublic: boolean) => {
  const res = await api.patch(`/api/files/${id}/visibility`, { is_public: isPublic });
  return res.data;
}

export const advancedSearch = async (params: { 
  q?: string, 
  type?: string, 
  department?: string, 
  tags?: string, 
  startDate?: string, 
  endDate?: string 
}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryParams.append(key, value);
  });
  const res = await api.get(`/api/files/search?${queryParams.toString()}`);
  return res.data;
}
