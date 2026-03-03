import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Global error handler para capturar errores no controlados
window.addEventListener('error', (event) => {
  console.error('🔥 ERROR GLOBAL CAPTURADO:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// Global error handler para promesas rechazadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('🔥 PROMESA RECHAZADA NO MANEJADA:', {
    reason: event.reason,
    promise: event.promise
  });
});

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    console.error('🔥 ERROR EN BOOTSTRAP:', err);
  });
