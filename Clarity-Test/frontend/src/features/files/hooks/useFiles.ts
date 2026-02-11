import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listFiles, uploadFiles } from '../api';

export const useFiles = (folderId?: string) => {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['files', folderId || 'all'], queryFn: () => listFiles(folderId), staleTime: 1000 * 60 });
  const upload = useMutation({
    mutationFn: (fd: FormData) => uploadFiles(fd, folderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] })
  });
  return { ...q, upload };
}
