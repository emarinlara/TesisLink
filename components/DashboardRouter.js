'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../utils/auth'
import CycleManagement from './CycleManagement'
import StudentManagement from './StudentManagement'
import ProfessorManagement from './ProfessorManagement'
import TutorReview from './TutorReview'
import FinalDocument from './FinalDocument'
import StudentProfile from './StudentProfile'
import StudentProposals from './StudentProposals'
import ProfessorDashboard from './ProfessorDashboard'

export default function DashboardRouter() {
  const { user, signOut } = useAuth()
  const [currentView, setCurrentView] = useState('dashboard')
  const [cycleCount, setCycleCount] = useState(0)
  const [studentCount, setStudentCount] = useState(0)
  const [professorCount, setProfessorCount] = useState(0)
  const [proposalCount, setProposalCount] = useState(0)
  const [assignmentCount, setAssignmentCount] = useState(0)

  useEffect(() => {
    if (user) {
      loadCounts()
    }
  }, [user])

  const loadCounts = async () => {
    try {
      // Contar ciclos
      const { count: cycles } = await supabase
        .from('cycles')
        .select('*', { count: 'exact', head: true })
      setCycleCount(cycles || 0)

      // Contar estudiantes
      const { count: students } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
      setStudentCount(students || 0)

      // Contar profesores
      const { count: professors } = await supabase
        .from('professors')
        .select('*', { count: 'exact', head: true })
      setProfessorCount(professors || 0)

      // Contar solicitudes
      const { count: proposals } = await supabase
        .from('student_proposals')
        .select('*', { count: 'exact', head: true })
      setProposalCount(proposals || 0)

      // Contar asignaciones
      const { count: assignments } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
      setAssignmentCount(assignments || 0)

    } catch (error) {
      console.error('Error cargando contadores:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      window.location.href = '/'
    }
  }

  const onBackToDashboard = () => {
    setCurrentView('dashboard')
    loadCounts() // Recargar contadores al volver
  }

  // Determinar rol del usuario
 const isAdmin = user?.role === 'tutor'
 const isStudent = user?.role === 'student'  
 const isProfessor = user?.role === 'professor'

  if (isAdmin) {
    // Dashboard del Tutor/Administrador
    if (currentView === 'cycles') {
      return <CycleManagement onBackToDashboard={onBackToDashboard} onLogout={handleLogout} />
    }

    if (currentView === 'students') {
      return <StudentManagement onBackToDashboard={onBackToDashboard} onLogout={handleLogout} />
    }

    if (currentView === 'professors') {
      return <ProfessorManagement onBackToDashboard={onBackToDashboard} onLogout={handleLogout} />
    }

    if (currentView === 'review') {
      return <TutorReview onBackToDashboard={onBackToDashboard} onLogout={handleLogout} />
    }

    if (currentView === 'final-document') {
      return <FinalDocument onBackToDashboard={onBackToDashboard} onLogout={handleLogout} />
    }

    return (
      <div className="min-h-screen bg-[rgb(0,113,248)]">
        {/* Header */}
        <div className="border-b border-white border-opacity-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-white">Dashboard del Tutor</h1>
                <p className="text-white opacity-80">Sistema de Gestión de Profesores Lectores</p>
              </div>
              <div className="flex items-center space-x-6">
                <span className="text-white opacity-90">{user?.email}</span>
                <button
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                      handleLogout()
                    }
                  }}
                  className="bg-white text-black px-4 py-2 hover:bg-white transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
            <div className="border border-white border-opacity-10 p-6">
              <div>
                <p className="text-white text-sm opacity-80">Ciclos</p>
                <p className="text-3xl font-bold text-white">{cycleCount}</p>
              </div>
            </div>

            <div className="border border-white border-opacity-10 p-6">
              <div>
                <p className="text-white text-sm opacity-80">Estudiantes</p>
                <p className="text-3xl font-bold text-white">{studentCount}</p>
              </div>
            </div>

            <div className="border border-white border-opacity-10 p-6">
              <div>
                <p className="text-white text-sm opacity-80">Profesores</p>
                <p className="text-3xl font-bold text-white">{professorCount}</p>
              </div>
            </div>

            <div className="border border-white border-opacity-10 p-6">
              <div>
                <p className="text-white text-sm opacity-80">Solicitudes</p>
                <p className="text-3xl font-bold text-white">{proposalCount}</p>
              </div>
            </div>

            <div className="border border-white border-opacity-10 p-6">
              <div>
                <p className="text-white text-sm opacity-80">Asignaciones</p>
                <p className="text-3xl font-bold text-white">{assignmentCount}</p>
              </div>
            </div>
          </div>

          {/* Acciones Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            
            {/* Gestión de Ciclos */}
            <div className="border border-white border-opacity-10 p-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Gestionar Ciclo</h3>
                <p className="text-white opacity-70 text-sm mb-6">Crear y configurar ciclos académicos</p>
                <button
                  onClick={() => setCurrentView('cycles')}
                  className="w-full bg-white text-black py-3 px-4 hover:bg-white font-medium transition-colors"
                >
                  Acceder
                </button>
              </div>
            </div>

            {/* Gestión de Estudiantes */}
            <div className="border border-white border-opacity-10 p-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Gestionar Estudiantes</h3>
                <p className="text-white opacity-70 text-sm mb-6">Agregar y administrar estudiantes</p>
                <button
                  onClick={() => setCurrentView('students')}
                  className="w-full bg-white text-black py-3 px-4 hover:bg-white font-medium transition-colors"
                >
                  Acceder
                </button>
              </div>
            </div>

            {/* Gestión de Profesores */}
            <div className="border border-white border-opacity-10 p-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Gestionar Profesores</h3>
                <p className="text-white opacity-70 text-sm mb-6">Agregar y administrar profesores</p>
                <button
                  onClick={() => setCurrentView('professors')}
                  className="w-full bg-white text-black py-3 px-4 hover:bg-white font-medium transition-colors"
                >
                  Acceder
                </button>
              </div>
            </div>

            {/* Revisar Asignaciones */}
            <div className="border border-white border-opacity-10 p-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Revisar Asignaciones</h3>
                <p className="text-white opacity-70 text-sm mb-6">Revisar y modificar asignaciones de profesores</p>
                <button
                  onClick={() => setCurrentView('review')}
                  className="w-full bg-white text-black py-3 px-4 hover:bg-white font-medium transition-colors"
                >
                  Acceder
                </button>
              </div>
            </div>

            {/* Documento Final */}
            <div className="border border-white border-opacity-10 p-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Documento Final</h3>
                <p className="text-white opacity-70 text-sm mb-6">Generar PDF y CSV con resultados finales</p>
                <button
                  onClick={() => setCurrentView('final-document')}
                  className="w-full bg-white text-black py-3 px-4 hover:bg-white font-medium transition-colors"
                >
                  Generar
                </button>
              </div>
            </div>

          </div>

          {/* Información del Sistema */}
          <div className="border border-white border-opacity-10 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Estado del Sistema</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-medium text-white mb-4">Resumen Actual</h3>
                <ul className="text-white opacity-80 space-y-2">
                  <li>{cycleCount} ciclo(s) académico(s)</li>
                  <li>{studentCount} estudiante(s) registrado(s)</li>
                  <li>{professorCount} profesor(es) disponible(s)</li>
                  <li>{proposalCount} solicitud(es) enviada(s)</li>
                  <li>{assignmentCount} asignación(es) confirmada(s)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-white mb-4">Próximos Pasos</h3>
                <ul className="text-white opacity-80 space-y-2">
                  <li>Revisar asignaciones pendientes</li>
                  <li>Completar estudiantes sin 3 profesores</li>
                  <li>Generar documento final cuando esté listo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isStudent) {
    // Dashboard del Estudiante
    if (currentView === 'profile') {
      return <StudentProfile onBackToDashboard={onBackToDashboard} onLogout={handleLogout} />
    }

    if (currentView === 'proposals') {
      return <StudentProposals onBackToDashboard={onBackToDashboard} onLogout={handleLogout} />
    }

    return (
      <div className="min-h-screen bg-[rgb(0,113,248)]">
        {/* Header */}
        <div className="border-b border-white border-opacity-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-white">Dashboard del Estudiante</h1>
                <p className="text-white opacity-80">Gestiona tu perfil y solicitudes de profesores</p>
              </div>
              <div className="flex items-center space-x-6">
                <span className="text-white opacity-90">{user?.email}</span>
                <button
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                      handleLogout()
                    }
                  }}
                  className="bg-white text-black px-4 py-2 hover:bg-white transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            
            {/* Completar Perfil */}
            <div className="border border-white border-opacity-10 p-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Completar Perfil</h3>
                <p className="text-white opacity-70 text-sm mb-6">Completa tu información y sube los archivos de tu tesis</p>
                <button
                  onClick={() => setCurrentView('profile')}
                  className="w-full bg-white text-black py-3 px-4 hover:bg-white font-medium transition-colors"
                >
                  Acceder
                </button>
              </div>
            </div>

            {/* Hacer Solicitudes */}
            <div className="border border-white border-opacity-10 p-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Hacer Solicitudes</h3>
                <p className="text-white opacity-70 text-sm mb-6">Solicita hasta 5 profesores lectores para tu tesis</p>
                <button
                  onClick={() => setCurrentView('proposals')}
                  className="w-full bg-white text-black py-3 px-4 hover:bg-white font-medium transition-colors"
                >
                  Acceder
                </button>
              </div>
            </div>

          </div>

          {/* Información */}
          <div className="border border-white border-opacity-10 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Instrucciones</h2>
            <ol className="list-decimal list-inside text-white opacity-80 space-y-3">
              <li>Primero completa tu perfil con toda la información requerida</li>
              <li>Sube la imagen de tu proyecto y el documento PDF de tu tesis</li>
              <li>Luego podrás solicitar hasta 5 profesores lectores</li>
              <li>Los profesores revisarán tu solicitud y podrán aceptarla o rechazarla</li>
              <li>Mantente pendiente del estado de tus solicitudes</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  if (isProfessor) {
    // Dashboard del Profesor
    return <ProfessorDashboard onLogout={handleLogout} />
  }

  // Fallback
  return (
    <div className="min-h-screen bg-[rgb(0,113,248)] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Cargando Dashboard...</h2>
        <p className="text-white opacity-80">Detectando tipo de usuario...</p>
      </div>
    </div>
  )
}