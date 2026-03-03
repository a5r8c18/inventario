import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[appNoLeadingWhitespace]',
  standalone: true,
})
export class NoLeadingWhitespaceDirective {
  private isProcessing = false;

  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    if (this.isProcessing) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Si el valor comienza con espacios, eliminarlos
    if (value && value !== value.trimStart()) {
      this.isProcessing = true;
      const trimmedValue = value.trimStart();
      input.value = trimmedValue;

      // Disparar evento para actualizar el FormControl
      const inputEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(inputEvent);

      this.isProcessing = false;
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    const input = this.el.nativeElement as HTMLInputElement;

    // Obtener la posición actual del cursor
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = input.value;

    // Si estamos pegando al inicio, eliminar espacios iniciales del texto pegado
    let textToInsert = pastedText;
    if (start === 0) {
      textToInsert = pastedText.trimStart();
    }

    // Insertar el texto en la posición del cursor
    const newValue =
      currentValue.substring(0, start) +
      textToInsert +
      currentValue.substring(end);
    input.value = newValue;

    // Mover el cursor al final del texto insertado
    const newPosition = start + textToInsert.length;
    input.setSelectionRange(newPosition, newPosition);

    // Disparar evento para actualizar el FormControl
    const inputEvent = new Event('input', { bubbles: true });
    input.dispatchEvent(inputEvent);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const cursorPosition = input.selectionStart || 0;

    // Si estamos al inicio del campo y se presiona espacio, prevenir
    if (event.key === ' ' && cursorPosition === 0 && input.value.length === 0) {
      event.preventDefault();
    }
  }
}
