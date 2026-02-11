import React, { useState } from 'react'
import { Squares2X2Icon, Bars3BottomLeftIcon } from '@heroicons/react/24/outline'
import FileListView from '../features/files/components/FileList'
import EmptyFolder from '../features/files/components/EmptyFolder'
import { moveFile } from '../features/files/api'
import { useFiles } from '../features/files/hooks/useFiles'
import Card from '../components/Card'
import Button from '../components/Button'
import FileListItem from '../components/FileListItem'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useFolders } from '../features/folders/hooks/useFolders'
import { toastError, toastSuccess } from '../utils/swal'
import FolderGrid from '../features/folders/components/FolderGrid'
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import styles from '../styles/pages/BoardPage.module.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function DynamicContentArea({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.contentArea}>
      {children}
    </div>
  )
}

export default function BoardPage() {
  const [search, setSearch] = useSearchParams()
  const [selectedTab, setSelectedTab] = React.useState<'todos' | 'carpetas' | 'archivos' | 'imagenes' | 'pdf' | 'documentos' | 'comprimidos' | 'audio' | 'video' | 'codigo'>('todos')
  const folderId = search.get('folder') || undefined
  const query = (search.get('q') || '').trim().toLowerCase()
  const { data, isLoading, isError, upload } = useFiles(folderId)
  const { data: allData } = useFiles()
  const { data: folders, isLoading: foldersLoading, isError: foldersError } = useFolders()
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null)
  const qc = useQueryClient()
  const moveMutation = useMutation({
    mutationFn: ({ fileId, folderId }: { fileId: string; folderId: string }) => moveFile(fileId, folderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] })
      qc.invalidateQueries({ queryKey: ['folders'] })
      toastSuccess('Archivo movido')
    },
    onError: () => toastError('No se pudo mover el archivo')
  })
  const currentFolder = folderId && folders ? folders.find((f: any) => f.id === folderId) : null
  const normalizedFiles = React.useMemo(() => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (Array.isArray((data as any).uploaded)) return (data as any).uploaded
    if (Array.isArray((data as any).data)) return (data as any).data
    return []
  }, [data])
  const normalizedAllFiles = React.useMemo(() => {
    if (!allData) return []
    if (Array.isArray(allData)) return allData
    if (Array.isArray((allData as any).uploaded)) return (allData as any).uploaded
    if (Array.isArray((allData as any).data)) return (allData as any).data
    return []
  }, [allData])
  const filteredFiles = React.useMemo(() => {
    const getFileExt = (name: string) => name?.split('.').pop()?.toLowerCase() || ''

    let list: any[]
    if (folderId) {
      list = normalizedFiles
    } else if (selectedTab === 'imagenes') {
      list = normalizedFiles.filter((file: any) => file.type?.startsWith('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(getFileExt(file.name)))
    } else if (selectedTab === 'pdf') {
      list = normalizedFiles.filter((file: any) => file.type === 'application/pdf' || getFileExt(file.name) === 'pdf')
    } else if (selectedTab === 'documentos') {
      list = normalizedFiles.filter((file: any) => {
        const ext = getFileExt(file.name)
        return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext) || file.type?.includes('word') || file.type?.includes('excel') || file.type?.includes('powerpoint') || file.type?.includes('document')
      })
    } else if (selectedTab === 'comprimidos') {
      list = normalizedFiles.filter((file: any) => ['zip', 'rar', '7z', 'tar', 'gz'].includes(getFileExt(file.name)))
    } else if (selectedTab === 'audio') {
      list = normalizedFiles.filter((file: any) => file.type?.startsWith('audio') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(getFileExt(file.name)))
    } else if (selectedTab === 'video') {
      list = normalizedFiles.filter((file: any) => file.type?.startsWith('video') || ['mp4', 'mkv', 'mov', 'webm', 'avi'].includes(getFileExt(file.name)))
    } else if (selectedTab === 'codigo') {
      list = normalizedFiles.filter((file: any) => {
        const ext = getFileExt(file.name)
        return ['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'java', 'c', 'cpp', 'cs', 'rs', 'php', 'html', 'css', 'json', 'xml'].includes(ext)
      })
    } else if (selectedTab === 'todos') {
      list = normalizedAllFiles
    } else {
      list = normalizedFiles
    }

    if (!query) return list

    return list.filter((file: any) => {
      const name = String(file.name || '').toLowerCase()
      const type = String(file.type || '').toLowerCase()
      return name.includes(query) || type.includes(query)
    })
  }, [normalizedFiles, normalizedAllFiles, selectedTab, folderId, query])
  const tabs: { key: 'todos' | 'carpetas' | 'archivos' | 'imagenes' | 'pdf' | 'documentos' | 'comprimidos' | 'audio' | 'video' | 'codigo'; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'carpetas', label: 'Carpetas' },
    { key: 'archivos', label: 'Archivos' },
    { key: 'imagenes', label: 'Imágenes' },
    { key: 'pdf', label: 'PDF' },
    { key: 'documentos', label: 'Documentos' },
    { key: 'comprimidos', label: 'Archivos' },
    { key: 'audio', label: 'Audio' },
    { key: 'video', label: 'Video' },
    { key: 'codigo', label: 'Código' }
  ]
  const showFolders = selectedTab === 'carpetas'
  const subtitleText = showFolders
    ? `${folders?.length ?? 0} carpetas disponibles`
    : `${filteredFiles.length} archivos en total`
  const openFolder = React.useCallback((folderId: string) => {
    const params = new URLSearchParams(search)
    params.set('folder', folderId)
    setSearch(params)
    setSelectedTab('todos')
    setSelectedFolderId(null)
  }, [search, setSearch])

  React.useEffect(() => {
    // clear selection when switching tabs
    setSelectedFolderId(null)
  }, [selectedTab])
  const handleDrop = (folderId: string, fileId?: string) => {
    if (!fileId) return
    moveMutation.mutate({ fileId, folderId })
  }

  const activityData = React.useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return d;
    });

    const counts = last7Days.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      return normalizedAllFiles.filter((f: any) => {
        if (!f.created_at) return false;
        // created_at can be "2026-02-10 10:00:00" or ISO
        const fileDateStr = new Date(f.created_at).toISOString().split('T')[0];
        return fileDateStr === dateStr;
      }).length;
    });

    return {
      labels: last7Days.map(d => days[d.getDay()]),
      counts
    };
  }, [normalizedAllFiles]);

  const recentActivityData = {
    labels: activityData.labels,
    datasets: [
      {
        label: 'Archivos subidos',
        data: activityData.counts,
        borderColor: 'rgba(33, 192, 122, 1)',
        backgroundColor: 'rgba(33, 192, 122, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(33, 192, 122, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(33, 192, 122, 1)',
      },
    ],
  };

  const recentActivityOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: '#94a3b8'
        },
        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      },
      x: {
        ticks: {
          color: '#94a3b8'
        },
        grid: {
          display: false
        }
      }
    }
  };

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {currentFolder ? (
            <div className={styles.titleRow}>
              <button
                className="pill-btn secondary"
                onClick={() => {
                  const pid = (currentFolder as any).parent_id
                  const params = new URLSearchParams(search)
                  if (pid) {
                    params.set('folder', String(pid))
                  } else {
                    params.delete('folder')
                  }
                  setSearch(params)
                }}
              >
                Atrás
              </button>
              <h2 className={styles.title}>{currentFolder.name}</h2>
            </div>
          ) : (
            <h2 className={styles.title}>Mis archivos</h2>
          )}
          <div className={styles.subtitle}>{subtitleText}</div>
        </div>
        <div className={styles.actions}>
          <div className={`${styles.tabs} tabs`}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`pill-btn secondary${selectedTab === tab.key ? ' active' : ''}`}
                onClick={() => {
                  if (tab.key === 'todos') {
                    const params = new URLSearchParams(search)
                    params.delete('folder')
                    setSearch(params)
                    setSelectedFolderId(null)
                  }
                  setSelectedTab(tab.key)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            id="file-input"
            className="hidden-file-input"
            aria-label="Seleccionar archivos"
            type="file"
            multiple
            onChange={async (e) => {
              const input = e.currentTarget as HTMLInputElement
              const files = input.files
              if (!files || files.length === 0) return

              const MySwal = (await import('../utils/swal')).default
              const result = await MySwal.fire({
                title: '¿Cómo deseas subir los archivos?',
                html: `
                  <div style="margin: 20px 0;">
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 16px;">
                      ${files.length} archivo${files.length > 1 ? 's' : ''} seleccionado${files.length > 1 ? 's' : ''}
                    </p>
                  </div>
                `,
                icon: 'question',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: '🌐 Público',
                denyButtonText: '🔒 Privado',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#059669',
                denyButtonColor: '#64748b'
              })

              if (result.isDismissed) {
                input.value = ''
                return
              }

              const isPublic = result.isConfirmed

              const fd = new FormData()
              for (let i = 0; i < files.length; i++) fd.append('files', files[i])
              fd.append('is_public', isPublic ? 'true' : 'false')

              try {
                await upload.mutateAsync(fd)
                input.value = ''
                toastSuccess(`Archivo${files.length > 1 ? 's' : ''} subido${files.length > 1 ? 's' : ''} como ${isPublic ? 'público' : 'privado'}${files.length > 1 ? 's' : ''}`)
              } catch (err) {
                console.error(err)
                toastError('Error subiendo archivos')
              }
            }}
          />
          <Button variant="primary" onClick={() => document.getElementById('file-input')?.click()}>Subir</Button>
          <button className="pill-btn secondary">⋮</button>
        </div>
      </div>

          <div className={styles.viewToggle}>
            <span className={styles.viewLabel}>Vista</span>
            <div className={styles.viewButtons}>
              <button
                className={`${styles.viewButton} ${viewMode === 'grid' ? styles.viewButtonActive : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Vista cuadricula"
                title="Vista cuadricula"
              >
                <Squares2X2Icon className={styles.viewIcon} />
              </button>
              <button
                className={`${styles.viewButton} ${viewMode === 'list' ? styles.viewButtonActive : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="Vista lista"
                title="Vista lista"
              >
                <Bars3BottomLeftIcon className={styles.viewIcon} />
              </button>
            </div>
          </div>

          <DynamicContentArea>
            {showFolders ? (
              <FolderGrid
                folders={folders}
                loading={foldersLoading}
                error={foldersError}
                onOpen={openFolder}
                onDrop={handleDrop}
                selectedFolderId={selectedFolderId}
                onSelect={(id) => setSelectedFolderId(id)}
              />
            ) : (
              <>
                {isLoading && <div>Cargando…</div>}
                {isError && <div>Error al cargar</div>}
                {!isLoading && !isError && (
                  folderId ? (
                    normalizedFiles.length === 0 ? (
                      <EmptyFolder onUpload={() => document.getElementById('file-input')?.click()} />
                    ) : (
                      viewMode === 'grid' ? (
                        <FileListView files={filteredFiles} />
                      ) : (
                        <ul className={styles.list}>
                          {filteredFiles.map((file: any) => (
                            <FileListItem key={file.id} file={file} />
                          ))}
                        </ul>
                      )
                    )
                  ) : (
                    viewMode === 'grid' ? (
                      <FileListView files={filteredFiles} />
                    ) : (
                      <ul className={styles.list}>
                        {filteredFiles.map((file: any) => (
                          <FileListItem key={file.id} file={file} />
                        ))}
                      </ul>
                    )
                  )
                )}
              </>
            )}
          </DynamicContentArea>

          <Card className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>Estadísticas de Actividad</h3>
              <span className={styles.chartBadge}>Últimos 7 días</span>
            </div>
            <div className={styles.chartBody}>
              <Line data={recentActivityData} options={recentActivityOptions} />
            </div>
          </Card>
      </section>
  );
}
