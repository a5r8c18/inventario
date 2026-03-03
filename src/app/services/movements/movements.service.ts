import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { TauriService } from '../tauri.service';
import { environment } from '../../../environments/environment';
import { CreateReturnMovementDto } from '../../../types/backend-models';
import { UserService } from '../auth/user.service';

export interface Filters {
  fromDate: string;
  toDate: string;
  product: string;
  expirationDate: string;
}

export interface MovementItem {
  product: {
    productName: string;
    productCode: string;
    stock: number;
    entity: string;
    warehouse: string;
    unitPrice: number;
    productUnit: string;
  };
  entries: number;
  exits: number;
  stock: number;
  type: string;
  quantity: number;
  createdAt: string;
  reason: string;
  purchase?: {
    id: string;
    document: string;
    createdAt: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class MovementsService {
  private apiUrl = `${environment.apiUrl}/movements`;

  constructor(
    private http: HttpClient,
    private tauriService: TauriService,
    private userService: UserService
  ) {}

  getMovements(filters?: Filters): Observable<MovementItem[]> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.getMovements()).pipe(
        map((movements: any[]) => {
          // Convertir formato de Tauri a formato del frontend
          let items = movements.map((movement: any) => ({
            product: {
              productName: movement.productName || movement.product_code,
              productCode: movement.productCode,
              stock: movement.stock || 0,
              entity: movement.entity || '',
              warehouse: movement.warehouse || '',
              unitPrice: movement.unitPrice || 0,
              productUnit: movement.productUnit || ''
            },
            entries: movement.movementType === 'entry' ? movement.quantity : 0,
            exits: movement.movementType === 'exit' ? movement.quantity : 0,
            stock: movement.stock || 0,
            type: movement.movementType,
            quantity: movement.quantity,
            createdAt: movement.createdAt,
            reason: movement.reason || movement.label || '',
            purchaseId: movement.purchaseId,
            purchase: movement.purchaseId ? {
              id: movement.purchaseId,
              document: '',
              createdAt: movement.createdAt
            } : undefined
          }));

          // Aplicar filtros client-side
          if (filters) {
            if (filters.product && filters.product.trim()) {
              const search = filters.product.toLowerCase().trim();
              items = items.filter(item =>
                item.product.productName?.toLowerCase().includes(search) ||
                item.product.productCode?.toLowerCase().includes(search)
              );
            }
            if (filters.fromDate) {
              items = items.filter(item => {
                if (!item.createdAt) return false;
                const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
                return itemDate >= filters.fromDate;
              });
            }
            if (filters.toDate) {
              items = items.filter(item => {
                if (!item.createdAt) return false;
                const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
                return itemDate <= filters.toDate;
              });
            }
          }

          return items;
        }),
        catchError(error => {
          console.error('Error en getMovements (Tauri):', error);
          return this.fallbackToHttp(filters);
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttp(filters);
  }

  private fallbackToHttp(filters?: Filters): Observable<MovementItem[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.fromDate) params = params.set('start_date', filters.fromDate);
      if (filters.toDate) params = params.set('end_date', filters.toDate);
      if (filters.product) params = params.set('product_name', filters.product);
    }
    // Agregar parámetro para incluir relaciones
    params = params.set('relations', 'true');
    return this.http.get<MovementItem[]>(this.apiUrl, { params });
  }

  createReturn(purchaseId: string, reason: string): Observable<any> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.userService.getCurrentUserName()).pipe(
        switchMap((userName: string) => {
          const returnDto: CreateReturnMovementDto = { 
            purchase_id: purchaseId, 
            reason, 
            user_name: userName 
          };
          return from(this.tauriService.createMovementReturn(returnDto));
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.http.post(`${this.apiUrl}/return`, { purchase_id: purchaseId, reason });
  }

  async registerExit(exitData: any): Promise<any> {
    // Get current user name
    let userName = 'System';
    try {
      userName = await this.userService.getCurrentUserName();
    } catch (error) {
      console.error('Error getting current user name:', error);
    }

    const payload: any = {
      product_code: exitData.productCode,
      quantity: exitData.quantity,
      reason: exitData.reason,
      user_name: userName, // Usar nombre del usuario actual
      entity: exitData.entity,
      warehouse: exitData.warehouse,
    };

    // Solo enviar unit_price si viene explícitamente (ej: facturación)
    // Para salidas directas, el backend usará el costo de entrada del inventario
    if (exitData.unitPrice !== undefined && exitData.unitPrice !== null) {
      payload.unit_price = exitData.unitPrice;
    }

    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      try {
        return await this.tauriService.createMovementExit(payload);
      } catch (error) {
        console.error('Error en createMovementExit (Tauri):', error);
        throw error;
      }
    }
    
    // Fallback a HTTP para modo web
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No se encontró token de autenticación');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.apiUrl}/exit`, payload, { headers }).toPromise();
  }
  
  registerDirectEntry(entryData: any): Observable<any> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.createDirectEntry(entryData));
    }
    
    // Fallback a HTTP para modo web
    return this.http.post(`${this.apiUrl}/direct-entry`, entryData);
  }
}
