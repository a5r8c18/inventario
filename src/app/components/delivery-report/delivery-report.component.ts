import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { ReportsService } from '../../services/reports/reports.service';
import { NotificationService } from '../../services/shared/notification.service';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-delivery-report',
  standalone: true,
  imports: [CommonModule, NgIcon, FilterBarComponent],
  templateUrl: './delivery-report.component.html',
})
export class DeliveryReportComponent implements OnInit {
  reports: any[] = [];
  pagedReports: any[] = [];
  selectedReport: any = null;
  currentPage = 1;
  pageSize = 10;

  constructor(
    private reportsService: ReportsService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadReports();
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
    this.selectedReport = report;
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
    doc.text(
      `Entidad: ${report.entity || '-'} (Código: ${report.entityCode || '-'})`,
      10,
      30
    );
    doc.text(
      `Unidad: ${report.unit || '-'} (Código: ${report.unitCode || '-'})`,
      10,
      40
    );
    doc.text(`Almacén: ${report.warehouse || '-'}`, 10, 50);
    doc.text(`Orden No.: ${report.orderNo || '-'}`, 10, 60);
    doc.text(
      `Centro de Costo: ${report.costCenter || '-'} (Código: ${
        report.costCenterCode || '-'
      })`,
      10,
      70
    );
    doc.text(`Lote No.: ${report.lotNo || '-'}`, 10, 80);
    doc.text(
      `Fecha: ${
        report.date ? new Date(report.date).toLocaleDateString() : '-'
      }`,
      10,
      90
    );
    doc.text(
      `Tipo: ${report.type === 'delivery' ? 'Entrega' : 'Devolución'}`,
      10,
      100
    );

    if (report.products?.length) {
      autoTable(doc, {
        startY: 110,
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
          p.unitPrice ? Number(p.unitPrice).toFixed(2) : '-',
          p.amount ? Number(p.amount).toFixed(2) : '-',
          p.balance ? Number(p.balance).toFixed(2) : '-',
        ]),
        foot: [
          [
            { content: 'TOTAL', colSpan: 7 },
            Number(this.getTotalAmount(report)).toFixed(2),
            '-',
          ],
        ],
      });
    }

    doc.text(
      `Despachado/Devuelto por: ${
        report.dispatchedBy?.name || '__________________'
      }`,
      10,
      doc.lastAutoTable.finalY + 10
    );
    doc.text('Firma: __________________', 10, doc.lastAutoTable.finalY + 20);
    doc.text(
      `Recibido por: ${report.receivedBy?.name || '__________________'}`,
      10,
      doc.lastAutoTable.finalY + 30
    );
    doc.text('Firma: __________________', 10, doc.lastAutoTable.finalY + 40);
    doc.text(
      `Anotado: ${report.recorded || '__________________'}`,
      10,
      doc.lastAutoTable.finalY + 50
    );
    doc.text(
      `Control Inventario: ${report.inventoryControl || '__________________'}`,
      10,
      doc.lastAutoTable.finalY + 60
    );
    doc.text(
      `Contabilizado: ${report.accounted || '__________________'}`,
      10,
      doc.lastAutoTable.finalY + 70
    );
    doc.text(
      `Solicitud Materiales No.: ${report.materialRequestNo || '-'}`,
      100,
      doc.lastAutoTable.finalY + 50
    );
    doc.text(
      `Vale Entrega No.: ${report.deliveryVoucherNo || '-'}`,
      100,
      doc.lastAutoTable.finalY + 60
    );
    doc.text(
      `Vale Devolución No.: ${report.returnVoucherNo || '-'}`,
      100,
      doc.lastAutoTable.finalY + 70
    );

    doc.save(`vale-entrega-devolucion-${report.code || 'reporte'}.pdf`);
  }

  exportToExcel(report: any) {
    const worksheetData = [
      ['Vale de Entrega/Devolución'],
      ['Código', report.code || '-'],
      [
        'Entidad',
        `${report.entity || '-'} (Código: ${report.entityCode || '-'})`,
      ],
      ['Unidad', `${report.unit || '-'} (Código: ${report.unitCode || '-'})`],
      ['Almacén', report.warehouse || '-'],
      ['Orden No.', report.orderNo || '-'],
      [
        'Centro de Costo',
        `${report.costCenter || '-'} (Código: ${report.costCenterCode || '-'})`,
      ],
      ['Lote No.', report.lotNo || '-'],
      ['Fecha', report.date ? new Date(report.date).toLocaleDateString() : '-'],
      ['Tipo', report.type === 'delivery' ? 'Entrega' : 'Devolución'],
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
      ...report.products.map((p: any) => [
        p.code || '-',
        p.account || '-',
        p.subaccount || '-',
        p.description || '-',
        p.unit || '-',
        p.quantity || 0,
        p.unitPrice ? Number(p.unitPrice).toFixed(2) : '-',
        p.amount ? Number(p.amount).toFixed(2) : '-',
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
        Number(this.getTotalAmount(report)).toFixed(2),
        '-',
      ],
      [],
      [
        'Despachado/Devuelto por',
        report.dispatchedBy?.name || '__________________',
      ],
      ['Recibido por', report.receivedBy?.name || '__________________'],
      ['Anotado', report.recorded || '__________________'],
      ['Control Inventario', report.inventoryControl || '__________________'],
      ['Contabilizado', report.accounted || '__________________'],
      ['Solicitud Materiales No.', report.materialRequestNo || '-'],
      ['Vale Entrega No.', report.deliveryVoucherNo || '-'],
      ['Vale Devolución No.', report.returnVoucherNo || '-'],
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
        .map((p: any) => Number(p.amount) || 0)
        .reduce((sum: number, curr: number) => sum + curr, 0);
    }
    return 0;
  }
}
