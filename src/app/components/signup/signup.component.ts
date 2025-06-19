import { Component } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgIconsModule } from '@ng-icons/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgIconsModule
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
          Crear Cuenta
        </h2>
        <form
          [formGroup]="signupForm"
          (ngSubmit)="onSubmit()"
          class="space-y-6"
        >
          <div>
            <label
              for="firstName"
              class="block text-sm font-medium text-gray-700"
              >Nombre</label
            >
            <input
              id="firstName"
              type="text"
              formControlName="firstName"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Tu nombre"
              [class.border-red-500]="
                signupForm.get('firstName')?.invalid &&
                signupForm.get('firstName')?.touched
              "
            />
            <div
              *ngIf="
                signupForm.get('firstName')?.invalid &&
                signupForm.get('firstName')?.touched
              "
              class="text-red-500 text-sm mt-1"
            >
              El nombre es requerido.
            </div>
          </div>
          <div>
            <label
              for="lastName"
              class="block text-sm font-medium text-gray-700"
              >Apellidos</label
            >
            <input
              id="lastName"
              type="text"
              formControlName="lastName"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Tus apellidos"
              [class.border-red-500]="
                signupForm.get('lastName')?.invalid &&
                signupForm.get('lastName')?.touched
              "
            />
            <div
              *ngIf="
                signupForm.get('lastName')?.invalid &&
                signupForm.get('lastName')?.touched
              "
              class="text-red-500 text-sm mt-1"
            >
              Los apellidos son requeridos.
            </div>
          </div>
          <div>
            <label for="company" class="block text-sm font-medium text-gray-700"
              >Empresa</label
            >
            <input
              id="company"
              type="text"
              formControlName="company"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Nombre de la empresa"
              [class.border-red-500]="
                signupForm.get('company')?.invalid &&
                signupForm.get('company')?.touched
              "
            />
            <div
              *ngIf="
                signupForm.get('company')?.invalid &&
                signupForm.get('company')?.touched
              "
              class="text-red-500 text-sm mt-1"
            >
              La empresa es requerida.
            </div>
          </div>
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
                signupForm.get('email')?.invalid &&
                signupForm.get('email')?.touched
              "
            />
            <div
              *ngIf="
                signupForm.get('email')?.invalid &&
                signupForm.get('email')?.touched
              "
              class="text-red-500 text-sm mt-1"
            >
              Por favor, ingresa un correo electrónico válido.
            </div>
          </div>
          <div>
            <label for="phone" class="block text-sm font-medium text-gray-700"
              >Número de Teléfono</label
            >
            <input
              id="phone"
              type="tel"
              formControlName="phone"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="+1234567890"
              [class.border-red-500]="
                signupForm.get('phone')?.invalid &&
                signupForm.get('phone')?.touched
              "
            />
            <div
              *ngIf="
                signupForm.get('phone')?.invalid &&
                signupForm.get('phone')?.touched
              "
              class="text-red-500 text-sm mt-1"
            >
              Por favor, ingresa un número de teléfono válido.
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
                signupForm.get('password')?.invalid &&
                signupForm.get('password')?.touched
              "
            />
            <div
              *ngIf="
                signupForm.get('password')?.invalid &&
                signupForm.get('password')?.touched
              "
              class="text-red-500 text-sm mt-1"
            >
              La contraseña debe tener al menos 8 caracteres, incluyendo letras,
              números y caracteres especiales.
            </div>
          </div>
          <div>
            <label
              for="confirmPassword"
              class="block text-sm font-medium text-gray-700"
              >Confirmar Contraseña</label
            >
            <input
              id="confirmPassword"
              type="password"
              formControlName="confirmPassword"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="••••••••"
              [class.border-red-500]="
                signupForm.get('confirmPassword')?.invalid &&
                signupForm.get('confirmPassword')?.touched
              "
            />
            <div
              *ngIf="
                signupForm.get('confirmPassword')?.invalid &&
                signupForm.get('confirmPassword')?.touched
              "
              class="text-red-500 text-sm mt-1"
            >
              Las contraseñas no coinciden.
            </div>
          </div>
          <div>
            <button
              type="submit"
              [disabled]="signupForm.invalid"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Registrarse
            </button>
          </div>
        </form>
        <p class="mt-4 text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta?
          <a routerLink="/login" class="text-indigo-600 hover:text-indigo-500"
            >Inicia sesión</a
          >
        </p>
      </div>
    </div>
  `,
  styles: [],
})
export class SignupComponent {
  signupForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.signupForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      company: ['', Validators.required],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern('^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*\\d).+$')
      ]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.matchPasswords
    });

    // Password validation message
    this.signupForm.get('password')?.valueChanges.subscribe(() => {
      const passwordControl = this.signupForm.get('password');
      if (passwordControl?.touched && passwordControl?.invalid) {
        const error = passwordControl?.errors;
        if (error?.['minlength']) {
          passwordControl?.setErrors({
            message: 'La contraseña debe tener al menos 8 caracteres'
          });
        } else if (error?.['pattern']) {
          passwordControl?.setErrors({
            message: 'La contraseña debe contener al menos una mayúscula, un número y un carácter especial'
          });
        }
      }
    });
  }

  matchPasswords(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;
    if (password !== confirmPassword) {
      formGroup.get('confirmPassword')?.setErrors({ mismatch: true });
    } else {
      formGroup.get('confirmPassword')?.setErrors(null);
    }
  }

  onSubmit() {
    if (this.signupForm.valid) {
      const { firstName, lastName, email, phone, password, company } = this.signupForm.value;
      const signupData = {
        firstName,
        lastName,
        email,
        phone,
        password,
        company
      };
      this.authService.signup(signupData).subscribe({
        next: (response: { accessToken: string }) => {
          this.toastr.success(
            'Registro exitoso. Por favor, inicia sesión.',
            'Éxito'
          );
          localStorage.setItem('token', response.accessToken);
          this.router.navigate(['/login']);
        },
        error: (error: any) => {
          this.toastr.error(
            'Error al registrarse: ' + error.message,
            'Error'
          );
        },
        complete: () => {
          // Handle completion if needed
        }
      });
    }
  }
}
