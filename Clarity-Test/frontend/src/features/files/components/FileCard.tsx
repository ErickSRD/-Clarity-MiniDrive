import React, { useEffect, useRef, useState } from 'react'
import {
  DocumentIcon,
  PhotoIcon,
  CodeBracketIcon,
  MusicalNoteIcon,
  VideoCameraIcon,
  ArchiveBoxIcon,
  LockClosedIcon,
  GlobeAltIcon,
  UserPlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  ArrowPathRoundedSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { moveFile, deleteFile, toggleFileVisibility, updateFileMetadata } from '../api'
import api from '../../../services/api'
import { useFolders } from '../../folders/hooks/useFolders'
import { confirm, select, toastError, toastSuccess } from '../../../utils/swal'
import MySwal from '../../../utils/swal'
import styles from '../../../styles/components/FileCard.module.css'
import { PencilSquareIcon } from '@heroicons/react/24/outline'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
const apiUrl = (path: string) => `${API_BASE}${path}`

interface FileCardProps {
  id: string
  name: string
  type?: string
  size?: number
  isPublic?: number
  department?: string
  tags?: string
  onShare?: (id: string, name: string) => void
}

export default function FileCard({ id, name, type, size, isPublic, department, tags, onShare }: FileCardProps) {
  const isImage = type?.startsWith('image')
  const qc = useQueryClient()
  const { data: folders } = useFolders()
  const [moving, setMoving] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const mv = useMutation({
    mutationFn: ({ target }: { target?: string }) => moveFile(id, target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] })
      qc.invalidateQueries({ queryKey: ['folders'] })
      setMoving(false)
    },
    onError: () => setMoving(false)
  })

  const del = useMutation({
    mutationFn: () => deleteFile(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] })
      toastSuccess('Archivo eliminado')
    },
    onError: () => {
      toastError('No se pudo eliminar el archivo')
    }
  })

  const visibility = useMutation({
    mutationFn: (publicState: boolean) => toggleFileVisibility(id, publicState),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] })
      toastSuccess('Visibilidad actualizada')
    },
    onError: () => {
      toastError('No se pudo cambiar la visibilidad')
    }
  })

  // Native brownser download logic (Memory safe, supports large files)
  const handleDownload = () => {
    const token = localStorage.getItem('token')
    const downloadUrl = apiUrl(`/api/files/${id}/download?token=${token || ''}`)
    
    // Create temporary link to trigger native browser download
    const link = document.createElement('a')
    link.href = downloadUrl
    link.setAttribute('download', name)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleMove = async () => {
    if (!folders || folders.length === 0) {
      toastError('No hay carpetas para mover a.')
      return
    }
    const options: Record<string, string> = {}
    for (const f of folders) options[f.id] = f.name
    const sel = await select(`Mover "${name}" a:`, options)
    if (!sel) return
    setMoving(true)
    mv.mutate({ target: sel })
  }

  const handleDelete = async () => {
    const confirmed = await confirm(`¿Eliminar "${name}"?`, 'Esta acción no se puede deshacer.')
    if (!confirmed) return
    del.mutate()
  }

  const handleToggleVisibility = () => {
    visibility.mutate(!isPublic)
  }

  const editMetadata = useMutation({
    mutationFn: (data: { name: string, department?: string, tags?: string }) => updateFileMetadata(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] })
      toastSuccess('Metadatos actualizados')
    },
    onError: () => toastError('Error al actualizar metadatos')
  })

  const handleClassify = async () => {
    // Fetch available taxonomies
    const [deptsRes, tagsRes] = await Promise.allSettled([
      api.get('/api/taxonomy/departments'),
      api.get('/api/taxonomy/tags')
    ]);

    const depts = deptsRes.status === 'fulfilled' ? deptsRes.value.data : [];
    const availableTags = tagsRes.status === 'fulfilled' ? tagsRes.value.data : [];

    const deptsOptions = depts.map((d: any) => `<option value="${d.name}" ${department === d.name ? 'selected' : ''}>${d.name}</option>`).join('');
    const tagsHtml = availableTags.map((t: any) => `<option value="${t.name}">`).join('');

    const { value: formValues } = await MySwal.fire({
      title: 'Clasificar archivo',
      html: `
        <div style="text-align: left;">
          <label class="swal2-label">Departamento:</label>
          <select id="swal-dept" class="swal2-input" style="display: flex; width: 100%; box-sizing: border-box;">
            <option value="">-- Sin departamento --</option>
            ${deptsOptions}
          </select>
          
          <label class="swal2-label" style="margin-top: 15px; display: block;">Etiquetas:</label>
          <input id="swal-tags" class="swal2-input" value="${tags || ''}" list="tags-list" placeholder="Selecciona o escribe etiquetas...">
          <datalist id="tags-list">${tagsHtml}</datalist>
          <p style="font-size: 11px; color: #64748b; margin-top: 4px;">Selecciona etiquetas de la lista global (separadas por coma).</p>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      preConfirm: () => {
        return {
          name: name, // Keep existing name
          department: (document.getElementById('swal-dept') as HTMLSelectElement).value,
          tags: (document.getElementById('swal-tags') as HTMLInputElement).value
        }
      }
    })

    if (formValues) {
      editMetadata.mutate(formValues)
    }
  }

  const fetchChecksum = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(apiUrl(`/api/files/${id}/hash`), {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      })
      if (!response.ok) return null
      const data = await response.json()
      return data?.checksum || null
    } catch (error) {
      console.error('Error fetching checksum:', error)
      return null
    }
  }

  const showDetails = async () => {
    const checksum = await fetchChecksum()
    MySwal.fire({
      title: 'Detalles del archivo',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Tipo:</strong> ${type || 'Desconocido'}</p>
          <p><strong>Tamaño:</strong> ${size?.toLocaleString() ?? 0} bytes</p>
          <p><strong>SHA-256:</strong> <code style="word-break: break-all;">${checksum || 'No disponible'}</code></p>
        </div>
      `
    })
  }

  const viewFile = async () => {
    const checksum = await fetchChecksum()
    const checksumRow = `<div style="margin-top:8px;font-size:11px;color:#94a3b8;word-break:break-all;"><strong>SHA-256:</strong> ${checksum || 'No disponible'}</div>`
    const previewId = `file-preview-swal-${id}`
    
    const previewHtml = isImage
      ? `<img id="${previewId}" src="" alt="${name}" style="max-width:100%; max-height:300px; border-radius:8px; display:none; margin: 0 auto; object-fit: contain;"/>
         <div id="preview-loading" style="padding: 20px; color: #94a3b8;">Cargando vista previa...</div>`
      : `<div style="padding: 40px; background: #f8fafc; border-radius: 8px; color: #64748b;">Vista previa no disponible</div>`

    MySwal.fire({
      title: 'Vista rápida',
      html: `
        <div class="swal-file-viewer-content">
          ${previewHtml}
          <div style="margin-top:16px; font-weight: 500;">${name}</div>
          <div style="color: #64748b; font-size: 13px;">${type || 'Tipo desconocido'}</div>
          ${checksumRow}
          <button id="swal-download-btn" class="sq-btn green" style="width: 100%; margin-top: 16px;">
            📥 Descargar ahora
          </button>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
      didOpen: () => {
        let sessionObjectUrl: string | null = null
        
        // Handle Image Preview
        if (isImage) {
          const token = localStorage.getItem('token')
          fetch(apiUrl(`/api/files/${id}/raw-view`), {
            headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
          })
            .then(res => res.ok ? res.blob() : Promise.reject())
            .then(blob => {
              sessionObjectUrl = window.URL.createObjectURL(blob)
              const img = document.getElementById(previewId) as HTMLImageElement
              const loader = document.getElementById('preview-loading')
              if (img) {
                img.src = sessionObjectUrl
                img.style.display = 'block'
              }
              if (loader) loader.style.display = 'none'
            })
            .catch(() => {
              const loader = document.getElementById('preview-loading')
              if (loader) loader.innerText = 'No se pudo cargar la vista previa'
            })
        }

        // Handle Download in Swal
        const downloadBtn = document.getElementById('swal-download-btn')
        if (downloadBtn) {
          downloadBtn.onclick = () => {
            handleDownload()
          }
        }

        // Cleanup on close
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.removedNodes) {
              mutation.removedNodes.forEach((node) => {
                if (node === MySwal.getPopup()) {
                  if (sessionObjectUrl) window.URL.revokeObjectURL(sessionObjectUrl)
                  observer.disconnect()
                }
              })
            }
          })
        })
        observer.observe(document.body, { childList: true })
      }
    })
  }

  // Choose icon and color based on mime/type
  const getFileMeta = (mimeType?: string, fileName?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || ''
    if (mimeType?.startsWith('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      return { Icon: PhotoIcon, tone: 'image' }
    }
    if (mimeType === 'application/pdf' || ext === 'pdf') {
      return { Icon: DocumentIcon, tone: 'pdf' }
    }
    if (mimeType?.startsWith('video') || ['mp4', 'mkv', 'mov', 'webm'].includes(ext)) {
      return { Icon: VideoCameraIcon, tone: 'video' }
    }
    if (mimeType?.startsWith('audio') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      return { Icon: MusicalNoteIcon, tone: 'audio' }
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return { Icon: ArchiveBoxIcon, tone: 'archive' }
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'java', 'c', 'cpp', 'cs', 'rs'].includes(ext) || mimeType?.includes('code')) {
      return { Icon: CodeBracketIcon, tone: 'code' }
    }
    return { Icon: DocumentIcon, tone: 'default' }
  }

  const { Icon: FileIcon, tone } = getFileMeta(type, name)
  const toneClassMap: Record<string, string> = {
    image: styles.toneImage,
    pdf: styles.tonePdf,
    video: styles.toneVideo,
    audio: styles.toneAudio,
    archive: styles.toneArchive,
    code: styles.toneCode,
    default: styles.toneDefault
  }
  const toneClass = toneClassMap[tone] || styles.toneDefault

  const getTypeLabel = (mimeType?: string, fileName?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || ''
    if (ext) return ext.toUpperCase()
    if (mimeType) return mimeType.split('/').pop()?.toUpperCase() || mimeType
    return 'FILE'
  }
  const typeLabel = getTypeLabel(type, name)

  // Truncate long MIME types for display
  const truncateMimeType = (mimeType?: string, maxLength = 30) => {
    if (!mimeType) return 'Desconocido'
    return mimeType.length <= maxLength ? mimeType : `${mimeType.substring(0, maxLength)}...`
  }

  // Click outside menu closer
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Lifecycle managed Image Preview
  useEffect(() => {
    if (!isImage) return
    
    let active = true
    let objectUrl: string | null = null
    
    const fetchPreview = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(apiUrl(`/api/files/${id}/raw-view`), {
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
        })
        
        if (!res.ok) throw new Error()
        
        const blob = await res.blob()
        if (active) {
          objectUrl = window.URL.createObjectURL(blob)
          setPreviewUrl(objectUrl)
          setImageError(false)
        }
      } catch {
        if (active) setImageError(true)
      }
    }

    fetchPreview()

    return () => {
      active = false
      if (objectUrl) window.URL.revokeObjectURL(objectUrl)
    }
  }, [id, isImage])

  const handleMenuAction = (action: () => void) => {
    setMenuOpen(false)
    action()
  }

  return (
    <div
      className={`${styles.card} ${toneClass} ${menuOpen ? styles.cardActive : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/file-id', id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        setMenuOpen(true)
      }}
      onDoubleClick={viewFile}
    >
      <div className={`${styles.thumb} ${toneClass}`}>
        {isImage && previewUrl && !imageError ? (
          <img
            src={previewUrl}
            alt={name}
            loading="lazy"
            className={styles.previewImage}
            onError={() => setImageError(true)}
          />
        ) : null}
        <div className={`${styles.artwork} ${isImage && previewUrl && !imageError ? styles.artworkHidden : ''}`}>
          <span className={`${styles.orb} ${styles.orbMain}`} />
          <span className={`${styles.orb} ${styles.orbFaint}`} />
          <span className={`${styles.orb} ${styles.orbLined}`} />
          <div className="file-artwork-icon">
            <FileIcon className={styles.fileIcon} />
          </div>
        </div>
      </div>

      <div className={styles.title} title={name}>{name}</div>
      
      <div className={styles.typeRow}>
        <div className={styles.typeBadge}>{typeLabel}</div>
        <div className={styles.meta} title={type}>
          {truncateMimeType(type)} — {size ? (size / 1024).toFixed(1) + ' KB' : '0 B'}
        </div>
      </div>

      <div className={styles.visibilityRow}>
        {isPublic ? (
          <span className={styles.visibilityPublic} title="Archivo público">
            <GlobeAltIcon className={styles.visibilityIcon} /> Público
          </span>
        ) : (
          <span className={styles.visibilityPrivate} title="Archivo privado">
            <LockClosedIcon className={styles.visibilityIcon} /> Privado
          </span>
        )}
      </div>

      <div className={styles.actions}>
        <div className="options-wrapper" ref={menuRef}>
          <button
            type="button"
            className="options-trigger"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="options-menu">
              <button type="button" onClick={() => handleMenuAction(viewFile)}>
                <EyeIcon className="w-4 h-4 mr-2" /> Ver archivo
              </button>
              {onShare && (
                <button type="button" onClick={() => handleMenuAction(() => onShare(id, name))}>
                  <UserPlusIcon className="w-4 h-4 mr-2" /> Compartir
                </button>
              )}
              <button type="button" onClick={() => handleMenuAction(handleDownload)}>
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" /> Descargar
              </button>
              <button type="button" onClick={() => handleMenuAction(handleClassify)}>
                <PencilSquareIcon className="w-4 h-4 mr-2" /> Categorías
              </button>
              <button type="button" onClick={() => handleMenuAction(showDetails)}>
                <InformationCircleIcon className="w-4 h-4 mr-2" /> Ver detalles
              </button>
              <button type="button" onClick={() => handleMenuAction(handleMove)} disabled={moving}>
                <ArrowPathRoundedSquareIcon className="w-4 h-4 mr-2" /> {moving ? 'Moviendo…' : 'Mover'}
              </button>
              <button type="button" onClick={() => handleMenuAction(handleToggleVisibility)} disabled={visibility.isPending}>
                {isPublic ? (
                  <><LockClosedIcon className="w-4 h-4 mr-2" /> Hacer privado</>
                ) : (
                  <><GlobeAltIcon className="w-4 h-4 mr-2" /> Hacer público</>
                )}
              </button>
              <button type="button" onClick={() => handleMenuAction(handleDelete)} disabled={del.isPending} className="danger">
                <TrashIcon className="w-4 h-4 mr-2" /> {del.isPending ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

