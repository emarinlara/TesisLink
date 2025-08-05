// components/ViewStudents.js
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export default function ViewStudents() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    withProposals: 0,
    withoutProposals: 0,
    completedProfiles: 0
  })

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      setLoading(true)

      // Cargar estudiantes con información de sus solicitudes
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          *,
          student_proposals (
            id,
            professor_id,
            proposal_order,
            status,
            professors (
              name
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (studentsError) throw studentsError

      setStudents(studentsData || [])

      // Calcular estadísticas
      const totalStudents = studentsData?.length || 0
      const withProposals = studentsData?.filter(s => s.student_proposals && s.student_proposals.length > 0).length || 0
      const withoutProposals = totalStudents - withProposals
      const completedProfiles = studentsData?.filter(s => 
        s.name && s.student_id && s.project_description
      ).length || 0

      setStats({
        totalStudents,
        withProposals,
        withoutProposals,
        completedProfiles
      })

    } catch (error) {
      console.error('Error cargando estudiantes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProfileCompleteness = (student) => {
    const fields = [
      student.name,
      student.student_id,
      student.project_description
    ]
    const completed = fields.filter(field => field && field.trim()).length
    return Math.round((completed / fields.length) * 100)
  }

  const getProposalsCount = (student) => {
    return student.student_proposals?.length || 0
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-8">
          <div className="text-white">🔄 Cargando estudiantes...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">
              🎓 Estudiantes Autoregistrados
            </h2>
            <p className="text-white mt-1">
              Vista de estudiantes que se han registrado en el sistema
            </p>
          </div>
          <button
            onClick={loadStudents}
            className="bg-white hover:bg-white text-white px-4 py-2 rounded-lg"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Información del nuevo sistema */}
      <div className="bg-[#32D74B] border border-[#32D74B] rounded-lg p-4">
        <h3 className="font-semibold text-[#32D74B] mb-2">✅ Sistema Automático Funcionando</h3>
        <div className="text-[#32D74B] text-sm space-y-1">
          <p>• <strong>Los estudiantes se registran</strong> de forma autónoma</p>
          <p>• <strong>Ingresan su carnet universitario</strong> como identificador único</p>
          <p>• <strong>Completan su perfil</strong> y hacen solicitudes de profesores</p>
          <p>• <strong>No requiere intervención</strong> del tutor para gestión de estudiantes</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-white">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.totalStudents}</div>
            <div className="text-sm text-white">Total Estudiantes</div>
          </div>
        </div>
        <div className="bg-[#32D74B] p-4 rounded-lg border border-[#32D74B]">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#32D74B]">{stats.completedProfiles}</div>
            <div className="text-sm text-[#32D74B]">Perfiles Completos</div>
          </div>
        </div>
        <div className="bg-[#FFD400] p-4 rounded-lg border border-[#FFD400]">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#FFD400]">{stats.withProposals}</div>
            <div className="text-sm text-[#FFD400]">Con Solicitudes</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-white">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.withoutProposals}</div>
            <div className="text-sm text-white">Sin Solicitudes</div>
          </div>
        </div>
      </div>

      {/* Lista de estudiantes */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">📋 Lista de Estudiantes Registrados</h3>
        </div>

        {students.length === 0 ? (
          <div className="p-8 text-center text-white">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-lg font-semibold mb-2">No hay estudiantes registrados</h3>
            <p>Los estudiantes aparecerán aquí cuando se registren en el sistema</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {students.map((student) => (
              <div key={student.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Info del estudiante */}
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="text-lg font-semibold text-white">
                        {student.name || 'Sin nombre'}
                      </h4>
                      <span className="px-2 py-1 rounded-full text-xs bg-white text-white">
                        Carnet: {student.student_id || 'Sin carnet'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        getProfileCompleteness(student) === 100 
                          ? 'bg-[#32D74B] text-[#32D74B]' 
                          : 'bg-[#FFD400] text-[#FFD400]'
                      }`}>
                        Perfil: {getProfileCompleteness(student)}%
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        getProposalsCount(student) === 5 
                          ? 'bg-[#32D74B] text-[#32D74B]' 
                          : getProposalsCount(student) > 0
                          ? 'bg-[#FFD400] text-[#FFD400]'
                          : 'bg-[#FF453A] text-[#FF453A]'
                      }`}>
                        Solicitudes: {getProposalsCount(student)}/5
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-white">
                          <strong>Email:</strong> {student.email}
                        </p>
                        <p className="text-sm text-white">
                          <strong>Registrado:</strong> {formatDate(student.created_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-white">
                          <strong>Última actualización:</strong> {formatDate(student.updated_at || student.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Descripción del proyecto */}
                    <div className="mb-4">
                      <h5 className="font-medium text-white mb-2">📝 Descripción del proyecto:</h5>
                      <div className="bg-white p-3 rounded border text-sm text-white">
                        {student.project_description || 'Sin descripción del proyecto'}
                      </div>
                    </div>

                    {/* Solicitudes de profesores */}
                    {student.student_proposals && student.student_proposals.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-white mb-2">🎯 Solicitudes de profesores:</h5>
                        <div className="bg-white p-3 rounded border">
                          <div className="space-y-1">
                            {student.student_proposals
                              .sort((a, b) => a.proposal_order - b.proposal_order)
                              .map((proposal) => (
                                <div key={proposal.id} className="text-sm flex justify-between">
                                  <span>
                                    {proposal.proposal_order}ª opción: {proposal.professors?.name || 'Profesor eliminado'}
                                  </span>
                                  <span className={`px-1 rounded text-xs ${
                                    proposal.status === 'pending' ? 'bg-[#FFD400] text-[#FFD400]' :
                                    proposal.status === 'accepted' ? 'bg-[#32D74B] text-[#32D74B]' :
                                    'bg-[#FF453A] text-[#FF453A]'
                                  }`}>
                                    {proposal.status === 'pending' ? 'Pendiente' :
                                     proposal.status === 'accepted' ? 'Aceptada' : 'Rechazada'}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Estado visual */}
                  <div className="ml-6 text-center">
                    <div className={`w-4 h-4 rounded-full ${
                      getProfileCompleteness(student) === 100 && getProposalsCount(student) === 5
                        ? 'bg-[#32D74B]' 
                        : getProfileCompleteness(student) > 50
                        ? 'bg-[#FFD400]'
                        : 'bg-[#FF453A]'
                    }`}></div>
                    <div className="text-xs text-white mt-1">
                      {getProfileCompleteness(student) === 100 && getProposalsCount(student) === 5
                        ? 'Completo' 
                        : 'En progreso'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="bg-white border border-white rounded-lg p-4">
        <h3 className="font-semibold text-white mb-2">ℹ️ Información para el tutor:</h3>
        <ul className="text-white text-sm space-y-1">
          <li>• <strong>Vista de solo lectura:</strong> Los estudiantes gestionan sus propios datos</li>
          <li>• <strong>Perfil completo:</strong> Nombre, carnet y descripción del proyecto completados</li>
          <li>• <strong>Solicitudes completas:</strong> 5 profesores solicitados en orden de prioridad</li>
          <li>• <strong>Estados automáticos:</strong> El sistema actualiza los estados en tiempo real</li>
        </ul>
      </div>
    </div>
  )
}