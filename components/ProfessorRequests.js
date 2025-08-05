// components/ProfessorRequests.js
import { useState, useEffect } from 'react'
import { useAuth } from '../utils/auth'
import { supabase } from '../utils/supabase'

export default function ProfessorRequests() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null) // ID de la solicitud siendo procesada
  const [message, setMessage] = useState(null)
  const [professorData, setProfessorData] = useState(null)
  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    availableSlots: 0
  })

  // Cargar datos al montar el componente
  useEffect(() => {
    loadProfessorData()
  }, [user])

  const loadProfessorData = async () => {
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

      // 2. Obtener todas las solicitudes para este profesor
      const { data: requestsData, error: requestsError } = await supabase
        .from('student_proposals')
        .select(`
          *,
          students (
            id,
            name,
            student_id,
            email,
            project_description
          )
        `)
        .eq('professor_id', professor.id)
        .order('proposal_order', { ascending: true })

      if (requestsError) throw requestsError

      setRequests(requestsData || [])

      // 3. Calcular estadísticas
      const totalRequests = requestsData?.length || 0
      const pendingRequests = requestsData?.filter(req => req.status === 'pending').length || 0
      const acceptedRequests = requestsData?.filter(req => req.status === 'accepted').length || 0
      const availableSlots = Math.max(0, professor.max_students - professor.current_students)

      setStats({
        totalRequests,
        pendingRequests,
        acceptedRequests,
        availableSlots
      })

    } catch (error) {
      console.error('Error cargando datos del profesor:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Error al cargar los datos'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRequestResponse = async (requestId, newStatus, studentId) => {
    if (!professorData) return

    setProcessing(requestId)
    setMessage(null)

    try {
      // Validar capacidad al aceptar
      if (newStatus === 'accepted') {
        if (professorData.current_students >= professorData.max_students) {
          throw new Error('Has alcanzado tu capacidad máxima de estudiantes')
        }
      }

      // 1. Actualizar el estado de la solicitud
      const { error: updateRequestError } = await supabase
        .from('student_proposals')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateRequestError) throw updateRequestError

      // 2. Actualizar contador del profesor
      let newCurrentStudents = professorData.current_students
      if (newStatus === 'accepted') {
        newCurrentStudents += 1
      } else if (newStatus === 'rejected') {
        // Si el estudiante ya estaba aceptado y ahora se rechaza, decrementar
        const currentRequest = requests.find(req => req.id === requestId)
        if (currentRequest && currentRequest.status === 'accepted') {
          newCurrentStudents -= 1
        }
      }

      const { error: updateProfessorError } = await supabase
        .from('professors')
        .update({ current_students: newCurrentStudents })
        .eq('id', professorData.id)

      if (updateProfessorError) throw updateProfessorError

      // Actualizar estado local
      setProfessorData(prev => ({
        ...prev,
        current_students: newCurrentStudents
      }))

      setMessage({
        type: 'success',
        text: `Solicitud ${newStatus === 'accepted' ? 'aceptada' : 'rechazada'} correctamente`
      })

      // Recargar datos
      loadProfessorData()

    } catch (error) {
      console.error('Error procesando solicitud:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Error al procesar la solicitud'
      })
    } finally {
      setProcessing(null)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-[#FFD400] border-[#FFD400] text-[#FFD400]'
      case 'accepted': return 'bg-[#32D74B] border-[#32D74B] text-[#32D74B]'
      case 'rejected': return 'bg-[#FF453A] border-[#FF453A] text-[#FF453A]'
      default: return 'bg-white border-white text-white'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '⏳ Pendiente'
      case 'accepted': return '✅ Aceptada'
      case 'rejected': return '❌ Rechazada'
      default: return '❓ Sin estado'
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

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-8">
          <div className="text-white">🔄 Cargando solicitudes...</div>
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
            No tienes permisos para acceder a esta sección o no estás registrado como profesor.
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
              👥 Solicitudes de Estudiantes
            </h2>
            <p className="text-white mt-1">
              Estudiantes que te han incluido en sus opciones de profesores lectores
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-white">Capacidad actual</div>
            <div className="text-2xl font-bold text-white">
              {professorData.current_students}/{professorData.max_students}
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-white">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.totalRequests}</div>
            <div className="text-sm text-white">Total solicitudes</div>
          </div>
        </div>
        <div className="bg-[#FFD400] p-4 rounded-lg border border-[#FFD400]">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#FFD400]">{stats.pendingRequests}</div>
            <div className="text-sm text-[#FFD400]">Pendientes</div>
          </div>
        </div>
        <div className="bg-[#32D74B] p-4 rounded-lg border border-[#32D74B]">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#32D74B]">{stats.acceptedRequests}</div>
            <div className="text-sm text-[#32D74B]">Aceptadas</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-white">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.availableSlots}</div>
            <div className="text-sm text-white">Cupos disponibles</div>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-[#32D74B] border border-[#32D74B] text-[#32D74B]' 
            : 'bg-[#FF453A] border border-[#FF453A] text-[#FF453A]'
        }`}>
          <p>{message.text}</p>
        </div>
      )}

      {/* Alerta de capacidad */}
      {stats.availableSlots === 0 && (
        <div className="bg-[#FFD400] border border-[#FFD400] rounded-lg p-4">
          <h3 className="font-semibold text-[#FFD400] mb-2">⚠️ Capacidad completa</h3>
          <p className="text-[#FFD400] text-sm">
            Has alcanzado tu capacidad máxima. No podrás aceptar más estudiantes hasta que se liberen cupos.
          </p>
        </div>
      )}

      {/* Lista de solicitudes */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">📋 Solicitudes recibidas</h3>
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center text-white">
            <div className="text-4xl mb-4">📭</div>
            <p>No has recibido solicitudes de estudiantes aún</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {requests.map((request) => (
              <div key={request.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Info del estudiante */}
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="text-lg font-semibold text-white">
                        {request.students?.name}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(request.proposal_order)}`}>
                        {getPriorityLabel(request.proposal_order)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-white">
                          <strong>ID:</strong> {request.students?.student_id}
                        </p>
                        <p className="text-sm text-white">
                          <strong>Email:</strong> {request.students?.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-white">
                          <strong>Solicitud enviada:</strong> {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Descripción del proyecto */}
                    <div className="mb-4">
                      <h5 className="font-medium text-white mb-2">📝 Descripción del proyecto:</h5>
                      <div className="bg-white p-3 rounded border text-sm text-white">
                        {request.students?.project_description || 'Sin descripción disponible'}
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  {request.status === 'pending' && (
                    <div className="flex flex-col space-y-2 ml-6">
                      <button
                        onClick={() => handleRequestResponse(request.id, 'accepted', request.students?.id)}
                        disabled={processing === request.id || stats.availableSlots === 0}
                        className="bg-[#32D74B] hover:bg-[#32D74B] text-white px-4 py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === request.id ? '⏳' : '✅'} Aceptar
                      </button>
                      <button
                        onClick={() => handleRequestResponse(request.id, 'rejected', request.students?.id)}
                        disabled={processing === request.id}
                        className="bg-[#FF453A] hover:bg-[#FF453A] text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                      >
                        {processing === request.id ? '⏳' : '❌'} Rechazar
                      </button>
                    </div>
                  )}

                  {/* Cambiar decisión */}
                  {request.status !== 'pending' && (
                    <div className="flex flex-col space-y-2 ml-6">
                      <button
                        onClick={() => handleRequestResponse(request.id, 'pending', request.students?.id)}
                        disabled={processing === request.id}
                        className="bg-white hover:bg-white text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                      >
                        {processing === request.id ? '⏳' : '🔄'} Cambiar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="bg-white border border-white rounded-lg p-4">
        <h3 className="font-semibold text-white mb-2">💡 Información importante:</h3>
        <ul className="text-white text-sm space-y-1">
          <li>• Las <strong>opciones principales (1º-3º)</strong> tienen mayor prioridad en el algoritmo de asignación</li>
          <li>• Las <strong>opciones alternativas (4º-5º)</strong> se consideran solo si es necesario</li>
          <li>• Puedes <strong>cambiar tu decisión</strong> en cualquier momento antes de que se publiquen los resultados finales</li>
          <li>• Tu capacidad actual es <strong>{professorData.current_students}/{professorData.max_students}</strong> estudiantes</li>
        </ul>
      </div>
    </div>
  )
}