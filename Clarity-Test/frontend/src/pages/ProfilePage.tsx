import React, { useState, useEffect } from 'react'
import { UserCircleIcon, EnvelopeIcon, KeyIcon, CheckCircleIcon, CheckIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Button from '../components/Button'
import Input from '../components/Input'
import { useCurrentUser } from '../hooks/useCurrentUser'
import api from '../services/api'
import MySwal from '../utils/swal'
import styles from '../styles/pages/ProfilePage.module.css'

export default function ProfilePage() {
  const { data: user } = useCurrentUser()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
    }
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await api.patch('/api/auth/profile', { name, email })
      
      // Actualizar localStorage
      const updatedUser = { ...user, ...response.data }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      MySwal.fire({
        icon: 'success',
        title: '¡Perfil actualizado!',
        text: 'Tus datos se han guardado correctamente',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.error || 'No se pudo actualizar el perfil'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Las contraseñas no coinciden'
      })
      return
    }

    if (newPassword.length < 6) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: 'La contraseña debe tener al menos 6 caracteres'
      })
      return
    }

    setLoading(true)
    
    try {
      await api.patch('/api/auth/password', {
        currentPassword,
        newPassword
      })
      
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      MySwal.fire({
        icon: 'success',
        title: '¡Contraseña actualizada!',
        text: 'Tu contraseña se ha cambiado correctamente',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.error || 'No se pudo cambiar la contraseña'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Mi Perfil</h1>
          <p className={styles.subtitle}>Administra tu información personal y seguridad de la cuenta</p>
        </div>

        <div className={styles.card}>
          <div className={styles.profileHeader}>
            <div className={styles.avatar}>
              <UserCircleIcon className={styles.avatarIcon} />
            </div>
            <div>
              <h2 className={styles.profileName}>{user?.name || user?.email || 'Usuario'}</h2>
              <p className={styles.statusRow}>
                <span className={styles.statusDot} />
                Cuenta activa
              </p>
              <p className={styles.role}>
                Rol: {user?.role === 'owner_admin' ? 'Administrador' : user?.role === 'editor' ? 'Editor' : 'Visualizador'}
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className={styles.formGrid}>
              <div>
                <label className={styles.label}>Nombre completo</label>
                <Input
                  className={styles.input}
                  value={name}
                  onChange={(e: any) => setName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className={styles.label}>
                  <EnvelopeIcon className={styles.inlineIcon} />
                  Correo electrónico
                </label>
                <Input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                />
              </div>
            </div>
            <div className={styles.actions}>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <ArrowPathIcon className="sq-icon animate-spin" /> : <CheckIcon className="sq-icon" />}
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <KeyIcon className={styles.sectionIcon} />
            <span>Cambiar contraseña</span>
          </div>
          <p className={styles.sectionSubtitle}>Actualiza tu contraseña para mantener tu cuenta segura</p>

          <form onSubmit={handleChangePassword}>
            <div>
              <label className={styles.label}>Contraseña actual</label>
              <Input
                className={styles.input}
                type="password"
                value={currentPassword}
                onChange={(e: any) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className={styles.passwordGrid}>
              <div>
                <label className={styles.label}>Nueva contraseña</label>
                <Input
                  className={styles.input}
                  type="password"
                  value={newPassword}
                  onChange={(e: any) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className={styles.label}>Confirmar nueva contraseña</label>
                <Input
                  className={styles.input}
                  type="password"
                  value={confirmPassword}
                  onChange={(e: any) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
              >
                <XMarkIcon className="sq-icon" />
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <ArrowPathIcon className="sq-icon animate-spin" /> : <KeyIcon className="sq-icon" />}
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
              </Button>
            </div>
          </form>
        </div>

        <div className={styles.note}>
          <div className={styles.noteRow}>
            <CheckCircleIcon className={styles.noteIcon} />
            <div>
              <p className={styles.noteTitle}>Tu información está protegida</p>
              <p className={styles.noteText}>
                Usamos encriptación de extremo a extremo para proteger tus datos. Nunca compartiremos tu información con terceros.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
