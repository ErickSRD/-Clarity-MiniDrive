import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import styles from '../styles/layout/Layout.module.css'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className={styles.layoutRoot}>
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'mobile-open' : ''}`} 
        onClick={() => setSidebarOpen(false)} 
      />
      <div className={`${styles.layoutBody} ${!sidebarOpen ? styles.sidebarClosed : ''}`}>
        <Sidebar open={sidebarOpen} />
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
