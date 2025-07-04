import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'https://inventario-db.onrender.com/movements';

  constructor(private http: HttpClient) {}

  getMovements(filters?: Filters): Observable<MovementItem[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
      if (filters.toDate) params = params.set('toDate', filters.toDate);
      if (filters.product) params = params.set('product', filters.product);
      if (filters.expirationDate)
        params = params.set('expirationDate', filters.expirationDate);
    }
    // Agregar parámetro para incluir relaciones
    params = params.set('relations', 'true');
    return this.http.get<MovementItem[]>(this.apiUrl, { params });
  }

  createReturn(purchaseId: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/return`, { purchaseId, reason });
  }

  registerExit(exitData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/exit`, exitData);
  }
  registerDirectEntry(entryData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/direct-entry`, entryData);
  }
}