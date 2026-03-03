import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { ErrorHandlerService } from '../error-handler.service';
import { TauriService } from '../tauri.service';
import { environment } from '../../../environments/environment';

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
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService,
    private tauriService: TauriService
  ) {}

  getUserProfile(): Observable<UserProfile> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.getUserProfile()).pipe(
        map((userInfo: any) => {
          // Convertir UserInfo a formato UserProfile
          console.log('Datos de usuario desde Tauri:', userInfo);
          return {
            firstName: userInfo.first_name || 'Usuario',
            lastName: userInfo.last_name || 'Desktop',
            email: userInfo.email || 'user@desktop.com',
            phone: userInfo.phone || '',
            company: userInfo.company || 'Empresa',
            memberSince: new Date(userInfo.member_since),
            profileImage: userInfo.avatar || null
          } as UserProfile;
        }),
        catchError(error => {
          console.error('Error en getUserProfile (Tauri):', error);
          return this.fallbackToHttp();
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttp();
  }

  private fallbackToHttp(): Observable<UserProfile> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return throwError(
        () => new Error('No se encontró un token, por favor inicia sesión')
      );
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.get<any>(`${this.apiUrl}/profile`, { headers }).pipe(
      tap((response) => console.log('Response from backend:', response)),
      map((response: any) => {
        if (!response || !response.user) {
          console.error('Invalid response format:', response);
          throw new Error('Formato de respuesta incorrecto');
        }
        const user = response.user;
        console.log('Mapped user data:', user);
        return {
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          email: user.email || '',
          phone: user.phone || '',
          company: user.company || '',
          memberSince: user.member_since
            ? new Date(user.member_since)
            : new Date(),
          profileImage: user.avatar || null,
        } as UserProfile;
      }),
      catchError((error) => {
        console.error('Error al obtener el perfil:', error);
        return throwError(() => new Error('Error al obtener el perfil'));
      })
    );
  }

  updateProfile(userData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
  }): Observable<any> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      const settings = {
        company_name: userData.company,
        company_email: userData.email,
        company_phone: userData.phone
      };
      return from(this.tauriService.updateSystemSettings(settings));
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToUpdateProfile(userData);
  }

  private fallbackToUpdateProfile(userData: any): Observable<any> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return throwError(
        () => new Error('No se encontró un token, por favor inicia sesión')
      );
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    return this.http.put(`${this.apiUrl}/profile`, userData, { headers }).pipe(
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
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    return this.http
      .patch(`${this.apiUrl}/password`, passwordData, { headers })
      .pipe(
        tap((response) => console.log('Contraseña cambiada:', response)),
        catchError(this.errorHandler.handleError)
      );
  }

  updateAvatar(file: File): Observable<any> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.updateAvatar(file)).pipe(
        map((response: any) => {
          // The backend returns the avatar URL or success message
          return response.avatar || response;
        }),
        catchError(this.errorHandler.handleError)
      );
    }
    
    // Fallback a HTTP para modo web
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return throwError(
        () => new Error('No se encontró un token, por favor inicia sesión')
      );
    }

    const formData = new FormData();
    formData.append('avatar', file);

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.post(`${this.apiUrl}/avatar`, formData, { headers }).pipe(
      map((response: any) => {
        // The backend returns the avatar URL
        return response.avatar;
      }),
      catchError(this.errorHandler.handleError)
    );
  }

  logout(): Observable<any> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.logout()).pipe(
        tap(() => {
          localStorage.removeItem('accessToken');
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToLogout();
  }

  private fallbackToLogout(): Observable<any> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return throwError(
        () => new Error('No se encontró un token, por favor inicia sesión')
      );
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.post(`${this.apiUrl}/logout`, {}, { headers }).pipe(
      tap(() => {
        localStorage.removeItem('accessToken');
      }),
      catchError(this.errorHandler.handleError)
    );
  }
}
