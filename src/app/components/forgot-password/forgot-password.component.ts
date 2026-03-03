import { Component, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgIconsModule, provideIcons } from '@ng-icons/core';
import {
  lucideMail,
  lucideLock,
  lucideEye,
  lucideEyeOff,
  lucideShieldCheck,
} from '@ng-icons/lucide';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconsModule, RouterLink],
  providers: [
    provideIcons({ lucideMail, lucideLock, lucideEye, lucideEyeOff, lucideShieldCheck }),
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div class="flex justify-center mb-6">
          <ng-icon
            name="lucideShieldCheck"
            class="text-indigo-600"
            size="2rem"
          ></ng-icon>
        </div>
        <h2 class="text-2xl font-bold text-center text-gray-800 mb-2">
          Restablecer Contraseña
        </h2>
        <p class="text-sm text-gray-500 mb-6 text-center">
          Ingresa tu correo electrónico y tu nueva contraseña.
        </p>
        <form
          [formGroup]="resetForm"
          (ngSubmit)="onSubmit()"
          class="space-y-5"
        >
          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              <div class="flex items-center">
                <ng-icon name="lucideMail" class="h-4 w-4 text-gray-500 mr-1"></ng-icon>
                <span>Correo Electrónico</span>
              </div>
            </label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="tu&#64;correo.com"
              [class.border-red-500]="showError('email')"
            />
            <div *ngIf="showError('email')" class="text-red-500 text-sm mt-1">
              Por favor, ingresa un correo electrónico válido.
            </div>
          </div>

          <!-- Nueva Contraseña -->
          <div>
            <label for="newPassword" class="block text-sm font-medium text-gray-700">
              <div class="flex items-center">
                <ng-icon name="lucideLock" class="h-4 w-4 text-gray-500 mr-1"></ng-icon>
                <span>Nueva Contraseña</span>
              </div>
            </label>
            <div class="mt-1 relative rounded-md shadow-sm">
              <input
                id="newPassword"
                [type]="showNewPassword() ? 'text' : 'password'"
                formControlName="newPassword"
                class="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Mínimo 6 caracteres"
                [class.border-red-500]="showError('newPassword')"
              />
              <button
                type="button"
                (click)="showNewPassword.set(!showNewPassword())"
                class="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none"
              >
                <ng-icon
                  [name]="showNewPassword() ? 'lucideEyeOff' : 'lucideEye'"
                  class="h-5 w-5 text-gray-400 hover:text-gray-500"
                ></ng-icon>
              </button>
            </div>
            <div *ngIf="showError('newPassword')" class="text-red-500 text-sm mt-1">
              La contraseña debe tener al menos 6 caracteres.
            </div>
          </div>

          <!-- Confirmar Contraseña -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
              <div class="flex items-center">
                <ng-icon name="lucideLock" class="h-4 w-4 text-gray-500 mr-1"></ng-icon>
                <span>Confirmar Contraseña</span>
              </div>
            </label>
            <div class="mt-1 relative rounded-md shadow-sm">
              <input
                id="confirmPassword"
                [type]="showConfirmPassword() ? 'text' : 'password'"
                formControlName="confirmPassword"
                class="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Repite la contraseña"
                [class.border-red-500]="showError('confirmPassword') || showMismatchError()"
              />
              <button
                type="button"
                (click)="showConfirmPassword.set(!showConfirmPassword())"
                class="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none"
              >
                <ng-icon
                  [name]="showConfirmPassword() ? 'lucideEyeOff' : 'lucideEye'"
                  class="h-5 w-5 text-gray-400 hover:text-gray-500"
                ></ng-icon>
              </button>
            </div>
            <div *ngIf="showError('confirmPassword')" class="text-red-500 text-sm mt-1">
              La confirmación es obligatoria.
            </div>
            <div *ngIf="showMismatchError()" class="text-red-500 text-sm mt-1">
              Las contraseñas no coinciden.
            </div>
          </div>

          <!-- Submit -->
          <div>
            <button
              type="submit"
              [disabled]="resetForm.invalid || isSubmitting"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <span *ngIf="!isSubmitting">Restablecer Contraseña</span>
              <span *ngIf="isSubmitting">Procesando...</span>
            </button>
          </div>
        </form>
        <p class="mt-4 text-center text-sm text-gray-600">
          ¿Ya recuerdas tu contraseña?
          <a routerLink="/login" class="text-indigo-600 hover:text-indigo-500">Inicia sesión</a>
        </p>
        <p class="mt-2 text-center text-sm text-gray-600">
          ¿No tienes una cuenta?
          <a routerLink="/signup" class="text-indigo-600 hover:text-indigo-500">Regístrate</a>
        </p>
      </div>
    </div>
  `,
  styles: [],
})
export class ForgotPasswordComponent {
  resetForm: FormGroup;
  isSubmitting = false;
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordsMatchValidator });
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordsMismatch: true };
    }
    return null;
  }

  showError(field: string): boolean {
    const control = this.resetForm.get(field);
    return !!control?.invalid && !!control?.touched;
  }

  showMismatchError(): boolean {
    const confirmControl = this.resetForm.get('confirmPassword');
    return !!this.resetForm.hasError('passwordsMismatch') && !!confirmControl?.touched && !confirmControl?.errors;
  }

  onSubmit() {
    if (this.resetForm.invalid) {
      Object.values(this.resetForm.controls).forEach(c => c.markAsTouched());
      return;
    }

    this.isSubmitting = true;
    const { email, newPassword } = this.resetForm.value;

    this.authService.resetPasswordDirect(email, newPassword).subscribe({
      next: () => {
        this.toastr.success(
          'Tu contraseña ha sido restablecida exitosamente.',
          'Éxito'
        );
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.isSubmitting = false;
        const msg = error?.message || error?.error?.message || 'Error al restablecer la contraseña';
        this.toastr.error(msg, 'Error');
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
  }
}
