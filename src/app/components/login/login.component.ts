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
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
  CommonModule,
  ReactiveFormsModule,
  NgIconsModule,
  RouterLink
],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div class="flex justify-center mb-6">
          <ng-icon
            name="lucideUser"
            class="text-indigo-600"
            size="2rem"
          ></ng-icon>
        </div>
        <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">
          Iniciar Sesión
        </h2>
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
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
                loginForm.get('email')?.invalid &&
                loginForm.get('email')?.touched
              "
            />
            <div
              *ngIf="
                loginForm.get('email')?.invalid &&
                loginForm.get('email')?.touched
              "
              class="text-red-500 text-sm mt-1"
            >
              Por favor, ingresa un correo electrónico válido.
            </div>
          </div>
          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700"
              >Contraseña</label
            >
            <input
              id="password"
              type="password"
              formControlName="password"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="••••••••"
              [class.border-red-500]="
                loginForm.get('password')?.invalid &&
                loginForm.get('password')?.touched
              "
            />
            <div
              *ngIf="
                loginForm.get('password')?.invalid &&
                loginForm.get('password')?.touched
              "
              class="text-red-500 text-sm mt-1"
            >
              La contraseña es requerida.
            </div>
          </div>
          <div>
            <button
              type="submit"
              [disabled]="loginForm.invalid"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Iniciar Sesión
            </button>
          </div>
        </form>
        <p class="mt-4 text-center text-sm text-gray-600">
          ¿No tienes una cuenta?
          <a [routerLink]="['/signup']" class="text-indigo-600 hover:text-indigo-500">Regístrate</a>
        </p>
        <p class="mt-2 text-center text-sm text-gray-600">
          ¿Olvidaste tu contraseña?
          <a [routerLink]="['/forgot-password']" class="text-indigo-600 hover:text-indigo-500">Restablecer</a>
        </p>
      </div>
    </div>
  `,
  styles: [],
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email, password).subscribe({
        next: (response) => {
          this.toastr.success('Inicio de sesión exitoso', 'Éxito');
          this.router.navigate(['/dashboard']); // Ajusta la ruta según tu aplicación
        },
        error: (error) => {
          this.toastr.error(
            'Error al iniciar sesión: ' + error.message,
            'Error'
          );
        },
      });
    }
  }
}
