import React from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'

export default function RequireAuth() {
  const token = (() => {
    try { return localStorage.getItem('token') } catch { return null }
  })()
  const location = useLocation()
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}
