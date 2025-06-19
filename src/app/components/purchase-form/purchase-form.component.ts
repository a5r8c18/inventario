import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgIconsModule } from '@ng-icons/core';
import { PurchasesService } from '../../services/purchases/purchases.service';
import { NotificationService } from '../../services/shared/notification.service';

@Component({
  selector: 'app-purchase-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconsModule],
  templateUrl: './purchase-form.component.html',
})
export class PurchaseFormComponent implements OnInit {
  purchaseForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private purchasesService: PurchasesService,
    private notificationService: NotificationService
  ) {
    this.purchaseForm = this.fb.group({
      entity: ['', Validators.required],
      warehouse: ['', Validators.required],
      supplier: ['', Validators.required],
      document: ['', Validators.required],
      products: this.fb.array([]),
    });

    // Agrega un producto por defecto al iniciar
    this.addProduct();
  }

  ngOnInit() {
    // Configurar la suscripción a cambios en cada producto existente
    this.products.controls.forEach((product, index) => {
      this.subscribeToProductChanges(index);
    });
  }

  get products() {
    return this.purchaseForm.get('products') as FormArray;
  }

  addProduct() {
    const productGroup = this.fb.group({
      code: ['', Validators.required],
      description: ['', Validators.required],
      unit: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      amount: [
        { value: 0, disabled: true },
        [Validators.required, Validators.min(0)],
      ],
      expirationDate: [''],
    });

    this.products.push(productGroup);

    // Suscribirse a los cambios del nuevo producto
    this.subscribeToProductChanges(this.products.length - 1);
  }

  subscribeToProductChanges(index: number) {
    const product = this.products.at(index) as FormGroup;
    const quantity = product.get('quantity');
    const unitPrice = product.get('unitPrice');
    const amount = product.get('amount');

    // Suscribirse a cambios en quantity o unitPrice
    quantity?.valueChanges.subscribe(() => this.calculateAmount(product));
    unitPrice?.valueChanges.subscribe(() => this.calculateAmount(product));

    // Calcular inicialmente por si hay valores por defecto
    this.calculateAmount(product);
  }

  calculateAmount(product: FormGroup) {
    const quantity = product.get('quantity')?.value || 0;
    const unitPrice = product.get('unitPrice')?.value || 0;
    const amount = quantity * unitPrice;
    product.get('amount')?.setValue(amount, { emitEvent: false });
  }

  onSubmit() {
    console.log('Datos enviados al backend:', this.purchaseForm.getRawValue());
    if (this.purchaseForm.valid) {
      this.purchasesService
        .createPurchase(this.purchaseForm.getRawValue())
        .subscribe({
          next: () => {
            this.notificationService.showSuccess(
              'Compra registrada exitosamente'
            );
            this.purchaseForm.reset();
            this.products.clear();
            this.addProduct();
          },
          error: () =>
            this.notificationService.showError('Error al registrar la compra'),
        });
    } else {
      this.notificationService.showError(
        'Por favor, completa todos los campos obligatorios'
      );
    }
  }
}
