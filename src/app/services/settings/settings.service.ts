import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private apiUrl = 'http://localhost:3000/settings';

  constructor(private http: HttpClient) {}

  setStockLimit(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/stock-limit`, data);
  }

  resetStockLimit(productId: string): Observable<any> {
    return this.setStockLimit({ productId, stockLimit: null }); // o 0 si prefieres
  }

  getProducts(): Observable<any> {
    return this.http.get('http://localhost:3000/inventory');
  }
}
