// utils/dataCleanup.js - VERSIÓN CORREGIDA
import { supabase } from './supabase'

/**
 * Limpia todos los datos de estudiantes del sistema
 * Elimina: students, student_proposals (5 por estudiante), assignments (3 finales)
 * Mantiene: professors, users, cycles
 */
export async function cleanupStudentData() {
  try {
    console.log('🧹 Iniciando limpieza de datos de estudiantes...')
    
    // 1. Eliminar asignaciones (assignments) - SINTAXIS CORREGIDA
    const { error: assignmentsError } = await supabase
      .from('assignments')
      .delete()
      .not('id', 'is', null) // Elimina todos los registros
    
    if (assignmentsError) {
      console.error('Error eliminando asignaciones:', assignmentsError)
      throw assignmentsError
    }
    console.log('✅ Asignaciones eliminadas')

    // 2. Eliminar solicitudes (student_proposals) - SINTAXIS CORREGIDA
    const { error: proposalsError } = await supabase
      .from('student_proposals')
      .delete()
      .not('id', 'is', null) // Elimina todos los registros
    
    if (proposalsError) {
      console.error('Error eliminando solicitudes:', proposalsError)
      throw proposalsError
    }
    console.log('✅ Solicitudes eliminadas')

    // 3. Obtener URLs de archivos antes de eliminar estudiantes
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('project_image_url, thesis_pdf_url')
    
    if (studentsError) {
      console.error('Error obteniendo archivos de estudiantes:', studentsError)
      throw studentsError
    }

    // 4. Eliminar archivos de Supabase Storage (si existen)
    if (students && students.length > 0) {
      const filesToDelete = []
      
      students.forEach(student => {
        if (student.project_image_url) {
          // Extraer nombre del archivo de la URL
          const imagePath = student.project_image_url.split('/').pop()
          if (imagePath) filesToDelete.push(`images/${imagePath}`)
        }
        if (student.thesis_pdf_url) {
          // Extraer nombre del archivo de la URL
          const pdfPath = student.thesis_pdf_url.split('/').pop()
          if (pdfPath) filesToDelete.push(`pdfs/${pdfPath}`)
        }
      })

      // Eliminar archivos en lotes
      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('student-files')
          .remove(filesToDelete)
        
        if (storageError) {
          console.warn('⚠️ Error eliminando algunos archivos del storage:', storageError)
          // No lanzamos error porque los archivos pueden no existir
        } else {
          console.log(`✅ ${filesToDelete.length} archivos eliminados del storage`)
        }
      }
    }

    // 5. Eliminar estudiantes - SINTAXIS CORREGIDA
    const { error: deleteStudentsError } = await supabase
      .from('students')
      .delete()
      .not('id', 'is', null) // Elimina todos los registros
    
    if (deleteStudentsError) {
      console.error('Error eliminando estudiantes:', deleteStudentsError)
      throw deleteStudentsError
    }
    console.log('✅ Estudiantes eliminados')

    // 6. Resetear contador de estudiantes en profesores - SINTAXIS CORREGIDA
    const { error: resetProfessorsError } = await supabase
      .from('professors')
      .update({ current_students: 0 })
      .not('id', 'is', null) // Actualiza todos los registros
    
    if (resetProfessorsError) {
      console.error('Error reseteando contadores de profesores:', resetProfessorsError)
      throw resetProfessorsError
    }
    console.log('✅ Contadores de profesores reseteados')

    console.log('🎉 Limpieza de datos completada exitosamente')
    return { success: true, message: 'Datos de estudiantes eliminados correctamente' }

  } catch (error) {
    console.error('❌ Error en la limpieza de datos:', error)
    return { 
      success: false, 
      message: `Error al limpiar datos: ${error.message}` 
    }
  }
}

/**
 * Obtiene estadísticas antes de la limpieza
 */
export async function getCleanupStats() {
  try {
    const [studentsResult, proposalsResult, assignmentsResult] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact' }),
      supabase.from('student_proposals').select('id', { count: 'exact' }),
      supabase.from('assignments').select('id', { count: 'exact' })
    ])

    return {
      students: studentsResult.count || 0,
      proposals: proposalsResult.count || 0,
      assignments: assignmentsResult.count || 0
    }
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error)
    return { students: 0, proposals: 0, assignments: 0 }
  }
}