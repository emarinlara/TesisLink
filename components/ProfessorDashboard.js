"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '../utils/auth'
import { supabase } from '../utils/supabase'

export default function ProfessorDashboard() {
  const { user, userProfile, signOut } = useAuth()
  const [pendingRequests, setPendingRequests] = useState([])
  const [acceptedStudents, setAcceptedStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewingStudent, setViewingStudent] = useState(null)

  // Función de logout directa sin async
  const handleLogoutDirect = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      try {
        // Limpiar cualquier estado local si es necesario
        localStorage.clear()
        sessionStorage.clear()
        
        // Forzar redirección inmediata
        window.location.replace('/')
      } catch (error) {
        console.log('Error en logout:', error)
        // Fallback si replace no funciona
        window.location.href = '/'
      }
    }
  }

  // Abrir modal para ver proyecto
  const handleViewThesis = (student) => {
    setViewingStudent(student)
  }

  // Cerrar modal
  const handleCloseModal = () => {
    setViewingStudent(null)
  }

  useEffect(() => {
    if (userProfile?.role === 'professor') {
      fetchData()
    }
  }, [userProfile])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')

      // Buscar el profesor en la base de datos
      const { data: professor, error: profError } = await supabase
        .from('professors')
        .select('*')
        .eq('email', userProfile.email)
        .single()

      if (profError) {
        console.error('Error buscando profesor:', profError)
        setError('No se pudo encontrar el perfil del profesor')
        return
      }

      // Obtener solicitudes pendientes
      const { data: pending, error: pendingError } = await supabase
        .from('student_proposals')
        .select(`
          *,
          students:student_id (
            id,
            name,
            email,
            university_id,
            project_description,
            project_image_url
          )
        `)
        .eq('professor_id', professor.id)
        .eq('status', 'pending')

      if (pendingError) {
        console.error('Error obteniendo solicitudes pendientes:', pendingError)
      } else {
        setPendingRequests(pending || [])
      }

      // Obtener estudiantes aceptados
      const { data: accepted, error: acceptedError } = await supabase
        .from('student_proposals')
        .select(`
          *,
          students:student_id (
            id,
            name,
            email,
            university_id,
            project_description,
            project_image_url
          )
        `)
        .eq('professor_id', professor.id)
        .eq('status', 'accepted')

      if (acceptedError) {
        console.error('Error obteniendo estudiantes aceptados:', acceptedError)
      } else {
        setAcceptedStudents(accepted || [])
      }

    } catch (error) {
      console.error('Error general:', error)
      setError('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (proposalId) => {
    try {
      setError('')

      // Actualizar el estado de la solicitud
      const { error: updateError } = await supabase
        .from('student_proposals')
        .update({ status: 'accepted' })
        .eq('id', proposalId)

      if (updateError) {
        throw updateError
      }

      // Recargar datos
      await fetchData()

    } catch (error) {
      console.error('Error al aceptar solicitud:', error)
      setError('Error al procesar la solicitud')
    }
  }

  const handleReject = async (proposalId) => {
    try {
      setError('')

      // Actualizar el estado de la solicitud
      const { error: updateError } = await supabase
        .from('student_proposals')
        .update({ status: 'rejected' })
        .eq('id', proposalId)

      if (updateError) {
        throw updateError
      }

      // Recargar datos
      await fetchData()

    } catch (error) {
      console.error('Error al rechazar solicitud:', error)
      setError('Error al procesar la solicitud')
    }
  }

  if (!userProfile || userProfile.role !== 'professor') {
    return (
      <div className="min-h-screen bg-[rgb(0,113,248)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Acceso denegado</h2>
          <p className="text-white opacity-80 mb-6">Esta página es solo para profesores.</p>
          <button
            onClick={handleLogoutDirect}
            className="bg-white text-black px-6 py-3 hover:bg-white transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(0,113,248)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-opacity-30 border-t-white mx-auto"></div>
          <p className="mt-6 text-white opacity-80">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(0,113,248)]">
      {/* Header */}
      <div className="border-b border-white border-opacity-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard del Profesor</h1>
              <p className="text-white opacity-80">
                Bienvenido, {userProfile.name}
              </p>
            </div>
            <button
              onClick={handleLogoutDirect}
              className="bg-white text-black px-4 py-2 hover:bg-white transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Mostrar errores */}
        {error && (
          <div className="mb-8 border border-white border-opacity-30 p-4">
            <div className="text-white">
              <h3 className="font-medium mb-2">Error</h3>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="border border-white border-opacity-10 p-6">
            <div>
              <p className="text-white text-sm opacity-80">Solicitudes Pendientes</p>
              <p className="text-3xl font-bold text-white">{pendingRequests.length}</p>
            </div>
          </div>

          <div className="border border-white border-opacity-10 p-6">
            <div>
              <p className="text-white text-sm opacity-80">Estudiantes Aceptados</p>
              <p className="text-3xl font-bold text-white">{acceptedStudents.length}</p>
            </div>
          </div>

          <div className="border border-white border-opacity-10 p-6">
            <div>
              <p className="text-white text-sm opacity-80">Estado</p>
              <p className="text-lg font-medium text-[#32D74B]">Disponible para más estudiantes</p>
            </div>
          </div>
        </div>

        {/* Solicitudes Pendientes */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Solicitudes Pendientes ({pendingRequests.length})
          </h2>
          
          {pendingRequests.length === 0 ? (
            <div className="border border-white border-opacity-10 p-6">
              <p className="text-white opacity-80">No hay solicitudes pendientes.</p>
            </div>
          ) : (
            <div className="border border-white border-opacity-20">
              <div className="divide-y divide-white divide-opacity-20">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            <div className="h-12 w-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                              <span className="text-blue font-medium text-lg">
                                {request.students?.name?.charAt(0) || 'E'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-lg font-medium text-white">
                              {request.students?.name || 'Sin nombre'}
                            </div>
                            <div className="text-white opacity-70 text-sm">
                              {request.students?.email || 'Sin email'} • 
                              Carnet: {request.students?.university_id || 'N/A'} • 
                              Prioridad: {request.proposal_order}
                            </div>
                          </div>
                        </div>
                        {request.students?.project_description && (
                          <div className="mt-4 ml-16">
                            <p className="text-white opacity-80 text-sm">
                              <span className="font-medium">Proyecto:</span> {request.students.project_description}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-3 ml-6">
                        <button
                            onClick={() => handleViewThesis(request.students)}
                            className="text-white border border-white border-opacity-30 px-4 py-2 text-sm hover:bg-white hover:bg-opacity-10 transition-colors"
  >
                            Ver Proyecto
                        </button>
                        <button
                         onClick={() => handleAccept(request.id)}
                            className="bg-white text-black px-4 py-2 text-sm hover:bg-white transition-colors"
  >
                            Aceptar
                        </button>
                        <button
                            onClick={() => handleReject(request.id)}
                            className="text-white border border-white border-opacity-30 px-4 py-2 text-sm hover:bg-opacity-30 transition-colors"
  >
                            Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Estudiantes Aceptados */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-6">
            Estudiantes Aceptados ({acceptedStudents.length})
          </h2>
          
          {acceptedStudents.length === 0 ? (
            <div className="border border-white border-opacity-20 p-8 text-center">
              <p className="text-white opacity-80">No has aceptado estudiantes aún.</p>
            </div>
          ) : (
            <div className="border border-white border-opacity-10 p-6">
              <div className="divide-y divide-white divide-opacity-20">
                {acceptedStudents.map((student) => (
                  <div key={student.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            <div className="h-12 w-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                              <span className="text-blue font-medium text-lg">
                                {student.students?.name?.charAt(0) || 'E'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-lg font-medium text-white">
                              {student.students?.name || 'Sin nombre'}
                            </div>
                            <div className="text-white opacity-70 text-sm">
                              {student.students?.email || 'Sin email'} • 
                              Carnet: {student.students?.university_id || 'N/A'} • 
                              Prioridad: {student.proposal_order}
                            </div>
                          </div>
                        </div>
                        {student.students?.project_description && (
                          <div className="mt-4 ml-16">
                            <p className="text-white opacity-80 text-sm">
                              <span className="font-medium">Proyecto:</span> {student.students.project_description}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-3 ml-6">
                        <button
                          onClick={() => handleViewThesis(student.students)}
                          className="bg-white text-black px-4 py-2 text-sm hover:bg-white transition-colors"
                        >
                          Ver Proyecto
                        </button>
                        <span className="text-white border border-white border-opacity-30 px-4 py-2 text-sm">
                          Aceptado
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border-0 w-11/12 md:w-3/4 lg:w-1/2 shadow-2xl bg-[rgb(0,113,248)]">
            
            {/* Header del Modal */}
            <div className="flex justify-between items-center pb-6 border-b border-white border-opacity-20">
              <h3 className="text-2xl font-semibold text-white">
                Proyecto de {viewingStudent.name}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-white hover:text-white text-3xl font-light"
              >
                ×
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="mt-6 space-y-8">
              
              {/* Información del Estudiante */}
              <div className="border border-white border-opacity-20 p-6">
                <h4 className="font-medium text-white mb-4 text-lg">Información del Estudiante</h4>
                <div className="text-white opacity-90 space-y-2">
                  <p><span className="font-medium">Nombre:</span> {viewingStudent.name}</p>
                  <p><span className="font-medium">Email:</span> {viewingStudent.email}</p>
                  <p><span className="font-medium">Carnet:</span> {viewingStudent.university_id}</p>
                  {viewingStudent.project_description && (
                    <div className="mt-4 p-4 border border-white border-opacity-20">
                      <p className="font-medium text-white mb-2">Descripción del Proyecto:</p>
                      <p className="text-white opacity-80 leading-relaxed">
                        {viewingStudent.project_description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Imagen del Proyecto */}
              {viewingStudent.project_image_url ? (
                <div>
                  <h4 className="font-medium text-white mb-4 text-lg">Imagen del Proyecto</h4>
                  <div className="border border-white border-opacity-20 overflow-hidden">
                    <img 
                      src={viewingStudent.project_image_url} 
                      alt={`Proyecto de ${viewingStudent.name}`}
                      className="w-full h-64 object-cover"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg=='
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border border-white border-opacity-20">
                  <p className="text-white opacity-70">Este estudiante aún no ha subido una imagen de su proyecto.</p>
                </div>
              )}

            </div>

            {/* Footer del Modal */}
            <div className="flex justify-end pt-6 mt-8 border-t border-white border-opacity-20">
              <button
                onClick={handleCloseModal}
                className="bg-white text-black px-6 py-2 hover:bg-white transition-colors"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}