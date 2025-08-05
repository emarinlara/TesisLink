"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Verificar si hay una sesión activa al cargar
    const checkSession = () => {
      const savedUser = localStorage.getItem('thesis_user')
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser)
          setUser(userData)
          setUserProfile(userData)
        } catch (error) {
          console.error('Error parsing saved user:', error)
          localStorage.removeItem('thesis_user')
        }
      }
      setLoading(false)
    }

    checkSession()
  }, [])

  // Función para hacer login con credenciales pre-creadas
  const signIn = async (username, password) => {
    try {
      setLoading(true)
        // Validar dominio institucional
          if (!username.endsWith('@veritas.co.cr')) {
            throw new Error('Solo emails @veritas.co.cr pueden acceder al sistema')
          }
      // Validar credenciales usando la función SQL
      const { data, error } = await supabase
        .rpc('validate_user_credentials', {
          input_username: username.toLowerCase().trim(),
          input_password: password.trim()
        })

      if (error) {
        throw new Error(`Error de validación: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('Credenciales incorrectas. Verifica tu usuario y clave.')
      }

      const userData = data[0]
      
      console.log('🔍 DEBUG - Datos de función SQL:', userData)
      
      // Crear objeto de usuario - ✅ CORREGIDO: Campos sin prefijo user_
      const userObject = {
        id: userData.user_id,        // ✅ CORRECTO (único con prefijo)
        email: userData.email,       // ✅ CORREGIDO (sin prefijo user_)
        name: userData.name,         // ✅ CORREGIDO (sin prefijo user_)
        role: userData.role,         // ✅ CORREGIDO (sin prefijo user_)
        cycle_id: null,              // ✅ CORREGIDO (no existe en función SQL)
        student_id: userData.student_id, // ✅ CORRECTO (sin prefijo)
        loginTime: new Date().toISOString()
      }

      console.log('🔍 DEBUG - UserObject creado:', userObject)

      // Guardar en localStorage
      localStorage.setItem('thesis_user', JSON.stringify(userObject))
      
      // Actualizar estado
      setUser(userObject)
      setUserProfile(userObject)

      return { user: userObject, error: null }

    } catch (error) {
      console.error('Error en signIn:', error)
      return { 
        user: null, 
        error: error.message || 'Error al iniciar sesión' 
      }
    } finally {
      setLoading(false)
    }
  }

  // Función para cerrar sesión
  const signOut = async () => {
    try {
      // Limpiar localStorage
      localStorage.removeItem('thesis_user')
      
      // Limpiar estado
      setUser(null)
      setUserProfile(null)
      
      return { error: null }
    } catch (error) {
      console.error('Error en signOut:', error)
      return { error: error.message }
    }
  }

  // Función para actualizar perfil (si es necesario)
  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No hay usuario autenticado')

      // Actualizar según el tipo de usuario
      let updateResult
      
      if (user.role === 'professor') {
        const { error } = await supabase
          .from('professors')
          .update(updates)
          .eq('id', user.id)
        
        if (error) throw error
        
      } else if (user.role === 'student') {
        const { error } = await supabase
          .from('students')
          .update(updates)
          .eq('id', user.id)
        
        if (error) throw error
      }

      // Actualizar estado local
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      setUserProfile(updatedUser)
      localStorage.setItem('thesis_user', JSON.stringify(updatedUser))

      return { error: null }

    } catch (error) {
      console.error('Error actualizando perfil:', error)
      return { error: error.message }
    }
  }

  // Helpers para verificar roles
  const isAdmin = userProfile?.role === 'tutor'
  const isStudent = userProfile?.role === 'student'
  const isProfessor = userProfile?.role === 'professor'

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    updateProfile,
    isAdmin,
    isStudent,
    isProfessor
  }

  // Evitar hydration issues
  if (!mounted) {
    return null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}