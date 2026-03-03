import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environments/environment';
import { JwtHelperService } from '@auth0/angular-jwt';
import { TauriService } from '../tauri.service';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  company?: string;
  phone?: string;
  avatar?: string;
  memberSince?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUser: User | null = null;
  private jwtHelper = new JwtHelperService();

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService,
    private injector: Injector
  ) {}

  // Get TauriService lazily to avoid circular dependency
  private getTauriService(): TauriService {
    return this.injector.get(TauriService);
  }

  // Obtener información del usuario desde el token JWT
  getCurrentUserFromToken(): User | null {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return null;
    }

    try {
      const decoded = this.jwtHelper.decodeToken(token);
      console.log('Token decodificado:', decoded);
      
      // Manejar diferentes estructuras de nombres en el token
      let firstName = '';
      let lastName = '';
      
      if (decoded.firstName && decoded.lastName) {
        firstName = decoded.firstName;
        lastName = decoded.lastName;
      } else if (decoded.name) {
        const nameParts = decoded.name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      } else if (decoded.first_name && decoded.last_name) {
        firstName = decoded.first_name;
        lastName = decoded.last_name;
      }
      
      return {
        id: decoded.sub || decoded.id,
        firstName: firstName,
        lastName: lastName,
        email: decoded.email,
        role: decoded.role || 'user',
        company: decoded.company,
        phone: decoded.phone,
        avatar: decoded.avatar,
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Obtener perfil completo del usuario desde el backend
  getUserProfile(): Observable<User> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return of(null as any);
    }

    return this.http.get<any>(`${this.apiUrl}/profile`).pipe(
      map(response => response.user),
      catchError(this.errorHandler.handleError)
    );
  }

  // Obtener rol del usuario
  getCurrentUserRole(): string {
    const user = this.getCurrentUserFromToken();
    if (!user) {
      console.log('❌ No se pudo obtener el usuario del token');
      return 'Usuario';
    }
    
    console.log('🔍 Rol de usuario obtenido:', user.role);
    return user.role || 'Usuario';
  }

  // Obtener nombre completo del usuario
  async getCurrentUserName(): Promise<string> {
    console.log('🔍 getCurrentUserName llamado');
    
    // En modo desktop, usar Tauri
    const tauriService = this.getTauriService();
    console.log('🔍 TauriService obtenido:', !!tauriService);
    console.log('🔍 ¿Está en desktop?', tauriService.isDesktop());
    
    if (tauriService.isDesktop()) {
      try {
        console.log('🔍 Intentando obtener perfil desde Tauri...');
        const profile = await tauriService.getCurrentUserProfile();
        console.log('🔍 Perfil obtenido:', profile);
        
        if (profile && profile.first_name && profile.last_name) {
          const fullName = `${profile.first_name} ${profile.last_name}`.trim();
          console.log('🔍 Nombre de usuario desde Tauri:', fullName);
          return fullName || 'Usuario';
        } else {
          console.log('🔍 Perfil incompleto, usando fallback');
        }
      } catch (error) {
        console.error('❌ Error obteniendo nombre desde Tauri:', error);
      }
      
      console.log('🔍 Retornando "Usuario" como fallback');
      return 'Usuario';
    }
    
    // Fallback a modo web con JWT
    const user = this.getCurrentUserFromToken();
    if (!user) {
      console.log('❌ No se pudo obtener el usuario del token');
      return 'Usuario';
    }
    
    console.log('🔍 Usuario completo:', user);
    console.log('🔍 firstName:', user.firstName);
    console.log('🔍 lastName:', user.lastName);
    console.log('🔍 email:', user.email);
    
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    console.log('🔍 Nombre de usuario obtenido:', fullName);
    
    // Si fullName está vacío, intentar obtener desde backend
    if (!fullName) {
      console.log('🔍 Nombre vacío, intentando obtener desde backend...');
      const backendName = await this.getUserNameFromBackend();
      if (backendName && backendName !== 'Usuario') {
        console.log('🔍 Nombre desde backend:', backendName);
        return backendName;
      }
      
      // Mientras tanto, usar email
      const altName = user.email || 'Usuario';
      console.log('🔍 Usando email como nombre temporal:', altName);
      return altName;
    }
    
    return fullName || 'Usuario';
  }

  // Obtener nombre completo desde backend
  private async getUserNameFromBackend(): Promise<string> {
    try {
      const profile = await this.getTauriService().getCurrentUserProfile();
      
      if (profile && profile.first_name && profile.last_name) {
        const fullName = `${profile.first_name} ${profile.last_name}`.trim();
        return fullName || 'Usuario';
      }
      
      return 'Usuario';
    } catch (error) {
      console.error('❌ Error obteniendo nombre desde backend:', error);
      return 'Usuario';
    }
  }
}
