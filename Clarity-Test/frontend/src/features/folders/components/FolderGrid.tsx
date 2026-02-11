import React, { useEffect, useRef } from 'react'
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

function FolderCardItem({ 
  folder, 
  dropTarget, 
  selectedFolderId, 
  openMenuId, 
  onDragOver, 
  onDragLeave, 
  onDrop, 
  onDoubleClick, 
  onClick, 
  onOpen, 
  onShare, 
  onRename, 
  onDelete, 
  setOpenMenuId, 
  handleMenuAction 
}: any) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<any>(null)

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.setProperty('--folder-border-color', folder.color || 'transparent')
    }
    if (iconRef.current) {
      iconRef.current.style.setProperty('--folder-icon-bg', folder.color || '#21C07A')
      iconRef.current.style.setProperty('--folder-icon-glow', `${folder.color || '#21C07A'}2e`)
    }
  }, [folder.color])

  return (
    <div
      className={`folder-card group ${dropTarget === folder.id ? 'drop-target' : ''} ${selectedFolderId === folder.id ? 'selected' : ''} ${openMenuId === folder.id ? 'menu-open' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDoubleClick={onDoubleClick}
      onClick={onClick}
    >
      <div className="folder-shape">
        <div ref={bodyRef} className="folder-body">
          <div className="folder-body-left">
            <FolderIcon ref={iconRef} className="folder-icon" />
          </div>
          <div className="folder-body-right">
            <p className="folder-card-title truncate" title={folder.name}>{folder.name}</p>
          </div>

          <div className="options-wrapper">
            <button
              type="button"
              className="options-trigger-pill"
              title="Más opciones"
              onClick={(e) => {
                e.stopPropagation()
                setOpenMenuId(openMenuId === folder.id ? null : folder.id)
              }}
            >
              ⋮
            </button>
            {openMenuId === folder.id && (
              <div className="options-menu options-menu-bottom-right">
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
  )
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
        <FolderCardItem
          key={folder.id}
          folder={folder}
          dropTarget={dropTarget}
          selectedFolderId={selectedFolderId}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
          handleMenuAction={handleMenuAction}
          onOpen={onOpen}
          onShare={onShare}
          onRename={onRename}
          onDelete={onDelete}
          onDragOver={(e: any) => {
            e.preventDefault()
            setDropTarget(folder.id)
            e.dataTransfer.dropEffect = 'move'
          }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(e: any) => {
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
          onClick={(e: any) => {
            e.stopPropagation()
            if (onSelect) {
              onSelect(selectedFolderId === folder.id ? null : folder.id)
            }
          }}
        />
      ))}
      
      {/* Click outside to close menu */}
      {openMenuId && (
        <div 
          className="overlay-fixed"
          onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
        />
      )}
    </div>
  )
}
