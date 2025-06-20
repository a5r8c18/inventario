import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
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
export class PurchaseFormComponent {
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

    this.addProduct();
  }

  get products() {
    return this.purchaseForm.get('products') as FormArray;
  }

  // Custom validator for expirationDate
  private dateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Allow empty value (optional)
    }
    const date = new Date(control.value);
    return isNaN(date.getTime()) ? { invalidDate: true } : null;
  }

  addProduct() {
    this.products.push(
      this.fb.group({
        code: ['', Validators.required],
        description: ['', Validators.required],
        unit: ['', Validators.required],
        quantity: [0, [Validators.required, Validators.min(1)]],
        unitPrice: [0, [Validators.required, Validators.min(0)]],
        amount: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]], // Disabled to prevent manual input
        expirationDate: ['', this.dateValidator], // Optional with date validation
      })
    );

    // Subscribe to quantity and unitPrice changes to calculate amount
    const product = this.products.at(this.products.length - 1);
    this.subscribeToProductChanges(product as FormGroup);
  }

  // Subscribe to quantity and unitPrice changes to update amount
  private subscribeToProductChanges(product: FormGroup) {
    product.get('quantity')?.valueChanges.subscribe(() => this.updateAmount(product));
    product.get('unitPrice')?.valueChanges.subscribe(() => this.updateAmount(product));
  }

  // Calculate amount based on quantity * unitPrice
  private updateAmount(product: FormGroup) {
    const quantity = product.get('quantity')?.value || 0;
    const unitPrice = product.get('unitPrice')?.value || 0;
    const amount = quantity * unitPrice;
    product.get('amount')?.setValue(amount, { emitEvent: false });
  }

  onSubmit() {
    if (this.purchaseForm.valid) {
      // Enable amount fields before submitting to include them in the form value
      this.products.controls.forEach((product) => {
        product.get('amount')?.enable({ emitEvent: false });
      });

      console.log('Datos enviados al backend:', this.purchaseForm.value);
      this.purchasesService.createPurchase(this.purchaseForm.value).subscribe({
        next: () => {
          this.notificationService.showSuccess('Compra registrada exitosamente');
          this.purchaseForm.reset();
          this.products.clear();
          this.addProduct(); // Add a new empty product after reset
        },
        error: () => this.notificationService.showError('Error al registrar la compra'),
      });
    } else {
      this.notificationService.showError('Por favor, completa todos los campos obligatorios');
    }
  }
}

