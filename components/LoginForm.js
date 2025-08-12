"use client"

import { useState } from 'react'
import { useAuth } from '../utils/auth'

const LoginForm = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { signIn } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!username.trim() || !password.trim()) {
      setError('Por favor ingresa usuario y clave')
      setLoading(false)
      return
    }

    try {
      const { user, error } = await signIn(username, password)
      
      if (error) {
        setError(error)
      } else if (user) {
        // Login exitoso - el estado se actualiza automáticamente
        console.log('Login exitoso:', user.role)
      }
    } catch (err) {
      console.error('Error en login:', err)
      setError('Error inesperado. Intenta de nuevo.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[rgb(0,113,248)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            TesisLink
          </h2>
          <p className="text-white text-lg opacity-90">
            Sistema de gestión de profesores lectores - EDEI PFG
          </p>
        </div>

        {/* Formulario */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-6">
            
            {/* Campo Usuario */}
            <div>
              <label htmlFor="username" className="block text-white text-sm font-medium mb-2">
                Usuario (Email)
              </label>
              <input
                id="username"
                name="username"
                type="email"
                autoComplete="username"
                required
                className="w-full px-4 py-3 bg-transparent border-2 border-white border-opacity-30 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                placeholder="tu-email@veritas.cr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Campo Clave */}
            <div>
              <label htmlFor="password" className="block text-white text-sm font-medium mb-2">
                Clave de Acceso
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 pr-12 bg-transparent border-2 border-white border-opacity-30 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                  placeholder="Tu clave proporcionada"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="text-white text-sm">
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="border border-white border-opacity-30 px-4 py-3">
                <p className="text-white text-sm">{error}</p>
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white text-black text-lg font-medium hover:bg-white focus:outline-none focus:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="mr-2">Ingresando...</span>
                </span>
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </div>
        </form>

        {/* Información de ayuda */}
        <div className="mt-8 pt-4 border-t border-white border-opacity-20">
          <div>
            <h3 className="text-white opacity-70 font-medium mb-2">
              ¿Necesitas ayuda?
            </h3>
            <div className="text-white text-sm opacity-70 space-y-1">
              <p><strong>Estudiantes:</strong> Usa tu email y ID universitario (9 dígitos)</p>
              <p><strong>Profesores:</strong> Usa tu email y la clave proporcionada por el tutor</p>
              <p><strong>¿Olvidaste tu clave?</strong> Contacta al tutor del sistema</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-18 text-center text-white text-sm opacity-50">
          Sitio diseñado y construido por Elías Marín Lara + Claude Sonnet 4 ai 
        </div>
      </div>
    </div>
  )
}

export default LoginForm