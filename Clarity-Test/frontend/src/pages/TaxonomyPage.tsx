import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { 
  BuildingOfficeIcon, 
  TagIcon, 
  PlusIcon, 
  TrashIcon, 
  ShieldCheckIcon 
} from '@heroicons/react/24/outline'
import { toastSuccess, toastError, confirm } from '../utils/swal'

export default function TaxonomyPage() {
  const qc = useQueryClient()
  const [deptName, setDeptName] = useState('')
  const [tagName, setTagName] = useState('')

  // --- QUERIES ---
  const { data: departments, isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/api/taxonomy/departments')
      return res.data
    }
  })

  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await api.get('/api/taxonomy/tags')
      return res.data
    }
  })

  // --- MUTATIONS ---
  const createDept = useMutation({
    mutationFn: (name: string) => api.post('/api/taxonomy/departments', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      setDeptName('')
      toastSuccess('Departamento creado')
    },
    onError: (err: any) => toastError(err.response?.data?.error || 'Error al crear')
  })

  const deleteDept = useMutation({
    mutationFn: (id: number) => api.delete(`/api/taxonomy/departments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toastSuccess('Departamento eliminado')
    }
  })

  const createTag = useMutation({
    mutationFn: (name: string) => api.post('/api/taxonomy/tags', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      setTagName('')
      toastSuccess('Etiqueta creada')
    },
    onError: (err: any) => toastError(err.response?.data?.error || 'Error al crear')
  })

  const deleteTag = useMutation({
    mutationFn: (id: number) => api.delete(`/api/taxonomy/tags/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      toastSuccess('Etiqueta eliminada')
    }
  })

  const handleDeleteDept = async (id: number, name: string) => {
    if (await confirm('Eliminar Departamento', `¿Estás seguro de eliminar "${name}"?`)) {
      deleteDept.mutate(id)
    }
  }

  const handleDeleteTag = async (id: number, name: string) => {
    if (await confirm('Eliminar Etiqueta', `¿Estás seguro de eliminar "${name}"?`)) {
      deleteTag.mutate(id)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldCheckIcon className="w-8 h-8 text-emerald-600" />
          Gestión de Organizadores
        </h1>
        <p className="text-slate-500 mt-2">Configura los departamentos y etiquetas disponibles para clasificar archivos.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        
        {/* SECCIÓN DE DEPARTAMENTOS */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">Departamentos</h2>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-2">
            <input 
              type="text" 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del departamento..."
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createDept.mutate(deptName)}
            />
            <button 
              onClick={() => createDept.mutate(deptName)}
              disabled={createDept.isPending || !deptName.trim()}
              className="sq-btn green flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Añadir
            </button>
          </div>

          <div className="space-y-2">
            {deptsLoading ? <p className="text-slate-400">Cargando...</p> : departments?.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 hover:border-blue-200 transition-all shadow-sm group">
                <span className="font-semibold text-slate-700">{d.name}</span>
                <button 
                  onClick={() => handleDeleteDept(d.id, d.name)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SECCIÓN DE ETIQUETAS */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <TagIcon className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-slate-800">Etiquetas Globales</h2>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-2">
            <input 
              type="text" 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Nueva etiqueta..."
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createTag.mutate(tagName)}
            />
            <button 
              onClick={() => createTag.mutate(tagName)}
              disabled={createTag.isPending || !tagName.trim()}
              className="sq-btn green flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Añadir
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {tagsLoading ? <p className="text-slate-400">Cargando...</p> : tags?.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full border border-purple-100 group">
                <span className="text-sm font-bold uppercase">{t.name}</span>
                <button 
                  onClick={() => handleDeleteTag(t.id, t.name)}
                  className="text-purple-300 hover:text-red-500 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
