# 🎓 TesisLink - Sistema de Gestión de Profesores Lectores

Sistema web completo para gestionar el proceso académico donde estudiantes proponen profesores lectores para sus proyectos de tesis y los profesores seleccionan estudiantes sin límites de capacidad.

## 🎯 **Descripción del Proyecto**

TesisLink facilita el proceso de asignación de profesores lectores para proyectos de tesis, proporcionando una plataforma intuitiva donde:

- **Estudiantes** completan su perfil, suben archivos de su proyecto y solicitan hasta 5 profesores lectores
- **Profesores** revisan proyectos estudiantiles y aceptan/rechazan solicitudes libremente
- **Tutor único** administra todo el sistema, revisa asignaciones y genera documentos finales

## ✨ **Características Principales**

### 🔐 **Sistema de Autenticación Institucional**
- Validación exclusiva de emails `@veritas.co.cr`
- Roles automáticos sin selector manual
- Credenciales pre-creadas seguras

### 👨‍🎓 **Dashboard del Tutor**
- Gestión completa de ciclos académicos (sistema de ciclo único)
- CRUD de estudiantes con importación CSV múltiple
- CRUD de profesores con generación automática de claves
- Dashboard de revisión de asignaciones con tabla interactiva
- Generación de documentos finales (PDF/CSV)

### 🎓 **Dashboard del Estudiante**
- Perfil completo con carnet universitario único
- Sistema de archivos con Cloudinary (imagen del proyecto)
- Solicitudes de hasta 5 profesores (3 principales + 2 alternativas)
- Edición avanzada de solicitudes (modificar, reemplazar, reordenar)

### 👨‍🏫 **Dashboard del Profesor**
- Visualización de solicitudes pendientes y estudiantes aceptados
- Modal "Ver Proyecto" con preview de imagen e información completa
- Aceptación/rechazo sin límites de capacidad
- Sistema flexible sin restricciones de cupos

### 🎨 **Diseño Minimalista**
- Interfaz azul consistente `rgb(0,113,248)`
- Paleta de colores reducida: amarillo `#FFD400`, verde `#32D74B`, rojo `#FF453A`
- Sin emojis, completamente profesional
- Navegación fluida sin puntos muertos

## 🛠️ **Tecnologías Utilizadas**

- **Frontend**: Next.js 13+ (App Router) + React 18 + Tailwind CSS 3
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Storage**: Cloudinary (gestión de archivos e imágenes optimizadas)
- **Deployment**: Vercel (hosting y CI/CD)
- **Base de Datos**: PostgreSQL con funciones SQL personalizadas

## 📦 **Instalación**

### **Pre-requisitos**
- Node.js 18+ y npm
- Cuenta de Supabase
- Cuenta de Cloudinary
- Git

### **Configuración Local**
```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/tesislink.git
cd tesislink

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales
```

### **Variables de Entorno (.env.local)**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://rsvedrzfblvcttsqhmjs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

### **Configuración de Base de Datos**
```sql
-- En Supabase SQL Editor, ejecutar:

-- Función de autenticación principal
CREATE OR REPLACE FUNCTION authenticate_user(
    p_email TEXT,
    p_password TEXT
)
RETURNS TABLE(
    user_id INTEGER,
    user_name TEXT,
    user_email TEXT,
    user_role TEXT,
    user_carnet TEXT,
    user_specialty TEXT
) AS $$
DECLARE
    active_cycle_id INTEGER;
BEGIN
    SELECT id INTO active_cycle_id FROM cycles WHERE is_active = true LIMIT 1;
    
    IF p_email !~ '@veritas\.co\.cr$' THEN
        RAISE EXCEPTION 'Solo emails @veritas.co.cr pueden acceder al sistema';
    END IF;
    
    -- Verificar tutor
    IF p_email = 'elias.marin@veritas.co.cr' AND p_password = 'admin2025' THEN
        RETURN QUERY SELECT 0, 'Tutor Principal'::TEXT, p_email, 'tutor'::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Verificar profesor
    RETURN QUERY 
    SELECT p.id, p.name, p.email, 'professor'::TEXT, NULL::TEXT, p.specialty
    FROM professors p 
    WHERE p.email = p_email AND p.password = p_password AND p.cycle_id = active_cycle_id;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Verificar estudiante
    RETURN QUERY 
    SELECT s.id, s.name, s.email, 'student'::TEXT, s.carnet, NULL::TEXT
    FROM students s 
    WHERE s.email = p_email AND s.carnet = p_password AND s.cycle_id = active_cycle_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Credenciales incorrectas o usuario no encontrado en el ciclo activo';
    END IF;
END;
$$ LANGUAGE plpgsql;
```

## 🚀 **Uso**

### **Iniciar Desarrollo Local**
```bash
npm run dev
# Abrir: http://localhost:3000
```

### **Credenciales de Acceso**

#### **Tutor (Administrador)**
- **Email**: `elias.marin@veritas.co.cr`
- **Clave**: `admin2025`

#### **Estudiantes**
- **Email**: Debe ser `@veritas.co.cr`
- **Clave**: Su carnet universitario
- **Nota**: El tutor debe agregarlos primero

#### **Profesores**
- **Email**: Debe ser `@veritas.co.cr`
- **Clave**: Generada automáticamente por el tutor

## 📖 **Flujo de Uso**

