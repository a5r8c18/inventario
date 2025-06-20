import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { ReportsService } from '../../services/reports/reports.service';
import { NotificationService } from '../../services/shared/notification.service';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';

@Component({
  selector: 'app-reception-report',
  standalone: true,
  imports: [CommonModule, NgIcon, FilterBarComponent],
  templateUrl: './reception-report.component.html',
})
export class ReceptionReportComponent implements OnInit {
  reports: any[] = [];
  selectedReport: any = null;
  pagedReports: any[] = [];
  currentPage = 1;
  pageSize = 10;

  constructor(
    private reportsService: ReportsService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadReports();
  }

  closeModal() {
    this.selectedReport = null;
  }

  loadReports() {
    this.reportsService.getReceptionReports().subscribe({
      next: (data) => {
        this.reports = data;
        this.setPage(1);
      },
      error: () =>
        this.notificationService.showError('Error al cargar informes'),
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
    this.reportsService.getReceptionReports(filters).subscribe({
      next: (data) => {
        this.reports = data;
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
    this.reportsService.downloadPDF(report.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe-recepcion-${
          report.purchase?.document || report.id
        }.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.notificationService.showError('Error al descargar PDF'),
    });
  }

  downloadExcel(report: any) {
    this.reportsService.downloadExcel(report.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe-recepcion-${
          report.purchase?.document || report.id
        }.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () =>
        this.notificationService.showError('Error al descargar Excel'),
    });
  }
  getTotalAmount(): number {
    if (
      this.selectedReport &&
      this.selectedReport.details &&
      Array.isArray(this.selectedReport.details.products)
    ) {
      return this.selectedReport.details.products
        .map((p: any) => Number(p.amount) || 0)
        .reduce((sum: number, curr: number) => sum + curr, 0);
    }
    return 0;
  }
}