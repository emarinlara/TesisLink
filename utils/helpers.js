import { supabase } from './supabase'

/**
 * Obtiene estadísticas antes de limpiar el ciclo actual
 */
export const getCleanupStats = async () => {
  try {
    // Obtener ciclo actual
    const { data: currentCycle } = await supabase
      .from('cycles')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)

    if (!currentCycle?.[0]) {
      return { students: 0, proposals: 0, assignments: 0, files: 0, professors: 0 }
    }

    const cycleId = currentCycle[0].id

    // Contar estudiantes
    const { count: studentsCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('cycle_id', cycleId)

    // Contar solicitudes
    const { count: proposalsCount } = await supabase
      .from('student_proposals')
      .select('*', { count: 'exact', head: true })
      .in('student_id', 
        (await supabase.from('students').select('id').eq('cycle_id', cycleId)).data?.map(s => s.id) || []
      )

    // Contar asignaciones
    const { count: assignmentsCount } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .in('student_id',
        (await supabase.from('students').select('id').eq('cycle_id', cycleId)).data?.map(s => s.id) || []
      )

    // Contar archivos en Storage
    const { data: storageFiles } = await supabase
      .storage
      .from('thesis-files')
      .list()

    const filesCount = storageFiles?.length || 0

    // Contar profesores totales (se mantienen)
    const { count: professorsCount } = await supabase
      .from('professors')
      .select('*', { count: 'exact', head: true })
      .eq('cycle_id', cycleId)

    return {
      students: studentsCount || 0,
      proposals: proposalsCount || 0,
      assignments: assignmentsCount || 0,
      files: filesCount,
      professors: professorsCount || 0
    }

  } catch (error) {
    console.error('Error getting cleanup stats:', error)
    return { students: 0, proposals: 0, assignments: 0, files: 0, professors: 0 }
  }
}

/**
 * Limpia completamente todos los datos del ciclo actual
 * MANTIENE a los profesores para migrarlos al nuevo ciclo
 */
export const cleanupCycleData = async () => {
  try {
    // 1. Obtener ciclo actual
    const { data: currentCycle } = await supabase
      .from('cycles')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)

    if (!currentCycle?.[0]) {
      console.log('No hay ciclo actual para limpiar')
      return { success: true, message: 'No hay datos para limpiar' }
    }

    const cycleId = currentCycle[0].id

    // 2. Obtener todos los estudiantes del ciclo actual
    const { data: students } = await supabase
      .from('students')
      .select('id, student_id, project_image_url, thesis_pdf_url')
      .eq('cycle_id', cycleId)

    const studentIds = students?.map(s => s.id) || []

    console.log(`Limpiando ciclo: ${cycleId}`)
    console.log(`Estudiantes a eliminar: ${studentIds.length}`)

    // 3. ELIMINAR ARCHIVOS DE STORAGE
    if (students && students.length > 0) {
      // Eliminar archivos individuales por estudiante
      for (const student of students) {
        try {
          // Eliminar carpeta completa del estudiante en Storage
          const { data: studentFiles } = await supabase
            .storage
            .from('thesis-files')
            .list(`images/${student.student_id}`)

          if (studentFiles && studentFiles.length > 0) {
            const imageFiles = studentFiles.map(file => `images/${student.student_id}/${file.name}`)
            await supabase.storage.from('thesis-files').remove(imageFiles)
          }

          const { data: pdfFiles } = await supabase
            .storage
            .from('thesis-files')
            .list(`pdfs/${student.student_id}`)

          if (pdfFiles && pdfFiles.length > 0) {
            const pdfFilesPath = pdfFiles.map(file => `pdfs/${student.student_id}/${file.name}`)
            await supabase.storage.from('thesis-files').remove(pdfFilesPath)
          }

        } catch (storageError) {
          console.log(`Error eliminando archivos del estudiante ${student.student_id}:`, storageError)
        }
      }
    }

    // 4. ELIMINAR ASIGNACIONES (student_id foreign key)
    if (studentIds.length > 0) {
      const { error: assignmentsError } = await supabase
        .from('assignments')
        .delete()
        .in('student_id', studentIds)

      if (assignmentsError) throw assignmentsError
    }

    // 5. ELIMINAR SOLICITUDES (student_id foreign key)  
    if (studentIds.length > 0) {
      const { error: proposalsError } = await supabase
        .from('student_proposals')
        .delete()
        .in('student_id', studentIds)

      if (proposalsError) throw proposalsError
    }

    // 6. ELIMINAR ESTUDIANTES
    const { error: studentsError } = await supabase
      .from('students')
      .delete()
      .eq('cycle_id', cycleId)

    if (studentsError) throw studentsError

    // 7. RESETEAR CONTADORES DE PROFESORES (mantener profesores, resetear contadores)
    const { error: professorsError } = await supabase
      .from('professors')
      .update({ current_students: 0 })
      .eq('cycle_id', cycleId)

    if (professorsError) throw professorsError

    console.log('✅ Limpieza completa exitosa')
    return { 
      success: true, 
      message: 'Datos del ciclo anterior eliminados exitosamente',
      studentsRemoved: studentIds.length
    }

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
    throw new Error(`Error limpiando datos: ${error.message}`)
  }
}

