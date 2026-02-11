import React from 'react'
import { FolderIcon } from '@heroicons/react/24/outline'

type FolderGridProps = {
  folders?: Array<{ id: string; name: string }>
  loading?: boolean
  error?: boolean
  onOpen: (folderId: string) => void
  onDrop?: (folderId: string, fileId?: string) => void
  selectedFolderId?: string | null
  onSelect?: (folderId: string | null) => void
}

export default function FolderGrid({ folders, loading, error, onOpen, onDrop, selectedFolderId, onSelect }: FolderGridProps) {
  const [dropTarget, setDropTarget] = React.useState<string | null>(null)
  if (loading) return <div>Cargando carpetas…</div>
  if (error) return <div>No se pudieron cargar las carpetas</div>
  if (!folders || folders.length === 0) return <div>No hay carpetas aún</div>

  return (
    <div className="folder-grid">
      {folders.map((folder) => (
        <div
          className={`folder-card${dropTarget === folder.id ? ' drop-target' : ''}${selectedFolderId === folder.id ? ' selected' : ''}`}
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
            // clear selection when opening
            if (onSelect) onSelect(null)
          }}
          onClick={(e) => {
            e.stopPropagation()
            if (onSelect) {
              // toggle selection
              onSelect(selectedFolderId === folder.id ? null : folder.id)
            }
          }}
        >
          <div className="folder-shape">
            <div className="folder-body">
              <div className="folder-body-left">
                <FolderIcon className="folder-icon" />
              </div>
              <div className="folder-body-right">
                <p className="folder-card-title">{folder.name}</p>
                <p className="text-sm">ID {folder.id}</p>
              </div>
            </div>
          </div>
          {/* Open folder by double-clicking the card */}
        </div>
      ))}
    </div>
  )
}
