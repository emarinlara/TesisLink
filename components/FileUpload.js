'use client'
import { useState, useRef } from 'react'

export default function FileUpload({ 
  onFileUploaded, 
  mode = 'image-only', // Solo admite 'image-only' ahora
  className = '' 
}) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const imageInputRef = useRef(null)

  const handleUpload = async (file) => {
    if (!file) return

    // Validaciones de imagen (30MB máximo)
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, GIF, etc.)')
      return
    }
    
    if (file.size > 30 * 1024 * 1024) { // ✅ 30MB límite
      alert('La imagen debe ser menor a 30MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'ml_default')

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dhv1gkbzn/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      )

      if (response.ok) {
        const data = await response.json()
        onFileUploaded(data.secure_url, 'image', file.name, file.size)
      } else {
        alert('Error al subir la imagen')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragActive(false)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Área de drag and drop */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-white bg-white' 
            : 'border-white hover:border-white'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="space-y-2">
          <div className="text-4xl">🖼️</div>
          <p className="text-white font-medium">
            Arrastra tu imagen aquí o haz clic para seleccionar
          </p>
          <p className="text-sm text-white">
            JPG, PNG, GIF • Máximo 30MB
          </p>
          
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
            className="mt-3 px-6 py-2 bg-white text-white rounded-md hover:bg-white disabled:bg-white text-sm font-medium"
          >
            {uploading ? 'Subiendo...' : '📁 Seleccionar Imagen'}
          </button>
        </div>
      </div>

      {/* Input oculto */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files[0]
          if (file) handleUpload(file)
        }}
        className="hidden"
      />

      {/* Indicador de subida */}
      {uploading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-white">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span className="text-sm font-medium">Subiendo imagen...</span>
          </div>
          <p className="text-xs text-white mt-1">
            Las imágenes grandes pueden tardar unos segundos
          </p>
        </div>
      )}

      {/* Información adicional */}
      <div className="bg-white border border-white rounded-md p-3">
        <h4 className="text-sm font-medium text-white mb-1">💡 Consejos para mejores resultados:</h4>
        <ul className="text-xs text-white space-y-1">
          <li>• Usa imágenes claras y bien iluminadas de tu proyecto</li>
          <li>• Formatos recomendados: JPG o PNG</li>
          <li>• Resolución mínima sugerida: 800x600 píxeles</li>
          <li>• Límite generoso de 30MB para imágenes de alta calidad</li>
        </ul>
      </div>
    </div>
  )
}