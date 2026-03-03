import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserService } from '../auth/user.service';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private currentUserRole$ = new BehaviorSubject<string>('');
  private visibleModules$ = new BehaviorSubject<Set<string>>(new Set());

  constructor(private userService: UserService) {}

  // Establecer el rol del usuario actual
  setUserRole(role: string): void {
    this.currentUserRole$.next(role);
    this.updateVisibleModules(role);
  }

  // Obtener el rol actual
  getCurrentRole(): Observable<string> {
    return this.currentUserRole$.asObservable();
  }

  // Obtener los módulos visibles
  getVisibleModules(): Observable<Set<string>> {
    return this.visibleModules$.asObservable();
  }

  // Verificar si un módulo es visible
  isModuleVisible(moduleName: string): boolean {
    return this.visibleModules$.value.has(moduleName);
  }

  // Actualizar módulos visibles según el rol
  private updateVisibleModules(role: string): void {
    const roleLower = role.toLowerCase();
    const visibleModules = new Set<string>();

    // Módulos disponibles: dashboard, inventory, movements, purchases, reports, settings, invoices
    
    switch (roleLower) {
      case 'administrador':
      case 'admin':
        visibleModules.add('dashboard');
        visibleModules.add('inventory');
        visibleModules.add('movements');
        visibleModules.add('purchases');
        visibleModules.add('reports');
        visibleModules.add('settings');
        visibleModules.add('invoices');
        visibleModules.add('fixedAssets');
        break;
      
      case 'developer':
        visibleModules.add('dashboard');
        visibleModules.add('inventory');
        visibleModules.add('movements');
        visibleModules.add('purchases');
        visibleModules.add('reports');
        visibleModules.add('settings');
        visibleModules.add('invoices');
        visibleModules.add('fixedAssets');
        break;
      
      case 'contador':
        visibleModules.add('inventory');
        visibleModules.add('invoices');
        visibleModules.add('fixedAssets');
        break;
      
      case 'facturador':
        // Facturador ve dashboard y invoices
        visibleModules.add('dashboard');
        visibleModules.add('invoices');
        break;
      
      default:
        // Usuario normal solo ve inventory
        visibleModules.add('inventory');
        break;
    }

    this.visibleModules$.next(visibleModules);
  }

  // Inicializar el rol del usuario actual
  initializeUserRole(): void {
    const currentRole = this.userService.getCurrentUserRole();
    this.setUserRole(currentRole);
  }
}
