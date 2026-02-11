import React from 'react'
import { FolderOpenIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'

export default function EmptyFolder({ onUpload }: { onUpload?: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-illustration">
        <div className="empty-card">
          <FolderOpenIcon className="empty-icon" />
        </div>
        <div className="sparkles">
          <span className="spark" />
          <span className="spark" />
          <span className="spark" />
        </div>
      </div>
      <h3>No hay archivos aquí</h3>
      <p className="muted">Esta carpeta está limpia como una libreta nueva. ¿Quieres subir algo?</p>
      <div className="mt-3">
        <button className="sq-btn green" onClick={() => onUpload && onUpload()}>
          <ArrowUpTrayIcon className="w-4 h-4 mr-2" /> Subir archivos
        </button>
      </div>
    </div>
  )
}
