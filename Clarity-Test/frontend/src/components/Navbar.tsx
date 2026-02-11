import React, { useState } from 'react'
import Button from './Button'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MagnifyingGlassIcon, ArrowUpTrayIcon, BellIcon, Cog6ToothIcon, Bars3Icon } from '@heroicons/react/24/outline'
import { useCurrentUser } from '../hooks/useCurrentUser'

export default function Navbar({ onToggleSidebar, sidebarOpen }: { onToggleSidebar?: () => void; sidebarOpen?: boolean }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: user } = useCurrentUser()
  const searchQuery = searchParams.get('q') || ''

  function logout() {
    try { 
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } catch {}
    navigate('/login')
  }

  return (
    <header className="navbar">
      <div className="nav-left">
        <button className="mobile-menu-btn pill-btn secondary" aria-label="menu" onClick={() => onToggleSidebar && onToggleSidebar()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSidebar && onToggleSidebar() } }}>
          <Bars3Icon className="icon-svg" />
        </button>
        <button className="brand brand-button" onClick={() => navigate('/board')} type="button">
          Clarity
        </button>
      </div>
      <div className="nav-center">
        <div className="nav-search-row">
          <input
            className="input-glass"
            placeholder="Buscar archivos..."
            value={searchQuery}
            onChange={(e) => {
              const value = e.target.value
              const next = new URLSearchParams(searchParams)
              if (value.trim()) {
                next.set('q', value)
              } else {
                next.delete('q')
              }
              setSearchParams(next)
            }}
          />
        </div>
      </div>
      <div className="nav-right">
        <div className="user-menu">
          <button className="pill-btn user-btn" onClick={() => setOpen((s) => !s)}>
            <span className="avatar"></span>
            <span>{user?.name || user?.email || 'Mi cuenta'} ▾</span>
          </button>
          {open && (
            <div className="user-dropdown">
              <div className="user-item" onClick={() => navigate('/profile')}>Perfil</div>
              <div className="user-item" onClick={logout}>Cerrar sesión</div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
