import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { ReportsService } from '../../services/reports/reports.service';
import { NotificationService } from '../../services/shared/notification.service';
import { UserService } from '../../services/auth/user.service';
import { CompanyStateService } from '../../services/companies/company-state.service';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reception-report',
  standalone: true,
  imports: [CommonModule, NgIcon, FilterBarComponent],
  templateUrl: './reception-report.component.html',
})
export class ReceptionReportComponent implements OnInit, OnDestroy {
  private refreshSub!: Subscription;
  private companyChangeSub!: Subscription;
  reports: any[] = [];
  selectedReport: any = null;
  pagedReports: any[] = [];
  currentPage = 1;
  pageSize = 10;
  currentUserName = '';

  constructor(
    private reportsService: ReportsService,
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

  closeModal() {
    this.selectedReport = null;
  }

  loadReports() {
    this.reportsService.getReceptionReports().subscribe({
      next: (data) => {
        console.log('Received reports:', data);
        this.reports = data;
        this.setPage(1);
      },
      error: () =>
        this.notificationService.showError('Error al cargar informes'),
    });
  }

  // Helper method to safely parse details
  private parseDetails(report: any): any {
    if (typeof report.details === 'string') {
      try {
        return JSON.parse(report.details);
      } catch (e) {
        console.error('Error parsing report details:', e);
        return {};
      }
    }
    return report.details || {};
  }

  // Helper method to get parsed details
  getDetails(report: any): any {
    return this.parseDetails(report);
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
    this.reportsService.getReceptionReports(filters).subscribe({
      next: (data) => {
        let filteredReports = data;
        
        // Filter by expiration date locally (stored in details.products JSON)
        if (filters.expirationDate) {
          filteredReports = data.filter((report: any) => {
            if (report.details && Array.isArray(report.details.products)) {
              return report.details.products.some((product: any) => 
                product.expirationDate === filters.expirationDate
              );
            }
            return false;
          });
        }
        
        this.reports = filteredReports;
        this.setPage(1);
      },
      error: () =>
        this.notificationService.showError('Error al aplicar filtros'),
    });
  }

  viewReport(report: any) {
    this.notificationService.showSuccess(
      `Visualizando informe ${report.purchase?.document || report.id}`
    );
    this.selectedReport = report;
  }

  downloadPDF(report: any) {
    this.notificationService.showSuccess('Generando PDF...');
    
    const doc = new jsPDF();
    const details = this.getDetails(report);
    const products = details.products || [];
    
    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORME DE RECEPCIÓN', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    // Documento
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Documento: ${details.document || '-'}`, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
    
    // Información de Origen (lado izquierdo)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Información de Origen', 14, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Entidad: ${details.entity || '-'}`, 14, 48);
    doc.text(`Almacén: ${details.warehouse || '-'}`, 14, 55);
    doc.text(`Proveedor: ${details.supplier || '-'}`, 14, 62);
    
    // Detalles del Documento (lado derecho)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalles del Documento', 110, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Tipo: ${details.documentType || '-'}`, 110, 48);
    doc.text(`Fecha: ${report.createdAt ? new Date(report.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}`, 110, 55);
    
    // Tabla de productos
    if (products.length > 0) {
      autoTable(doc, {
        startY: 75,
        head: [['Código', 'Descripción', 'U/M', 'Cantidad', 'P. Unit.', 'Importe']],
        body: products.map((p: any) => [
          p.code || '-',
          p.description || '-',
          p.unit || '-',
          p.quantity || 0,
          p.unitPrice ? '$' + Number(p.unitPrice).toFixed(2) : '-',
          p.amount ? '$' + Number(p.amount).toFixed(2) : '-',
        ]),
        foot: [[
          { content: 'TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: '$' + this.getTotalAmountForReport(report).toFixed(2), styles: { fontStyle: 'bold' } }
        ]],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold' },
      });
    }
    
    const finalY = (doc as any).lastAutoTable?.finalY || 75;
    
    // Estado de Conformidad
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Estado de Conformidad', 14, finalY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const compliesText = details.complies ? 'SÍ' : 'NO';
    doc.text(
      `Los materiales recibidos ${compliesText} corresponden a la calidad, especificaciones,`,
      14, finalY + 23
    );
    doc.text(
      'estado de conservación y cantidades que muestran los documentos del suministrador.',
      14, finalY + 30
    );
    
    // Sección de Transportista
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Transportista', 14, finalY + 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre: ${details.transportista?.nombre || '__________________'}`, 14, finalY + 53);
    doc.text(`CI: ${details.transportista?.ci || '__________________'}`, 14, finalY + 60);
    doc.text(`Chapa: ${details.transportista?.chapa || '__________________'}`, 14, finalY + 67);
    doc.text('Firma: __________________', 14, finalY + 74);
    
    // Sección de Responsables
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Responsables', 110, finalY + 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Jefe de Almacén: __________________', 110, finalY + 53);
    doc.text(`Recepcionado por: ${this.currentUserName || '__________________'}`, 110, finalY + 60);
    doc.text('Anotado por: __________________', 110, finalY + 67);
    doc.text('Contabilizado por: __________________', 110, finalY + 74);
    
    // Guardar PDF
    doc.save(`informe-recepcion-${details.document || report.id}.pdf`);
    this.notificationService.showSuccess('PDF descargado correctamente');
  }

