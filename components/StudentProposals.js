'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../utils/auth'

export default function StudentProposals({ onBackToDashboard }) {
  const { user, signOut } = useAuth()
  const [professors, setProfessors] = useState([])
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editingProfessor, setEditingProfessor] = useState('')
  const [profileComplete, setProfileComplete] = useState(false)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)
      setMessage('')

      // 1. Obtener datos del estudiante actual
      const { data: studentData } = await supabase
        .from('students')
        .select('id, cycle_id, name, university_id, project_description, project_image_url')
        .eq('email', user.email)
        .single()

      if (!studentData) {
        setMessage('No se encontraron datos del estudiante. Contacta al tutor.')
        return
      }

      // 2. ✅ CORREGIDO: Verificar que el perfil esté completo (SIN PDF)
      const isProfileComplete = studentData.university_id && 
                               studentData.project_description && 
                               studentData.project_description.length >= 20 &&
                               studentData.project_image_url // ✅ Solo requiere imagen (sin PDF)

      setProfileComplete(isProfileComplete)

      if (!isProfileComplete) {
        let missingItems = []
        if (!studentData.project_description || studentData.project_description.length < 20) {
          missingItems.push('descripción del proyecto')
        }
        if (!studentData.project_image_url) {
          missingItems.push('imagen del proyecto')
        }
        
        setMessage(`Tu perfil está incompleto. Falta: ${missingItems.join(', ')}. Completa tu perfil antes de hacer solicitudes.`)
        return
      }

      // 3. Obtener profesores del ciclo
      const { data: professorsData } = await supabase
        .from('professors')
        .select('*')
        .eq('cycle_id', studentData.cycle_id)
        .order('name')

      setProfessors(professorsData || [])

      // 4. Obtener solicitudes existentes - SIN AUTO-CREAR
      const { data: proposalsData } = await supabase
        .from('student_proposals')
        .select(`
          id,
          professor_id,
          proposal_order,
          status,
          created_at,
          professors!inner(name, email)
        `)
        .eq('student_id', studentData.id)
        .order('proposal_order')

      setProposals(proposalsData || [])

      // ✅ CORREGIDO: NO crear solicitudes automáticamente
      // Solo mostrar lo que ya existe en la base de datos

    } catch (error) {
      console.error('Error loading data:', error)
      setMessage('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getAvailableProfessors = (excludeCurrentId = null) => {
    const usedProfessorIds = proposals
      .filter(p => p.professor_id !== excludeCurrentId)
      .map(p => p.professor_id)
    
    return professors.filter(prof => !usedProfessorIds.includes(prof.id))
  }

  const handleCreateProposal = async (professorId) => {
    try {
      setSubmitting(true)

      // Obtener datos del estudiante
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!studentData) {
        setMessage('Error: No se encontraron datos del estudiante')
        return
      }

      // Determinar el siguiente orden disponible
      const existingOrders = proposals.map(p => p.proposal_order)
      const nextOrder = [1, 2, 3, 4, 5].find(order => !existingOrders.includes(order))

      if (!nextOrder) {
        setMessage('Ya tienes 5 solicitudes. No puedes agregar más.')
        return
      }

      // Crear nueva solicitud
      const { error } = await supabase
        .from('student_proposals')
        .insert([{
          student_id: studentData.id,
          professor_id: professorId,
          proposal_order: nextOrder,
          status: 'pending'
        }])

      if (error) throw error

      setMessage('Solicitud creada exitosamente')
      
      // Recargar datos
      setTimeout(() => {
        loadData()
        setMessage('')
      }, 2000)

    } catch (error) {
      console.error('Error creating proposal:', error)
      setMessage('Error al crear solicitud: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditProposal = async (proposalIndex, newProfessorId) => {
    try {
      setSubmitting(true)
      
      const proposal = proposals[proposalIndex]
      const selectedProfessor = professors.find(p => p.id === newProfessorId)
      
      if (!selectedProfessor) {
        setMessage('Profesor no válido')
        return
      }

      // Actualizar en base de datos
      const { error } = await supabase
        .from('student_proposals')
        .update({ professor_id: newProfessorId })
        .eq('id', proposal.id)

      if (error) throw error

      setMessage('Solicitud actualizada exitosamente')
      setEditingIndex(null)
      setEditingProfessor('')
      
      // Recargar datos
      setTimeout(() => {
        loadData()
        setMessage('')
      }, 2000)

    } catch (error) {
      console.error('Error updating proposal:', error)
      setMessage('Error al actualizar: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReorderProposal = async (proposalIndex, direction) => {
    try {
      setSubmitting(true)
      
      const currentProposal = proposals[proposalIndex]
      const newOrder = direction === 'up' ? currentProposal.proposal_order - 1 : currentProposal.proposal_order + 1
      
      // Encontrar la propuesta con la que intercambiar
      const targetProposal = proposals.find(p => p.proposal_order === newOrder)
      
      if (!targetProposal) {
        setMessage('No se puede mover en esa dirección')
        return
      }

      // Intercambiar órdenes en base de datos
      const { error1 } = await supabase
        .from('student_proposals')
        .update({ proposal_order: newOrder })
        .eq('id', currentProposal.id)

      const { error2 } = await supabase
        .from('student_proposals')
        .update({ proposal_order: currentProposal.proposal_order })
        .eq('id', targetProposal.id)

      if (error1 || error2) throw error1 || error2

      setMessage('Orden actualizado exitosamente')
      
      // Recargar datos
      setTimeout(() => {
        loadData()
        setMessage('')
      }, 2000)

    } catch (error) {
      console.error('Error reordering proposal:', error)
      setMessage('Error al reordenar: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProposal = async (proposalId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta solicitud?')) {
      return
    }

    try {
      setSubmitting(true)

      const { error } = await supabase
        .from('student_proposals')
        .delete()
        .eq('id', proposalId)

      if (error) throw error

      setMessage('Solicitud eliminada exitosamente')
      
      // Recargar datos
      setTimeout(() => {
        loadData()
        setMessage('')
      }, 2000)

    } catch (error) {
      console.error('Error deleting proposal:', error)
      setMessage('Error al eliminar: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="text-[#FFD400] text-xs font-medium px-3 py-1">Pendiente</span>
      case 'accepted':
        return <span className="text-[#32D74B] text-xs font-medium px-3 py-1">Aceptada</span>
      case 'rejected':
        return <span className="bg-white text-[#FF453A] text-xs font-medium px-3 py-1">Rechazada</span>
      default:
        return <span className="bg-white text-white text-xs font-medium px-3 py-1">Desconocido</span>
    }
  }

  const canEdit = (status) => status === 'pending'
  const canReplace = (status) => status === 'rejected'
  const canReorder = (status) => status === 'pending' || status === 'rejected'

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(0,113,248)] flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="text-white text-lg">Cargando solicitudes...</span>
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
              <h1 className="text-3xl font-bold text-white">Mis Solicitudes de Profesores</h1>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-white opacity-90">{user?.email}</span>
              <button
                onClick={async () => {
                  if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                    try {
                      await signOut()
                      window.location.reload()
                    } catch (error) {
                      console.error('Error al cerrar sesión:', error)
                      window.location.href = '/'
                    }
                  }
                }}
                className="bg-white text-black px-4 py-2 hover:bg-white transition-colors font-medium"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensaje */}
        {message && (
          <div className={`mb-6 p-4 border ${
            message.includes('exitosamente') ? 'border-[#32D74B] bg-[#32D74B]' : 
            message.includes('Error') || message.includes('eliminar') ? 'border-[#FF453A] bg-[#FF453A]' : 
            message.includes('incompleto') || message.includes('Falta') ? 'border-[#FFD400] bg-[#FFD400]' :
            'border-white bg-white'
          } bg-opacity-20 border-opacity-40`}>
            <div className="text-white font-medium">{message}</div>
          </div>
        )}

        {/* Verificación de perfil completo */}
        {!profileComplete && (
          <div className="mb-8 p-6 border border-[#FFD400] border-opacity-40 bg-[#FFD400] bg-opacity-20">
            <h3 className="text-white font-semibold text-xl mb-3">Perfil Incompleto</h3>
            <p className="text-white opacity-90 mb-4">
              Para hacer solicitudes necesitas completar tu perfil con:
            </p>
            <ul className="text-white opacity-80 space-y-2 mb-6">
              <li>• Descripción del proyecto (mínimo 20 caracteres)</li>
              <li>• Imagen representativa del proyecto</li>
            </ul>
            <button
              onClick={onBackToDashboard}
              className="bg-white text-black px-6 py-2 hover:bg-white transition-colors font-medium"
            >
              Completar Perfil
            </button>
          </div>
        )}

        {profileComplete && (
          <>
            {/* Descripción */}
            <div className="mb-8">
              <p className="text-white opacity-80">Gestiona tus solicitudes de profesores lectores</p>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="border border-white border-opacity-10 p-6">
                <div className="text-sm font-medium text-white opacity-70 mb-2">Total Solicitudes</div>
                <div className="text-3xl font-bold text-white">{proposals.length}/5</div>
              </div>
              <div className="border border-white border-opacity-10 p-6">
                <div className="text-sm font-medium text-white opacity-70 mb-2">Pendientes</div>
                <div className="text-3xl font-bold text-[#FFD400]">
                  {proposals.filter(p => p.status === 'pending').length}
                </div>
              </div>
              <div className="border border-white border-opacity-10 p-6">
                <div className="text-sm font-medium text-white opacity-70 mb-2">Aceptadas</div>
                <div className="text-3xl font-bold text-[#32D74B]">
                  {proposals.filter(p => p.status === 'accepted').length}
                </div>
              </div>
              <div className="border border-white border-opacity-10 p-6">
                <div className="text-sm font-medium text-white opacity-70 mb-2">Rechazadas</div>
                <div className="text-3xl font-bold text-[#FF453A]">
                  {proposals.filter(p => p.status === 'rejected').length}
                </div>
              </div>
            </div>

            {/* Lista de Solicitudes */}
            <div className="border border-white border-opacity-10 mb-8">
              <div className="px-6 py-4 border-b border-white border-opacity-10">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Tus Solicitudes</h2>
                    <p className="text-white opacity-70 text-sm mt-1">Puedes editar solicitudes pendientes y reemplazar rechazadas</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white divide-opacity-10">
                {proposals.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <h3 className="text-xl font-semibold text-white mb-3">No tienes solicitudes</h3>
                    <p className="text-white opacity-70 mb-6">Crea tus solicitudes de profesores manualmente</p>
                    
                    {/* ✅ CORREGIDO: Solo mostrar profesores disponibles para crear solicitudes individuales */}
                    {getAvailableProfessors().length > 0 && (
                      <div className="max-w-2xl mx-auto">
                        <h4 className="text-lg font-medium text-white mb-4">Profesores Disponibles:</h4>
                        <div className="space-y-3">
                          {getAvailableProfessors().slice(0, 5).map(professor => (
                            <div key={professor.id} className="flex justify-between items-center p-4 border border-white border-opacity-20 bg-white bg-opacity-5">
                              <div className="text-left">
                                <div className="text-white font-medium">{professor.name}</div>
                                <div className="text-white opacity-60 text-sm">{professor.email}</div>
                              </div>
                              <button
                                onClick={() => handleCreateProposal(professor.id)}
                                disabled={submitting}
                                className="bg-white text-black px-4 py-2 hover:bg-white transition-colors font-medium disabled:opacity-50"
                              >
                                + Solicitar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  proposals.map((proposal, index) => (
                    <div key={proposal.id} className="px-6 py-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          {/* Orden de Prioridad */}
                          <div className="flex flex-col items-center">
                            <div className="text-2xl font-bold text-white">#{proposal.proposal_order}</div>
                            {canReorder(proposal.status) && (
                              <div className="flex flex-col space-y-1 mt-2">
                                {proposal.proposal_order > 1 && (
                                  <button
                                    onClick={() => handleReorderProposal(index, 'up')}
                                    disabled={submitting}
                                    className="text-xs border border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-10 px-2 py-1 disabled:opacity-50 transition-colors"
                                  >
                                    ↑
                                  </button>
                                )}
                                {proposal.proposal_order < 5 && (
                                  <button
                                    onClick={() => handleReorderProposal(index, 'down')}
                                    disabled={submitting}
                                    className="text-xs border border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-10 px-2 py-1 disabled:opacity-50 transition-colors"
                                  >
                                    ↓
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Información del Profesor */}
                          <div className="flex-1">
                            {editingIndex === index ? (
                              <div className="flex items-center space-x-3">
                                <select
                                  value={editingProfessor}
                                  onChange={(e) => setEditingProfessor(e.target.value)}
                                  className="bg-transparent border border-white border-opacity-30 text-white px-3 py-2 focus:outline-none focus:border-white focus:border-opacity-100 min-w-64"
                                >
                                  <option value="" className="bg-white text-white">Seleccionar profesor...</option>
                                  <option value={proposal.professor_id} className="bg-white text-white">{proposal.professors.name} (actual)</option>
                                  {getAvailableProfessors(proposal.professor_id).map(prof => (
                                    <option key={prof.id} value={prof.id} className="bg-white text-white">
                                      {prof.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleEditProposal(index, editingProfessor)}
                                  disabled={!editingProfessor || submitting}
                                  className="bg-[#32D74B] text-white px-4 py-2 hover:bg-[#32D74B] transition-colors font-medium disabled:opacity-50"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingIndex(null)
                                    setEditingProfessor('')
                                  }}
                                  className="border border-white border-opacity-30 text-white px-4 py-2 hover:bg-white hover:bg-opacity-10 transition-colors font-medium"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="text-white font-medium text-lg">
                                  {proposal.professors.name}
                                </div>
                                <div className="text-white opacity-70">
                                  {proposal.professors.email}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Estado */}
                          <div className="text-center">
                            {getStatusBadge(proposal.status)}
                          </div>

                          {/* Acciones */}
                          <div className="flex space-x-2">
                            {editingIndex !== index && (
                              <>
                                {canEdit(proposal.status) && (
                                  <button
                                    onClick={() => {
                                      setEditingIndex(index)
                                      setEditingProfessor(proposal.professor_id)
                                    }}
                                    disabled={submitting}
                                    className="border border-white border-opacity-30 text-white px-3 py-2 hover:bg-white hover:bg-opacity-10 transition-colors font-medium disabled:opacity-50"
                                  >
                                    Editar
                                  </button>
                                )}
                                {canReplace(proposal.status) && (
                                  <button
                                    onClick={() => {
                                      setEditingIndex(index)
                                      setEditingProfessor('')
                                    }}
                                    disabled={submitting}
                                    className="text-white px-2 py-1 hover:bg-[#FF453A] transition-colors font-medium disabled:opacity-50"
                                  >
                                    Reemplazar
                                  </button>
                                )}
                                {proposal.status === 'pending' && (
                                  <button
                                    onClick={() => handleDeleteProposal(proposal.id)}
                                    disabled={submitting}
                                    className="bg-[#FF453A] text-white px-3 py-2 hover:bg-[#FF453A] transition-colors font-medium disabled:opacity-50"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Agregar más solicitudes */}
            {proposals.length > 0 && proposals.length < 5 && getAvailableProfessors().length > 0 && (
              <div className="border border-white border-opacity-10 p-6 mb-8">
                <h3 className="text-xl font-semibold text-white mb-4">Agregar Más Solicitudes</h3>
                <p className="text-white opacity-80 mb-6">
                  Tienes {proposals.length}/5 solicitudes. Puedes agregar más profesores:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getAvailableProfessors().map(professor => (
                    <div key={professor.id} className="flex justify-between items-center p-4 border border-white border-opacity-20">
                      <div className="text-left">
                        <div className="text-white font-medium">{professor.name}</div>
                        <div className="text-white opacity-60 text-sm">{professor.email}</div>
                      </div>
                      <button
                        onClick={() => handleCreateProposal(professor.id)}
                        disabled={submitting}
                        className="bg-white text-black px-4 py-2 hover:bg-white transition-colors font-medium disabled:opacity-50"
                      >
                        + Solicitar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instrucciones actualizadas */}
            <div className="border border-white border-opacity-10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Instrucciones:</h3>
              <ul className="text-white opacity-80 space-y-2 text-sm">
                <li>• <span className="font-medium">Pendiente</span>: Puedes editar el profesor y cambiar el orden de prioridad</li>
                <li>• <span className="font-medium">Aceptada</span>: No se puede modificar (ya confirmada por el profesor)</li>
                <li>• <span className="font-medium">Rechazada</span>: Puedes reemplazar con otro profesor disponible</li>
                <li>• Usa los botones ↑↓ para cambiar el orden de prioridad (1 = más importante)</li>
                <li>• <span className="font-medium">Perfil completo requerido</span>: descripción del proyecto + imagen (sin PDF)</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}