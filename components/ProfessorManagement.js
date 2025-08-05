'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../utils/auth'

export default function ProfessorManagement({ onBackToDashboard, onLogout }) {
  const { user } = useAuth()
  const [professors, setProfessors] = useState([])
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedCycle, setSelectedCycle] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })
  const [bulkData, setBulkData] = useState('')
  const [showCredentials, setShowCredentials] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Cargar ciclos
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('cycles')
        .select('*')
        .order('created_at', { ascending: false })

      if (cyclesError) throw cyclesError
      setCycles(cyclesData || [])

      // Seleccionar primer ciclo por defecto
      if (cyclesData && cyclesData.length > 0) {
        setSelectedCycle(cyclesData[0].id)
      }

      // Cargar profesores
      const { data: professorsData, error: professorsError } = await supabase
        .from('professors')
        .select(`
          *,
          cycles:cycle_id (name)
        `)
        .order('created_at', { ascending: false })

      if (professorsError) throw professorsError
      setProfessors(professorsData || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = (name) => {
    // Generar clave automática basada en iniciales + año + secuencia
    const initials = name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').substring(0, 2)
    const year = new Date().getFullYear()
    const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
    return `${initials}${year}${sequence}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedCycle) {
      alert('Selecciona un ciclo académico')
      return
    }

    try {
      setLoading(true)

      const password = generatePassword(formData.name)

      const professorData = {
        cycle_id: selectedCycle,
        name: formData.name,
        email: formData.email,
        username: formData.email,
        password: password,
        password_generated_at: new Date().toISOString(),
        max_students: null, // Sin límites de capacidad
        current_students: 0
      }

      const { error } = await supabase
        .from('professors')
        .insert([professorData])

      if (error) throw error

      // Mostrar credenciales generadas
      setShowCredentials({
        name: formData.name,
        email: formData.email,
        password: password
      })

      setFormData({ name: '', email: '' })
      loadData()
    } catch (error) {
      console.error('Error agregando profesor:', error)
      alert('Error agregando profesor: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkImport = async () => {
    if (!selectedCycle) {
      alert('Selecciona un ciclo académico')
      return
    }

    if (!bulkData.trim()) {
      alert('Ingresa datos para importar')
      return
    }

    try {
      setLoading(true)

      const lines = bulkData.trim().split('\n')
      const professorsToAdd = []
      const credentials = []

      for (const line of lines) {
        const [name, email] = line.split(',').map(item => item.trim())
        
        if (name && email) {
          const password = generatePassword(name)
          
          professorsToAdd.push({
            cycle_id: selectedCycle,
            name,
            email,
            username: email,
            password: password,
            password_generated_at: new Date().toISOString(),
            max_students: null,
            current_students: 0
          })

          credentials.push({ name, email, password })
        }
      }

      if (professorsToAdd.length === 0) {
        alert('No se encontraron datos válidos para importar')
        return
      }

      const { error } = await supabase
        .from('professors')
        .insert(professorsToAdd)

      if (error) throw error

      // Mostrar todas las credenciales generadas
      let credentialsText = `${professorsToAdd.length} profesores importados exitosamente:\n\n`
      credentials.forEach(cred => {
        credentialsText += `${cred.name}\nEmail: ${cred.email}\nClave: ${cred.password}\n\n`
      })
      
      alert(credentialsText)
      setBulkData('')
      loadData()
    } catch (error) {
      console.error('Error importando profesores:', error)
      alert('Error importando profesores: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (professor) => {
    if (!window.confirm(`¿Generar nueva clave para ${professor.name}?`)) {
      return
    }

    try {
      setLoading(true)
      const newPassword = generatePassword(professor.name)

      const { error } = await supabase
        .from('professors')
        .update({
          password: newPassword,
          password_generated_at: new Date().toISOString()
        })
        .eq('id', professor.id)

      if (error) throw error

      alert(`Nueva clave generada para ${professor.name}:\n\nEmail: ${professor.email}\nNueva clave: ${newPassword}`)
      loadData()
    } catch (error) {
      console.error('Error reseteando clave:', error)
      alert('Error reseteando clave: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (professor) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar al profesor "${professor.name}"?`)) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('professors')
        .delete()
        .eq('id', professor.id)

      if (error) throw error
      alert('Profesor eliminado exitosamente')
      loadData()
    } catch (error) {
      console.error('Error eliminando profesor:', error)
      alert('Error eliminando profesor: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && professors.length === 0) {
    return (
      <div className="min-h-screen bg-[rgb(0,113,248)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white opacity-80">Cargando profesores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(0,113,248)]">
      {/* Modal de Credenciales */}
      {showCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Profesor Agregado</h3>
            <div className="space-y-2 mb-6">
              <p><strong>Nombre:</strong> {showCredentials.name}</p>
              <p><strong>Email:</strong> {showCredentials.email}</p>
              <p><strong>Clave de acceso:</strong> <span className="font-mono bg-white px-2 py-1">{showCredentials.password}</span></p>
            </div>
            <div className="bg-white border border-white p-3 mb-4">
              <p className="text-sm text-white">
                <strong>Instrucciones:</strong> Comparte estas credenciales con el profesor para que pueda acceder al sistema.
              </p>
            </div>
            <button
              onClick={() => setShowCredentials(null)}
              className="w-full bg-white text-white py-2 px-4 hover:bg-white"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

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
              <h1 className="text-3xl font-bold text-white">Gestión de Profesores</h1>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {!showForm ? (
          // Vista de lista de profesores
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-semibold text-white">Profesores Registrados</h2>
                <p className="text-white opacity-70">Gestiona los profesores del sistema</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-white text-black px-6 py-3 hover:bg-white font-medium transition-colors"
                >
                  Agregar Profesor
                </button>
              </div>
            </div>

            {/* Selector de Ciclo */}
            {cycles.length > 0 && (
              <div className="border border-white border-opacity-10 p-6 mb-8">
                <label className="block text-white text-sm font-medium mb-3">
                  Filtrar por Ciclo Académico
                </label>
                <select
                  value={selectedCycle}
                  onChange={(e) => setSelectedCycle(e.target.value)}
                  className="w-full max-w-xs p-3 border border-white border-opacity-30 text-white bg-transparent focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                >
                  <option value="" className="text-black">Todos los ciclos</option>
                  {cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id} className="text-black">
                      {cycle.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {professors.length === 0 ? (
              <div className="border border-white border-opacity-10 p-12 text-center">
                <h3 className="text-lg font-medium text-white mb-2">No hay profesores registrados</h3>
                <p className="text-white opacity-70 mb-6">Agrega profesores al sistema para comenzar</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-white text-black px-6 py-3 hover:bg-white font-medium transition-colors"
                >
                  Agregar Primer Profesor
                </button>
              </div>
            ) : (
              <div className="border border-white border-opacity-10 overflow-hidden">
                <table className="min-w-full divide-y divide-white divide-opacity-10">
                  <thead className="border-b border-white border-opacity-10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                        Estudiantes Aceptados
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                        Ciclo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white divide-opacity-10">
                    {professors
                      .filter(professor => !selectedCycle || professor.cycle_id === selectedCycle)
                      .map((professor) => (
                      <tr key={professor.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{professor.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white opacity-70">{professor.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{professor.current_students || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white opacity-70">
                            {professor.cycles?.name || 'Sin ciclo'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-[#32D74B] text-white">
                            Disponible para más estudiantes
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                          <button
                            onClick={() => resetPassword(professor)}
                            className="text-white opacity-80 hover:opacity-100 underline"
                          >
                            Nueva Clave
                          </button>
                          <button
                            onClick={() => handleDelete(professor)}
                            className="text-white opacity-80 hover:opacity-100 underline"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          // Formulario de agregar profesor
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Formulario Individual */}
              <div className="border border-white border-opacity-10 p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Agregar Profesor Individual</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-white text-sm font-medium mb-3">
                      Ciclo Académico *
                    </label>
                    <select
                      required
                      value={selectedCycle}
                      onChange={(e) => setSelectedCycle(e.target.value)}
                      className="w-full p-3 border border-white border-opacity-30 text-white bg-transparent focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                    >
                      <option value="" className="text-black">Seleccionar ciclo</option>
                      {cycles.map((cycle) => (
                        <option key={cycle.id} value={cycle.id} className="text-black">
                          {cycle.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-3">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Dr. Ana López"
                      className="w-full p-3 border border-white border-opacity-30 text-white bg-transparent placeholder-white placeholder-opacity-50 focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-3">
                      Email Institucional *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="profesor@veritas.co.cr"
                      className="w-full p-3 border border-white border-opacity-30 text-white bg-transparent placeholder-white placeholder-opacity-50 focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                    />
                  </div>

                  <div className="border border-white border-opacity-20 p-4">
                    <p className="text-white opacity-80 text-sm">
                      <strong>Nota:</strong> Se generará automáticamente una clave de acceso que deberás compartir con el profesor.
                    </p>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-white text-black py-3 px-6 hover:bg-white disabled:opacity-50 font-medium transition-colors"
                    >
                      {loading ? 'Agregando...' : 'Agregar Profesor'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 border border-white border-opacity-30 text-white py-3 px-6 hover:bg-white hover:bg-opacity-10 font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>

              {/* Importación Múltiple */}
              <div className="border border-white border-opacity-10 p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Importación Múltiple</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-white text-sm font-medium mb-3">
                      Ciclo Académico *
                    </label>
                    <select
                      required
                      value={selectedCycle}
                      onChange={(e) => setSelectedCycle(e.target.value)}
                      className="w-full p-3 border border-white border-opacity-30 text-white bg-transparent focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                    >
                      <option value="" className="text-black">Seleccionar ciclo</option>
                      {cycles.map((cycle) => (
                        <option key={cycle.id} value={cycle.id} className="text-black">
                          {cycle.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-3">
                      Datos de Profesores
                    </label>
                    <textarea
                      rows={8}
                      value={bulkData}
                      onChange={(e) => setBulkData(e.target.value)}
                      placeholder={`Formato: Nombre,Email
Dr. Ana Rodríguez,ana@veritas.co.cr
Dr. Miguel Castro,miguel@veritas.co.cr
Dra. Laura Jiménez,laura@veritas.co.cr`}
                      className="w-full p-3 border border-white border-opacity-30 text-white bg-transparent placeholder-white placeholder-opacity-50 focus:outline-none focus:border-white focus:border-opacity-100 transition-all font-mono text-sm"
                    />
                  </div>

                  <div className="border border-white border-opacity-20 p-4">
                    <p className="text-white opacity-80 text-sm">
                      <strong>Importante:</strong> Se generarán claves automáticas para todos los profesores importados.
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleBulkImport}
                      disabled={loading || !selectedCycle}
                      className="flex-1 bg-white text-black py-3 px-6 hover:bg-white disabled:opacity-50 font-medium transition-colors"
                    >
                      {loading ? 'Importando...' : 'Importar Profesores'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkData('')}
                      className="border border-white border-opacity-30 text-white py-3 px-6 hover:bg-white hover:bg-opacity-10 font-medium transition-colors"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Información */}
        <div className="mt-8 border border-white border-opacity-10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Información sobre Profesores</h3>
          <div className="text-white opacity-80 space-y-2">
            <p>• Los profesores pueden aceptar estudiantes sin límites de capacidad</p>
            <p>• Se generan claves automáticas que debes compartir con cada profesor</p>
            <p>• Los profesores usan su email y la clave generada para acceder al sistema</p>
            <p>• Puedes resetear la clave de cualquier profesor cuando sea necesario</p>
            <p>• Para importación múltiple, usa el formato: Nombre,Email</p>
          </div>
        </div>
      </div>
    </div>
  )
}