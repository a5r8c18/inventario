import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiUrl = 'http://localhost:3000/dashboard/inventory-chart';

  constructor(private http: HttpClient) {}

  getInventoryData(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
}
