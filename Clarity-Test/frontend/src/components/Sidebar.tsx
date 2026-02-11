import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useFolders } from '../features/folders/hooks/useFolders'
import { useFiles } from '../features/files/hooks/useFiles'
import { renameFolder, deleteFolder } from '../features/folders/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inputText, confirm, toastError, toastSuccess } from '../utils/swal'

export default function Sidebar({ open }: { open?: boolean }) {
  const navigate = useNavigate()
  const { data: folders, isLoading, create } = useFolders()
  const qc = useQueryClient()
  const renameMut = useMutation({ mutationFn: ({ id, name }: any) => renameFolder(id, name), onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }) })
  const deleteMut = useMutation({ mutationFn: (id: string) => deleteFolder(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }) })

  const handleCreate = async () => {
    const val = await inputText('Nueva carpeta', 'Nombre')
    if (!val) return
    try {
      await create.mutateAsync({ name: val })
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
        <button onClick={handleCreate} className="pill-btn secondary new-folder-btn">
          <span className="new-folder-plus">＋</span>
          <span>Nueva carpeta</span>
        </button>
      </div>
      <nav className="sidebar-inner">
        <ul>
          <li onClick={() => openFolder(undefined)} className="side-item active"><FolderIcon className="icon-svg"/> Mis archivos</li>
        </ul>

        <div className="folders-list" aria-label="Carpetas">
          <div className="folders-title">Carpetas</div>
          {isLoading && <div className="muted">Cargando…</div>}
          {folders && folders.length === 0 && <div className="muted">Sin carpetas</div>}
          <ul role="list">
            {folders && folders.map((f: any) => (
              <li key={f.id} className="folder-item" role="listitem">
                <button className="folder-main" onClick={() => openFolder(f.id)} aria-label={`Abrir carpeta ${f.name}`}>
                  <FolderIcon className="icon-svg" />
                  <span className="folder-name">{f.name}</span>
                </button>
                <div className="folder-controls">
                  <button onClick={async (e) => { e.stopPropagation(); const newName = await inputText('Renombrar carpeta', 'Nuevo nombre', f.name); if (!newName) return; try { await renameMut.mutateAsync({ id: f.id, name: newName }); toastSuccess('Renombrado'); } catch (err) { console.error(err); toastError('Error renombrando'); } }} className="icon-btn" aria-label={`Renombrar ${f.name}`}><PencilSquareIcon className="icon-svg"/></button>
                  <button onClick={async (e) => { e.stopPropagation(); const ok = await confirm('Eliminar carpeta', `¿Eliminar "${f.name}"? Esta acción no se puede deshacer.`); if (!ok) return; try { await deleteMut.mutateAsync(f.id); toastSuccess('Carpeta eliminada'); } catch (err) { console.error(err); toastError('Error eliminando'); } }} className="icon-btn danger" aria-label={`Eliminar ${f.name}`}><TrashIcon className="icon-svg"/></button>
                </div>
              </li>
            ))}
          </ul>
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
