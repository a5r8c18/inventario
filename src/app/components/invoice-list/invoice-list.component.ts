import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconsModule, provideIcons } from '@ng-icons/core';
import { Router, RouterModule } from '@angular/router';
import { 
  lucidePlus, 
  lucideReceipt, 
  lucideFileText, 
  lucideDownload,
  lucideTrash2,
  lucideEye
} from '@ng-icons/lucide';
import { InvoicesService, Invoice } from '../../services/invoices/invoices.service';
import { NotificationService } from '../../services/shared/notification.service';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconsModule, RouterModule],
  providers: [
    provideIcons({
      lucidePlus,
      lucideReceipt,
      lucideFileText,
      lucideDownload,
      lucideTrash2,
      lucideEye,
    }),
  ],
  templateUrl: './invoice-list.component.html',
})
export class InvoiceListComponent implements OnInit {
  invoices: Invoice[] = [];
  pagedInvoices: Invoice[] = [];
  currentPage = 1;
  pageSize = 10;
  statusFilter = '';
  searchTerm = '';

  constructor(
    private invoicesService: InvoicesService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadInvoices();
    this.notificationService.refresh$.subscribe(() => this.loadInvoices());
  }

  loadInvoices() {
    console.log('🔄 Loading invoices...');
    this.invoicesService.getInvoices({ status: this.statusFilter || undefined }).subscribe({
      next: (data) => {
        console.log('📋 Invoices received:', data);
        this.invoices = data;
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
        this.notificationService.showError('Error al cargar facturas');
      },
    });
  }

  applyFilters() {
    let filtered = this.invoices;

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.customerName.toLowerCase().includes(term) ||
        inv.invoiceNumber.toLowerCase().includes(term)
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter(inv => inv.status === this.statusFilter);
    }

    this.setPage(1, filtered);
  }

  setPage(page: number, data?: Invoice[]) {
    const source = data || this.invoices;
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedInvoices = source.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.invoices.length / this.pageSize);
  }

  updateStatus(invoice: Invoice, status: string) {
    this.invoicesService.updateStatus(invoice.id, status).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Factura marcada como ${this.getStatusLabel(status)}`);
        this.loadInvoices();
      },
      error: () => this.notificationService.showError('Error al actualizar estado'),
    });
  }

  deleteInvoice(invoice: Invoice) {
    if (confirm(`¿Eliminar factura ${invoice.invoiceNumber}?`)) {
      this.invoicesService.deleteInvoice(invoice.id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Factura eliminada');
          this.loadInvoices();
        },
        error: () => this.notificationService.showError('Error al eliminar factura'),
      });
    }
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pendiente',
      paid: 'Pagada',
      cancelled: 'Anulada',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  viewInvoice(invoice: Invoice) {
    this.router.navigate(['/invoices', invoice.id]);
  }

  downloadPDF(invoice: Invoice) {
    // Navegar a la vista de factura para generar el PDF
    this.router.navigate(['/invoices', invoice.id]);
  }

  downloadExcel(invoice: Invoice) {
    this.invoicesService.downloadExcel(invoice.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura_${invoice.invoiceNumber}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.notificationService.showSuccess('Excel descargado exitosamente');
      },
      error: () => this.notificationService.showError('Error al descargar Excel'),
    });
  }
}
