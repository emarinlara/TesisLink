"use client"

import { useAuth } from '../utils/auth'
import { useState, useEffect } from 'react'
import LoginForm from '../components/LoginForm'
import DashboardRouter from '../components/DashboardRouter'

export default function Home() {
  const { user, userProfile, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Evitar hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Mostrar loading hasta que esté montado
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {!mounted ? 'Inicializando aplicación...' : 'Verificando autenticación...'}
          </p>
        </div>
      </div>
    )
  }

  // Si no hay usuario o perfil, mostrar login
  if (!user || !userProfile) {
    return <LoginForm />
  }

  // Si hay usuario y perfil, mostrar dashboard
  return <DashboardRouter />
}