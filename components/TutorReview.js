'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../utils/auth'

export default function TutorReview({ onBackToDashboard }) {
  const { user, signOut } = useAuth()
  const [students, setStudents] = useState([])
  const [professors, setProfessors] = useState([])
  const [assignments, setAssignments] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // 1. Obtener ciclo activo
      const { data: cycles } = await supabase
        .from('cycles')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!cycles || cycles.length === 0) {
        setMessage('No hay ciclo activo')
        return
      }

      const cycleId = cycles[0].id

      // 2. Obtener estudiantes del ciclo
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('name')

      // 3. Obtener profesores del ciclo
      const { data: professorsData } = await supabase
        .from('professors')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('name')

      // 4. Obtener asignaciones finales existentes (FUENTE PRINCIPAL)
      const { data: existingAssignments } = await supabase
        .from('assignments')
        .select(`
          student_id,
          professor_id,
          assigned_by_tutor,
          students!inner(name, id),
          professors!inner(name, id)
        `)

      // 5. Obtener TODAS las solicitudes aceptadas (filtraremos después)
      const { data: allAcceptedProposals } = await supabase
        .from('student_proposals')
        .select(`
          student_id,
          professor_id,
          students!inner(name, id),
          professors!inner(name, id)
        `)
        .eq('status', 'accepted')

      setStudents(studentsData || [])
      setProfessors(professorsData || [])

      // Organizar asignaciones por estudiante
      const assignmentsByStudent = {}
      
      studentsData?.forEach(student => {
        assignmentsByStudent[student.id] = {
          student: student,
          professors: [],
          status: '0/3'
        }
      })

      // PRIMERO: Agregar asignaciones finales (tienen prioridad total)
      const studentsWithFinalAssignments = new Set()
      existingAssignments?.forEach(assignment => {
        const studentId = assignment.student_id
        studentsWithFinalAssignments.add(studentId)
        if (assignmentsByStudent[studentId]) {
          assignmentsByStudent[studentId].professors.push({
            id: assignment.professor_id,
            name: assignment.professors.name,
            source: assignment.assigned_by_tutor ? 'tutor' : 'accepted'
          })
        }
      })

      // SEGUNDO: Solo para estudiantes SIN asignaciones finales, agregar solicitudes aceptadas
      allAcceptedProposals?.forEach(proposal => {
        const studentId = proposal.student_id
        // Solo agregar si el estudiante NO tiene asignaciones finales
        if (assignmentsByStudent[studentId] && !studentsWithFinalAssignments.has(studentId)) {
          assignmentsByStudent[studentId].professors.push({
            id: proposal.professor_id,
            name: proposal.professors.name,
            source: 'accepted'
          })
        }
      })

      // Calcular estado y limitar a 3 profesores
      Object.keys(assignmentsByStudent).forEach(studentId => {
        const count = assignmentsByStudent[studentId].professors.length
        assignmentsByStudent[studentId].status = `${Math.min(count, 3)}/3`
        
        // Limitar a 3 profesores máximo
        if (count > 3) {
          assignmentsByStudent[studentId].professors = assignmentsByStudent[studentId].professors.slice(0, 3)
        }
      })

      setAssignments(assignmentsByStudent)

    } catch (error) {
      console.error('Error loading data:', error)
      setMessage('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleProfessorChange = (studentId, professorIndex, professorId) => {
    setAssignments(prev => {
      const updated = { ...prev }
      const selectedProfessor = professors.find(p => p.id === professorId)
      
      if (!selectedProfessor) return prev

      // Asegurar que el array de profesores tenga 3 elementos
      while (updated[studentId].professors.length < 3) {
        updated[studentId].professors.push({ id: null, name: '', source: 'tutor' })
      }

      updated[studentId].professors[professorIndex] = {
        id: professorId,
        name: selectedProfessor.name,
        source: 'tutor'
      }

      // Recalcular estado
      const count = updated[studentId].professors.filter(p => p.id).length
      updated[studentId].status = `${count}/3`

      return updated
    })
  }

  const removeProfessor = (studentId, professorIndex) => {
    setAssignments(prev => {
      const updated = { ...prev }
      updated[studentId].professors[professorIndex] = { id: null, name: '', source: 'tutor' }
      
      // Recalcular estado
      const count = updated[studentId].professors.filter(p => p.id).length
      updated[studentId].status = `${count}/3`

      return updated
    })
  }

  const saveAssignments = async () => {
    try {
      setSaving(true)
      setMessage('')

      // Preparar datos para guardar
      const assignmentsToSave = []
      
      Object.keys(assignments).forEach(studentId => {
        assignments[studentId].professors.forEach(prof => {
          if (prof.id) {
            assignmentsToSave.push({
              student_id: studentId,
              professor_id: prof.id,
              assigned_by_tutor: prof.source === 'tutor'
            })
          }
        })
      })

      // Eliminar asignaciones existentes
      const studentIds = Object.keys(assignments)
      await supabase
        .from('assignments')
        .delete()
        .in('student_id', studentIds)

      // Insertar nuevas asignaciones
      if (assignmentsToSave.length > 0) {
        const { error } = await supabase
          .from('assignments')
          .insert(assignmentsToSave)

        if (error) throw error
      }

      setMessage('Asignaciones guardadas exitosamente')
      
      // Recargar datos para mostrar cambios
      setTimeout(() => {
        loadData()
        setMessage('')
      }, 2000)

    } catch (error) {
      console.error('Error saving assignments:', error)
      setMessage('Error al guardar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const getAvailableProfessors = (studentId, professorIndex) => {
    // Profesores ya asignados a este estudiante (excluyendo el índice actual)
    const assignedIds = assignments[studentId]?.professors
      .map((p, idx) => idx !== professorIndex ? p.id : null)
      .filter(id => id) || []

    // Filtrar profesores disponibles
    return professors.filter(prof => !assignedIds.includes(prof.id))
  }

  const getStatusColor = (status) => {
    switch (status) {
      case '3/3': return 'text-[#32D74B] font-semibold'
      case '2/3': return 'text-[#FFD400] font-semibold'
      case '1/3': return 'text-[#FFD400] font-semibold'
      default: return 'text-[#FF453A] font-semibold'
    }
  }

  const getSourceBadge = (source) => {
    switch (source) {
      case 'accepted':
        return <span className="text-xs bg-[#32D74B] text-white px-2 py-1">Aceptado</span>
      case 'tutor':
        return <span className="text-xs bg-white text-black px-2 py-1">Tutor</span>
      default:
        return null
    }
  }

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      try {
        await signOut()
        window.location.reload()
      } catch (error) {
        console.error('Error al cerrar sesión:', error)
        window.location.href = '/'
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(0,113,248)] flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <span className="text-white text-lg">Cargando datos de revisión...</span>
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
            <div className="flex items-center space-x-4">
              <button
                onClick={onBackToDashboard}
                className="text-white opacity-90 hover:opacity-100 font-medium transition-opacity"
              >
                ← Volver al Dashboard
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">Revisión de Asignaciones</h1>
                <p className="text-white opacity-70 text-sm mt-1">Revisar y ajustar asignaciones de profesores lectores</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-white opacity-90 text-sm">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="bg-white text-black px-4 py-2 hover:bg-white transition-colors font-medium"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Mensaje */}
        {message && (
          <div className={`mb-6 p-4 border ${
            message.includes('exitosamente') ? 'border-[#32D74B] bg-[#32D74B] bg-opacity-20 text-[#32D74B]' : 
            message.includes('Error') ? 'border-[#FF453A] bg-[#FF453A] bg-opacity-20 text-[#FF453A]' : 
            'border-white bg-white bg-opacity-20 text-white'
          }`}>
            {message}
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="border border-white border-opacity-10 p-6">
            <div className="text-sm font-medium text-white opacity-70">Total Estudiantes</div>
            <div className="text-3xl font-bold text-white mt-2">{students.length}</div>
          </div>
          <div className="border border-white border-opacity-10 p-6">
            <div className="text-sm font-medium text-white opacity-70">Estudiantes Completos</div>
            <div className="text-3xl font-bold text-[#32D74B] mt-2">
              {Object.values(assignments).filter(a => a.status === '3/3').length}
            </div>
          </div>
          <div className="border border-white border-opacity-10 p-6">
            <div className="text-sm font-medium text-white opacity-70">Estudiantes Incompletos</div>
            <div className="text-3xl font-bold text-[#FFD400] mt-2">
              {Object.values(assignments).filter(a => a.status !== '3/3').length}
            </div>
          </div>
          <div className="border border-white border-opacity-10 p-6">
            <div className="text-sm font-medium text-white opacity-70">Profesores Disponibles</div>
            <div className="text-3xl font-bold text-white mt-2">{professors.length}</div>
          </div>
        </div>

        {/* Tabla de Asignaciones */}
        <div className="border border-white border-opacity-10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white border-opacity-10">
            <h2 className="text-xl font-semibold text-white">Tabla de Asignaciones</h2>
            <p className="text-sm text-white opacity-70 mt-1">Cada estudiante debe tener exactamente 3 profesores asignados</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white divide-opacity-10">
              <thead className="border-b border-white border-opacity-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                    Estudiante
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                    Profesor 1
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                    Profesor 2
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                    Profesor 3
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white divide-opacity-10">
                {Object.keys(assignments).map(studentId => {
                  const assignment = assignments[studentId]
                  const student = assignment.student
                  
                  // Asegurar que tenga 3 espacios para profesores
                  while (assignment.professors.length < 3) {
                    assignment.professors.push({ id: null, name: '', source: 'tutor' })
                  }

                  return (
                    <tr key={studentId} className="hover:bg-opacity-5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{student.name}</div>
                        <div className="text-sm text-white opacity-60">{student.student_id}</div>
                      </td>
                      
                      {[0, 1, 2].map(index => (
                        <td key={index} className="px-6 py-4 whitespace-nowrap">
                          {assignment.professors[index]?.id ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-white">
                                  {assignment.professors[index].name}
                                </span>
                                <button
                                  onClick={() => removeProfessor(studentId, index)}
                                  className="text-[#FFD400] hover:text-[#FF453A] text-semibold ml-4 transition-colors"
                                >
                                  ×
                                </button>
                              </div>
                              {getSourceBadge(assignment.professors[index].source)}
                            </div>
                          ) : (
                            <select
                              value=""
                              onChange={(e) => handleProfessorChange(studentId, index, e.target.value)}
                              className="text-sm bg-transparent border border-white border-opacity-30 text-white px-3 py-2 w-full focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                            >
                              <option value="" className="bg-[rgb(0,113,248)] text-white">Seleccionar profesor...</option>
                              {getAvailableProfessors(studentId, index).map(prof => (
                                <option key={prof.id} value={prof.id} className="bg-[rgb(0,113,248)] text-white">
                                  {prof.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      ))}
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={loadData}
            disabled={loading}
            className="border border-white border-opacity-30 text-white px-6 py-3 hover:bg-white hover:bg-opacity-10 disabled:opacity-50 transition-colors font-medium"
          >
            Recargar Datos
          </button>
          <button
            onClick={saveAssignments}
            disabled={saving}
            className="bg-white text-black px-6 py-3 hover:bg-white disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? 'Guardando...' : 'Guardar Asignaciones'}
          </button>
        </div>

        {/* Instrucciones */}
        <div className="mt-8 border border-white border-opacity-20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Instrucciones</h3>
          <div className="space-y-2 text-sm text-white opacity-80">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-[#32D74B] text-white px-2 py-1">Aceptado</span>
              <span>Solicitud aceptada por el profesor</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-white text-black px-2 py-1">Tutor</span>
              <span>Asignación manual del tutor</span>
            </div>
            <div className="mt-4 space-y-1 text-white opacity-70">
              <p>• Usa los dropdowns para completar estudiantes con menos de 3 profesores</p>
              <p>• Puedes reasignar cualquier profesor usando el botón "×" y seleccionando otro</p>
              <p>• Guarda los cambios para actualizar las asignaciones finales</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}