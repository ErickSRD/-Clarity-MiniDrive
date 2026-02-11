import React from 'react'
import { FolderIcon, PencilIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline'

type FolderGridProps = {
  folders?: Array<{ id: string; name: string; color?: string; icon?: string }>
  loading?: boolean
  error?: boolean
  onOpen: (folderId: string) => void
  onDrop?: (folderId: string, fileId?: string) => void
  selectedFolderId?: string | null
  onSelect?: (folderId: string | null) => void
  onRename?: (id: string, name: string, color?: string) => void
  onDelete?: (id: string) => void
  onShare?: (id: string, name: string) => void
}

export default function FolderGrid({ 
  folders, 
  loading, 
  error, 
  onOpen, 
  onDrop, 
  selectedFolderId, 
  onSelect,
  onRename,
  onDelete,
  onShare
}: FolderGridProps) {
  const [dropTarget, setDropTarget] = React.useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null)

  if (loading) return <div>Cargando carpetas…</div>
  if (error) return <div>No se pudieron cargar las carpetas</div>
  if (!folders || folders.length === 0) return <div>No hay carpetas aún</div>

  const handleMenuAction = (id: string, action: () => void) => {
    setOpenMenuId(null)
    action()
  }

  return (
    <div className="folder-grid">
      {folders.map((folder) => (
        <div
          className={`folder-card group${dropTarget === folder.id ? ' drop-target' : ''}${selectedFolderId === folder.id ? ' selected' : ''}`}
          key={folder.id}
          style={{ zIndex: openMenuId === folder.id ? 1000 : 1 }}
          onDragOver={(e) => {
            e.preventDefault()
            setDropTarget(folder.id)
            e.dataTransfer.dropEffect = 'move'
          }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(e) => {
            e.preventDefault()
            setDropTarget(null)
            const fileId = e.dataTransfer.getData('application/file-id')
            if (fileId && onDrop) {
              onDrop(folder.id, fileId)
            }
          }}
          onDoubleClick={() => {
            onOpen(folder.id)
            if (onSelect) onSelect(null)
          }}
          onClick={(e) => {
            e.stopPropagation()
            if (onSelect) {
              onSelect(selectedFolderId === folder.id ? null : folder.id)
            }
          }}
        >
          <div className="folder-shape">
            <div className="folder-body" style={{ ...(folder.color ? { borderLeft: `4px solid ${folder.color}` } : {}), overflow: 'visible' }}>
              <div className="folder-body-left">
                <FolderIcon 
                  className="folder-icon" 
                  style={folder.color ? { background: folder.color, boxShadow: `0 8px 20px ${folder.color}2e` } : {}}
                />
              </div>
              <div className="folder-body-right">
                <p className="folder-card-title truncate" title={folder.name}>{folder.name}</p>
              </div>

              {/* Actions Menu */}
              <div className="options-wrapper">
                <button
                  type="button"
                  className="options-trigger"
                  style={{ padding: '2px 8px', fontSize: '18px', borderRadius: '999px', background: '#fff', border: '1px solid #eef2f7' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === folder.id ? null : folder.id)
                  }}
                >
                  ⋮
                </button>
                {openMenuId === folder.id && (
                  <div className="options-menu" style={{ top: '100%', right: '0' }}>
                    <button type="button" onClick={() => handleMenuAction(folder.id, () => onOpen(folder.id))}>
                      <FolderIcon className="w-4 h-4 mr-2" /> Abrir carpeta
                    </button>
                    {onShare && (
                      <button type="button" onClick={() => handleMenuAction(folder.id, () => onShare(folder.id, folder.name))}>
                        <UserPlusIcon className="w-4 h-4 mr-2" /> Compartir
                      </button>
                    )}
                    {onRename && (
                      <button type="button" onClick={() => handleMenuAction(folder.id, () => onRename(folder.id, folder.name, folder.color))}>
                        <PencilIcon className="w-4 h-4 mr-2" /> Renombrar
                      </button>
                    )}
                    {onDelete && (
                      <button type="button" onClick={() => handleMenuAction(folder.id, () => onDelete(folder.id))}>
                        <TrashIcon className="w-4 h-4 mr-2" /> Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Click outside to close menu */}
      {openMenuId && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 9999 }} 
          onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
        />
      )}
    </div>
  )
}
