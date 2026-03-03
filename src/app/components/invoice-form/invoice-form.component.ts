import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgIconsModule, provideIcons } from '@ng-icons/core';
import {
  lucideFileText,
  lucidePlus,
  lucideTrash2,
  lucideSave,
} from '@ng-icons/lucide';
import { InvoicesService } from '../../services/invoices/invoices.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/shared/notification.service';
import { UserService } from '../../services/auth/user.service';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconsModule],
  providers: [
    provideIcons({
      lucideFileText,
      lucidePlus,
      lucideTrash2,
      lucideSave,
    }),
  ],
  templateUrl: './invoice-form.component.html',
})
export class InvoiceFormComponent implements OnInit {
  invoiceForm: FormGroup;
  products: any[] = [];

  constructor(
    private fb: FormBuilder,
    private invoicesService: InvoicesService,
    private inventoryService: InventoryService,
    private notificationService: NotificationService,
    private userService: UserService
  ) {
    console.log('InvoiceFormComponent constructor called');
    this.invoiceForm = this.fb.group({
      customerName: ['', Validators.required],
      customerId: [''],
      customerAddress: [''],
      customerPhone: [''],
      date: [this.getTodayDate()],
      taxRate: [0, [Validators.min(0), Validators.max(100)]],
      discount: [0, Validators.min(0)],
      notes: [''],
      items: this.fb.array<FormGroup>([]),
    });

    this.addItem();
  }

  ngOnInit() {
    console.log('InvoiceFormComponent initialized');
    this.loadProducts();
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private loadProducts() {
    this.inventoryService.getInventory().subscribe({
      next: (data) => {
        this.products = data.filter((p: any) => p.stock > 0);
      },
      error: () => this.notificationService.showError('Error al cargar productos'),
    });
  }

  get items(): FormArray<FormGroup> {
    return this.invoiceForm.get('items') as FormArray<FormGroup>;
  }

  addItem() {
    const itemGroup = this.fb.group({
      productCode: [''],
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      amount: [{ value: 0, disabled: true }],
    });

    this.items.push(itemGroup);
    this.subscribeToItemChanges(itemGroup);
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  private subscribeToItemChanges(item: FormGroup) {
    item.get('quantity')?.valueChanges.subscribe(() => this.updateItemAmount(item));
    item.get('unitPrice')?.valueChanges.subscribe(() => this.updateItemAmount(item));
  }

  private updateItemAmount(item: FormGroup) {
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    const amount = quantity * unitPrice;
    item.get('amount')?.setValue(amount, { emitEvent: false });
  }

  onProductSelect(index: number, event: Event) {
    const productCode = (event.target as HTMLSelectElement).value;
    const product = this.products.find(p => p.productCode === productCode);
    
    if (product) {
      const item = this.items.at(index);
      item.patchValue({
        description: product.productName,
        unitPrice: product.unitPrice || 0,
      });
      this.updateItemAmount(item);
    }
  }

  get subtotal(): number {
    return this.items.controls.reduce((sum, item) => {
      const quantity = item.get('quantity')?.value || 0;
      const unitPrice = item.get('unitPrice')?.value || 0;
      return sum + (quantity * unitPrice);
    }, 0);
  }

  get taxAmount(): number {
    const taxRate = this.invoiceForm.get('taxRate')?.value || 0;
    return this.subtotal * (taxRate / 100);
  }

  get discountValue(): number {
    return this.invoiceForm.get('discount')?.value || 0;
  }

  get total(): number {
    return this.subtotal + this.taxAmount - this.discountValue;
  }

  async onSubmit() {
    if (this.invoiceForm.valid && this.items.length > 0) {
      const formValue = this.invoiceForm.value;
      
      // Get current user name
      let currentUserName = 'System';
      try {
        console.log('🔍 Intentando obtener nombre de usuario para factura...');
        currentUserName = await this.userService.getCurrentUserName();
        console.log('🔍 Nombre de usuario obtenido para factura:', currentUserName);
        console.log('🔍 Valor de currentUserName en factura:', currentUserName);
      } catch (error) {
        console.error('❌ Error getting current user name:', error);
      }
      
      const invoiceData = {
        customerName: formValue.customerName,
        customerId: formValue.customerId || undefined,
        customerAddress: formValue.customerAddress || undefined,
        customerPhone: formValue.customerPhone || undefined,
        date: formValue.date || undefined,
        taxRate: formValue.taxRate || 0,
        discount: formValue.discount || 0,
        notes: formValue.notes || undefined,
        createdByName: currentUserName,
        items: formValue.items.map((item: any) => ({
          productCode: item.productCode || undefined,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
        })),
      };

      console.log('🔍 Datos completos de factura:', invoiceData);
      console.log('🔍 createdByName en factura:', invoiceData.createdByName);

      this.invoicesService.createInvoice(invoiceData).subscribe({
        next: () => {
          this.notificationService.showSuccess('Factura creada exitosamente');
          this.notificationService.notifyRefresh();
          this.resetForm();
        },
        error: (error) => {
          console.error('Error al crear factura:', error);
          const errorMsg = typeof error === 'string' ? error : error?.message || '';
          const cleanMsg = errorMsg.replace('Validation error: ', '').replace('Validation: ', '');
          this.notificationService.showError(cleanMsg || 'Error al crear la factura');
        },
      });
    } else {
      this.notificationService.showError('Complete todos los campos requeridos');
    }
  }

  private resetForm() {
    this.invoiceForm.reset({
      customerName: '',
      customerId: '',
      customerAddress: '',
      customerPhone: '',
      date: this.getTodayDate(),
      taxRate: 0,
      discount: 0,
      notes: '',
    });
    this.items.clear();
    this.addItem();
  }
}
