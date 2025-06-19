import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { ReportsService } from '../../services/reports/reports.service';
import { NotificationService } from '../../services/shared/notification.service';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-reception-report',
  standalone: true,
  imports: [CommonModule, NgIcon, FilterBarComponent, ReactiveFormsModule],
  templateUrl: './reception-report.component.html',
})
export class ReceptionReportComponent implements OnInit {
  reports: any[] = [];
  selectedReport: any = null;
  pagedReports: any[] = [];
  currentPage = 1;
  pageSize = 10;
  showPdfModal = false;
  pdfForm: FormGroup;
  jwtHelper = new JwtHelperService();

  constructor(
    private reportsService: ReportsService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.pdfForm = this.fb.group({
      warehouseManager: ['', Validators.required],
      transporterName: ['', Validators.required],
      transporterPlate: ['', Validators.required],
      transporterCI: ['', Validators.required],
      signature: [''],
    });
  }

  ngOnInit() {
    this.loadReports();
  }

  closeModal() {
    this.selectedReport = null;
    this.showPdfModal = false;
    this.pdfForm.reset();
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

  openPdfModal(report: any) {
    this.selectedReport = report;
    this.showPdfModal = true;
  }

  submitPdfForm() {
    if (this.pdfForm.valid) {
      const token = localStorage.getItem('token');
      const decodedToken = token ? this.jwtHelper.decodeToken(token) : null;
      const formData = {
        ...this.pdfForm.value,
        receptor: decodedToken?.name || 'Usuario desconocido',
      };
      this.downloadPDF(this.selectedReport, formData);
      this.closeModal();
    } else {
      this.notificationService.showError(
        'Por favor, completa todos los campos obligatorios'
      );
    }
  }

  downloadPDF(report: any, formData: any) {
    this.reportsService.downloadPDF(report.id, formData).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe-recepcion-${
          report.purchase?.document || report.id
        }.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.notificationService.showSuccess('PDF generado exitosamente');
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

  onSignatureUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.pdfForm.get('signature')?.setValue(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }
}
