import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FolderIcon, PencilSquareIcon, TrashIcon, ShieldCheckIcon, FolderPlusIcon, ChevronRightIcon, ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useFolders } from '../features/folders/hooks/useFolders'
import { useFiles } from '../features/files/hooks/useFiles'
import { renameFolder, deleteFolder, createFolder } from '../features/folders/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { folderCustomizer, confirm, toastError, toastSuccess } from '../utils/swal'
import { useCurrentUser } from '../hooks/useCurrentUser'

// Recursive component for folder tree
function FolderNode({ 
  folder, 
  allFolders, 
  onOpen, 
  onRename, 
  onDelete,
  onCreateSub,
  currentFolderId 
}: { 
  folder: any, 
  allFolders: any[], 
  onOpen: (id: string) => void,
  onRename: (id: string, name: string, color?: string) => void,
  onDelete: (id: string) => void,
  onCreateSub: (parentId: string) => void,
  currentFolderId?: string
}) {
  const [expanded, setExpanded] = React.useState(false)
  const children = allFolders.filter(f => Number(f.parent_id) === Number(folder.id))
  const hasChildren = children.length > 0
  const isActive = String(folder.id) === String(currentFolderId)

  // Auto-expand if this folder contains the active one
  React.useEffect(() => {
    const isParentOfActive = (fId: string, targetId: string): boolean => {
      const target = allFolders.find(f => String(f.id) === String(targetId))
      if (!target || !target.parent_id) return false
      if (String(target.parent_id) === String(fId)) return true
      return isParentOfActive(fId, target.parent_id)
    }

    if (currentFolderId && isParentOfActive(folder.id, currentFolderId)) {
      setExpanded(true)
    }
  }, [currentFolderId, folder.id, allFolders])

  return (
    <div className="folder-tree-item">
      <div 
        className={`folder-tree-row ${isActive ? 'active' : ''}`} 
        onClick={() => {
          onOpen(folder.id)
          if (hasChildren) setExpanded(!expanded)
        }}
      >
        <div className="folder-tree-label">
          {hasChildren ? (
            <button 
              type="button"
              title={expanded ? "Contraer" : "Expandir"}
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="p-1 -ml-1 hover:bg-slate-200 rounded tree-toggle-btn"
            >
              {expanded ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
            </button>
          ) : (
            <div className="w-5" /> // Spacer
          )}
          <FolderIcon 
            className={`tree-icon flex-shrink-0 ${isActive ? 'active-icon' : ''}`} 
            style={!isActive && folder.color ? { color: folder.color } : {}}
          />
          <span className={`flex-1 truncate ${isActive ? 'font-bold' : ''}`} title={folder.name}>
            {folder.name}
          </span>
        </div>
        
        <div className="tree-controls">
          <button 
            type="button"
            title="Nueva sub-carpeta"
            onClick={(e) => { e.stopPropagation(); onCreateSub(folder.id); }}
            className={`tree-btn ${isActive ? 'active-btn' : ''}`}
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            title="Renombrar carpeta"
            onClick={(e) => { e.stopPropagation(); onRename(folder.id, folder.name, folder.color); }}
            className={`tree-btn ${isActive ? 'active-btn' : ''}`}
          >
            <PencilSquareIcon className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            title="Eliminar carpeta"
            onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
            className={`tree-btn danger ${isActive ? 'active-btn-danger' : ''}`}
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {expanded && hasChildren && (
        <div className="folder-tree-children">
          {children.map(child => (
            <FolderNode 
              key={child.id} 
              folder={child} 
              allFolders={allFolders} 
              onOpen={onOpen}
              onRename={onRename}
              onDelete={onDelete}
              onCreateSub={onCreateSub}
              currentFolderId={currentFolderId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ open }: { open?: boolean }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const currentFolderId = searchParams.get('folder') || undefined
  const { data: user } = useCurrentUser()
  const { data: folders, isLoading, create } = useFolders()
  const qc = useQueryClient()
  const renameMut = useMutation({ 
    mutationFn: ({ id, name, color }: any) => renameFolder(id, name, color), 
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }) 
  })
  const deleteMut = useMutation({ 
    mutationFn: (id: string) => deleteFolder(id), 
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }) 
  })

  const handleCreate = async () => {
    const res = await folderCustomizer('')
    if (!res) return
    try {
      await create.mutateAsync({ name: res.name, color: res.color })
      toastSuccess('Carpeta creada')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error creando carpeta', e)
      toastError('Error creando carpeta')
    }
  }

  const openFolder = (id?: string) => {
    if (!id) return navigate('/')
    navigate(`/?folder=${encodeURIComponent(id)}`)
  }

  // compute total used storage (from all files) and show in MB, capped at 1024 MB (1 GB)
  const { data: allData } = useFiles()
  const normalizedAll = React.useMemo(() => {
    if (!allData) return []
    if (Array.isArray(allData)) return allData
    if (Array.isArray((allData as any).uploaded)) return (allData as any).uploaded
    if (Array.isArray((allData as any).data)) return (allData as any).data
    return []
  }, [allData])
  const totalBytes = normalizedAll.reduce((s: number, f: any) => s + (Number(f.size) || 0), 0)
  const usedMbRaw = totalBytes / 1024 / 1024
  const totalMb = Math.min(usedMbRaw, 1024)
  const percentRaw = (usedMbRaw / 1024) * 100
  const percent = Math.min(100, percentRaw)
  const percentRounded = Math.round(percent)
  const statusClass = percentRaw >= 100 ? 'full' : percentRaw >= 80 ? 'almost-full' : 'ok'

  return (
    <aside className={`sidebar glass-card ${open ? 'open' : ''}`}>
      <div className="sidebar-inner">
        <button onClick={handleCreate} className="sq-btn green new-folder-btn">
          <FolderPlusIcon className="sq-icon" />
          <span>Nueva carpeta</span>
        </button>
      </div>
      <nav className="sidebar-inner">
        <ul>
          <li onClick={() => openFolder(undefined)} className="side-item active"><FolderIcon className="icon-svg"/> Mis archivos</li>
          {user?.role === 'owner_admin' && (
            <li onClick={() => navigate('/admin')} className="side-item">
              <ShieldCheckIcon className="icon-svg" /> Administrador
            </li>
          )}
        </ul>

        <div className="folders-list" aria-label="Carpetas">
          <div className="folders-title">Carpetas</div>
          {isLoading && <div className="muted">Cargando…</div>}
          {folders && folders.length === 0 && <div className="muted">Sin carpetas</div>}
          
          <div className="mt-2 space-y-1">
            {folders && folders.filter((f: any) => !f.parent_id).map((f: any) => (
              <FolderNode 
                key={f.id} 
                folder={f} 
                allFolders={folders} 
                onOpen={openFolder}
                currentFolderId={currentFolderId}
                onCreateSub={async (parentId) => {
                  const res = await folderCustomizer('')
                  if (res) {
                    try {
                      await create.mutateAsync({ name: res.name, parentId, color: res.color } as any)
                      toastSuccess('Sub-carpeta creada')
                    } catch (e) {
                      toastError('Error al crear')
                    }
                  }
                }}
                onRename={async (id, name, color) => {
                  const res = await folderCustomizer(name, color)
                  if (res) {
                    try {
                      await renameMut.mutateAsync({ id, name: res.name, color: res.color })
                      toastSuccess('Carpeta actualizada')
                    } catch (e) {
                      toastError('Error al actualizar')
                    }
                  }
                }}
                onDelete={async (id) => {
                  const ok = await confirm('Eliminar', '¿Eliminar carpeta?')
                  if (ok) deleteMut.mutateAsync(id)
                }}
              />
            ))}
          </div>
        </div>
      </nav>
      <div className="storage-section">
        <div className="storage-label">ALMACENAMIENTO</div>
        <div className="storage-bar">
          <div className={`storage-used ${statusClass}`} style={{ width: `${percentRounded}%` }} />
        </div>
        <div className="storage-note">{usedMbRaw.toFixed(2)} MB de 1024 MB ({percentRounded}%)</div>
      </div>
    </aside>
  )
}
