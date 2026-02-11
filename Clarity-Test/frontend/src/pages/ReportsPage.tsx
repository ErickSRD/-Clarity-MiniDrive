import React from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { 
  ChartBarIcon, 
  ArrowDownTrayIcon, 
  UserGroupIcon, 
  CircleStackIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import { Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { toastError } from '../utils/swal'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  ArcElement
)

const ReportsPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['reports-stats'],
    queryFn: async () => {
      const res = await api.get('/api/reports/stats')
      return res.data
    },
    refetchOnWindowFocus: false
  })

  const exportExcel = async () => {
    try {
      const res = await api.get('/api/reports/export/excel', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Reporte_Clarity_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      toastError('Error al exportar Excel')
    }
  }

  // Activity chart data
  const deptData = {
    labels: data?.departments?.map((d: any) => d.name) || [],
    datasets: [{
      label: 'Archivos',
      data: data?.departments?.map((d: any) => d.count) || [],
      backgroundColor: 'rgba(16, 185, 129, 0.7)',
      borderColor: 'rgb(16, 185, 129)',
      borderWidth: 2,
      borderRadius: 6
    }]
  }

  const storageData = {
    labels: data?.departments?.map((d: any) => d.name) || [],
    datasets: [{
      label: 'MB',
      data: data?.departments?.map((d: any) => (d.size / (1024 * 1024)).toFixed(2)) || [],
      backgroundColor: [
        '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'
      ],
      borderWidth: 0
    }]
  }

  if (isLoading) return <div className="p-8 text-center">Cargando reportes...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Análisis y Reportes</h1>
          <p className="text-slate-500">Control de almacenamiento y actividad de la plataforma.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportExcel}
            className="sq-btn green flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Exportar Excel
          </button>
          <button 
            onClick={() => window.print()}
            className="sq-btn secondary flex items-center gap-2"
          >
            <ChartBarIcon className="w-5 h-5" />
            Vista Impresión (PDF)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <CircleStackIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-500 uppercase">Almacenamiento Total</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {(data?.storage / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <BuildingOfficeIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-500 uppercase">Departamentos</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {data?.departments?.length || 0}
          </div>
        </div>

        {data?.users && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <UserGroupIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-500 uppercase">Usuarios Activos (7d)</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {data.users.active} / {data.users.total}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Actividad por Departamento (Archivos)</h3>
          <div className="h-64">
            <Bar 
              data={deptData} 
              options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} 
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Uso de Almacenamiento por Depto.</h3>
          <div className="h-64 flex justify-center">
            <Pie 
              data={storageData} 
              options={{ maintainAspectRatio: false }} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
