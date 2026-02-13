import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  FolderIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  ShieldCheckIcon, 
  FolderPlusIcon, 
  ChevronRightIcon, 
  ChevronDownIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  ChartBarIcon,
  TagIcon
} from '@heroicons/react/24/outline'
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
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const { data: user } = useCurrentUser()
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

  // Click outside to close menu
  React.useEffect(() => {
    if (!menuOpen) return
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    e.preventDefault()
    setMenuOpen(false)
    action()
  }

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
          <span className={`flex-1 ${isActive ? 'font-bold' : ''}`} title={folder.name}>
            {folder.name}
          </span>
        </div>
        
        <div className="tree-controls">
          <div className="options-wrapper" ref={menuRef}>
            <button
              type="button"
              className={`tree-btn ${isActive ? 'active-btn' : ''}`}
              title="Más opciones"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setMenuOpen(!menuOpen)
              }}
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="options-menu tree-menu">
                {(user?.role === 'admin' || user?.role === 'editor' || user?.role === 'owner_admin') && (
                  <>
                    <button type="button" onClick={(e) => handleMenuAction(e, () => onCreateSub(folder.id))}>
                      <PlusIcon className="w-4 h-4 mr-2 text-slate-500" /> Nueva sub-carpeta
                    </button>
                    <button type="button" onClick={(e) => handleMenuAction(e, () => onRename(folder.id, folder.name, folder.color))}>
                      <PencilSquareIcon className="w-4 h-4 mr-2 text-slate-500" /> Renombrar
                    </button>
                  </>
                )}
                {(user?.role === 'admin' || user?.role === 'owner_admin') && (
                  <button type="button" onClick={(e) => handleMenuAction(e, () => onDelete(folder.id))}>
                    <TrashIcon className="w-4 h-4 mr-2 text-red-500" /> Eliminar
                  </button>
                )}
                <button type="button" onClick={(e) => handleMenuAction(e, () => onOpen(folder.id))}>
                  <ChevronRightIcon className="w-4 h-4 mr-2 text-slate-500" /> Ver contenidos
                </button>
              </div>
            )}
          </div>
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
  const storageRef = React.useRef<HTMLDivElement>(null)
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

  React.useEffect(() => {
    if (storageRef.current) {
      storageRef.current.style.setProperty('--storage-width', `${percentRounded}%`)
    }
  }, [percentRounded])

  return (
    <aside className={`sidebar glass-card ${open ? 'open' : ''}`}>
      <div className="sidebar-inner">
        {(user?.role === 'admin' || user?.role === 'editor' || user?.role === 'owner_admin') && (
          <button onClick={handleCreate} className="sq-btn green new-folder-btn">
            <FolderPlusIcon className="sq-icon" />
            <span>Nueva carpeta</span>
          </button>
        )}
      </div>
      <nav className="sidebar-inner">
        <ul>
          <li onClick={() => openFolder(undefined)} className="side-item active"><FolderIcon className="icon-svg"/> Mis archivos</li>
          <li onClick={() => navigate('/board?tab=busqueda')} className="side-item">
            <MagnifyingGlassIcon className="icon-svg" /> Búsqueda
          </li>
          
          {(user?.role === 'admin' || user?.role === 'editor' || user?.role === 'owner_admin') && (
            <li onClick={() => navigate('/reports')} className="side-item">
              <ChartBarIcon className="icon-svg" /> Reportes
            </li>
          )}

          {(user?.role === 'admin' || user?.role === 'owner_admin') && (
            <>
              <li onClick={() => navigate('/taxonomy')} className="side-item">
                <TagIcon className="icon-svg" /> Etiquetas y Deptos.
              </li>
              <li onClick={() => navigate('/admin')} className="side-item">
                <ShieldCheckIcon className="icon-svg" /> Administrador
              </li>
            </>
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
                  const ok = await confirm(
                    '¿Eliminar carpeta?', 
                    'Se eliminará la carpeta y todo su contenido (archivos y subcarpetas).'
                  )
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
          <div 
            ref={storageRef}
            className={`storage-used ${statusClass}`} 
          />
        </div>
        <div className="storage-note">{usedMbRaw.toFixed(2)} MB de 1024 MB ({percentRounded}%)</div>
      </div>
    </aside>
  )
}