/**
 * Migra profesores del ciclo anterior al nuevo ciclo
 */
export const migrateProfessors = async (newCycleId) => {
  try {
    // Obtener ciclo anterior
    const { data: cycles } = await supabase
      .from('cycles')
      .select('id')
      .neq('id', newCycleId)
      .order('created_at', { ascending: false })

    if (!cycles || cycles.length === 0) {
      return { success: true, message: 'No hay profesores para migrar', count: 0 }
    }

    const oldCycleId = cycles[0].id

    // Actualizar cycle_id de todos los profesores
    const { data: updatedProfessors, error } = await supabase
      .from('professors')
      .update({ 
        cycle_id: newCycleId, 
        current_students: 0,
        updated_at: new Date().toISOString()
      })
      .eq('cycle_id', oldCycleId)
      .select('id')

    if (error) throw error

    const migratedCount = updatedProfessors?.length || 0

    console.log(`✅ ${migratedCount} profesores migrados al nuevo ciclo`)
    return { 
      success: true, 
      message: `${migratedCount} profesores migrados exitosamente`,
      count: migratedCount
    }

  } catch (error) {
    console.error('❌ Error migrando profesores:', error)
    throw new Error(`Error migrando profesores: ${error.message}`)
  }
}

/**
 * Obtiene el ciclo actual (solo puede haber uno)
 */
export const getCurrentCycle = async () => {
  try {
    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    return data?.[0] || null
  } catch (error) {
    console.error('Error obteniendo ciclo actual:', error)
    return null
  }
}

/**
 * Obtiene estadísticas generales del sistema
 */
export const getSystemStats = async () => {
  try {
    const currentCycle = await getCurrentCycle()
    
    if (!currentCycle) {
      return {
        cycles: 0,
        students: 0,
        professors: 0,
        proposals: 0,
        assignments: 0,
        currentCycle: null
      }
    }

    // Contar estudiantes del ciclo actual
    const { count: studentsCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('cycle_id', currentCycle.id)

    // Contar profesores del ciclo actual
    const { count: professorsCount } = await supabase
      .from('professors')
      .select('*', { count: 'exact', head: true })
      .eq('cycle_id', currentCycle.id)

    // Contar solicitudes del ciclo actual
    const { data: studentIds } = await supabase
      .from('students')
      .select('id')
      .eq('cycle_id', currentCycle.id)

    const studentIdsList = studentIds?.map(s => s.id) || []

    const { count: proposalsCount } = await supabase
      .from('student_proposals')
      .select('*', { count: 'exact', head: true })
      .in('student_id', studentIdsList.length > 0 ? studentIdsList : [''])

    const { count: assignmentsCount } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .in('student_id', studentIdsList.length > 0 ? studentIdsList : [''])

    return {
      cycles: 1, // Solo hay un ciclo activo
      students: studentsCount || 0,
      professors: professorsCount || 0,
      proposals: proposalsCount || 0,
      assignments: assignmentsCount || 0,
      currentCycle: currentCycle
    }

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error)
    return {
      cycles: 0,
      students: 0,
      professors: 0,
      proposals: 0,
      assignments: 0,
      currentCycle: null
    }
  }
}

/**
 * Valida si un estudiante puede hacer solicitudes
 */
export const canStudentMakeProposals = async (studentId) => {
  try {
    const currentCycle = await getCurrentCycle()
    
    if (!currentCycle) {
      return { canPropose: false, reason: 'No hay ciclo académico activo' }
    }

    // Verificar si el estudiante existe y pertenece al ciclo actual
    const { data: student } = await supabase
      .from('students')
      .select('id, project_description')
      .eq('id', studentId)
      .eq('cycle_id', currentCycle.id)
      .single()

    if (!student) {
      return { canPropose: false, reason: 'Estudiante no encontrado en el ciclo actual' }
    }

    // Verificar si el perfil está completo
    if (!student.project_description || student.project_description.trim().length < 10) {
      return { canPropose: false, reason: 'Debes completar tu perfil antes de hacer solicitudes' }
    }

    // Verificar estado del ciclo
    if (currentCycle.status === 'setup') {
      return { canPropose: false, reason: 'El ciclo aún no está abierto para solicitudes' }
    }

    if (!['submissions', 'selections'].includes(currentCycle.status)) {
      return { canPropose: false, reason: 'El período de solicitudes ha terminado' }
    }

    return { canPropose: true, reason: null }

  } catch (error) {
    console.error('Error validando solicitudes de estudiante:', error)
    return { canPropose: false, reason: 'Error del sistema' }
  }
}