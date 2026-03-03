export const environment = {
  production: false,
  
  apiUrl: 'http://localhost:3001',
  
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