1. **Tutor** crea ciclo académico y agrega profesores
2. **Profesores** se registran con sus emails institucionales
3. **Estudiantes** se registran independientemente
4. **Estudiantes** completan perfil y suben imagen del proyecto
5. **Estudiantes** solicitan hasta 5 profesores lectores
6. **Profesores** revisan proyectos y aceptan/rechazan solicitudes
7. **Tutor** revisa asignaciones y genera documento final

## 📁 **Estructura del Proyecto**

```
tesislink/
├── app/
│   ├── page.js                    # Página principal con routing
│   ├── layout.js                  # Layout con AuthProvider
│   ├── globals.css                # Estilos Tailwind
│   └── favicon.ico
├── components/
│   ├── LoginForm.js               # Formulario de login
│   ├── DashboardRouter.js         # Router principal por roles
│   ├── CycleManagement.js         # Gestión de ciclos académicos
│   ├── StudentManagement.js       # CRUD de estudiantes
│   ├── ProfessorManagement.js     # CRUD de profesores
│   ├── TutorReview.js             # Dashboard de revisión
│   ├── FinalDocument.js           # Generación de documentos
│   ├── StudentProfile.js          # Perfil de estudiantes
│   ├── StudentProposals.js        # Sistema de solicitudes
│   ├── ProfessorDashboard.js      # Dashboard de profesores
│   ├── FileUpload.js              # Subida de archivos
│   └── FilePreview.js             # Preview de archivos
├── utils/
│   ├── supabase.js                # Cliente de Supabase
│   ├── auth.js                    # Contexto de autenticación
│   └── helpers.js                 # Funciones auxiliares
├── .env.local                     # Variables de entorno
├── package.json                   # Dependencias
├── tailwind.config.js             # Configuración Tailwind (opcional)
└── next.config.js                 # Configuración Next.js
```

## 🗄️ **Base de Datos**

### **Esquema Principal**
- **1 Ciclo activo** por vez (sistema de ciclo único)
- **Migración automática** de profesores al crear nuevo ciclo
- **Limpieza completa** de estudiantes y datos al renovar
- **Sin límites de capacidad** para profesores
- **Validación institucional** en todos los niveles

### **Funcionalidades Especiales**
- **Triggers automáticos** para contadores de estudiantes
- **Sistema de renovación** con confirmación y estadísticas
- **Función de limpieza** de archivos huérfanos
- **Generación automática** de claves para profesores

## 🎨 **Paleta de Colores**

- **Fondo principal**: `rgb(0,113,248)` (azul institucional)
- **Estados pendientes**: `#FFD400` (amarillo brillante)
- **Estados aceptados**: `#32D74B` (verde iOS)
- **Estados rechazados**: `#FF453A` (rojo iOS)
- **Texto principal**: `white` (blanco)

## 🚀 **Deploy en Producción**

### **Vercel (Recomendado)**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variables de entorno en Vercel Dashboard
```

### **Variables de Entorno Producción**
- Configurar las mismas variables de `.env.local` en Vercel
- Usar URLs de producción para Supabase y Cloudinary

## 🔧 **Troubleshooting**

### **Problemas Comunes**

#### **Error: "process is not defined"**
- **Causa**: Variables de entorno mal configuradas
- **Solución**: Verificar archivo `.env.local` existe y tiene todas las variables

#### **Error: "new row violates row-level security policy"**
- **Causa**: RLS habilitado en Supabase
- **Solución**: Deshabilitar RLS en tablas principales

#### **Error: "Solo emails @veritas.co.cr pueden acceder"**
- **Causa**: Validación institucional funcionando correctamente
- **Solución**: Usar emails del dominio institucional

#### **Error: "No se encontró tu ID de estudiante"**
- **Causa**: Estudiante no agregado por el tutor
- **Solución**: Tutor debe agregar al estudiante primero

### **Comandos Útiles**
```bash
# Limpiar cache de Next.js
rm -rf .next && npm run dev

# Verificar estado de la base de datos
# En Supabase SQL Editor:
SELECT COUNT(*) FROM cycles;      # Debe ser 1
SELECT COUNT(*) FROM students;   # Estudiantes actuales
SELECT COUNT(*) FROM professors; # Profesores disponibles

# Backup del proyecto
cp -r tesislink tesislink-backup-$(date +%Y%m%d)
```

## 🤝 **Contribución**

### **Desarrollo Local**
1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'Agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### **Convenciones**
- **NO modificar** archivos de configuración sin consultar
- **Mantener** consistencia en diseño minimalista
- **Preservar** funcionalidad existente
- **Usar** solo los 5 colores permitidos

## 📄 **Licencia**

Proyecto académico interno - Universidad Veritas

## 📞 **Soporte**

Para soporte técnico, contactar al administrador del sistema:
- **Email**: elias.marin@veritas.co.cr

---

## 📊 **Estado del Proyecto**

- ✅ **Sistema**: 100% funcional
- ✅ **Autenticación**: Institucional @veritas.co.cr
- ✅ **Dashboards**: Completos para todos los roles
- ✅ **Archivos**: Sistema Cloudinary operativo
- ✅ **Diseño**: Minimalista consistente
- ✅ **Base de datos**: Optimizada y limpia
- ✅ **Navegación**: Fluida sin puntos muertos
- ✅ **Documentación**: README completo

**Versión actual**: 1.0.0  
**Última actualización**: Agosto 2025  
**Estado**: Listo para producción

---

**🎓 TesisLink v1.0 - Sistema de Gestión de Profesores Lectores**  
**Universidad Veritas - Costa Rica**
