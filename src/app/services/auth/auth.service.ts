import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ErrorHandlerService } from '../error-handler.service'; // Importa el nuevo servicio

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/auth';

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService // Inyecta el servicio
  ) {}

  login(email: string, password: string): Observable<{ accessToken: string }> {
    const payload = { email, password };
    return this.http
      .post<{ accessToken: string }>(`${this.apiUrl}/login`, payload)
      .pipe(
        tap((response) => {
          console.log('Login exitoso:', response);
          localStorage.setItem('accessToken', response.accessToken);
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
  }

  signup(signupData: {
    firstName: string,
    lastName: string,
    company: string,
    email: string,
    phone: string,
    password: string
  }): Observable<{ accessToken: string }> {
    const payload = signupData;
    return this.http
      .post<{ accessToken: string }>(`${this.apiUrl}/signup`, payload)
      .pipe(
        tap((response) => {
          console.log('Registro exitoso:', response);
          localStorage.setItem('accessToken', response.accessToken);
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  forgotPassword(email: string): Observable<any> {
    const payload = { email };
    return this.http.post(`${this.apiUrl}/forgot-password`, payload).pipe(
      tap((response) => {
        console.log('Solicitud de restablecimiento enviada:', response);
      }),
      catchError(this.errorHandler.handleError)
    );
  }

  resetPassword(token: string, password: string): Observable<any> {
    const payload = { token, password };
    return this.http.post(`${this.apiUrl}/reset-password`, payload).pipe(
      tap((response) => {
        console.log('Contraseña restablecida:', response);
      }),
      catchError(this.errorHandler.handleError)
    );
  }
}
