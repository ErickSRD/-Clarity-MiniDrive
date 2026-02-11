import React, { useState } from 'react';
import { 
  LockClosedIcon, 
  GlobeAltIcon, 
  PencilSquareIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteFile, toggleFileVisibility, updateFileMetadata } from '../features/files/api';
import api from '../services/api';
import { toastError, toastSuccess, confirm } from '../utils/swal';
import MySwal from '../utils/swal';
import styles from '../styles/components/FileListItem.module.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const apiUrl = (path: string) => `${API_BASE}${path}`;

interface FileListItemProps {
  file: any;
}

export default function FileListItem({ file }: FileListItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  
  // Click outside to close menu
  React.useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(false);
    action();
  };
  
  const deleteMutation = useMutation({
    mutationFn: () => deleteFile(file.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
      toastSuccess('Archivo eliminado');
    },
    onError: () => toastError('No se pudo eliminar el archivo')
  });
  
  const visibilityMutation = useMutation({
    mutationFn: (isPublic: boolean) => toggleFileVisibility(file.id, isPublic),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
      toastSuccess('Visibilidad actualizada');
    },
    onError: () => toastError('No se pudo cambiar la visibilidad')
  });
  
  const handleDelete = async () => {
    const confirmed = await confirm(`¿Eliminar "${file.name}"?`, 'Esta acción no se puede deshacer.');
    if (confirmed) {
      deleteMutation.mutate();
    }
  };
  
  const handleToggleVisibility = () => {
    visibilityMutation.mutate(!file.is_public);
  };

  const handleClassify = async () => {
    // Fetch available taxonomies
    const [deptsRes, tagsRes] = await Promise.allSettled([
      api.get('/api/taxonomy/departments'),
      api.get('/api/taxonomy/tags')
    ]);

    const depts = deptsRes.status === 'fulfilled' ? deptsRes.value.data : [];
    const availableTags = tagsRes.status === 'fulfilled' ? tagsRes.value.data : [];

    const deptsOptions = depts.map((d: any) => `<option value="${d.name}" ${file.department === d.name ? 'selected' : ''}>${d.name}</option>`).join('');
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
          <input id="swal-tags" class="swal2-input" value="${file.tags || ''}" list="tags-list" placeholder="Selecciona o escribe etiquetas...">
          <datalist id="tags-list">${tagsHtml}</datalist>
          <p style="font-size: 11px; color: #64748b; margin-top: 4px;">Selecciona etiquetas de la lista global (separadas por coma).</p>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      preConfirm: () => {
        return {
          name: file.name, // Keep existing name
          department: (document.getElementById('swal-dept') as HTMLSelectElement).value,
          tags: (document.getElementById('swal-tags') as HTMLInputElement).value
        }
      }
    })

    if (formValues) {
      try {
        await updateFileMetadata(file.id, formValues)
        qc.invalidateQueries({ queryKey: ['files'] })
        toastSuccess('Información actualizada')
      } catch (err) {
        toastError('Error al actualizar')
      }
    }
  }
  
  const handleDownload = async () => {
    try {
      const response = await fetch(apiUrl(`/api/files/${file.id}/raw-download`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        toastError('No se pudo descargar el archivo');
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toastError('Error al descargar el archivo');
    }
  };

  const fetchChecksum = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/files/${file.id}/hash`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.checksum || null;
    } catch (error) {
      return null;
    }
  };
  
  const viewFile = async () => {
    const checksum = await fetchChecksum();
    const checksumRow = `<div style="margin-top:8px;font-size:12px;color:#64748b;word-break:break-all;"><strong>SHA-256:</strong> ${checksum || 'No disponible'}</div>`;
    const isImage = file.type?.startsWith('image');
    const previewId = `file-preview-${file.id}`;
    const preview = isImage
      ? `<img id="${previewId}" src="" alt="${file.name}" loading="lazy" style="max-width:100%;max-height:320px;border-radius:12px;border:1px solid rgba(255,255,255,0.3);object-fit:contain;"/>`
      : `<p style="font-size:14px;color:#475569;">Vista previa no disponible para este tipo de archivo.</p>`;
    MySwal.fire({
      title: 'Vista rápida',
      html: `${preview}<div style="margin-top:12px;font-size:14px;"><strong>${file.name}</strong><br>${file.type || 'Tipo desconocido'}</div>${checksumRow}<button id="swal-download-btn" class="sq-btn green" style="margin-top:14px;display:inline-flex;justify-content:center;width:100%;">📥 Descargar</button>`,
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        popup: 'swal-file-viewer'
      },
      didOpen: () => {
        let createdUrl = '';
        if (isImage) {
          const token = localStorage.getItem('token');
          fetch(apiUrl(`/api/files/${file.id}/raw-view`), {
            headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
          })
            .then((res) => (res.ok ? res.blob() : Promise.reject()))
            .then((blob) => {
              createdUrl = window.URL.createObjectURL(blob);
              const img = document.getElementById(previewId) as HTMLImageElement | null;
              if (img) img.src = createdUrl;
            })
            .catch(() => {});
        }
        const downloadBtn = document.getElementById('swal-download-btn');
        if (downloadBtn) {
          downloadBtn.addEventListener('click', async () => {
            try {
              const response = await fetch(apiUrl(`/api/files/${file.id}/raw-download`), {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });
              
              if (!response.ok) {
                toastError('No se pudo descargar el archivo');
                return;
              }
              
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = file.name;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            } catch (error) {
              toastError('Error al descargar el archivo');
            }
          });
        }
        MySwal.getPopup()?.addEventListener('swal:close', () => {
          if (createdUrl) window.URL.revokeObjectURL(createdUrl);
        });
      }
    });
    setMenuOpen(false);
  };
  
  return (
    <li
      className={`${styles.item} ${menuOpen ? styles.itemActive : ''}`}
      onDoubleClick={viewFile}
    >
      <div className={styles.left}>
        <span className={styles.name}>
          {file.name}
        </span>
        {file.is_public ? (
          <span className={styles.tagPublic}>
            <GlobeAltIcon className={styles.tagIcon} /> Público
          </span>
        ) : (
          <span className={styles.tagPrivate}>
            <LockClosedIcon className={styles.tagIcon} /> Privado
          </span>
        )}
        <span className={styles.size}>
          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : '—'}
        </span>
      </div>

      <div className={styles.menu} ref={menuRef}>
        <button
          className={`sq-btn secondary ${styles.menuButton}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setMenuOpen(!menuOpen);
          }}
        >
          ⋮
        </button>
        {menuOpen && (
          <ul className={styles.menuList}>
            <li>
              <button
                type="button"
                onClick={(e) => handleMenuAction(e, viewFile)}
                className={styles.menuItem}
              >
                <EyeIcon className="w-4 h-4 mr-2" /> Ver archivo
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={(e) => handleMenuAction(e, handleDownload)}
                className={styles.menuItem}
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" /> Descargar
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={(e) => handleMenuAction(e, handleClassify)}
                className={styles.menuItem}
              >
                <PencilSquareIcon className="w-4 h-4 mr-2" /> Categorías
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={(e) => handleMenuAction(e, handleToggleVisibility)}
                disabled={visibilityMutation.isPending}
                className={styles.menuItem}
              >
                {file.is_public ? (
                  <><LockClosedIcon className="w-4 h-4 mr-2" /> Hacer privado</>
                ) : (
                  <><GlobeAltIcon className="w-4 h-4 mr-2" /> Hacer público</>
                )}
              </button>
            </li>
            <li className={styles.divider} />
            <li>
              <button
                type="button"
                onClick={(e) => handleMenuAction(e, handleDelete)}
                disabled={deleteMutation.isPending}
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
              >
                <TrashIcon className="w-4 h-4 mr-2" /> Eliminar
              </button>
            </li>
          </ul>
        )}
      </div>
    </li>
  );
}
