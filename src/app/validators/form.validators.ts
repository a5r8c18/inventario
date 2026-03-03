import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator to check if email format is valid
 */
export function emailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const valid = emailRegex.test(value);

    return valid ? null : { invalidEmail: true };
  };
}

/**
 * Validator to check if phone number is valid
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    // Allow formats like: +1234567890, 1234567890, (123) 456-7890, etc.
    // Must be between 10-20 characters (matching backend validation)
    const phoneRegex =
      /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{2,12}$/;
    const cleanPhone = value.replace(/\s/g, '');
    const valid = phoneRegex.test(cleanPhone) && cleanPhone.length >= 10 && cleanPhone.length <= 20;

    return valid ? null : { invalidPhone: true };
  };
}

/**
 * Validator to check if field contains only letters and spaces
 */
export function nameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    const valid = nameRegex.test(value);

    return valid ? null : { invalidName: true };
  };
}

/**
 * Validator to check minimum length with custom message
 */
export function minLengthValidator(minLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    return value.length >= minLength
      ? null
      : {
          minLength: { requiredLength: minLength, actualLength: value.length },
        };
  };
}

/**
 * Validator to check if field starts with whitespace
 */
export function noLeadingWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const hasLeadingWhitespace = /^\s/.test(value);

    return hasLeadingWhitespace ? { leadingWhitespace: true } : null;
  };
}
