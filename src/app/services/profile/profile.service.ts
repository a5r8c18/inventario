import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { ErrorHandlerService } from '../error-handler.service';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  memberSince: Date;
  profileImage: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private apiUrl = 'http://localhost:3000/auth';

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  getUserProfile(): Observable<UserProfile> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return throwError(
        () => new Error('No se encontró un token, por favor inicia sesión')
      );
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any>(`${this.apiUrl}/profile`, { headers }).pipe(
      map((response: any) => {
        if (!response || !response.user) {
          throw new Error('Formato de respuesta incorrecto');
        }
        const user = response.user;
        return {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          company: user.company || '',
          memberSince: user.memberSince ? new Date(user.memberSince) : new Date(),
          profileImage: user.avatar || null
        } as UserProfile;
      }),
      catchError((error) => {
        console.error('Error al obtener el perfil:', error);
        return throwError(() => new Error('Error al obtener el perfil'));
      })
    );
  }

  updateProfile(userData: {
    firstname: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
  }): Observable<any> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return throwError(
        () => new Error('No se encontró un token, por favor inicia sesión')
      );
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.put(`${this.apiUrl}/update`, userData, { headers }).pipe(
      tap((response) => console.log('Perfil actualizado:', response)),
      catchError(this.errorHandler.handleError)
    );
  }

  changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Observable<any> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return throwError(
        () => new Error('No se encontró un token, por favor inicia sesión')
      );
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.put(`${this.apiUrl}/change-password`, passwordData, { headers }).pipe(
      tap((response) => console.log('Contraseña cambiada:', response)),
      catchError(this.errorHandler.handleError)
    );
  }

  updateAvatar(file: File): Observable<any> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return throwError(
        () => new Error('No se encontró un token, por favor inicia sesión')
      );
    }

    const formData = new FormData();
    formData.append('avatar', file);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.patch(`${this.apiUrl}/avatar`, formData, { headers }).pipe(
      map((response: any) => {
        // The backend returns the avatar URL
        return response.avatar;
      }),
      catchError(this.errorHandler.handleError)
    );
  }

  logout(): Observable<any> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return throwError(
        () => new Error('No se encontró un token, por favor inicia sesión')
      );
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post(`${this.apiUrl}/logout`, {}, { headers }).pipe(
      tap(() => {
        localStorage.removeItem('accessToken');
      }),
      catchError(this.errorHandler.handleError)
    );
  }
}
