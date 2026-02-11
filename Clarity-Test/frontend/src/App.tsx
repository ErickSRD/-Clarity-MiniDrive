import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import BoardPage from './pages/BoardPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import ReportsPage from './pages/ReportsPage'
import TaxonomyPage from './pages/TaxonomyPage'
import RequireAuth from './components/RequireAuth'
import Layout from './components/Layout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<BoardPage />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/taxonomy" element={<TaxonomyPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
