// components/ProfessorAssignments.js
import { useState, useEffect } from 'react'
import { useAuth } from '../utils/auth'
import { supabase } from '../utils/supabase'

export default function ProfessorAssignments() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [professorData, setProfessorData] = useState(null)
  const [assignments, setAssignments] = useState([])

  // Cargar datos al montar el componente
  useEffect(() => {
    loadAssignments()
  }, [user])

  const loadAssignments = async () => {
    if (!user?.email) return

    try {
      setLoading(true)

      // 1. Obtener datos del profesor
      const { data: professor, error: professorError } = await supabase
        .from('professors')
        .select('*')
        .eq('email', user.email)
        .single()

      if (professorError) {
        throw new Error('No se encontró información del profesor en el sistema')
      }

      setProfessorData(professor)

      // 2. Obtener estudiantes aceptados (solicitudes con status 'accepted')
      const { data: acceptedRequests, error: requestsError } = await supabase
        .from('student_proposals')
        .select(`
          *,
          students (
            id,
            name,
            student_id,
            email,
            project_description,
            project_image_url,
            thesis_pdf_url
          )
        `)
        .eq('professor_id', professor.id)
        .eq('status', 'accepted')
        .order('proposal_order', { ascending: true })

      if (requestsError) throw requestsError

      setAssignments(acceptedRequests || [])

    } catch (error) {
      console.error('Error cargando asignaciones:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Error al cargar los datos'
      })
    } finally {
      setLoading(false)
    }
  }

  const getPriorityLabel = (order) => {
    if (order <= 3) {
      return `${order}ª opción (Principal)`
    } else {
      return `${order}ª opción (Alternativa)`
    }
  }

  const getPriorityColor = (order) => {
    return order <= 3 ? 'text-white bg-white' : 'text-[#32D74B] bg-[#32D74B]'
  }

  const handleDownloadPDF = (pdfUrl, studentName) => {
    if (!pdfUrl) {
      setMessage({
        type: 'error',
        text: 'Este estudiante no ha subido su documento PDF aún'
      })
      return
    }

    // Por ahora solo mostrar mensaje, cuando tengamos Storage funcionará
    setMessage({
      type: 'info',
      text: 'Funcionalidad de descarga disponible próximamente'
    })
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-8">
          <div className="text-white">🔄 Cargando estudiantes asignados...</div>
        </div>
      </div>
    )
  }

  if (!professorData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-8">
          <div className="text-[#FF453A] mb-4">⚠️ Acceso denegado</div>
          <p className="text-white">
            No tienes permisos para acceder a esta sección.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white">
              📋 Mis Estudiantes Asignados
            </h2>
            <p className="text-white mt-1">
              Estudiantes que has aceptado como profesor lector
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-white">Estudiantes aceptados</div>
            <div className="text-2xl font-bold text-[#32D74B]">
              {assignments.length}/{professorData.max_students}
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#32D74B] p-4 rounded-lg border border-[#32D74B]">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#32D74B]">{assignments.length}</div>
            <div className="text-sm text-[#32D74B]">Estudiantes aceptados</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-white">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {assignments.filter(a => a.proposal_order <= 3).length}
            </div>
            <div className="text-sm text-white">Opciones principales</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-white">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {Math.max(0, professorData.max_students - assignments.length)}
            </div>
            <div className="text-sm text-white">Cupos disponibles</div>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-[#32D74B] border border-[#32D74B] text-[#32D74B]' :
          message.type === 'info' ? 'bg-white border border-white text-white' :
          'bg-[#FF453A] border border-[#FF453A] text-[#FF453A]'
        }`}>
          <p>{message.text}</p>
        </div>
      )}

      {/* Lista de estudiantes asignados */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">👥 Estudiantes bajo tu supervisión</h3>
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center text-white">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold mb-2">No tienes estudiantes asignados aún</h3>
            <p>Los estudiantes aparecerán aquí cuando aceptes sus solicitudes</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Info del estudiante */}
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="text-lg font-semibold text-white">
                        {assignment.students?.name}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(assignment.proposal_order)}`}>
                        {getPriorityLabel(assignment.proposal_order)}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs bg-[#32D74B] text-[#32D74B]">
                        ✅ Aceptado
                      </span>
                    </div>

                    {/* Información de contacto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-white">
                          <strong>ID de estudiante:</strong> {assignment.students?.student_id}
                        </p>
                        <p className="text-sm text-white">
                          <strong>Email:</strong> 
                          <a 
                            href={`mailto:${assignment.students?.email}`}
                            className="text-white hover:text-white ml-1"
                          >
                            {assignment.students?.email}
                          </a>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-white">
                          <strong>Aceptado el:</strong> {new Date(assignment.updated_at || assignment.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-white">
                          <strong>Prioridad:</strong> Te eligió como {assignment.proposal_order}ª opción
                        </p>
                      </div>
                    </div>

                    {/* Descripción del proyecto */}
                    <div className="mb-4">
                      <h5 className="font-medium text-white mb-2">📝 Descripción del proyecto:</h5>
                      <div className="bg-white p-3 rounded border text-sm text-white">
                        {assignment.students?.project_description || 'Sin descripción disponible'}
                      </div>
                    </div>

                    {/* Archivos del proyecto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Imagen del proyecto */}
                      <div className="bg-white p-4 rounded-lg border-2 border-dashed border-white">
                        <div className="text-center text-white">
                          <div className="text-2xl mb-2">🖼️</div>
                          <p className="font-medium">Imagen del proyecto</p>
                          {assignment.students?.project_image_url ? (
                            <p className="text-sm text-white">Archivo disponible</p>
                          ) : (
                            <p className="text-sm">No subida aún</p>
                          )}
                        </div>
                      </div>

                      {/* Documento PDF */}
                      <div className="bg-white p-4 rounded-lg border-2 border-dashed border-white">
                        <div className="text-center text-white">
                          <div className="text-2xl mb-2">📄</div>
                          <p className="font-medium">Documento de tesis</p>
                          {assignment.students?.thesis_pdf_url ? (
                            <button
                              onClick={() => handleDownloadPDF(assignment.students.thesis_pdf_url, assignment.students.name)}
                              className="text-sm text-white hover:text-white mt-1"
                            >
                              📥 Descargar PDF
                            </button>
                          ) : (
                            <p className="text-sm">No subido aún</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones adicionales */}
                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => window.open(`mailto:${assignment.students?.email}?subject=Consulta sobre tu proyecto de tesis`, '_blank')}
                      className="bg-white hover:bg-white text-white px-4 py-2 rounded text-sm"
                    >
                      📧 Contactar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="bg-[#32D74B] border border-[#32D74B] rounded-lg p-4">
        <h3 className="font-semibold text-[#32D74B] mb-2">📋 Información sobre tus asignaciones:</h3>
        <ul className="text-[#32D74B] text-sm space-y-1">
          <li>• Tienes <strong>{assignments.length} estudiantes aceptados</strong> de un máximo de <strong>{professorData.max_students}</strong></li>
          <li>• Los estudiantes pueden contactarte directamente por email</li>
          <li>• Las funcionalidades de descarga de archivos estarán disponibles próximamente</li>
          <li>• Puedes cambiar tu decisión de aceptación en la sección "Ver Solicitudes"</li>
        </ul>
      </div>
    </div>
  )
}