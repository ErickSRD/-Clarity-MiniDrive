import React, { useState } from 'react';
import { LockClosedIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteFile, toggleFileVisibility } from '../features/files/api';
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
  const qc = useQueryClient();
  
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
    setMenuOpen(false);
  };
  
  const handleToggleVisibility = () => {
    visibilityMutation.mutate(!file.is_public);
    setMenuOpen(false);
  };
  
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
    setMenuOpen(false);
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
      html: `${preview}<div style="margin-top:12px;font-size:14px;"><strong>${file.name}</strong><br>${file.type || 'Tipo desconocido'}</div>${checksumRow}<button id="swal-download-btn" class="pill-btn primary" style="margin-top:14px;display:inline-flex;justify-content:center;width:100%;">📥 Descargar</button>`,
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
      className={styles.item}
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

      <div className={styles.menu}>
        <button
          className={`pill-btn secondary ${styles.menuButton}`}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
        >
          ⋮
        </button>
        {menuOpen && (
          <>
            <div
              className={styles.menuOverlay}
              onClick={() => setMenuOpen(false)}
            />
            <ul className={styles.menuList}>
              <li>
                <button
                  type="button"
                  onClick={viewFile}
                  className={styles.menuItem}
                >
                  👁️ Ver archivo
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleDownload}
                  className={styles.menuItem}
                >
                  📥 Descargar
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleToggleVisibility}
                  disabled={visibilityMutation.isPending}
                  className={styles.menuItem}
                >
                  {file.is_public ? '🔒 Hacer privado' : '🌐 Hacer público'}
                </button>
              </li>
              <li className={styles.divider} />
              <li>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                >
                  🗑️ Eliminar
                </button>
              </li>
            </ul>
          </>
        )}
      </div>
    </li>
  );
}
