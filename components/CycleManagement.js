'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../utils/auth'

export default function CycleManagement({ onBackToDashboard, onLogout }) {
  const { user } = useAuth()
  const [cycles, setCycles] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingCycle, setEditingCycle] = useState(null)
  const [formData, setFormData] = useState({
    name: ''
  })
  const [loading, setLoading] = useState(false)
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [migrationStats, setMigrationStats] = useState({})

  useEffect(() => {
    loadCycles()
  }, [])

  const loadCycles = async () => {
    try {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCycles(data || [])
    } catch (error) {
      console.error('Error cargando ciclos:', error)
      alert('Error cargando ciclos: ' + error.message)
    }
  }

  const getMigrationStats = async () => {
    try {
      // Contar estudiantes que se eliminarán
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

      // Contar solicitudes que se eliminarán
      const { count: proposalCount } = await supabase
        .from('student_proposals')
        .select('*', { count: 'exact', head: true })

      // Contar asignaciones que se eliminarán
      const { count: assignmentCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })

      // Contar profesores que se migrarán
      const { count: professorCount } = await supabase
        .from('professors')
        .select('*', { count: 'exact', head: true })

      return {
        students: studentCount || 0,
        proposals: proposalCount || 0,
        assignments: assignmentCount || 0,
        professors: professorCount || 0
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error)
      return { students: 0, proposals: 0, assignments: 0, professors: 0 }
    }
  }

  const handleCreateCycle = async () => {
    if (!formData.name.trim()) {
      alert('El nombre del ciclo es obligatorio')
      return
    }

    // Mostrar modal de confirmación con estadísticas
    const stats = await getMigrationStats()
    setMigrationStats(stats)
    setShowMigrationModal(true)
  }

  const confirmMigration = async () => {
    setLoading(true)
    setShowMigrationModal(false)

    try {
      // 1. Crear nuevo ciclo
      const { data: newCycle, error: cycleError } = await supabase
        .from('cycles')
        .insert([{
          name: formData.name.trim(),
          status: 'setup'
        }])
        .select()
        .single()

      if (cycleError) throw cycleError

      // 2. Migrar profesores al nuevo ciclo
      const { error: migrateError } = await supabase
        .from('professors')
        .update({ 
          cycle_id: newCycle.id,
          current_students: 0
        })
        .neq('id', '00000000-0000-0000-0000-000000000000') // Migrar todos

      if (migrateError) throw migrateError

      // 3. Eliminar estudiantes (CASCADE eliminará solicitudes y asignaciones)
      const { error: deleteStudentsError } = await supabase
        .from('students')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Eliminar todos

      if (deleteStudentsError) throw deleteStudentsError

      // 4. Eliminar solicitudes restantes
      const { error: deleteProposalsError } = await supabase
        .from('student_proposals')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (deleteProposalsError) console.warn('Error eliminando solicitudes:', deleteProposalsError)

      // 5. Eliminar asignaciones restantes
      const { error: deleteAssignmentsError } = await supabase
        .from('assignments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (deleteAssignmentsError) console.warn('Error eliminando asignaciones:', deleteAssignmentsError)

      // 6. Eliminar ciclos antiguos
      const { error: deleteOldCyclesError } = await supabase
        .from('cycles')
        .delete()
        .neq('id', newCycle.id)

      if (deleteOldCyclesError) console.warn('Error eliminando ciclos antiguos:', deleteOldCyclesError)

      // Recargar datos
      await loadCycles()
      
      // Reset form
      setFormData({ name: '' })
      setShowForm(false)
      setEditingCycle(null)
      
      alert(`Ciclo "${formData.name}" creado exitosamente.\n\n` +
            `${migrationStats.professors} profesores migrados\n` +
            `${migrationStats.students} estudiantes eliminados\n` +
            `${migrationStats.proposals} solicitudes eliminadas\n` +
            `${migrationStats.assignments} asignaciones eliminadas`)

    } catch (error) {
      console.error('Error creando ciclo:', error)
      alert('Error creando ciclo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (cycle) => {
    setEditingCycle(cycle)
    setFormData({
      name: cycle.name || ''
    })
    setShowForm(true)
  }

  const handleUpdateCycle = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('cycles')
        .update({
          name: formData.name.trim()
        })
        .eq('id', editingCycle.id)

      if (error) throw error

      await loadCycles()
      
      setFormData({ name: '' })
      setShowForm(false)
      setEditingCycle(null)
      
      alert('Ciclo actualizado exitosamente')
    } catch (error) {
      console.error('Error actualizando ciclo:', error)
      alert('Error actualizando ciclo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (cycleId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este ciclo? Esta acción eliminará TODOS los datos asociados.')) {
      try {
        const { error } = await supabase
          .from('cycles')
          .delete()
          .eq('id', cycleId)

        if (error) throw error

        await loadCycles()
        alert('Ciclo eliminado exitosamente')
      } catch (error) {
        console.error('Error eliminando ciclo:', error)
        alert('Error eliminando ciclo: ' + error.message)
      }
    }
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingCycle(null)
    setFormData({ name: '' })
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
                className="text-white opacity-90 hover:opacity-100 font-medium"
              >
                ← Volver al Dashboard
              </button>
              <h1 className="text-3xl font-bold text-white">Gestión de Ciclo Académico</h1>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-white opacity-90">{user?.email}</span>
              <button
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                    onLogout()
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
        
        {/* Información importante */}
        <div className="mb-8 border border-white border-opacity-10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Sistema de Ciclo Único</h3>
          <ul className="text-white opacity-80 space-y-2">
            <li>• Solo puede existir 1 ciclo activo a la vez</li>
            <li>• Al crear un nuevo ciclo se elimina automáticamente el anterior</li>
            <li>• Los profesores se migran automáticamente al nuevo ciclo</li>
            <li>• Todos los estudiantes y sus datos se eliminan completamente</li>
          </ul>
        </div>

        {/* Botón para crear/editar */}
        <div className="mb-8">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-white text-black px-6 py-3 hover:bg-white font-medium transition-colors"
          >
            {showForm ? 'Ver Ciclo Actual' : 'Crear Nuevo Ciclo'}
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="border border-white border-opacity-10 p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-6">
              {editingCycle ? 'Editar Ciclo' : 'Crear Nuevo Ciclo'}
            </h2>
            
            <form onSubmit={editingCycle ? handleUpdateCycle : (e) => { e.preventDefault(); handleCreateCycle(); }} className="space-y-6">
              <div>
                <label className="block text-white text-sm font-medium mb-3">
                  Nombre del Ciclo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border border-white border-opacity-30 text-white bg-transparent placeholder-white placeholder-opacity-50 focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                  placeholder="Ej: Ciclo 2025-1"
                />
                <p className="text-white opacity-60 text-xs mt-2">
                  Ejemplo: "Ciclo 2025-1", "Primer Ciclo 2025", "2025-I"
                </p>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-white text-black px-6 py-3 hover:bg-white disabled:opacity-50 font-medium transition-colors"
                >
                  {loading ? 'Procesando...' : (editingCycle ? 'Actualizar Ciclo' : 'Crear Nuevo Ciclo')}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="border border-white border-opacity-30 text-white px-6 py-3 hover:bg-white hover:bg-opacity-10 font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Ciclos */}
        <div className="border border-white border-opacity-10">
          <div className="px-6 py-4 border-b border-white border-opacity-10">
            <h2 className="text-xl font-semibold text-white">
              Ciclo Académico Actual
            </h2>
          </div>
          
          <div className="p-6">
            {cycles.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-white mb-2">No hay ciclos académicos</h3>
                <p className="text-white opacity-70 mb-6">Crea el primer ciclo para comenzar</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-white text-black px-6 py-3 hover:bg-white font-medium transition-colors"
                >
                  Crear Primer Ciclo
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cycles.map((cycle) => (
                  <div key={cycle.id} className="border border-white border-opacity-10 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{cycle.name}</h3>
                        <p className="text-white opacity-70 text-sm">
                          Creado: {new Date(cycle.created_at).toLocaleDateString('es-ES')}
                        </p>
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-[#32D74B] text-white mt-2">
                          Ciclo Activo
                        </span>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEdit(cycle)}
                          className="bg-white text-black px-3 py-2 hover:bg-white text-sm font-medium transition-colors"
                        >
                          Editar Nombre
                        </button>
                        <button
                          onClick={() => handleDelete(cycle.id)}
                          className="border border-white border-opacity-30 text-white px-3 py-2 hover:bg-white hover:bg-opacity-10 text-sm font-medium transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Migración */}
      {showMigrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Confirmar Creación de Nuevo Ciclo
            </h3>
            
            <div className="mb-6 p-4 bg-[#FFD400] border border-[#FFD400]">
              <p className="text-sm text-[#FFD400] mb-3">
                <strong>Nombre del nuevo ciclo:</strong> "{formData.name}"
              </p>
              <p className="text-sm text-[#FFD400] mb-2">
                <strong>Esto eliminará permanentemente:</strong>
              </p>
              <ul className="text-sm text-[#FFD400] space-y-1">
                <li>• {migrationStats.students} estudiante(s) y sus perfiles</li>
                <li>• {migrationStats.proposals} solicitud(es) de profesores</li>
                <li>• {migrationStats.assignments} asignación(es) finales</li>
                <li>• Todos los ciclos anteriores</li>
              </ul>
              <p className="text-sm text-[#32D74B] mt-3">
                <strong>Se mantendrán:</strong>
              </p>
              <ul className="text-sm text-[#32D74B]">
                <li>• {migrationStats.professors} profesor(es) (migrarán al nuevo ciclo)</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowMigrationModal(false)}
                className="px-4 py-2 text-white border border-white hover:bg-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmMigration}
                disabled={loading}
                className="px-4 py-2 bg-[#FF453A] text-white hover:bg-[#FF453A] disabled:bg-white transition-colors"
              >
                {loading ? 'Procesando...' : 'Confirmar y Crear Ciclo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}