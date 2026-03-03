import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InvoicesService, Invoice } from '../../services/invoices/invoices.service';
import { NotificationService } from '../../services/shared/notification.service';
import { UserService } from '../../services/auth/user.service';
import { CompanyStateService } from '../../services/companies/company-state.service';
import { TauriService } from '../../services/tauri.service';
import { Company } from '../../../types/backend-models';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-invoice-view',
  standalone: true,
  imports: [CommonModule, NgIconsModule],
  templateUrl: './invoice-view.component.html',
})
export class InvoiceViewComponent implements OnInit {
  invoice: Invoice | null = null;
  loading = true;
  currentUserName: string = '';
  currentUserRole: string = '';
  activeCompany: Company | null = null;
  companyLogoUrl: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invoicesService: InvoicesService,
    private notificationService: NotificationService,
    public userService: UserService,
    private companyState: CompanyStateService,
    private tauri: TauriService
  ) {}

  async ngOnInit() {
    this.activeCompany = this.companyState.activeCompany;
    if (this.activeCompany?.logo_path) {
      this.companyLogoUrl = await this.loadLogoBase64(this.activeCompany.logo_path);
    }
    this.companyState.activeCompany$.subscribe(async company => {
      this.activeCompany = company;
      this.companyLogoUrl = company?.logo_path
        ? await this.loadLogoBase64(company.logo_path)
        : null;
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInvoice(id);
      this.loadCurrentUser();
    } else {
      this.notificationService.showError('ID de factura no proporcionado');
      this.router.navigate(['/invoices']);
    }
  }

  private async loadCurrentUser() {
    try {
      this.currentUserName = await this.userService.getCurrentUserName();
      this.currentUserRole = this.userService.getCurrentUserRole();
    } catch (error) {
      console.error('Error loading current user:', error);
      this.currentUserName = 'Usuario';
      this.currentUserRole = 'Usuario';
    }
  }

  private loadInvoice(id: string) {
    this.invoicesService.getInvoiceById(id).subscribe({
      next: (invoice) => {
        console.log('📄 Invoice data received:', invoice);
        console.log('📄 Invoice fields:', {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          date: invoice.date,
          status: invoice.status,
          total: invoice.total,
          items: invoice.items?.length || 0
        });
        this.invoice = invoice;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar factura:', error);
        this.notificationService.showError('Error al cargar la factura');
        this.router.navigate(['/invoices']);
      },
    });
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
      month: 'long',
      day: 'numeric',
    });
  }

  
  backToList() {
    this.router.navigate(['/invoices']);
  }

  async downloadPDF() {
    if (!this.invoice) return;
    
    this.notificationService.showSuccess('Generando PDF...');
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Cargar logo de la empresa activa como base64
    const logoBase64 = this.activeCompany?.logo_path
      ? await this.loadLogoBase64(this.activeCompany.logo_path)
      : null;
    
    this.generatePDFContent(doc, pageWidth, logoBase64);
  }

  private async loadLogoBase64(path: string): Promise<string | null> {
    try {
      return await this.tauri.getImageAsBase64(path);
    } catch {
      return null;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private generatePDFContent(doc: jsPDF, pageWidth: number, logoBase64: string | null) {
    let currentY = 15;
    const leftMargin = 14;
    const rightCol = pageWidth / 2 + 5;
    
    // ========== HEADER: Logo + Empresa (igual que HTML) ==========
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', leftMargin, currentY, 32, 20);
      } catch (e) {
        console.warn('Error al agregar logo al PDF:', e);
      }
    }
    
    // Info empresa al lado del logo
    const company = this.activeCompany;
    const companyX = leftMargin + 38;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || 'Mi Empresa', companyX, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let infoY = currentY + 9;
    if (company?.tax_id) { doc.text(`RUC/NIT: ${company.tax_id}`, companyX, infoY); infoY += 4; }
    if (company?.phone) { doc.text(`Teléfono: ${company.phone}`, companyX, infoY); infoY += 4; }
    if (company?.email) { doc.text(`Email: ${company.email}`, companyX, infoY); infoY += 4; }
    if (company?.address) { doc.text(company.address, companyX, infoY); }
    
    currentY += 30;
    
    // ========== FACTURA HEADER ==========
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Factura', leftMargin, currentY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nº: ${this.invoice!.invoiceNumber}`, leftMargin, currentY + 7);
    
    // Estado badge (lado derecho)
    const statusText = this.getStatusLabel(this.invoice!.status);
    let statusBgColor = [229, 231, 235]; // gray-200
    let statusTextColor = [55, 65, 81]; // gray-700
    if (this.invoice!.status === 'pending') {
      statusBgColor = [254, 249, 195]; // yellow-100
      statusTextColor = [133, 77, 14]; // yellow-800
    } else if (this.invoice!.status === 'paid') {
      statusBgColor = [220, 252, 231]; // green-100
      statusTextColor = [22, 101, 52]; // green-800
    } else if (this.invoice!.status === 'cancelled') {
      statusBgColor = [254, 226, 226]; // red-100
      statusTextColor = [153, 27, 27]; // red-800
    }
    
    doc.setFillColor(statusBgColor[0], statusBgColor[1], statusBgColor[2]);
    doc.roundedRect(pageWidth - 50, currentY - 5, 36, 8, 2, 2, 'F');
    doc.setTextColor(statusTextColor[0], statusTextColor[1], statusTextColor[2]);
    doc.setFontSize(8);
    doc.text(statusText, pageWidth - 32, currentY, { align: 'center' });
    doc.setTextColor(0);
    
    doc.setFontSize(8);
    doc.text(`Fecha: ${this.formatDate(this.invoice!.date)}`, pageWidth - 50, currentY + 7);
    
    currentY += 18;
    
    // ========== DOS COLUMNAS: Cliente + Info Factura ==========
    const col1X = leftMargin;
    const col2X = rightCol;
    let col1Y = currentY;
    let col2Y = currentY;
    
    // Columna 1: Datos del Cliente
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos del Cliente', col1X, col1Y);
    col1Y += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Nombre: ${this.invoice!.customerName}`, col1X, col1Y);
    col1Y += 5;
    
    if (this.invoice!.customerId) {
      doc.text(`ID: ${this.invoice!.customerId}`, col1X, col1Y);
      col1Y += 5;
    }
    if (this.invoice!.customerAddress) {
      doc.text(`Dirección: ${this.invoice!.customerAddress}`, col1X, col1Y);
      col1Y += 5;
    }
    if (this.invoice!.customerPhone) {
      doc.text(`Teléfono: ${this.invoice!.customerPhone}`, col1X, col1Y);
      col1Y += 5;
    }
    
    // Columna 2: Información de Factura
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Información de Factura', col2X, col2Y);
    col2Y += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Nº Factura: ${this.invoice!.invoiceNumber}`, col2X, col2Y);
    col2Y += 5;
    doc.text(`Fecha: ${this.formatDate(this.invoice!.date)}`, col2X, col2Y);
    col2Y += 5;
    doc.text(`Estado: ${statusText}`, col2X, col2Y);
    col2Y += 5;
    if (this.invoice!.createdByName) {
      doc.text(`Creado por: ${this.invoice!.createdByName}`, col2X, col2Y);
      col2Y += 5;
    }
    
    currentY = Math.max(col1Y, col2Y) + 10;
    
    // ========== TABLA DE PRODUCTOS ==========
    if (this.invoice!.items && this.invoice!.items.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Productos/Servicios', leftMargin, currentY);
      currentY += 5;
      
      autoTable(doc, {
        startY: currentY,
        head: [['Código', 'Descripción', 'Cantidad', 'P. Unitario', 'Subtotal']],
        body: this.invoice!.items.map(item => [
          item.productCode || '-',
          item.description,
          item.quantity.toFixed(2),
          item.unitPrice.toFixed(2),
          (item.amount || 0).toFixed(2)
        ]),
        theme: 'grid',
        headStyles: { 
          fillColor: [243, 244, 246], 
          textColor: [0, 0, 0], 
          fontStyle: 'bold',
          lineColor: [209, 213, 219],
          lineWidth: 0.3
        },
        bodyStyles: {
          lineColor: [209, 213, 219],
          lineWidth: 0.3
        },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 28, halign: 'right' },
          4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
        }
      });
    }
    
    const finalY = (doc as any).lastAutoTable?.finalY || currentY + 30;
    currentY = finalY + 10;
    
    // ========== TOTALES (alineados a la derecha) ==========
    const totalsX = pageWidth - 80;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(this.invoice!.subtotal.toFixed(2), pageWidth - leftMargin, currentY, { align: 'right' });
    currentY += 5;
    
    doc.text(`Impuesto (${this.invoice!.taxRate}%):`, totalsX, currentY);
    doc.text(this.invoice!.taxAmount.toFixed(2), pageWidth - leftMargin, currentY, { align: 'right' });
    currentY += 5;
    
    if (this.invoice!.discount > 0) {
      doc.text('Descuento:', totalsX, currentY);
      doc.text(`-${this.invoice!.discount.toFixed(2)}`, pageWidth - leftMargin, currentY, { align: 'right' });
      currentY += 5;
    }
    
    // Línea separadora
    doc.setLineWidth(0.3);
    doc.line(totalsX, currentY, pageWidth - leftMargin, currentY);
    currentY += 5;
    
    // Total
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', totalsX, currentY);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text(this.invoice!.total.toFixed(2), pageWidth - leftMargin, currentY, { align: 'right' });
    doc.setTextColor(0);
    
    currentY += 12;
    
    // ========== NOTAS ==========
    if (this.invoice!.notes) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Notas', leftMargin, currentY);
      currentY += 5;
      
      doc.setFillColor(249, 250, 251); // gray-50
      const notesLines = doc.splitTextToSize(this.invoice!.notes, pageWidth - 28);
      const notesHeight = notesLines.length * 4 + 6;
      doc.roundedRect(leftMargin, currentY - 3, pageWidth - 28, notesHeight, 2, 2, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(notesLines, leftMargin + 3, currentY + 2);
      currentY += notesHeight + 8;
    }
    
    // ========== DOS COLUMNAS: Transportista + Facturador ==========
    // Verificar si hay espacio, si no, nueva página
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }
    
    const boxWidth = (pageWidth - 28 - 10) / 2;
    const box1X = leftMargin;
    const box2X = leftMargin + boxWidth + 10;
    const boxStartY = currentY;
    
    // Box 1: Transportista
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.3);
    doc.roundedRect(box1X, boxStartY, boxWidth, 45, 2, 2, 'S');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos del Transportista', box1X + 4, boxStartY + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Nombre: _______________________', box1X + 4, boxStartY + 16);
    doc.text('Cédula: _______________________', box1X + 4, boxStartY + 24);
    doc.text('Placa Vehículo: ________________', box1X + 4, boxStartY + 32);
    doc.text('Teléfono: _____________________', box1X + 4, boxStartY + 40);
    
    // Box 2: Facturador
    doc.roundedRect(box2X, boxStartY, boxWidth, 45, 2, 2, 'S');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Facturador(a)', box2X + 4, boxStartY + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    doc.text(`Nombre: ${this.currentUserName}`, box2X + 4, boxStartY + 16);
    doc.text(`Cargo: ${this.currentUserRole}`, box2X + 4, boxStartY + 24);
    doc.text(`Fecha: ${this.formatDate(this.invoice!.date)}`, box2X + 4, boxStartY + 32);
    doc.text('Sello: ________________________', box2X + 4, boxStartY + 40);
    
    currentY = boxStartY + 55;
    
    // ========== FIRMAS ==========
    const signWidth = (pageWidth - 28 - 20) / 2;
    const sign1X = leftMargin;
    const sign2X = pageWidth - leftMargin - signWidth;
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(31, 41, 55); // gray-800
    doc.line(sign1X, currentY + 15, sign1X + signWidth, currentY + 15);
    doc.line(sign2X, currentY + 15, sign2X + signWidth, currentY + 15);
    
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text('Firma del Cliente', sign1X + signWidth / 2, currentY + 20, { align: 'center' });
    doc.text('Firma del Facturador(a)', sign2X + signWidth / 2, currentY + 20, { align: 'center' });
    doc.setTextColor(0);
    
    // Guardar PDF
    doc.save(`factura_${this.invoice!.invoiceNumber}.pdf`);
    this.notificationService.showSuccess('PDF descargado correctamente');
  }

  
  downloadExcel() {
    if (!this.invoice) return;
    
    this.invoicesService.downloadExcel(this.invoice.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura_${this.invoice!.invoiceNumber}.csv`;
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
