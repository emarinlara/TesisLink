'use client'
import { useState } from 'react'

// Componente para preview de imagen
export function ImagePreview({ url, fileName, onReplace, onView }) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="text-center">
        <div className="mb-3">
          <img 
            src={url} 
            alt="Imagen del proyecto" 
            className="w-48 h-48 object-cover rounded-lg mx-auto border"
          />
        </div>
        <div className="text-sm text-white mb-3">
          🖼️ {fileName || 'imagen-proyecto.jpg'}
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => onView(url)}
            className="px-4 py-2 bg-white text-white rounded-md hover:bg-white flex items-center gap-1"
          >
            👁️ Ver
          </button>
          <button
            onClick={onReplace}
            className="px-4 py-2 bg-[#FFD400] text-[#FFD400] rounded-md hover:bg-[#FFD400] flex items-center gap-1"
          >
            🔄 Reemplazar
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente para preview de PDF
export function PDFPreview({ url, fileName, fileSize, onReplace, onView }) {
  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  // Función para descargar PDF (Cloudinary no puede mostrar PDFs directamente)
  const handleDownloadPDF = () => {
    // Crear enlace temporal para descarga
    const link = document.createElement('a')
    link.href = url
    link.download = fileName || 'documento.pdf'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="text-center">
        <div className="mb-3">
          <div className="w-24 h-32 mx-auto bg-[#FF453A] rounded-lg flex items-center justify-center border">
            <div className="text-center">
              <div className="text-3xl text-[#FF453A] mb-1">📄</div>
              <div className="text-xs text-[#FF453A] font-semibold">PDF</div>
            </div>
          </div>
        </div>
        <div className="text-sm text-white mb-1">
          📄 {fileName || 'documento.pdf'}
        </div>
        {fileSize && (
          <div className="text-xs text-white mb-3">
            {formatFileSize(fileSize)}
          </div>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-white text-white rounded-md hover:bg-white flex items-center gap-1"
          >
            📥 Descargar
          </button>
          <button
            onClick={onReplace}
            className="px-4 py-2 bg-[#FFD400] text-[#FFD400] rounded-md hover:bg-[#FFD400] flex items-center gap-1"
          >
            🔄 Reemplazar
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal para reemplazo de archivos
export function ReplaceFileModal({ isOpen, onClose, fileType, onFileUploaded, currentFileName }) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      // Crear FormData para Cloudinary
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('upload_preset', 'ml_default')

      // Subir a Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dhv1gkbzn/${fileType === 'image' ? 'image' : 'raw'}/upload`,
        {
          method: 'POST',
          body: formData
        }
      )

      if (response.ok) {
        const data = await response.json()
        onFileUploaded(data.secure_url, selectedFile.name, selectedFile.size)
        onClose()
        setSelectedFile(null)
      } else {
        alert('Error al subir el archivo')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error al subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  const isImage = fileType === 'image'
  const acceptTypes = isImage ? 'image/*' : '.pdf'
  const maxSize = isImage ? '8MB' : '10MB'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Reemplazar {isImage ? 'Imagen' : 'Documento PDF'}
        </h3>
        
        <div className="mb-4 p-3 bg-[#FFD400] border border-[#FFD400] rounded">
          <p className="text-sm text-[#FFD400]">
            <strong>Archivo actual:</strong> {currentFileName}
          </p>
          <p className="text-xs text-[#FFD400] mt-1">
            Este archivo será reemplazado permanentemente.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-white mb-2">
            Seleccionar nuevo archivo ({maxSize} máximo)
          </label>
          <input
            type="file"
            accept={acceptTypes}
            onChange={handleFileSelect}
            className="w-full p-2 border border-white rounded-md"
          />
        </div>

        {selectedFile && (
          <div className="mb-4 p-3 bg-[#32D74B] border border-[#32D74B] rounded">
            <p className="text-sm text-[#32D74B]">
              <strong>Archivo seleccionado:</strong> {selectedFile.name}
            </p>
            <p className="text-xs text-[#32D74B]">
              Tamaño: {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-white border border-white rounded-md hover:bg-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-4 py-2 bg-[#FFD400] text-white rounded-md hover:bg-[#FFD400] disabled:bg-white"
          >
            {uploading ? 'Subiendo...' : 'Reemplazar Archivo'}
          </button>
        </div>
      </div>
    </div>
  )
}