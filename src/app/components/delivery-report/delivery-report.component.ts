import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { ReportsService } from '../../services/reports/reports.service';
import { ProductsService } from '../../services/products/products.service';
import { NotificationService } from '../../services/shared/notification.service';
import { UserService } from '../../services/auth/user.service';
import { CompanyStateService } from '../../services/companies/company-state.service';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-delivery-report',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, FilterBarComponent],
  templateUrl: './delivery-report.component.html',
})
export class DeliveryReportComponent implements OnInit, OnDestroy {
  private refreshSub!: Subscription;
  private companyChangeSub!: Subscription;
  reports: any[] = [];
  pagedReports: any[] = [];
  selectedReport: any = null;
  currentPage = 1;
  pageSize = 10;
  currentUserName = '';

  // Comprobante por rango de fecha
  summaryFromDate = '';
  summaryToDate = '';
  summaryRows: { code: string; date: string; total: number }[] = [];
  summaryGenerated = false;

  constructor(
    private reportsService: ReportsService,
    private productsService: ProductsService,
    private notificationService: NotificationService,
    private userService: UserService,
    private companyStateService: CompanyStateService
  ) {}

  ngOnInit() {
    this.loadReports();
    this.loadCurrentUser();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => this.loadReports());
    this.companyChangeSub = this.companyStateService.activeCompany$.subscribe(() => this.loadReports());
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
    this.companyChangeSub?.unsubscribe();
  }

  async loadCurrentUser() {
    console.log('Cargando usuario actual...');
    const token = localStorage.getItem('accessToken');
    console.log('Token encontrado:', token ? 'Sí' : 'No');
    
    this.currentUserName = await this.userService.getCurrentUserName();
    console.log('Nombre de usuario establecido:', this.currentUserName);
  }

  loadReports() {
    this.reportsService.getDeliveryReports().subscribe({
      next: (data) => {
        this.reports = data;
        this.setPage(1);
      },
      error: () => this.notificationService.showError('Error al cargar vales'),
    });
  }

  setPage(page: number) {
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedReports = this.reports.slice(start, end);
  }

  get totalPages() {
    return Math.ceil(this.reports.length / this.pageSize);
  }

  applyFilters(filters: any) {
    this.reportsService.getDeliveryReports(filters).subscribe({
      next: (data) => {
        this.reports = data;
        this.setPage(1);
      },
      error: () =>
        this.notificationService.showError('Error al aplicar filtros'),
    });
  }

  viewReport(report: any) {
    this.notificationService.showSuccess(`Visualizando vale ${report.code}`);
    // Enriquecer los productos con datos completos
    this.enrichProducts(report);
    this.selectedReport = report;
  }

  enrichProducts(report: any) {
    if (!report.products || !Array.isArray(report.products)) {
      return;
    }

    // Para cada producto, obtener sus datos completos y calcular importe
    report.products.forEach((product: any) => {
      // Calcular importe si no existe
      if (!product.amount && product.quantity && product.unitPrice) {
        product.amount = product.quantity * product.unitPrice;
      }

      // Obtener datos completos del producto si faltan
      if (!product.unit || !product.unitPrice) {
        this.productsService.getProductByCode(product.code).subscribe({
          next: (fullProduct) => {
            if (fullProduct) {
              // Actualizar unidad de medida si falta
              if (!product.unit && fullProduct.unit_measure) {
                product.unit = fullProduct.unit_measure;
              }
              // Actualizar precio si falta o es 0
              if ((!product.unitPrice || product.unitPrice === 0) && fullProduct.price) {
                product.unitPrice = fullProduct.price;
                // Recalcular importe
                if (product.quantity) {
                  product.amount = product.quantity * product.unitPrice;
                }
              }
            }
          },
          error: () => {
            console.warn(`No se pudo obtener el producto ${product.code}`);
          }
        });
      }
    });
  }

  closeModal() {
    this.selectedReport = null;
  }

  exportToPDF(report: any) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Vale de Entrega/Devolución', 10, 10);
    doc.setFontSize(12);
    doc.text(`Código: ${report.code || '-'}`, 10, 20);
    doc.text(`Entidad: ${report.entity || '-'}`, 10, 30);
    doc.text(`Almacén: ${report.warehouse || '-'}`, 10, 40);
    doc.text(`Documento: ${report.document || '-'}`, 10, 50);
    doc.text(
      `Fecha: ${
        report.date ? new Date(report.date).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-'
      }`,
      10,
      60
    );
    doc.text(
      `Tipo: ${report.type === 'return' ? 'Devolución' : 'Entrega'}`,
      10,
      70
    );

    if (report.type === 'return' && report.reason) {
      doc.text(`Motivo: ${report.reason}`, 10, 80);
    }

    const startY = report.type === 'return' && report.reason ? 90 : 80;

    if (report.products?.length) {
      autoTable(doc, {
        startY: startY,
        head: [
          [
            'Código',
            'Cuenta',
            'Subcuenta',
            'Descripción',
            'U/M',
            'Cantidad',
            'Precio',
            'Importe',
            'Saldo',
          ],
        ],
        body: report.products.map((p: any) => [
          p.code || '-',
          p.account || '-',
          p.subaccount || '-',
          p.description || '-',
          p.unit || '-',
          p.quantity || 0,
          p.unitPrice ? '$' + Number(p.unitPrice).toFixed(2) : '-',
          p.amount ? '$' + Number(p.amount).toFixed(2) : '-',
          p.balance ? Number(p.balance).toFixed(2) : '-',
        ]),
        foot: [
          [
            { content: 'TOTAL', colSpan: 7 },
            '$' + Number(this.getTotalAmount(report)).toFixed(2),
            '-',
          ],
        ],
      });
    }

    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    
    // Sección de Transportista (lado izquierdo)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Transportista', 14, finalY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nombre: __________________', 14, finalY + 23);
    doc.text('CI: __________________', 14, finalY + 30);
    doc.text('Chapa: __________________', 14, finalY + 37);
    doc.text('Firma: __________________', 14, finalY + 44);
    
    // Sección de Responsables (lado derecho)
    const dispatchLabel = report.type === 'return' ? 'Devuelto por' : 'Despachado por';
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Responsables', 110, finalY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Jefe de Almacén: __________________', 110, finalY + 23);
    doc.text(`${dispatchLabel}: ${this.currentUserName || '__________________'}`, 110, finalY + 30);
    doc.text('Recibido por: __________________', 110, finalY + 37);
    doc.text('Contabilizado por: __________________', 110, finalY + 44);

    doc.save(`vale-entrega-devolucion-${report.code || 'reporte'}.pdf`);
  }

  exportToExcel(report: any) {
    const worksheetData = [
      ['Vale de Entrega/Devolución'],
      ['Código', report.code || '-'],
      ['Entidad', report.entity || '-'],
      ['Almacén', report.warehouse || '-'],
      ['Documento', report.document || '-'],
      ['Fecha', report.date ? new Date(report.date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-'],
      ['Tipo', report.type === 'return' ? 'Devolución' : 'Entrega'],
      ...(report.type === 'return' && report.reason
        ? [['Motivo', report.reason]]
        : []),
      [],
      [
        'Código',
        'Cuenta',
        'Subcuenta',
        'Descripción',
        'U/M',
        'Cantidad',
        'Precio',
        'Importe',
        'Saldo',
      ],
      ...(report.products || []).map((p: any) => [
        p.code || '-',
        p.account || '-',
        p.subaccount || '-',
        p.description || '-',
        p.unit || '-',
        p.quantity || 0,
        p.unitPrice ? '$' + Number(p.unitPrice).toFixed(2) : '-',
        p.amount ? '$' + Number(p.amount).toFixed(2) : '-',
        p.balance ? Number(p.balance).toFixed(2) : '-',
      ]),
      [
        '',
        '',
        '',
        '',
        '',
        '',
        'TOTAL',
        '$' + Number(this.getTotalAmount(report)).toFixed(2),
        '-',
      ],
      [],
      [report.type === 'return' ? 'Devuelto por' : 'Despachado por', this.currentUserName || '__________________'],
      ['Recibido por', '__________________'],
    ];

    const ws = XLSX.utils.json_to_sheet(worksheetData, { skipHeader: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vale');
    XLSX.writeFile(
      wb,
      `vale-entrega-devolucion-${report.code || 'reporte'}.xlsx`
    );
  }

  getTotalAmount(report: any = this.selectedReport): number {
    if (report && report.products && Array.isArray(report.products)) {
      return report.products
        .map((p: any) => {
          if (p.quantity && p.unitPrice) {
            return Number(p.quantity) * Number(p.unitPrice);
          }
          return Number(p.amount) || 0;
        })
        .reduce((sum: number, curr: number) => sum + curr, 0);
    }
    return 0;
  }

  // ─── Comprobante por rango de fecha ──────────────────────────────

  generateSummary() {
    if (!this.summaryFromDate || !this.summaryToDate) {
      this.notificationService.showError('Selecciona un rango de fechas');
      return;
    }
    const from = this.summaryFromDate;
    const to   = this.summaryToDate;
    const filtered = this.reports.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date).toISOString().split('T')[0];
      return d >= from && d <= to;
    });
    this.summaryRows = filtered.map(r => ({
      code:  r.code || '-',
      date:  r.date,
      total: this.getTotalAmount(r)
    }));
    this.summaryGenerated = true;
    if (this.summaryRows.length === 0) {
      this.notificationService.showError('No hay vales en el rango seleccionado');
    }
  }

  get summaryGrandTotal(): number {
    return this.summaryRows.reduce((s, r) => s + r.total, 0);
  }

  exportSummaryToPDF() {
    if (!this.summaryRows.length) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const leftMargin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Comprobante de Vales de Entrega', leftMargin, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${this.summaryFromDate}  →  ${this.summaryToDate}`, leftMargin, 23);

    autoTable(doc, {
      startY: 28,
      head: [['Nº Vale', 'Fecha', 'Total ($)']],
      body: this.summaryRows.map(r => [
        r.code,
        new Date(r.date).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' }),
        '$' + r.total.toFixed(2)
      ]),
      foot: [['', 'TOTAL GENERAL', '$' + this.summaryGrandTotal.toFixed(2)]],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 55 }, 2: { cellWidth: 55, halign: 'right' } },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 60;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}  |  Usuario: ${this.currentUserName}`, leftMargin, finalY + 10);
    doc.setTextColor(0);

    doc.save(`comprobante-vales-${this.summaryFromDate}_${this.summaryToDate}.pdf`);
    this.notificationService.showSuccess('PDF exportado correctamente');
  }

  exportSummaryToExcel() {
    if (!this.summaryRows.length) return;
    const data: any[][] = [
      ['Comprobante de Vales de Entrega'],
      [`Período: ${this.summaryFromDate} - ${this.summaryToDate}`],
      [],
      ['Nº Vale', 'Fecha', 'Total ($)'],
      ...this.summaryRows.map(r => [
        r.code,
        new Date(r.date).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' }),
        r.total
      ]),
      [],
      ['', 'TOTAL GENERAL', this.summaryGrandTotal]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comprobante');
    XLSX.writeFile(wb, `comprobante-vales-${this.summaryFromDate}_${this.summaryToDate}.xlsx`);
    this.notificationService.showSuccess('Excel exportado correctamente');
  }
}
