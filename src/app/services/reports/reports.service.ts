import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  entity?: string;
  warehouse?: string;
  document?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private apiUrl = 'https://inventario-db.onrender.com/reports';

  constructor(private http: HttpClient) {}

  getReceptionReports(filters?: ReportFilters): Observable<any> {
    const params: Record<string, string | number | boolean | readonly (string | number | boolean)[]> = {};
    if (filters) {
      if (filters['fromDate']) params['fromDate'] = filters['fromDate'];
      if (filters['toDate']) params['toDate'] = filters['toDate'];
      if (filters['entity']) params['entity'] = filters['entity'];
      if (filters['warehouse']) params['warehouse'] = filters['warehouse'];
      if (filters['document']) params['document'] = filters['document'];
    }
    return this.http.get(`${this.apiUrl}/reception`, { params });
  }

  getDeliveryReports(filters?: ReportFilters): Observable<any> {
    const params: Record<string, string | number | boolean | readonly (string | number | boolean)[]> = {};
    if (filters) {
      if (filters['fromDate']) params['fromDate'] = filters['fromDate'];
      if (filters['toDate']) params['toDate'] = filters['toDate'];
      if (filters['entity']) params['entity'] = filters['entity'];
      if (filters['warehouse']) params['warehouse'] = filters['warehouse'];
      if (filters['document']) params['document'] = filters['document'];
    }
    return this.http.get(`${this.apiUrl}/delivery`, { params });
  }

  downloadPDF(reportId: string) {
    return this.http.get(`${this.apiUrl}/${reportId}/pdf`, {
      responseType: 'blob',
    });
  }

  downloadExcel(reportId: string) {
    return this.http.get(`${this.apiUrl}/${reportId}/excel`, {
      responseType: 'blob',
    });
  }
}
