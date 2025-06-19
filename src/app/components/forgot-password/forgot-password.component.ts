import { Component } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service'; // Asegúrate de ajustar la ruta
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgIconsModule } from '@ng-icons/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div class="flex justify-center mb-6">
          <ng-icon
            name="lucideMail"
            class="text-indigo-600"
            size="2rem"
          ></ng-icon>
        </div>
        <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">
          Restablecer Contraseña
        </h2>
        <p class="text-sm text-gray-600 mb-6 text-center">
          Ingresa tu correo electrónico y te enviaremos un enlace para
          restablecer tu contraseña.
        </p>
        <form
          [formGroup]="forgotPasswordForm"
          (ngSubmit)="onSubmit()"
          class="space-y-6"
        >
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700"
              >Correo Electrónico</label
            >
            <input
              id="email"
              type="email"
              formControlName="email"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="tu@correo.com"
              [class.border-red-500]="
                forgotPasswordForm.get('email')?.invalid &&
                forgotPasswordForm.get('email')?.touched
              "
            />
            <div
              *ngIf="
                forgotPasswordForm.get('email')?.invalid &&
                forgotPasswordForm.get('email')?.touched
              "
              class="text-red-500 text-sm mt-1"
            >
              Por favor, ingresa un correo electrónico válido.
            </div>
          </div>
          <div>
            <button
              type="submit"
              [disabled]="forgotPasswordForm.invalid"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Enviar Enlace
            </button>
          </div>
        </form>
        <p class="mt-4 text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta?
          <a routerLink="/login" class="text-indigo-600 hover:text-indigo-500"
            >Inicia sesión</a
          >
        </p>
        <p class="mt-2 text-center text-sm text-gray-600">
          ¿No tienes una cuenta?
          <a routerLink="/signup" class="text-indigo-600 hover:text-indigo-500"
            >Regístrate</a
          >
        </p>
      </div>
    </div>
  `,
  styles: [],
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      const { email } = this.forgotPasswordForm.value;
      this.authService.forgotPassword(email).subscribe({
        next: (response) => {
          this.toastr.success(
            'Se ha enviado un enlace de restablecimiento a tu correo.',
            'Éxito'
          );
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.toastr.error(
            'Error al enviar el enlace: ' + error.message,
            'Error'
          );
        },
      });
    }
  }
}
