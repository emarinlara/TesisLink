# 🚀 Guía de Deployment - Sistema de Gestión de Tesis

## 📋 **Pre-Requisitos**

### **✅ Verificaciones Antes del Deploy**
```bash
# 1. Verificar que el sistema funciona localmente
cd /Users/eliasmarin/thesis-management
npm run dev
# URL: http://localhost:3000 - Debe cargar sin errores

# 2. Verificar login del tutor
# Email: elias.marin@veritas.co.cr / Clave: admin2025

# 3. Verificar que existe .env.local
ls -la .env.local
# Debe mostrar el archivo con las variables de entorno
```

### **✅ Variables de Entorno Necesarias**
```env
# Supabase (OBLIGATORIAS)
NEXT_PUBLIC_SUPABASE_URL=https://rsvedrzfblvcttsqhmjs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cloudinary (OBLIGATORIAS)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dhv1gkbzn
NEXT_PUBLIC_CLOUDINARY_API_KEY=647478868921146
NEXT_PUBLIC_CLOUDINARY_API_SECRET=7Ci_XNvF6vDcEegVOxuebMh6UNE
```

---

## 🌐 **Deployment en Vercel**

### **PASO 1: Preparar Repositorio Git**
```bash
# Si no está inicializado
cd /Users/eliasmarin/thesis-management
git init

# Agregar todos los archivos
git add .

# Commit inicial
git commit -m "Sistema de gestión de tesis - versión completa"

# Conectar con GitHub (crear repositorio primero en GitHub)
git remote add origin https://github.com/TU_USUARIO/thesis-management.git
git push -u origin main
```

### **PASO 2: Instalar Vercel CLI**
```bash
# Instalar Vercel CLI globalmente
npm i -g vercel

# Verificar instalación
vercel --version
```

### **PASO 3: Deploy Inicial**
```bash
# Desde el directorio del proyecto
cd /Users/eliasmarin/thesis-management

# Iniciar deployment
vercel

# Responder las preguntas:
# ? Set up and deploy "~/thesis-management"? [Y/n] Y
# ? Which scope do you want to deploy to? [Tu cuenta]
# ? Link to existing project? [Y/n] N
# ? What's your project's name? thesis-management
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] N
```

### **PASO 4: Configurar Variables de Entorno en Vercel**

#### **Via Dashboard Web:**
1. Ir a **https://vercel.com/dashboard**
2. Click en tu proyecto **"thesis-management"**
3. Ir a **Settings** → **Environment Variables**
4. Agregar cada variable:

```env
NEXT_PUBLIC_SUPABASE_URL
Value: https://rsvedrzfblvcttsqhmjs.supabase.co
Environment: Production, Preview, Development

NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (tu clave completa)
Environment: Production, Preview, Development

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
Value: dhv1gkbzn
Environment: Production, Preview, Development

NEXT_PUBLIC_CLOUDINARY_API_KEY
Value: 647478868921146
Environment: Production, Preview, Development

NEXT_PUBLIC_CLOUDINARY_API_SECRET
Value: 7Ci_XNvF6vDcEegVOxuebMh6UNE
Environment: Production, Preview, Development
```

#### **Via CLI (Alternativa):**
```bash
# Configurar variables desde terminal
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME production
vercel env add NEXT_PUBLIC_CLOUDINARY_API_KEY production
vercel env add NEXT_PUBLIC_CLOUDINARY_API_SECRET production
```

### **PASO 5: Re-deploy con Variables**
```bash
# Forzar nuevo deployment con variables
vercel --prod

# O desde dashboard, click "Redeploy"
```

---

## 🔧 **Configuración de Dominio (Opcional)**

### **Dominio Personalizado:**
```bash
# Agregar dominio personalizado
vercel domains add tesis.veritas.co.cr

# Verificar DNS
vercel domains inspect tesis.veritas.co.cr
```

### **Configuración DNS:**
```
# En el panel de DNS de tu dominio:
Type: CNAME
Name: tesis
Value: cname.vercel-dns.com
```

---

## ✅ **Verificaciones Post-Deploy**

### **PASO 1: Verificar URL de Producción**
```bash
# Tu URL será algo como:
https://thesis-management-tu-usuario.vercel.app
# O tu dominio personalizado
```

### **PASO 2: Testing Completo**
1. **Login del Tutor:**
   - Email: `elias.marin@veritas.co.cr`
   - Clave: `admin2025`
   - Debe cargar dashboard sin errores

2. **Verificar Supabase:**
   - Dashboard debe mostrar contadores reales
   - Gestión de profesores/estudiantes debe funcionar

3. **Verificar Cloudinary:**
   - Login como estudiante
   - Subir imagen en "Completar Perfil"
   - Debe funcionar sin errores

### **PASO 3: Verificar Variables de Entorno**
```bash
# En la consola del navegador (F12):
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
# Debe mostrar la URL de Supabase, no "undefined"
```

---

## 🔍 **Troubleshooting de Deploy**

### **Error: "process is not defined"**
```bash
# Causa: Variables mal configuradas
# Solución: Verificar que TODAS las variables están en Vercel
vercel env ls
```

### **Error: "Failed to fetch"**
```bash
# Causa: URL de Supabase incorrecta
# Solución: Verificar URL en variables de entorno
```

### **Error: Build Failed**
```bash
# Ver logs completos:
vercel logs <deployment-url>

# Build local para debug:
npm run build
```

### **Error: Cloudinary no funciona**
```bash
# Verificar credenciales en Vercel Dashboard
# Verificar que API Secret esté completo
```

---

## 📊 **Monitoring y Mantenimiento**

### **Comandos Útiles:**
```bash
# Ver deployments recientes
vercel ls

# Ver logs en tiempo real
vercel logs --follow

# Rollback a deployment anterior
vercel rollback [deployment-url]

# Información del proyecto
vercel inspect
```

### **Analytics:**
- Ir a **Vercel Dashboard** → **Analytics**
- Monitorear visitantes, errores, performance

---

## 🎯 **Checklist Final**

### **✅ Pre-Deploy:**
- [ ] Sistema funciona local (`npm run dev`)
- [ ] Login tutor funciona local
- [ ] Archivo `.env.local` completo
- [ ] Repositorio Git actualizado

### **✅ Deploy:**
- [ ] Vercel CLI instalado
- [ ] Proyecto deployado (`vercel`)
- [ ] Variables de entorno configuradas
- [ ] Re-deploy con variables (`vercel --prod`)

### **✅ Post-Deploy:**
- [ ] URL de producción accesible
- [ ] Login tutor funciona en producción
- [ ] Dashboard carga sin errores
- [ ] Subabase conecta correctamente
- [ ] Cloudinary funciona (subida de imagen)
- [ ] Navegación completa funcional

### **✅ Opcional:**
- [ ] Dominio personalizado configurado
- [ ] DNS apuntando correctamente
- [ ] Analytics configurado
- [ ] Monitoring activo

---

## 📞 **URLs Importantes**

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://app.supabase.com/project/rsvedrzfblvcttsqhmjs
- **Cloudinary Dashboard**: https://console.cloudinary.com/
- **Proyecto Local**: http://localhost:3000

---

## 🎉 **¡Deployment Completado!**

Una vez terminados todos los pasos, tu **Sistema de Gestión de Tesis** estará funcionando en producción, accesible desde cualquier lugar con todas las funcionalidades operativas.

**Estado final**: ✅ Sistema 100% funcional en producción