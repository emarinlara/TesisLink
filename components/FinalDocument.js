'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../utils/auth'

export default function FinalDocument({ onBackToDashboard, onLogout }) {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cycleInfo, setCycleInfo] = useState(null)
  const [stats, setStats] = useState({ total: 0, complete: 0, incomplete: 0 })
  const [debugInfo, setDebugInfo] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setDebugInfo(null)

      console.log('🔍 Iniciando carga de datos...')

      // 1. Obtener el ciclo activo
      const { data: cycles, error: cycleError } = await supabase
        .from('cycles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      if (cycleError) {
        console.error('❌ Error obteniendo ciclos:', cycleError)
        setDebugInfo({ error: 'Error obteniendo ciclos', details: cycleError })
        return
      }

      if (!cycles || cycles.length === 0) {
        console.log('⚠️ No hay ciclos disponibles')
        setDebugInfo({ warning: 'No hay ciclos académicos creados' })
        return
      }

      const currentCycle = cycles[0]
      setCycleInfo(currentCycle)
      console.log('✅ Ciclo encontrado:', currentCycle.name)

      // 2. Obtener todos los estudiantes del ciclo actual
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('cycle_id', currentCycle.id)
        .order('name')

      if (studentsError) {
        console.error('❌ Error obteniendo estudiantes:', studentsError)
        setDebugInfo({ error: 'Error obteniendo estudiantes', details: studentsError })
        return
      }

      console.log('✅ Estudiantes encontrados:', students?.length || 0)

      // 3. Obtener todos los profesores del ciclo actual
      const { data: professors, error: professorsError } = await supabase
        .from('professors')
        .select('*')
        .eq('cycle_id', currentCycle.id)

      if (professorsError) {
        console.error('❌ Error obteniendo profesores:', professorsError)
        setDebugInfo({ error: 'Error obteniendo profesores', details: professorsError })
        return
      }

      console.log('✅ Profesores encontrados:', professors?.length || 0)

      // 4. Obtener todas las asignaciones
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at')

      if (assignmentsError) {
        console.error('❌ Error obteniendo asignaciones:', assignmentsError)
        setDebugInfo({ error: 'Error obteniendo asignaciones', details: assignmentsError })
        return
      }

      console.log('✅ Asignaciones encontradas:', assignmentsData?.length || 0)

      // 5. Filtrar asignaciones que correspondan a estudiantes del ciclo actual
      const studentIds = (students || []).map(s => s.id)
      const relevantAssignments = (assignmentsData || []).filter(assignment => 
        studentIds.includes(assignment.student_id)
      )

      console.log('✅ Asignaciones relevantes:', relevantAssignments.length)

      // 6. Combinar datos manualmente (más confiable que joins complejos)
      const combinedData = {}

      // Inicializar estructura para cada estudiante
      ;(students || []).forEach(student => {
        combinedData[student.id] = {
          student: student,
          professors: []
        }
      })

      // Agregar profesores asignados
      relevantAssignments.forEach(assignment => {
        const professor = professors?.find(p => p.id === assignment.professor_id)
        if (professor && combinedData[assignment.student_id]) {
          combinedData[assignment.student_id].professors.push({
            ...professor,
            assigned_by_tutor: assignment.assigned_by_tutor,
            created_at: assignment.created_at,
            assignment_id: assignment.id
          })
        }
      })

      // 7. Convertir a array y ordenar profesores por fecha
      const finalAssignments = Object.values(combinedData).map(group => ({
        student: group.student,
        professors: group.professors
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          .slice(0, 3) // Máximo 3 profesores
      }))

      setAssignments(finalAssignments)

      // 8. Calcular estadísticas
      const complete = finalAssignments.filter(a => a.professors.length === 3).length
      const incomplete = finalAssignments.filter(a => a.professors.length < 3).length
      const newStats = {
        total: finalAssignments.length,
        complete,
        incomplete
      }

      setStats(newStats)

      // 9. Información de debug
      setDebugInfo({
        success: true,
        cycleId: currentCycle.id,
        cycleName: currentCycle.name,
        studentsInCycle: students?.length || 0,
        professorsInCycle: professors?.length || 0,
        totalAssignments: assignmentsData?.length || 0,
        relevantAssignments: relevantAssignments.length,
        studentsWithAssignments: finalAssignments.filter(a => a.professors.length > 0).length,
        stats: newStats
      })

      console.log('✅ Datos cargados exitosamente:', newStats)

    } catch (error) {
      console.error('❌ Error general cargando datos:', error)
      setDebugInfo({ error: 'Error general', details: error.message })
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = async () => {
    if (stats.complete === 0) {
      alert('No hay estudiantes con asignaciones completas (3 profesores) para generar el PDF')
      return
    }

    try {
      // Importar jsPDF dinámicamente para evitar errores de SSR
      const jsPDF = (await import('jspdf')).default

      const doc = new jsPDF()
      
      // Header del documento
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.text('UNIVERSIDAD - ASIGNACIONES DE PROFESORES LECTORES', 20, 20)
      
      doc.setFontSize(12)
      doc.setFont(undefined, 'normal')
      doc.text(`Ciclo Académico: ${cycleInfo?.name || 'N/A'}`, 20, 35)
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 20, 45)
      
      // Línea separadora
      doc.line(20, 55, 190, 55)
      
      let yPosition = 70
      
      // Headers de la tabla
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text('ESTUDIANTE', 20, yPosition)
      doc.text('PROFESOR 1', 80, yPosition)
      doc.text('PROFESOR 2', 120, yPosition)
      doc.text('PROFESOR 3', 160, yPosition)
      
      yPosition += 10
      doc.line(20, yPosition, 190, yPosition)
      yPosition += 5
      
      // Datos de estudiantes (solo los completos)
      const completeAssignments = assignments.filter(a => a.professors.length === 3)
      
      doc.setFont(undefined, 'normal')
      completeAssignments.forEach((assignment, index) => {
        if (yPosition > 270) { // Nueva página si es necesario
          doc.addPage()
          yPosition = 20
        }
        
        // Nombre del estudiante (truncar si es muy largo)
        const studentName = assignment.student.name.length > 18 
          ? assignment.student.name.substring(0, 15) + '...'
          : assignment.student.name
        doc.text(studentName, 20, yPosition)
        
        // Profesores (truncar nombres si son muy largos)
        assignment.professors.forEach((professor, index) => {
          const xPosition = 80 + (index * 40)
          const professorName = professor.name.length > 18
            ? professor.name.substring(0, 15) + '...'
            : professor.name
          doc.text(professorName, xPosition, yPosition)
        })
        
        yPosition += 8
      })
      
      // Footer con estadísticas
      yPosition += 20
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.line(20, yPosition, 190, yPosition)
      yPosition += 10
      
      doc.setFont(undefined, 'bold')
      doc.text(`Total de estudiantes con asignaciones completas: ${stats.complete}`, 20, yPosition)
      doc.text(`Total de estudiantes con asignaciones incompletas: ${stats.incomplete}`, 20, yPosition + 10)
      
      // Descargar PDF
      const filename = `asignaciones-profesores-${cycleInfo?.name?.replace(/\s+/g, '-') || 'sin-ciclo'}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      
      alert('PDF generado exitosamente')
    } catch (error) {
      console.error('Error generando PDF:', error)
      alert('Error generando PDF: ' + error.message)
    }
  }

  const exportCSV = () => {
    try {
      // Crear encabezados CSV
      const headers = ['Estudiante', 'ID Universitario', 'Profesor 1', 'Profesor 2', 'Profesor 3', 'Estado', 'Total Profesores']
      
      // Crear filas de datos
      const rows = assignments.map(assignment => {
        const professors = assignment.professors
        const row = [
          assignment.student.name || 'Sin nombre',
          assignment.student.student_id || 'N/A',
          professors[0]?.name || '',
          professors[1]?.name || '',
          professors[2]?.name || '',
          professors.length === 3 ? 'Completo' : `Incompleto`,
          professors.length.toString()
        ]
        return row
      })
      
      // Crear contenido CSV
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
        .join('\n')
      
      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `asignaciones-${cycleInfo?.name?.replace(/\s+/g, '-') || 'sin-ciclo'}-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      alert('CSV exportado exitosamente')
    } catch (error) {
      console.error('Error exportando CSV:', error)
      alert('Error exportando CSV: ' + error.message)
    }
  }

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      onLogout()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(0,113,248)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white text-lg">Cargando datos del documento final...</p>
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
                <h1 className="text-3xl font-bold text-white">Documento Final</h1>
                <p className="text-white opacity-70 text-sm mt-1">Generar documento oficial con asignaciones de profesores lectores</p>
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

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Debug Info */}
        {debugInfo && (
          <div className="mb-6 border border-white border-opacity-20 p-6">
            <h3 className="font-semibold text-white mb-3">Información de Debug</h3>
            <div className="text-sm text-white opacity-80">
              {debugInfo.error ? (
                <div className="text-[#FF453A]">
                  <strong>Error:</strong> {debugInfo.error}
                  <br />
                  <strong>Detalles:</strong> {JSON.stringify(debugInfo.details, null, 2)}
                </div>
              ) : debugInfo.warning ? (
                <div className="text-[#FFD400]">
                  <strong>Advertencia:</strong> {debugInfo.warning}
                </div>
              ) : debugInfo.success ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><strong>Ciclo:</strong> {debugInfo.cycleName}</div>
                  <div><strong>Estudiantes en ciclo:</strong> {debugInfo.studentsInCycle}</div>
                  <div><strong>Profesores en ciclo:</strong> {debugInfo.professorsInCycle}</div>
                  <div><strong>Asignaciones totales:</strong> {debugInfo.totalAssignments}</div>
                  <div><strong>Asignaciones relevantes:</strong> {debugInfo.relevantAssignments}</div>
                  <div><strong>Estudiantes con asignaciones:</strong> {debugInfo.studentsWithAssignments}</div>
                  <div><strong>Completos:</strong> {debugInfo.stats.complete}</div>
                  <div><strong>Incompletos:</strong> {debugInfo.stats.incomplete}</div>
                </div>
              ) : (
                <div>Información de debug no disponible</div>
              )}
            </div>
          </div>
        )}

        {/* Información del Ciclo */}
        <div className="border border-white border-opacity-10 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Información del Ciclo</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-white border-opacity-20 p-6">
              <p className="text-sm text-white opacity-70 font-medium">Ciclo Académico</p>
              <p className="text-2xl font-bold text-white mt-2">{cycleInfo?.name || 'Sin nombre'}</p>
            </div>
            <div className="border border-white border-opacity-20 p-6">
              <p className="text-sm text-white opacity-70 font-medium">Estado</p>
              <p className="text-2xl font-bold text-white mt-2 capitalize">{cycleInfo?.status || 'N/A'}</p>
            </div>
            <div className="border border-white border-opacity-20 p-6">
              <p className="text-sm text-white opacity-70 font-medium">Fecha de Creación</p>
              <p className="text-lg font-bold text-white mt-2">
                {cycleInfo?.created_at ? new Date(cycleInfo.created_at).toLocaleDateString('es-ES') : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="border border-white border-opacity-10 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Estadísticas de Asignaciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-white border-opacity-20 p-6">
              <p className="text-sm text-white opacity-70 font-medium">Total de Estudiantes</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
            </div>
            <div className="border border-white border-opacity-20 p-6">
              <p className="text-sm text-[#32D74B] font-medium">Asignaciones Completas</p>
              <p className="text-3xl font-bold text-[#32D74B] mt-2">{stats.complete}</p>
              <p className="text-xs text-[#32D74B] mt-1">(3 profesores cada uno)</p>
            </div>
            <div className="border border-white border-opacity-20 p-6">
              <p className="text-sm text-[#FFD400] font-medium">Asignaciones Incompletas</p>
              <p className="text-3xl font-bold text-[#FFD400] mt-2">{stats.incomplete}</p>
              <p className="text-xs text-[#FFD400] mt-1">(menos de 3 profesores)</p>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="border border-white border-opacity-10 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Generar Documentos</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={generatePDF}
              disabled={stats.complete === 0}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${
                stats.complete === 0
                  ? 'border border-white border-opacity-20 text-white opacity-50 cursor-not-allowed'
                  : 'text-white hover:bg-[#32D74B]'
              }`}
            >
              Generar PDF Oficial
              {stats.complete === 0 && (
                <span className="block text-xs mt-1">No hay asignaciones completas</span>
              )}
            </button>
            
            <button
              onClick={exportCSV}
              disabled={assignments.length === 0}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${
                assignments.length === 0
                  ? 'border border-white border-opacity-20 text-white opacity-50 cursor-not-allowed'
                  : 'text-white hover:bg-[#32D74B]'
              }`}
            >
              Exportar CSV/Excel
              {assignments.length === 0 && (
                <span className="block text-xs mt-1">No hay datos para exportar</span>
              )}
            </button>

            <button
              onClick={loadData}
              className="flex-1 py-4 px-6 border border-white border-opacity-30 text-white hover:bg-[#32D74B] hover:bg-opacity-10 font-medium transition-colors"
            >
              Actualizar Datos
            </button>
          </div>
        </div>

        {/* Preview de la Tabla */}
        <div className="border border-white border-opacity-10">
          <div className="border-b border-white border-opacity-10 p-6">
            <h2 className="text-xl font-semibold text-white">Vista Previa del Documento</h2>
          </div>
          
          {assignments.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white opacity-80 text-lg">No hay asignaciones para mostrar</p>
              <p className="text-white opacity-60 text-sm mt-2">Las asignaciones aparecerán aquí cuando estén disponibles</p>
              <button
                onClick={loadData}
                className="mt-6 bg-white text-black px-6 py-3 hover:bg-white font-medium transition-colors"
              >
                Recargar Datos
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white divide-opacity-10">
                <thead className="border-b border-white border-opacity-10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                      Estudiante
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white opacity-80 uppercase tracking-wider">
                      ID Universitario
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
                  {assignments.map((assignment, index) => (
                    <tr key={assignment.student.id} className="hover:bg-white hover:bg-opacity-5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{assignment.student.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white opacity-70">{assignment.student.student_id || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {assignment.professors[0]?.name || (
                            <span className="text-white opacity-50 italic">Sin asignar</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {assignment.professors[1]?.name || (
                            <span className="text-white opacity-50 italic">Sin asignar</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {assignment.professors[2]?.name || (
                            <span className="text-white opacity-50 italic">Sin asignar</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-medium ${
                          assignment.professors.length === 3
                            ? 'bg-[#32D74B] text-white'
                            : assignment.professors.length === 0
                            ? 'bg-[#FF453A] text-white'
                            : 'bg-[#FFD400] text-white'
                        }`}>
                          {assignment.professors.length === 3 
                            ? 'Completo' 
                            : assignment.professors.length === 0
                            ? 'Sin asignar'
                            : `Incompleto (${assignment.professors.length}/3)`
                          }
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Nota informativa */}
        <div className="mt-8 border border-white border-opacity-20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Información importante</h3>
          <div className="text-sm text-white opacity-80 space-y-2">
            <p>• El PDF solo incluirá estudiantes con 3 profesores asignados (completos)</p>
            <p>• El CSV incluirá todos los estudiantes con su estado actual</p>
            <p>• Los datos se actualizan automáticamente desde la base de datos</p>
            <p>• Puedes generar documentos múltiples veces conforme avance el proceso</p>
            <p>• La sección de debug muestra información detallada sobre los datos cargados</p>
          </div>
        </div>

      </div>
    </div>
  )
}