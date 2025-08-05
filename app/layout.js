import './globals.css'
import { AuthProvider } from '../utils/auth'

export const metadata = {
  title: 'Sistema de Gestión de Tesis',
  description: 'Sistema para gestionar solicitudes de profesores lectores de tesis',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <div id="app-root">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}