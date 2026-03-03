import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  handleError(error: HttpErrorResponse | any): Observable<never> {
    let errorMessage = 'Ocurrió un error desconocido';
    
    console.log('Error completo recibido:', error);
    
    if (error && typeof error === 'object') {
      // Error de Tauri (no es HttpErrorResponse)
      if (error.message) {
        errorMessage = `Error: ${error.message}`;
      } else if (error.error) {
        errorMessage = `Error: ${error.error}`;
      } else if (typeof error === 'string') {
        errorMessage = `Error: ${error}`;
      } else {
        errorMessage = `Error desconocido: ${JSON.stringify(error)}`;
      }
    } else if (error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.message}`;
    } else if (error instanceof HttpErrorResponse) {
      // Error del lado del servidor
      errorMessage = `Código de error: ${error.status}, Mensaje: ${error.message}`;
    } else if (typeof error === 'string') {
      errorMessage = `Error: ${error}`;
    }
    
    console.error('Error procesado:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
