import React from 'react'
import FileCard from './FileCard'
import { RocketLaunchIcon, SparklesIcon } from '@heroicons/react/24/outline'

export default function FileList({ files }: { files: any }) {
  const list: any[] = Array.isArray(files)
    ? files
    : files && Array.isArray(files.uploaded)
    ? files.uploaded
    : files && Array.isArray(files.data)
    ? files.data
    : [];

  if (!list || list.length === 0) return (
    <div className="empty-state-generic">
      <div className="empty-illustration-generic">
        <div className="empty-rocket">
          <RocketLaunchIcon className="rocket-icon" />
        </div>
      </div>
      <h3 className="empty-title">¡No tiene archivos de este tipo! </h3>
      <p className="empty-message">Parece que aquí aún no hay nada. ¡Sube tus primeros archivos y empieza la aventura!</p>
    </div>
  )
  return (
    <div className="file-grid">
      {list.map((f) => (
        <FileCard key={f.id} id={f.id} name={f.name} type={f.type} size={f.size} isPublic={f.is_public} />
      ))}
    </div>
  )
}
