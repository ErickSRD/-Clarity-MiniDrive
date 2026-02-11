import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listFolders, createFolder, renameFolder, deleteFolder } from '../api'

export const useFolders = (parentId?: string) => {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['folders', parentId || 'root'], queryFn: () => listFolders(parentId), staleTime: 1000 * 60 })
  
  const create = useMutation({
    mutationFn: ({ name, parentId: overridenParentId, color, icon }: { name: string, parentId?: string, color?: string, icon?: string }) => 
      createFolder(name, overridenParentId !== undefined ? overridenParentId : parentId, color, icon),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] })
    }
  })

  const rename = useMutation({
    mutationFn: ({ id, name, color, icon }: { id: string, name?: string, color?: string, icon?: string }) => 
      renameFolder(id, name, color, icon),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] })
    }
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] })
    }
  })

  return { ...q, create, rename, remove }
}
