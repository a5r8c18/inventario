import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TauriService } from '../tauri.service';
import { environment } from '../../../environments/environment';

export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  productCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerId?: string;
  customerAddress?: string;
  customerPhone?: string;
  date: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  status: string;
  notes?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
}

export interface CreateInvoiceDto {
  customerName: string;
  customerId?: string;
  customerAddress?: string;
  customerPhone?: string;
  date?: string;
  taxRate?: number;
  discount?: number;
  notes?: string;
  createdByName?: string;
  items: InvoiceItem[];
}

export interface InvoiceFilters {
  customerName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root',
})
export class InvoicesService {
  private apiUrl = `${environment.apiUrl}/invoices`;

  constructor(
    private http: HttpClient,
    private tauriService: TauriService
  ) {}

  getInvoices(filters?: InvoiceFilters): Observable<Invoice[]> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.getInvoices(filters)).pipe(
        map((invoices: any) => {
          // Convertir formato del backend a frontend
          return invoices.map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            customerName: inv.customer_name,
            customerId: inv.customer_id,
            customerAddress: inv.customer_address,
            customerPhone: inv.customer_phone,
            date: inv.date,
            subtotal: inv.subtotal,
            taxRate: inv.tax_rate,
            taxAmount: inv.tax_amount,
            discount: inv.discount,
            total: inv.total,
            status: inv.status,
            notes: inv.notes,
            createdByName: inv.created_by_name,
            createdAt: inv.created_at,
            updatedAt: inv.updated_at,
            items: inv.items?.map((item: any) => ({
              id: item.id,
              invoiceId: item.invoice_id,
              productCode: item.product_code,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              amount: item.amount
            })) || []
          }));
        }),
        catchError(error => {
          console.error('Error en getInvoices (Tauri):', error);
          return this.fallbackToHttp(filters);
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttp(filters);
  }

  private fallbackToHttp(filters?: InvoiceFilters): Observable<Invoice[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.customerName) params = params.set('customerName', filters.customerName);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }
    return this.http.get<{ invoices: Invoice[] }>(this.apiUrl, { params })
      .pipe(map(response => response.invoices || []));
  }

  getInvoiceById(id: string): Observable<Invoice> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.getInvoiceById(id)).pipe(
        map((response: any) => {
          console.log('🔍 Raw invoice from backend:', response);
          // Extraer datos del objeto invoice
          const invoice = response.invoice;
          const items = response.items || [];
          
          // Convertir formato del backend a frontend
          const converted = {
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            customerName: invoice.customer_name,
            customerId: invoice.customer_id,
            customerAddress: invoice.customer_address,
            customerPhone: invoice.customer_phone,
            date: invoice.date,
            subtotal: invoice.subtotal,
            taxRate: invoice.tax_rate,
            taxAmount: invoice.tax_amount,
            discount: invoice.discount,
            total: invoice.total,
            status: invoice.status,
            notes: invoice.notes,
            createdByName: invoice.created_by_name,
            createdAt: invoice.created_at,
            updatedAt: invoice.updated_at,
            items: items.map((item: any) => ({
              id: item.id,
              invoiceId: item.invoice_id,
              productCode: item.product_code,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              amount: item.amount
            }))
          };
          console.log('🔄 Converted invoice:', converted);
          return converted;
        }),
        catchError(error => {
          console.error('Error en getInvoiceById (Tauri):', error);
          return this.fallbackToHttpById(id);
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttpById(id);
  }

  private fallbackToHttpById(id: string): Observable<Invoice> {
    return this.http.get<{ invoice: Invoice }>(`${this.apiUrl}/${id}`)
      .pipe(map(response => response.invoice));
  }

  createInvoice(invoice: CreateInvoiceDto): Observable<Invoice> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.createInvoice({
        customer_name: invoice.customerName,
        customer_id: invoice.customerId,
        customer_address: invoice.customerAddress,
        customer_phone: invoice.customerPhone,
        date: invoice.date,
        tax_rate: invoice.taxRate || 0,
        discount: invoice.discount || 0,
        notes: invoice.notes,
        status: 'pending',
        created_by_name: invoice.createdByName,
        items: invoice.items.map(item => ({
          product_code: item.productCode || '',
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice
        }))
      })).pipe(
        map((invoiceResult: any) => {
          // Convertir resultado a formato Invoice
          return {
            id: invoiceResult.invoice.id,
            invoiceNumber: invoiceResult.invoice.invoice_number,
            customerName: invoice.customerName,
            customerId: invoice.customerId,
            customerAddress: invoice.customerAddress,
            customerPhone: invoice.customerPhone,
            date: invoice.date || new Date().toISOString(),
            subtotal: invoiceResult.invoice.subtotal,
            taxRate: invoiceResult.invoice.tax_rate,
            taxAmount: invoiceResult.invoice.tax_amount,
            discount: invoiceResult.invoice.discount,
            total: invoiceResult.invoice.total,
            status: invoiceResult.invoice.status,
            notes: invoice.notes,
            createdByName: invoiceResult.invoice.created_by_name,
            createdAt: invoiceResult.invoice.created_at,
            updatedAt: invoiceResult.invoice.updated_at,
            items: invoiceResult.items.map((item: any) => ({
              id: item.id,
              invoiceId: item.invoice_id,
              productCode: item.product_code,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              amount: item.amount
            }))
          } as Invoice;
        }),
        catchError(error => {
          console.error('Error en createInvoice (Tauri):', error);
          const errorMsg = typeof error === 'string' ? error : error?.message || '';
          // Si es un error de validación del backend, propagarlo al componente
          if (errorMsg.includes('Validation') || errorMsg.includes('Stock insuficiente') || errorMsg.includes('no existe')) {
            return throwError(() => errorMsg);
          }
          return this.fallbackToHttpCreate(invoice);
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttpCreate(invoice);
  }

  private fallbackToHttpCreate(invoice: CreateInvoiceDto): Observable<Invoice> {
    return this.http.post<{ invoice: Invoice }>(this.apiUrl, invoice)
      .pipe(map(response => response.invoice));
  }

  updateInvoice(id: string, data: Partial<Invoice>): Observable<Invoice> {
    return this.http.put<{ invoice: Invoice }>(`${this.apiUrl}/${id}`, data)
      .pipe(map(response => response.invoice));
  }

  deleteInvoice(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateStatus(id: string, status: string): Observable<Invoice> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.updateInvoiceStatus(id, status)).pipe(
        map((invoice: any) => {
          // Convertir formato del backend a frontend
          return {
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            customerName: invoice.customer_name,
            customerId: invoice.customer_id,
            customerAddress: invoice.customer_address,
            customerPhone: invoice.customer_phone,
            date: invoice.date,
            subtotal: invoice.subtotal,
            taxRate: invoice.tax_rate,
            taxAmount: invoice.tax_amount,
            discount: invoice.discount,
            total: invoice.total,
            status: invoice.status,
            notes: invoice.notes,
            createdByName: invoice.created_by_name,
            createdAt: invoice.created_at,
            updatedAt: invoice.updated_at,
            items: []
          };
        }),
        catchError(error => {
          console.error('Error en updateStatus (Tauri):', error);
          return this.fallbackToHttpUpdateStatus(id, status);
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttpUpdateStatus(id, status);
  }

  private fallbackToHttpUpdateStatus(id: string, status: string): Observable<Invoice> {
    return this.http.put<{ invoice: Invoice }>(`${this.apiUrl}/${id}/status`, { status })
      .pipe(map(response => response.invoice));
  }

  getStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`);
  }

  downloadPDF(id: string): Observable<Blob> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.exportToPdf('invoice_' + id)).pipe(
        map((arrayBuffer: ArrayBuffer) => new Blob([arrayBuffer], { type: 'application/pdf' }))
      );
    }
    
    // Fallback a HTTP para modo web
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  downloadExcel(id: string): Observable<Blob> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.exportToExcel('invoice_' + id)).pipe(
        map((arrayBuffer: ArrayBuffer) => new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      );
    }
    
    // Fallback a HTTP para modo web
    return this.http.get(`${this.apiUrl}/${id}/excel`, { responseType: 'blob' });
  }
}
