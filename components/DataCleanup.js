// components/DataCleanup.js
import { useState } from 'react'
import { cleanupStudentData, getCleanupStats } from '../utils/dataCleanup'

export default function DataCleanup() {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [result, setResult] = useState(null)

  // Obtener estadísticas antes de mostrar confirmación
  const handleInitiateCleanup = async () => {
    setIsLoading(true)
    try {
      const cleanupStats = await getCleanupStats()
      setStats(cleanupStats)
      setShowConfirmation(true)
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error)
      setResult({
        success: false,
        message: 'Error obteniendo información del sistema'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Ejecutar limpieza
  const executeCleanup = async () => {
    setIsLoading(true)
    setShowConfirmation(false)
    
    try {
      const cleanupResult = await cleanupStudentData()
      setResult(cleanupResult)
      
      // Limpiar estadísticas después de limpieza exitosa
      if (cleanupResult.success) {
        setStats(null)
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Error inesperado durante la limpieza'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const cancelCleanup = () => {
    setShowConfirmation(false)
    setStats(null)
  }

  const clearResult = () => {
    setResult(null)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          🧹 Limpieza de Datos de Estudiantes
        </h2>
        <p className="text-white">
          Elimina todos los datos de estudiantes del ciclo anterior para preparar el sistema para un nuevo ciclo académico. 
          Esto incluye perfiles, solicitudes (5 por estudiante) y asignaciones finales (3 por estudiante).
        </p>
      </div>

      {/* Información de qué se elimina */}
      <div className="bg-[#FFD400] border border-[#FFD400] rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#FFD400] mb-2">⚠️ Esta acción eliminará:</h3>
        <ul className="text-[#FFD400] space-y-1">
          <li>• <strong>Todos los estudiantes</strong> y sus perfiles</li>
          <li>• <strong>Todas las solicitudes</strong> (5 por estudiante)</li>
          <li>• <strong>Todas las asignaciones</strong> finales (3 por estudiante)</li>
          <li>• <strong>Archivos subidos</strong> (imágenes y PDFs de tesis)</li>
        </ul>
      </div>

      <div className="bg-[#32D74B] border border-[#32D74B] rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#32D74B] mb-2">✅ Se mantendrán:</h3>
        <ul className="text-[#32D74B] space-y-1">
          <li>• <strong>Profesores</strong> y sus capacidades</li>
          <li>• <strong>Usuarios</strong> del sistema (tutor, profesores)</li>
          <li>• <strong>Configuración</strong> del ciclo actual</li>
        </ul>
      </div>

      {/* Botón principal */}
      {!showConfirmation && !result && (
        <button
          onClick={handleInitiateCleanup}
          disabled={isLoading}
          className="bg-[#FF453A] hover:bg-[#FF453A] text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '🔄 Verificando datos...' : '🧹 Limpiar Datos de Estudiantes'}
        </button>
      )}

      {/* Modal de confirmación */}
      {showConfirmation && stats && (
        <div className="bg-[#FF453A] border border-[#FF453A] rounded-lg p-6">
          <h3 className="text-xl font-bold text-[#FF453A] mb-4">
            ⚠️ Confirmar Limpieza de Datos
          </h3>
          
          <div className="bg-white p-4 rounded border mb-4">
            <h4 className="font-semibold mb-2">Datos que se eliminarán:</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{stats.students}</div>
                <div className="text-sm text-white">Estudiantes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#FFD400]">{stats.proposals}</div>
                <div className="text-sm text-white">Solicitudes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#32D74B]">{stats.assignments}</div>
                <div className="text-sm text-white">Asignaciones</div>
              </div>
            </div>
          </div>

          <p className="text-[#FF453A] mb-6 font-medium">
            <strong>Esta acción NO se puede deshacer.</strong> Asegúrate de haber exportado/guardado cualquier información importante antes de continuar.
          </p>

          <div className="flex space-x-4">
            <button
              onClick={executeCleanup}
              disabled={isLoading}
              className="bg-[#FF453A] hover:bg-[#FF453A] text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '🔄 Eliminando...' : '✅ Confirmar Limpieza'}
            </button>
            <button
              onClick={cancelCleanup}
              disabled={isLoading}
              className="bg-white hover:bg-white text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
            >
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Resultado de la limpieza */}
      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-[#32D74B] border border-[#32D74B]' : 'bg-[#FF453A] border border-[#FF453A]'}`}>
          <h3 className={`font-semibold mb-2 ${result.success ? 'text-[#32D74B]' : 'text-[#FF453A]'}`}>
            {result.success ? '✅ Limpieza Completada' : '❌ Error en la Limpieza'}
          </h3>
          <p className={result.success ? 'text-[#32D74B]' : 'text-[#FF453A]'}>
            {result.message}
          </p>
          {result.success && (
            <p className="text-[#32D74B] mt-2 text-sm">
              El sistema está listo para recibir estudiantes del nuevo ciclo académico.
            </p>
          )}
          <button
            onClick={clearResult}
            className={`mt-3 px-4 py-2 rounded font-medium ${
              result.success 
                ? 'bg-[#32D74B] hover:bg-[#32D74B] text-white' 
                : 'bg-[#FF453A] hover:bg-[#FF453A] text-white'
            }`}
          >
            Entendido
          </button>
        </div>
      )}

      {/* Indicador de carga */}
      {isLoading && !showConfirmation && !result && (
        <div className="mt-4 text-center">
          <div className="text-white">🔄 Procesando...</div>
        </div>
      )}
    </div>
  )
}