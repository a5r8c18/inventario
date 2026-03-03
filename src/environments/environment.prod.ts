// inventario/src/environments/environment.prod.ts

// Configuración para PRODUCCIÓN
export const environment = {
  production: true,
  
  // En producción, siempre usar puerto 3001
  apiUrl: 'http://localhost:3001',
  
  // URLs para producción
  frontendUrl: window.location.origin,
  resetPasswordUrl: window.location.origin + '/reset-password',
  
  version: '1.0.0',
  
  theme: {
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
  },
  features: {
    darkMode: true,
    notifications: true,
  },
};