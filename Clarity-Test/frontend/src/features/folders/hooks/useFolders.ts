import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listFolders, createFolder } from '../api'

export const useFolders = (parentId?: string) => {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['folders', parentId || 'root'], queryFn: () => listFolders(parentId), staleTime: 1000 * 60 })
  const create = useMutation({
    mutationFn: ({ name }: { name: string }) => createFolder(name, parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] })
      qc.invalidateQueries({ queryKey: ['folders', parentId || 'root'] })
    }
  })
  return { ...q, create }
}
