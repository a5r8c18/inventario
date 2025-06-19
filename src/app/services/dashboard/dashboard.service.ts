import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiUrl = 'https://inventario-db.onrender.com/dashboard/inventory-chart';

  constructor(private http: HttpClient) {}

  getInventoryData(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
}
