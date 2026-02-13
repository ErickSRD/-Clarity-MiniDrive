import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useCurrentUser'

interface RequireRoleProps {
  allowedRoles: string[]
}

export default function RequireRole({ allowedRoles }: RequireRoleProps) {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading) return null

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
