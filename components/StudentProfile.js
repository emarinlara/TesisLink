'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../utils/auth'
import FileUpload from './FileUpload'

export default function StudentProfile({ onBackToDashboard }) {
  const { user, userProfile } = useAuth()
  const [profile, setProfile] = useState({
    id: null,
    name: '',
    email: '',
    university_id: '',
    project_description: '',
    project_image_url: '',
    cycle_id: null
  })
  
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  
  // Estados para imagen (SIN PDF)
  const [hasImage, setHasImage] = useState(false)
  const [imageData, setImageData] = useState({ url: '', name: '', size: 0 })
  
  // Estados para modal de reemplazo de imagen
  const [replaceModal, setReplaceModal] = useState({ open: false, fileName: '' })

  useEffect(() => {
    console.log('🚀 useEffect triggered')
    console.log('userProfile:', userProfile)
    
    if (userProfile) {
      if (userProfile.student_id) {
        console.log('✅ Found student_id:', userProfile.student_id)
        loadProfile()
      } else {
        console.log('❌ No student_id found')
        setLoading(false)
        setMessage('No se encontró tu ID de estudiante. Contacta al tutor.')
      }
    } else {
      console.log('⏳ Waiting for userProfile...')
      // Esperar un poco más por userProfile
      const timer = setTimeout(() => {
        if (!userProfile) {
          console.log('❌ Timeout waiting for userProfile')
          setLoading(false)
          setMessage('Error cargando información del usuario')
        }
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [userProfile])

  const loadProfile = async () => {
    try {
      console.log('🔍 Loading profile for student_id:', userProfile.student_id)
      
      // Consulta simple sin JOIN para evitar problemas
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('university_id', userProfile.student_id)
        .single()

      console.log('📊 Query result:', { studentData, studentError })

      if (studentError) {
        console.log('⚠️ Student not found:', studentError.message)
        setMessage('Primera vez completando perfil. Los datos básicos están precargados.')
        
        // Usar datos del userProfile como fallback
        setProfile({
          id: null,
          name: userProfile.name || 'Estudiante',
          email: userProfile.email || '',
          university_id: userProfile.student_id || '',
          project_description: '',
          project_image_url: '',
          cycle_id: null
        })
      } else if (studentData) {
        console.log('✅ Student found:', studentData)
        
        setProfile({
          id: studentData.id,
          name: studentData.name || 'Estudiante',
          email: studentData.email || userProfile.email,
          university_id: studentData.university_id || userProfile.student_id,
          project_description: studentData.project_description || '',
          project_image_url: studentData.project_image_url || '',
          cycle_id: studentData.cycle_id
        })
        
        // Verificar imagen existente (SIN PDF)
        if (studentData.project_image_url) {
          setHasImage(true)
          setImageData({
            url: studentData.project_image_url,
            name: extractFileName(studentData.project_image_url, 'image'),
            size: 0
          })
        }
      }
      
    } catch (error) {
      console.error('❌ Error loading profile:', error)
      setMessage(`Error: ${error.message}`)
      
      // Fallback con datos básicos
      setProfile({
        id: null,
        name: userProfile.name || 'Estudiante',
        email: userProfile.email || '',
        university_id: userProfile.student_id || '',
        project_description: '',
        project_image_url: '',
        cycle_id: null
      })
    } finally {
      console.log('✅ Loading completed')
      setLoading(false)
    }
  }

  const extractFileName = (url, type) => {
    if (!url) return 'imagen-proyecto.jpg'
    
    const parts = url.split('/')
    const lastPart = parts[parts.length - 1]
    const nameWithoutParams = lastPart.split('?')[0]
    
    if (nameWithoutParams && nameWithoutParams.includes('.')) {
      return nameWithoutParams
    }
    
    return 'imagen-proyecto.jpg'
  }

  const validateForm = () => {
    const newErrors = {}

    if (!profile.project_description || profile.project_description.trim().length < 20) {
      newErrors.project_description = 'La descripción debe tener al menos 20 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      setMessage('Por favor corrige los errores antes de guardar')
      setTimeout(() => setMessage(''), 5000)
      return
    }

    setSaving(true)
    setMessage('')

    try {
      console.log('💾 Saving profile...')
      
      const updateData = {
        project_description: profile.project_description.trim(),
        project_image_url: profile.project_image_url || null
        // ✅ ELIMINADO: thesis_pdf_url
      }

      let result
      
      if (profile.id) {
        // Actualizar estudiante existente
        console.log('📝 Updating existing student:', profile.id)
        result = await supabase
          .from('students')
          .update(updateData)
          .eq('id', profile.id)
          .select()
      } else {
        // Crear nuevo estudiante
        console.log('➕ Creating new student')
        
        // Obtener ciclo actual
        const { data: cycleData } = await supabase
          .from('cycles')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!cycleData) {
          throw new Error('No hay ciclo académico activo')
        }

        const insertData = {
          name: profile.name,
          email: profile.email,
          university_id: profile.university_id,
          cycle_id: cycleData.id,
          ...updateData
        }

        result = await supabase
          .from('students')
          .insert(insertData)
          .select()
      }

      console.log('📊 Save result:', result)

      if (result.error) {
        throw result.error
      }

      if (result.data && result.data.length > 0) {
        const savedData = result.data[0]
        setProfile(prev => ({
          ...prev,
          id: savedData.id,
          cycle_id: savedData.cycle_id,
          project_description: savedData.project_description,
          project_image_url: savedData.project_image_url
          // ✅ ELIMINADO: thesis_pdf_url
        }))
        
        setMessage('Perfil guardado exitosamente')
        setTimeout(() => setMessage(''), 3000)
      }

    } catch (error) {
      console.error('❌ Error saving:', error)
      setMessage(`Error al guardar: ${error.message}`)
      setTimeout(() => setMessage(''), 8000)
    } finally {
      setSaving(false)
    }
  }

  const handleFileUploaded = (url, type, fileName, fileSize) => {
    // Solo para imágenes (SIN PDF)
    if (type === 'image') {
      setProfile(prev => ({ ...prev, project_image_url: url }))
      setHasImage(true)
      setImageData({ url, name: fileName, size: fileSize })
      
      setMessage('Imagen subida exitosamente')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleReplaceImage = () => {
    setReplaceModal({ open: true, fileName: imageData.name })
  }

  const handleImageReplaced = (url, fileName, fileSize) => {
    setProfile(prev => ({ ...prev, project_image_url: url }))
    setImageData({ url, name: fileName, size: fileSize })
    
    setMessage('Imagen reemplazada exitosamente')
    setTimeout(() => setMessage(''), 3000)
    
    setReplaceModal({ open: false, fileName: '' })
  }

  const handleViewImage = (url) => {
    window.open(url, '_blank')
  }

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      try {
        window.location.replace('/')
      } catch (error) {
        window.location.href = '/'
      }
    }
  }

  // ✅ CORREGIDO: Perfil completo solo requiere descripción + imagen (SIN PDF)
  const isProfileComplete = profile.project_description && 
                           profile.project_description.length >= 20 &&
                           hasImage

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(0,113,248)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando tu perfil...</p>
          <p className="text-xs text-white opacity-70 mt-2">
            Usuario: {userProfile?.email || 'Cargando...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(0,113,248)]">
      {/* Header con navegación */}
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
                <h1 className="text-3xl font-bold text-white">Completar Perfil</h1>
                <p className="text-white opacity-70 text-sm mt-1">Usuario: {userProfile?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-white opacity-90 text-sm">{userProfile?.email}</span>
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
        
        {/* Mensaje de estado */}
        {message && (
          <div className={`mb-6 p-4 border ${
            message.includes('exitosamente') ? 'border-[#32D74B] bg-[#32D74B] bg-opacity-20 text-[#32D74B]' : 
            message.includes('Primera vez') ? 'border-white bg-white bg-opacity-20 text-black' :
            'border-[#FF453A] bg-[#FF453A] bg-opacity-20 text-[#FF453A]'
          }`}>
            {message}
          </div>
        )}

        {/* Estado del perfil */}
        {isProfileComplete && (
          <div className="mb-6 p-4 border border-[#32D74B]">
            <div className="flex items-center space-x-2 text-[#32D74B]">
              <span className="font-semibold">Perfil Completo</span>
              <span>- Ya puedes hacer solicitudes a profesores</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna izquierda - Información personal */}
          <div className="space-y-8">
            {/* Información Personal (READONLY) */}
            <div className="border border-white border-opacity-10 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">
                Información Personal
                <span className="text-sm font-normal text-white opacity-70 ml-2">(Registrada por el tutor)</span>
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white opacity-80 mb-2">Nombre Completo</label>
                  <input
                    type="text"
                    value={profile.name}
                    readOnly
                    className="w-full p-3 border border-white border-opacity-30 text-white"
                  />
                  <p className="text-xs text-white opacity-60 mt-2">Esta información fue registrada por el tutor</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white opacity-80 mb-2">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    className="w-full p-3 border border-white border-opacity-30 text-white"
                  />
                  <p className="text-xs text-white opacity-60 mt-2">Esta información fue registrada por el tutor</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white opacity-80 mb-2">
                    Carnet Universitario
                  </label>
                  <input
                    type="text"
                    value={profile.university_id}
                    readOnly
                    className="w-full p-3 border border-white border-opacity-30 text-white"
                  />
                  <p className="text-xs text-white opacity-60 mt-2">Esta información fue registrada por el tutor</p>
                </div>
              </div>
            </div>

            {/* Descripción del Proyecto (EDITABLE) */}
            <div className="border border-white border-opacity-10 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">
                Descripción del Proyecto
                <span className="text-sm font-normal text-white ml-2">(Completa esta sección)</span>
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-white opacity-80 mb-2">
                  Describe tu proyecto de tesis
                </label>
                <textarea
                  value={profile.project_description}
                  onChange={(e) => setProfile(prev => ({ ...prev, project_description: e.target.value }))}
                  className={`w-full p-3 bg-transparent border h-32 text-white placeholder-white placeholder-opacity-50 focus:outline-none focus:border-white focus:border-opacity-100 transition-all ${
                    errors.project_description ? 'border-[#FF453A]' : 'border-white border-opacity-30'
                  }`}
                  placeholder="Describe de manera detallada tu proyecto de tesis, objetivos, metodología, etc. (mínimo 20 caracteres)"
                />
                {errors.project_description && (
                  <p className="text-[#FF453A] text-xs mt-2">{errors.project_description}</p>
                )}
                <p className="text-xs text-white opacity-60 mt-2">
                  {profile.project_description.length} caracteres (mínimo 20)
                </p>
              </div>
            </div>

            {/* Botón de guardar */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-white text-black py-4 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar Información'}
            </button>
            
            {/* Debug info */}
            <div className="text-xs text-white opacity-50 text-center">
              ID: {profile.id || 'nuevo'} | Ciclo: {profile.cycle_id || 'pendiente'}
            </div>
          </div>

          {/* Columna derecha - SOLO IMAGEN (SIN PDF) */}
          <div className="space-y-8">
            <div className="border border-white border-opacity-10 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Imagen del Proyecto</h2>
              <p className="text-sm text-white opacity-70 mb-6">
                Sube una imagen representativa de tu proyecto (máximo 30MB)
              </p>
              
              {/* Renderizado condicional según estado de imagen */}
              {!hasImage ? (
                <div>
                  <FileUpload 
                    mode="image-only" 
                    onFileUploaded={handleFileUploaded}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Preview de imagen */}
                  <div className="border border-white border-opacity-20 overflow-hidden">
                    <div className="border-b border-white border-opacity-20 px-4 py-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-medium text-white">
                            {imageData.name}
                          </h3>
                          <p className="text-xs text-white opacity-60">
                            Imagen subida • Tamaño: {imageData.size > 0 ? (imageData.size / 1024).toFixed(1) + ' KB' : 'Desconocido'}
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleViewImage(imageData.url)}
                            className="text-xs border border-white border-opacity-30 text-white px-3 py-2 hover:bg-white hover:bg-opacity-10 transition-colors"
                          >
                            Ver
                          </button>
                          <button
                            onClick={handleReplaceImage}
                            className="text-xs text-white px-3 py-2 hover:bg-[#FF453A] transition-colors"
                          >
                            Reemplazar
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <img 
                        src={imageData.url} 
                        alt="Vista previa del proyecto"
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg=='
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de reemplazo de imagen */}
      {replaceModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border border-white border-opacity-20 w-96 bg-[rgb(0,113,248)] bg-opacity-95">
            <div className="flex justify-between items-center pb-4 border-b border-white border-opacity-20">
              <h3 className="text-lg font-semibold text-white">Reemplazar Imagen</h3>
              <button
                onClick={() => setReplaceModal({ open: false, fileName: '' })}
                className="text-white opacity-70 hover:opacity-100 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="my-6">
              <p className="text-sm text-white opacity-80">
                Archivo actual: <strong className="text-white">{replaceModal.fileName}</strong>
              </p>
              <p className="text-xs text-white opacity-60 mt-2">
                Selecciona una nueva imagen para reemplazar la actual.
              </p>
            </div>

            <FileUpload
              mode="image-only"
              onFileUploaded={(url, type, fileName, fileSize) => {
                handleImageReplaced(url, fileName, fileSize)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}// Updated Thu Aug 14 16:02:52 CST 2025
