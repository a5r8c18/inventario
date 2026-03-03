import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator to check if password meets complexity requirements
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
export function passwordComplexityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*]/.test(value);
    const hasMinLength = value.length >= 8;

    const passwordValid =
      hasUpperCase && hasNumber && hasSpecialChar && hasMinLength;

    if (!passwordValid) {
      return {
        passwordComplexity: {
          hasUpperCase,
          hasNumber,
          hasSpecialChar,
          hasMinLength,
        },
      };
    }

    return null;
  };
}

/**
 * Validator to check if two password fields match
 */
export function passwordMatchValidator(
  passwordField: string,
  confirmPasswordField: string
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get(passwordField);
    const confirmPassword = control.get(confirmPasswordField);

    if (!password || !confirmPassword) {
      return null;
    }

    if (confirmPassword.value === '') {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(
          Object.keys(errors).length > 0 ? errors : null
        );
      }
    }

    return null;
  };
}