  getTotalAmountForReport(report: any): number {
    if (report) {
      const details = this.getDetails(report);
      if (details && Array.isArray(details.products)) {
        return details.products
          .map((p: any) => Number(p.amount) || 0)
          .reduce((sum: number, curr: number) => sum + curr, 0);
      }
    }
    return 0;
  }

  downloadExcel(report: any) {
    this.notificationService.showSuccess('Generando Excel...');
    
    const details = this.getDetails(report);
    const products = details.products || [];
    
    const worksheetData = [
      ['INFORME DE RECEPCIÓN'],
      [],
      ['Información de Origen'],
      ['Entidad', details.entity || '-'],
      ['Almacén', details.warehouse || '-'],
      ['Proveedor', details.supplier || '-'],
      [],
      ['Detalles del Documento'],
      ['Documento', details.document || '-'],
      ['Tipo', details.documentType || '-'],
      ['Fecha', report.createdAt ? new Date(report.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'],
      [],
      ['Productos Recibidos'],
      ['Código', 'Descripción', 'U/M', 'Cantidad', 'P. Unit.', 'Importe'],
      ...products.map((p: any) => [
        p.code || '-',
        p.description || '-',
        p.unit || '-',
        p.quantity || 0,
        p.unitPrice ? '$' + Number(p.unitPrice).toFixed(2) : '-',
        p.amount ? '$' + Number(p.amount).toFixed(2) : '-',
      ]),
      ['', '', '', '', 'TOTAL', '$' + this.getTotalAmountForReport(report).toFixed(2)],
      [],
      ['Estado de Conformidad'],
      ['Los materiales recibidos', details.complies ? 'SÍ corresponden' : 'NO corresponden'],
      [],
      ['Transportista'],
      ['Nombre', details.transportista?.nombre || '-'],
      ['CI', details.transportista?.ci || '-'],
      ['Chapa', details.transportista?.chapa || '-'],
      [],
      ['Responsables'],
      ['Jefe de Almacén', '__________________'],
      ['Recepcionado por', this.currentUserName || '__________________'],
      ['Anotado por', '__________________'],
      ['Contabilizado por', '__________________'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 20 },
      { wch: 35 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informe de Recepción');
    XLSX.writeFile(wb, `informe-recepcion-${details.document || report.id}.xlsx`);
    
    this.notificationService.showSuccess('Excel descargado correctamente');
  }
  getTotalAmount(): number {
    if (this.selectedReport) {
      const details = this.getDetails(this.selectedReport);
      if (details && Array.isArray(details.products)) {
        return details.products
          .map((p: any) => Number(p.amount) || 0)
          .reduce((sum: number, curr: number) => sum + curr, 0);
      }
    }
    return 0;
  }
}
