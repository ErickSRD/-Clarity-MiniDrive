import React, { useState } from 'react'
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface AdvancedSearchProps {
  onSearch: (params: any) => void
  onClear: () => void
}

export default function AdvancedSearch({ onSearch, onClear }: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState({
    q: '',
    type: '',
    department: '',
    tags: '',
    startDate: '',
    endDate: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(filters)
    setIsOpen(false)
  }

  const handleClear = () => {
    const cleared = {
      q: '',
      type: '',
      department: '',
      tags: '',
      startDate: '',
      endDate: ''
    }
    setFilters(cleared)
    onClear()
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            name="q"
            value={filters.q}
            onChange={handleChange}
            placeholder="Buscar por nombre..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
          />
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`sq-btn secondary flex items-center gap-2 ${isOpen ? 'active' : ''}`}
        >
          <FunnelIcon className="w-4 h-4" />
          <span>Filtros</span>
        </button>
        {(Object.values(filters).some(v => v !== '')) && (
          <button
            onClick={handleClear}
            className="sq-btn secondary text-red-500 hover:text-red-600"
            title="Limpiar filtros"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate__animated animate__fadeIn">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo de Archivo</label>
              <select
                name="type"
                value={filters.type}
                onChange={handleChange}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">Cualquiera</option>
                <option value="image">Imágenes</option>
                <option value="pdf">PDF</option>
                <option value="word">Documentos (Word)</option>
                <option value="excel">Hojas de Cálculo</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Departamento</label>
              <input
                type="text"
                name="department"
                value={filters.department}
                onChange={handleChange}
                placeholder="Ej: Contabilidad"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Etiquetas</label>
              <input
                type="text"
                name="tags"
                value={filters.tags}
                onChange={handleChange}
                placeholder="Ej: factura, 2024"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Desde Fecha</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleChange}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Hasta Fecha</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleChange}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1 flex items-end">
              <button
                type="submit"
                className="w-full sq-btn green justify-center py-2"
              >
                Aplicar Filtros
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
