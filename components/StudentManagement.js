'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../utils/auth'

export default function StudentManagement({ onBackToDashboard }) {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [cycles, setCycles] = useState([])
  const [selectedCycle, setSelectedCycle] = useState('')
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  
  // Formulario individual
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    university_id: '' // Solo carnet universitario
  })
  
  // Importación múltiple
  const [csvText, setCsvText] = useState('')
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    loadCycles()
    loadStudents()
  }, [selectedCycle])

  const loadCycles = async () => {
    try {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setCycles(data || [])
      
      if (data && data.length > 0 && !selectedCycle) {
        setSelectedCycle(data[0].id)
      }
    } catch (error) {
      console.error('Error loading cycles:', error)
    }
  }

  const loadStudents = async () => {
    if (!selectedCycle) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('cycle_id', selectedCycle)
        .order('name')
      
      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.university_id) {
      alert('Por favor completa todos los campos')
      return
    }

    if (!selectedCycle) {
      alert('Por favor selecciona un ciclo académico')
      return
    }

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('students')
          .update({
            name: formData.name,
            email: formData.email,
            university_id: formData.university_id
          })
          .eq('id', editingStudent.id)
        
        if (error) throw error
        alert('Estudiante actualizado exitosamente')
      } else {
        const { error } = await supabase
          .from('students')
          .insert([{
            name: formData.name,
            email: formData.email,
            university_id: formData.university_id,
            cycle_id: selectedCycle
          }])
        
        if (error) throw error
        alert('Estudiante agregado exitosamente')
      }
      
      // Reset form
      setFormData({ name: '', email: '', university_id: '' })
      setIsEditing(false)
      setEditingStudent(null)
      loadStudents()
    } catch (error) {
      console.error('Error saving student:', error)
      alert('Error al guardar estudiante: ' + error.message)
    }
  }

  const handleEdit = (student) => {
    setFormData({
      name: student.name,
      email: student.email,
      university_id: student.university_id
    })
    setEditingStudent(student)
    setIsEditing(true)
  }

  const handleDelete = async (studentId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este estudiante?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
      
      if (error) throw error
      alert('Estudiante eliminado exitosamente')
      loadStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      alert('Error al eliminar estudiante: ' + error.message)
    }
  }

  const cancelEdit = () => {
    setFormData({ name: '', email: '', university_id: '' })
    setIsEditing(false)
    setEditingStudent(null)
  }

  const handleImportCSV = async () => {
    if (!csvText.trim()) {
      alert('Por favor ingresa datos CSV')
      return
    }

    if (!selectedCycle) {
      alert('Por favor selecciona un ciclo académico')
      return
    }

    try {
      const lines = csvText.trim().split('\n')
      const studentsData = []

      for (const line of lines) {
        const [name, email, university_id] = line.split(',').map(item => item.trim())
        
        if (name && email && university_id) {
          studentsData.push({
            name,
            email,
            university_id,
            cycle_id: selectedCycle
          })
        }
      }

      if (studentsData.length === 0) {
        alert('No se encontraron datos válidos en el CSV')
        return
      }

      const { error } = await supabase
        .from('students')
        .insert(studentsData)
      
      if (error) throw error
      
      alert(`${studentsData.length} estudiantes importados exitosamente`)
      setCsvText('')
      setShowImport(false)
      loadStudents()
    } catch (error) {
      console.error('Error importing students:', error)
      alert('Error al importar estudiantes: ' + error.message)
    }
  }

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-[rgb(0,113,248)]">
      {/* Header */}
      <div className="border-b border-white border-opacity-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-6">
              <button
                onClick={onBackToDashboard}
                className="text-white hover:text-white transition-colors"
              >
                ← Volver al Dashboard
              </button>
              <h1 className="text-3xl font-bold text-white">
                Gestión de Estudiantes
              </h1>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-white opacity-90">
                {user?.email || 'Usuario'}
              </span>
              <button
                onClick={handleLogout}
                className="bg-white text-black px-4 py-2 hover:bg-white transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Selector de Ciclo */}
        <div className="mb-8">
          <label className="block text-white text-sm font-medium mb-3">
            Ciclo Académico
          </label>
          <select
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(e.target.value)}
            className="w-full p-4 border border-white border-opacity-30 text-white focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
          >
            <option value="" className="text-black">Seleccionar ciclo...</option>
            {cycles.map(cycle => (
              <option key={cycle.id} value={cycle.id} className="text-black">
                {cycle.name}
              </option>
            ))}
          </select>
        </div>

        {selectedCycle && (
          <>
            {/* Botón de importación */}
            <div className="mb-8">
              <button
                onClick={() => setShowImport(!showImport)}
                className="bg-white text-black px-6 py-3 hover:bg-white transition-colors font-medium"
              >
                Importación Múltiple
              </button>
            </div>

            {/* Importación CSV */}
            {showImport && (
              <div className="bg-white bg-opacity-10 border border-white border-opacity-20 p-8 mb-8">
                <h3 className="text-xl font-medium text-white mb-4">
                  Importación Múltiple (CSV)
                </h3>
                <p className="text-white opacity-80 text-sm mb-6">
                  Formato: Nombre,Email,CarnetUniversitario (uno por línea)
                </p>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Juan Pérez,juan@estudiante.edu,123456789&#10;María González,maria@estudiante.edu,987654321"
                  className="w-full p-4 bg-white bg-opacity-10 border border-white border-opacity-30 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                  rows="4"
                />
                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={handleImportCSV}
                    className="bg-white text-black px-6 py-2 hover:bg-white transition-colors"
                  >
                    Importar Estudiantes
                  </button>
                  <button
                    onClick={() => setShowImport(false)}
                    className="bg-white bg-opacity-20 text-white border border-white border-opacity-30 px-6 py-2 hover:bg-opacity-30 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Formulario */}
            <div className="border border-white border-opacity-10 p-6">
              <h3 className="text-xl font-medium text-white mb-6">
                {isEditing ? 'Editar Estudiante' : 'Agregar Nuevo Estudiante'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full p-4 border border-white border-opacity-30 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full p-4 border border-white border-opacity-30 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Carnet Universitario * (Clave de acceso)
                    </label>
                    <input
                      type="text"
                      value={formData.university_id}
                      onChange={(e) => setFormData({...formData, university_id: e.target.value})}
                      className="w-full p-4 border border-white border-opacity-30 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:border-white focus:border-opacity-100 transition-all"
                      placeholder="123456789"
                      required
                    />
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="bg-white text-black px-6 py-3 hover:bg-white transition-colors font-medium"
                  >
                    {isEditing ? 'Actualizar' : 'Agregar'} Estudiante
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="bg-white bg-opacity-20 text-white border border-white border-opacity-30 px-6 py-3 hover:bg-opacity-30 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Lista de estudiantes */}
            <div className="border border-white border-opacity-10 p-6">
              <div className="px-8 py-6 border-b border-white border-opacity-20">
                <h3 className="text-xl font-medium text-white">
                  Estudiantes del Ciclo ({students.length})
                </h3>
              </div>
              
              {loading ? (
                <div className="p-8 text-center">
                  <div className="text-white opacity-80">Cargando estudiantes...</div>
                </div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-white opacity-80">No hay estudiantes en este ciclo</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-white border-opacity-20">
                        <th className="px-8 py-4 text-left text-sm font-medium text-white opacity-80">
                          Nombre
                        </th>
                        <th className="px-8 py-4 text-left text-sm font-medium text-white opacity-80">
                          Email
                        </th>
                        <th className="px-8 py-4 text-left text-sm font-medium text-white opacity-80">
                          Carnet
                        </th>
                        <th className="px-8 py-4 text-left text-sm font-medium text-white opacity-80">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white divide-opacity-20">
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td className="px-8 py-4 text-white font-medium">
                            {student.name}
                          </td>
                          <td className="px-8 py-4 text-white opacity-80">
                            {student.email}
                          </td>
                          <td className="px-8 py-4 text-white opacity-80">
                            {student.university_id}
                          </td>
                          <td className="px-8 py-4 space-x-4">
                            <button
                              onClick={() => handleEdit(student)}
                              className="text-white hover:text-white underline transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(student.id)}
                              className="text-white opacity-70 hover:opacity-100 underline transition-opacity"
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
            </div>
          </>
        )}
      </div>
    </div>
  )
}