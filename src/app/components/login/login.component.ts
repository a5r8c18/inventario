// Core Angular modules
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

// Angular Forms
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';

// Third-party libraries
import { ToastrService } from 'ngx-toastr';
import { NgIconsModule, provideIcons } from '@ng-icons/core';
import {
  lucideMail,
  lucideLock,
  lucideEye,
  lucideEyeOff,
} from '@ng-icons/lucide';

// Services
import { AuthService } from '../../services/auth/auth.service';
import { TranslationService } from '../../services/translation/translation.service';

// Pipes
import { TranslatePipe } from '../../pipes/translate.pipe';

// Validators
import {
  emailValidator,
  noLeadingWhitespaceValidator,
  NoLeadingWhitespaceDirective,
} from '../../validators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgIconsModule,
    RouterLink,
    NoLeadingWhitespaceDirective,
    TranslatePipe,
  ],
  providers: [
    provideIcons({ lucideMail, lucideLock, lucideEye, lucideEyeOff }),
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup; // Add the definite assignment assertion
  isSubmitting = false;
  showPassword = signal(false);
  passwordFieldType = signal('password');

  togglePasswordVisibility() {
    this.showPassword.update((value) => !value);
    this.passwordFieldType.set(this.showPassword() ? 'text' : 'password');
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    public translationService: TranslationService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Initialization logic if needed
  }

  /**
   * Initializes the login form with validation rules
   */
  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: [
        '',
        [Validators.required, emailValidator(), noLeadingWhitespaceValidator()],
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          noLeadingWhitespaceValidator(),
        ],
      ],
    });
  }

  /**
   * Handles form submission
   */
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isSubmitting = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => this.handleLoginSuccess(),
      error: (error) => this.handleLoginError(error),
      complete: () => (this.isSubmitting = false),
    });
  }

  /**
   * Handles successful login
   */
  private handleLoginSuccess(): void {
    this.toastr.success(
      this.translationService.instant('MESSAGES.LOGIN_SUCCESS'),
      this.translationService.instant('COMMON.SUCCESS')
    );
    this.router.navigate(['/dashboard']);
  }

  /**
   * Handles login errors
   */
  private handleLoginError(error: any): void {
    const errorMessage =
      error?.error?.message ||
      this.translationService.instant('MESSAGES.LOGIN_ERROR');
    this.toastr.error(
      errorMessage,
      this.translationService.instant('COMMON.ERROR')
    );
    this.loginForm.get('password')?.reset();
  }

  /**
   * Helper method to mark all form controls as touched
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Checks if email field has validation errors
   */
  showEmailError(): boolean {
    const emailControl = this.loginForm.get('email');
    return !!emailControl?.invalid && emailControl?.touched;
  }

  /**
   * Checks if password field has validation errors
   */
  showPasswordError(): boolean {
    const passwordControl = this.loginForm.get('password');
    return !!passwordControl?.invalid && passwordControl?.touched;
  }
}
