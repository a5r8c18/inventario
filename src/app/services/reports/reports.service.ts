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

export interface PdfFormData {
  warehouseManager: string;
  transporterName: string;
  transporterPlate: string;
  transporterCI: string;
  signature: string; // Base64 de la imagen o texto
  receptor: string; // Nombre del usuario autenticado
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private apiUrl = 'http://localhost:3000/reports';

  constructor(private http: HttpClient) {}

  getReceptionReports(filters?: ReportFilters): Observable<any> {
    const params: Record<
      string,
      string | number | boolean | readonly (string | number | boolean)[]
    > = {};
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
    const params: Record<
      string,
      string | number | boolean | readonly (string | number | boolean)[]
    > = {};
    if (filters) {
      if (filters['fromDate']) params['fromDate'] = filters['fromDate'];
      if (filters['toDate']) params['toDate'] = filters['toDate'];
      if (filters['entity']) params['entity'] = filters['entity'];
      if (filters['warehouse']) params['warehouse'] = filters['warehouse'];
      if (filters['document']) params['document'] = filters['document'];
    }
    return this.http.get(`${this.apiUrl}/delivery`, { params });
  }

  downloadPDF(reportId: string, formData: PdfFormData): Observable<Blob> {
    return this.http.post(
      `${this.apiUrl}/reception/${reportId}/pdf`,
      formData,
      {
        responseType: 'blob',
      }
    );
  }

  downloadExcel(reportId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reception/${reportId}/excel`, {
      responseType: 'blob',
    });
  }
}
