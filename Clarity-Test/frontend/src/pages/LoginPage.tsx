import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import Input from '../components/Input'
import Button from '../components/Button'
import { CloudIcon, SparklesIcon, LockClosedIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import styles from '../styles/pages/LoginPage.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@example.local')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await api.post('/api/auth/login', { email, password })
      const t = res.data?.token
      if (t) {
        try { 
          localStorage.setItem('token', t)
          
          // Obtener y guardar info del usuario
          const userRes = await api.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${t}` }
          })
          localStorage.setItem('user', JSON.stringify(userRes.data))
        } catch {}
        navigate('/board')
      } else setError('No token returned')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true">
        <span className={styles.glowA} />
        <span className={styles.glowB} />
        <span className={styles.grid} />
      </div>
      <div className={styles.container}>
        <div className={styles.illustration}>
          <div className={styles.cloud}>
            <CloudIcon className={styles.cloudIcon} />
          </div>
          <h1 className={styles.brand}>Clarity</h1>
          <p className={styles.tagline}>Archivos seguros, ordenados y siempre listos.</p>
          <ul className={styles.featureList}>
            <li className={styles.featureItem}>Busquedas rapidas con filtros inteligentes.</li>
            <li className={styles.featureItem}>Compartir y descargar sin friccion.</li>
          </ul>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <LockClosedIcon className={styles.lockIcon} />
            <h2 className={styles.formTitle}>Bienvenido de nuevo</h2>
            <p className={styles.formSubtitle}>Inicia sesion para continuar</p>
          </div>

          <form onSubmit={submit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label htmlFor="email">Correo electronico</label>
              <Input
                id="email"
                className={styles.input}
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="password">Contrasena</label>
              <Input
                id="password"
                className={styles.input}
                type="password"
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <Button variant="primary" type="submit" className={styles.primaryButton}>
              <ArrowRightOnRectangleIcon className="sq-icon" />
              Iniciar sesión
            </Button>
          </form>

        
        </div>
      </div>
    </div>
  )
}
