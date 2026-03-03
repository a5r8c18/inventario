import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TauriService } from '../tauri.service';
import { environment } from '../../../environments/environment';

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
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(
    private http: HttpClient,
    private tauriService: TauriService
  ) {}

  getReceptionReports(filters?: any): Observable<any> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.getReports()).pipe(
        map((response: any) => {
          // Backend returns { reception_reports: [...], delivery_reports: [...] }
          const reports = response.receptionReports || response.reception_reports || [];
          let parsed = reports.map((report: any) => ({
            ...report,
            details: report.details ? JSON.parse(report.details) : {}
          }));

          // Aplicar filtros client-side
          if (filters) {
            if (filters.product && filters.product.trim()) {
              const search = filters.product.toLowerCase().trim();
              parsed = parsed.filter((r: any) => {
                const details = r.details || {};
                const products = details.products || [];
                return details.document?.toLowerCase().includes(search) ||
                  details.supplier?.toLowerCase().includes(search) ||
                  products.some((p: any) =>
                    p.description?.toLowerCase().includes(search) ||
                    p.code?.toLowerCase().includes(search)
                  );
              });
            }
            if (filters.fromDate) {
              parsed = parsed.filter((r: any) => {
                if (!r.createdAt) return false;
                const itemDate = new Date(r.createdAt).toISOString().split('T')[0];
                return itemDate >= filters.fromDate;
              });
            }
            if (filters.toDate) {
              parsed = parsed.filter((r: any) => {
                if (!r.createdAt) return false;
                const itemDate = new Date(r.createdAt).toISOString().split('T')[0];
                return itemDate <= filters.toDate;
              });
            }
          }

          return parsed;
        }),
        catchError(error => {
          console.error('Error en getReceptionReports (Tauri):', error);
          return this.fallbackToHttp('reception', filters);
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttp('reception', filters);
  }

  getDeliveryReports(filters?: any): Observable<any> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.getReports()).pipe(
        map((response: any) => {
          // Backend returns { reception_reports: [...], delivery_reports: [...] }
          const reports = response.delivery_reports || [];
          let processed = reports.map((report: any) => ({
            ...report,
            type: report.reportType === 'Vale de Devolución' ? 'return' : 'delivery',
            products: report.products ? JSON.parse(report.products) : []
          }));

          // Aplicar filtros client-side
          if (filters) {
            if (filters.product && filters.product.trim()) {
              const search = filters.product.toLowerCase().trim();
              processed = processed.filter((r: any) => {
                const products = r.products || [];
                return r.code?.toLowerCase().includes(search) ||
                  r.document?.toLowerCase().includes(search) ||
                  r.entity?.toLowerCase().includes(search) ||
                  products.some((p: any) =>
                    p.description?.toLowerCase().includes(search) ||
                    p.code?.toLowerCase().includes(search)
                  );
              });
            }
            if (filters.fromDate) {
              processed = processed.filter((r: any) => {
                if (!r.date) return false;
                const itemDate = new Date(r.date).toISOString().split('T')[0];
                return itemDate >= filters.fromDate;
              });
            }
            if (filters.toDate) {
              processed = processed.filter((r: any) => {
                if (!r.date) return false;
                const itemDate = new Date(r.date).toISOString().split('T')[0];
                return itemDate <= filters.toDate;
              });
            }
          }

          return processed;
        }),
        catchError(error => {
          console.error('Error en getDeliveryReports (Tauri):', error);
          return this.fallbackToHttp('delivery', filters);
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttp('delivery', filters);
  }

  private fallbackToHttp(endpoint: string, filters?: ReportFilters): Observable<any> {
    const params: Record<
      string,
      string | number | boolean | readonly (string | number | boolean)[]
    > = {};
    if (filters) {
      if (filters['fromDate']) params['start_date'] = filters['fromDate'];
      if (filters['toDate']) params['end_date'] = filters['toDate'];
      if (filters['entity']) params['entity'] = filters['entity'];
      if (filters['warehouse']) params['warehouse'] = filters['warehouse'];
      if (filters['document']) params['document'] = filters['document'];
    }
    return this.http.get(`${this.apiUrl}/${endpoint}`, { params });
  }

  downloadPDF(reportId: string) {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.exportToPdf(reportId));
    }
    
    // Fallback a HTTP para modo web
    return this.http.get(`${this.apiUrl}/${reportId}/pdf`, {
      responseType: 'blob',
    });
  }

  downloadExcel(reportId: string) {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.exportToExcel(reportId));
    }
    
    // Fallback a HTTP para modo web
    return this.http.get(`${this.apiUrl}/${reportId}/excel`, {
      responseType: 'blob',
    });
  }
}
