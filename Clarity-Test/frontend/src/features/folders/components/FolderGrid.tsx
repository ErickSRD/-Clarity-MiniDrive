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
  if (loading) return <div>Cargando carpetas…</div>
  if (error) return <div>No se pudieron cargar las carpetas</div>
  if (!folders || folders.length === 0) return <div>No hay carpetas aún</div>

  return (
    <div className="folder-grid">
      {folders.map((folder) => (
        <div
          className={`folder-card group${dropTarget === folder.id ? ' drop-target' : ''}${selectedFolderId === folder.id ? ' selected' : ''}`}
          key={folder.id}
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
            <div className="folder-body" style={folder.color ? { borderLeft: `4px solid ${folder.color}` } : {}}>
              <div className="folder-body-left">
                <FolderIcon 
                  className="folder-icon" 
                  style={folder.color ? { background: folder.color, boxShadow: `0 8px 20px ${folder.color}2e` } : {}}
                />
              </div>
              <div className="folder-body-right relative pr-8">
                <p className="folder-card-title truncate">{folder.name}</p>
                
                {/* Actions */}
                <div className="absolute top-0 right-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onShare && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(folder.id, folder.name);
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                    </button>
                  )}
                  {onRename && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRename(folder.id, folder.name, folder.color);
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(folder.id);
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
