import React, { useState } from 'react'
import { 
  Squares2X2Icon, 
  Bars3BottomLeftIcon,
  FolderIcon,
  DocumentIcon,
  PhotoIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  MusicalNoteIcon,
  VideoCameraIcon,
  CodeBracketIcon,
  ArrowUpTrayIcon,
  EllipsisVerticalIcon,
  ArrowLeftIcon,
  FolderPlusIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import FileListView from '../features/files/components/FileList'
import EmptyFolder from '../features/files/components/EmptyFolder'
import { moveFile } from '../features/files/api'
import { useFiles, useSearch } from '../features/files/hooks/useFiles'
import Card from '../components/Card'
import Button from '../components/Button'
import FileListItem from '../components/FileListItem'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useFolders } from '../features/folders/hooks/useFolders'
import { toastError, toastSuccess, MySwal, folderCustomizer } from '../utils/swal'
import FolderGrid from '../features/folders/components/FolderGrid'
import AdvancedSearch from '../features/files/components/AdvancedSearch'
import ShareModal from '../features/permissions/components/ShareModal'
import { useCurrentUser } from '../hooks/useCurrentUser'
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
  const initialTab = (search.get('tab') as any) || 'todos'
  const [selectedTab, setSelectedTab] = React.useState<'todos' | 'carpetas' | 'archivos' | 'imagenes' | 'pdf' | 'documentos' | 'comprimidos' | 'audio' | 'video' | 'busqueda'>(initialTab)

  React.useEffect(() => {
    const tabUrl = search.get('tab')
    if (tabUrl && tabUrl !== selectedTab) {
      setSelectedTab(tabUrl as any)
    }
  }, [search])

  const folderId = search.get('folder') || undefined
  const query = (search.get('q') || '').trim().toLowerCase()
  const { data, isLoading, isError, upload } = useFiles(folderId)
  const { data: allData } = useFiles()
  const { 
    data: folders, 
    isLoading: foldersLoading, 
    isError: foldersError, 
    rename: renameFolderMutation, 
    remove: deleteFolderMutation,
    create: createFolderMutation
  } = useFolders()
  const { data: user } = useCurrentUser()
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null)
  const [sharingResource, setSharingResource] = React.useState<{ type: 'file' | 'folder', id: string, name: string } | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [searchParamsState, setSearchParamsState] = useState<any>({ q: '' })
  const { data: searchResults, isLoading: searchLoading } = useSearch(searchParamsState, selectedTab === 'busqueda')

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

  const breadcrumbs = React.useMemo(() => {
    const crumbs = [{ id: '', name: 'Mis archivos' }]
    if (!folderId || !folders) return crumbs
    
    const path: any[] = []
    let current = folders.find((f: any) => String(f.id) === String(folderId))
    while (current) {
      path.unshift({ id: String(current.id), name: current.name })
      const pid = current.parent_id
      current = pid ? folders.find((f: any) => String(f.id) === String(pid)) : null
    }
    return [...crumbs, ...path]
  }, [folderId, folders])

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
    } else if (selectedTab === 'todos') {
      list = normalizedAllFiles
    } else {
      list = normalizedFiles
    }

    if (!query) {
      // still return list if no query
    } else {
      list = list.filter((file: any) => {
        const name = String(file.name || '').toLowerCase()
        const type = String(file.type || '').toLowerCase()
        return name.includes(query) || type.includes(query)
      })
    }

    // Apply sorting
    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        comparison = (a.size || 0) - (b.size || 0);
      } else if (sortBy === 'date') {
        comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [normalizedFiles, normalizedAllFiles, selectedTab, folderId, query, sortBy, sortOrder])

  const filteredFolders = React.useMemo(() => {
    if (!folders) return []
    let list = []
    
    if (folderId) {
      // Browsing inside a folder -> show subfolders
      list = folders.filter((f: any) => String(f.parent_id) === String(folderId))
    } else if (selectedTab === 'todos' || selectedTab === 'carpetas') {
      // Root view -> show only root folders
      list = folders.filter((f: any) => !f.parent_id)
    }

    // Apply search query if present
    if (query) {
      list = list.filter((f: any) => f.name.toLowerCase().includes(query))
    }

    // Sort folders (folders usually sorted by name)
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [folders, folderId, selectedTab, query])

  const normalizedSearchResults = React.useMemo(() => {
    if (!searchResults) return []
    return searchResults
  }, [searchResults])

  const tabs: { key: 'todos' | 'carpetas' | 'archivos' | 'imagenes' | 'pdf' | 'documentos' | 'comprimidos' | 'audio' | 'video' | 'busqueda'; label: string; icon: any }[] = [
    { key: 'todos', label: 'Todos', icon: Squares2X2Icon },
    { key: 'carpetas', label: 'Carpetas', icon: FolderIcon },
    { key: 'busqueda', label: 'Búsqueda', icon: MagnifyingGlassIcon },
    { key: 'archivos', label: 'Archivos', icon: DocumentIcon },
    { key: 'imagenes', label: 'Imágenes', icon: PhotoIcon },
    { key: 'pdf', label: 'PDF', icon: DocumentTextIcon },
    { key: 'documentos', label: 'Documentos', icon: DocumentIcon },
    { key: 'comprimidos', label: 'Comprimidos', icon: ArchiveBoxIcon },
    { key: 'audio', label: 'Audio', icon: MusicalNoteIcon },
    { key: 'video', label: 'Video', icon: VideoCameraIcon }
  ]
  const isBrowsingGlobal = !folderId
  const showFolders = selectedTab === 'carpetas' || selectedTab === 'todos' || !!folderId
  const showFiles = selectedTab !== 'carpetas'

  const subtitleText = selectedTab === 'carpetas'
    ? `${filteredFolders.length} carpetas`
    : `${filteredFiles.length} archivos ${folderId ? 'en esta carpeta' : ''}`
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

  const handleRenameFolder = async (id: string, currentName: string, currentColor?: string) => {
    const result = await folderCustomizer(currentName, currentColor)

    if (result) {
      try {
        await renameFolderMutation.mutateAsync({ id, name: result.name, color: result.color })
        toastSuccess('Carpeta actualizada')
      } catch (err) {
        toastError('Error al actualizar')
      }
    }
  }

  const handleDeleteFolder = async (id: string) => {
    const result = await MySwal.fire({
      title: '¿Eliminar carpeta?',
      text: 'Se eliminará la carpeta y todo su contenido (archivos y subcarpetas). Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar todo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    })

    if (result.isConfirmed) {
      try {
        await deleteFolderMutation.mutateAsync(id)
        toastSuccess('Carpeta eliminada')
      } catch (err: any) {
        const msg = err.response?.data?.error || 'Error al eliminar'
        toastError(msg)
      }
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <nav className="flex items-center gap-1 text-sm mb-1 overflow-hidden whitespace-nowrap">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id || 'root'}>
                {idx > 0 && <ChevronRightIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                <button
                  onClick={() => {
                    const params = new URLSearchParams(search)
                    if (crumb.id) {
                      params.set('folder', crumb.id)
                    } else {
                      params.delete('folder')
                    }
                    setSearch(params)
                  }}
                  className={`hover:text-emerald-600 transition-colors truncate ${
                    idx === breadcrumbs.length - 1 
                      ? 'text-slate-900 font-bold cursor-default' 
                      : 'text-slate-500 font-medium'
                  }`}
                  title={crumb.name}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </nav>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>
              {currentFolder ? currentFolder.name : 'Mis archivos'}
            </h2>
          </div>
          <div className={styles.subtitle}>{subtitleText}</div>
        </div>
        <div className={styles.actions}>
          <div className={`${styles.tabs} tabs`}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`sq-btn secondary${selectedTab === tab.key ? ' active' : ''}`}
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
                <tab.icon className="sq-icon" />
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
          {(user?.role === 'admin' || user?.role === 'editor' || user?.role === 'owner_admin') && (
            <>
              <button 
                title="Crear nueva carpeta aquí"
                className="sq-btn secondary"
                onClick={async () => {
                  const result = await folderCustomizer('')
                  if (result) {
                    try {
                      await createFolderMutation.mutateAsync({ 
                        name: result.name, 
                        parentId: folderId,
                        color: result.color 
                      })
                      toastSuccess('Carpeta creada')
                    } catch (err) {
                      toastError('Error al crear carpeta')
                    }
                  }
                }}
              >
                <FolderPlusIcon className="sq-icon" />
                Carpeta
              </button>
              <button 
                className="sq-btn green" 
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <ArrowUpTrayIcon className="sq-icon" />
                Subir
              </button>
            </>
          )}
          <button className="sq-btn secondary" title="Más opciones">
            <EllipsisVerticalIcon className="sq-icon" />
          </button>
        </div>
      </div>

          {selectedTab === 'busqueda' && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-4 relative z-20">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                Panel de Búsqueda Avanzada
              </h3>
              <AdvancedSearch 
                onSearch={(params) => setSearchParamsState(params)} 
                onClear={() => setSearchParamsState({ q: '' })} 
              />
            </div>
          )}

          <div className={styles.viewToggle}>
            <div className="flex items-center gap-3 mr-4 border-r pr-4 border-slate-200">
              <span className="text-sm font-medium text-slate-500">Ordenar:</span>
              <select 
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                title="Ordenar por"
              >
                <option value="date">Fecha</option>
                <option value="name">Nombre</option>
                <option value="size">Tamaño</option>
              </select>
              <button 
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 hover:bg-slate-100 rounded text-slate-500"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            <span className={styles.viewLabel}>Vista</span>
            <div className={styles.viewButtons}>
              <button
                className={`sq-btn secondary ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Vista cuadricula"
                title="Vista cuadricula"
              >
                <Squares2X2Icon className="sq-icon" />
              </button>
              <button
                className={`sq-btn secondary ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="Vista lista"
                title="Vista lista"
              >
                <Bars3BottomLeftIcon className="sq-icon" />
              </button>
            </div>
          </div>

          <DynamicContentArea>
            {selectedTab === 'busqueda' ? (
              <div className="pb-20">
                {searchLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                  </div>
                ) : normalizedSearchResults.length > 0 ? (
                  viewMode === 'grid' ? (
                    <FileListView files={normalizedSearchResults} onShare={(id, name) => setSharingResource({ type: 'file', id, name })} />
                  ) : (
                    <ul className={styles.list}>
                      {normalizedSearchResults.map((file: any) => (
                        <FileListItem key={file.id} file={file} />
                      ))}
                    </ul>
                  )
                ) : (
                  <div className="text-center p-12 text-slate-400">
                    No se encontraron resultados para los filtros aplicados.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8 pb-20">
                {/* 1. Folders Section */}
                {showFolders && filteredFolders.length > 0 && (
                  <div>
                    {selectedTab === 'todos' && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Carpetas</h3>}
                    <FolderGrid
                      folders={filteredFolders}
                      loading={foldersLoading}
                      error={foldersError}
                      onOpen={openFolder}
                      onDrop={handleDrop}
                      selectedFolderId={selectedFolderId}
                      onSelect={(id) => setSelectedFolderId(id)}
                      onRename={handleRenameFolder}
                      onDelete={handleDeleteFolder}
                      onShare={(id, name) => setSharingResource({ type: 'folder', id, name })}
                    />
                  </div>
                )}

                {/* 2. Files Section */}
                {showFiles && (
                  <div>
                    {selectedTab === 'todos' && filteredFolders.length > 0 && (
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 mt-8">Archivos</h3>
                    )}
                    
                    {isLoading && <div className="p-8 text-center text-slate-500">Cargando archivos...</div>}
                    {isError && <div className="p-8 text-center text-red-500">Error al cargar archivos</div>}
                    
                    {!isLoading && !isError && (
                      filteredFiles.length === 0 ? (
                        selectedTab === 'todos' && filteredFolders.length > 0 ? (
                          <div className="py-8 text-center text-slate-400 text-sm italic">No hay archivos sueltos en esta ubicación</div>
                        ) : (
                          <EmptyFolder onUpload={() => document.getElementById('file-input')?.click()} />
                        )
                      ) : (
                        viewMode === 'grid' ? (
                          <FileListView files={filteredFiles} onShare={(id, name) => setSharingResource({ type: 'file', id, name })} />
                        ) : (
                          <ul className={styles.list}>
                            {filteredFiles.map((file: any) => (
                              <FileListItem key={file.id} file={file} />
                            ))}
                          </ul>
                        )
                      )
                    )}
                  </div>
                )}
              </div>
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
          
          {sharingResource && (
            <ShareModal
              resourceType={sharingResource.type}
              resourceId={sharingResource.id}
              resourceName={sharingResource.name}
              onClose={() => setSharingResource(null)}
            />
          )}
      </section>
  );
}
