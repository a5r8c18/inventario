import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ErrorHandlerService } from '../error-handler.service';
import { TauriService } from '../tauri.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(
    private http: HttpClient,
    private tauriService: TauriService,
    private errorHandler: ErrorHandlerService
  ) {}

  login(email: string, password: string): Observable<{ access_token: string }> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.login({ email, password })).pipe(
        tap((response: any) => {
          console.log('Login exitoso (Tauri):', response);
          localStorage.setItem('accessToken', response.access_token);
        }),
        map((response: any) => ({ access_token: response.access_token })),
        catchError((error) => {
          console.log('Error en login (Tauri):', error);
          return this.errorHandler.handleError(error);
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttp('login', { email, password });
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    if (this.tauriService.isDesktop()) {
      this.tauriService.logout().catch(console.error);
    }
  }

  signup(signupData: {
    firstName: string,
    lastName: string,
    company: string,
    email: string,
    phone: string,
    password: string
  }): Observable<{ access_token: string; user: any }> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      const userData = {
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        company: signupData.company,
        email: signupData.email,
        phone: signupData.phone,
        password: signupData.password
      };
      
      return from(this.tauriService.signup(userData)).pipe(
        tap((response: any) => {
          console.log('Registro exitoso (Tauri):', response);
          localStorage.setItem('accessToken', response.access_token);
        }),
        map((response: any) => ({ 
          access_token: response.access_token, 
          user: response.user 
        })),
        catchError((error) => {
          console.log('Error en signup (Tauri):', error);
          return this.errorHandler.handleError(error);
        })
      );
    }
    
    // Fallback a HTTP para modo web
    const payload = {
      first_name: signupData.firstName,
      last_name: signupData.lastName,
      company: signupData.company,
      email: signupData.email,
      phone: signupData.phone,
      password: signupData.password
    };
    
    console.log('Sending to backend:', payload);
    
    return this.http
      .post<{ access_token: string; user: any }>(`${this.apiUrl}/signup`, payload)
      .pipe(
        tap((response) => {
          console.log('Registro exitoso:', response);
          localStorage.setItem('accessToken', response.access_token);
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

  resetPasswordDirect(email: string, newPassword: string): Observable<any> {
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.resetPasswordDirect(email, newPassword)).pipe(
        tap((response: any) => {
          console.log('Contraseña restablecida directamente:', response);
        }),
        catchError((error) => {
          console.error('Error en resetPasswordDirect (Tauri):', error);
          return this.errorHandler.handleError(error);
        })
      );
    }

    const payload = { email, new_password: newPassword };
    return this.http.post(`${this.apiUrl}/reset-password-direct`, payload).pipe(
      tap((response) => {
        console.log('Contraseña restablecida directamente:', response);
      }),
      catchError(this.errorHandler.handleError)
    );
  }

  // Método auxiliar para fallback HTTP
  private fallbackToHttp(endpoint: string, payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${endpoint}`, payload).pipe(
      tap((response) => {
        console.log(`${endpoint} exitoso (HTTP):`, response);
        if (response && (response as any).access_token) {
          localStorage.setItem('accessToken', (response as any).access_token);
        }
      }),
      catchError(this.errorHandler.handleError)
    );
  }
}
