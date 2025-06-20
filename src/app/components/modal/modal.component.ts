import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  imports:[CommonModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-semibold text-gray-800 mb-4">{{ title }}</h3>
        <ng-content></ng-content>
        <div class="mt-4 flex justify-end space-x-2">
          <button
            (click)="close()"
            class="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancelar
          </button>
          <button
            (click)="confirm()"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() confirmText = 'Confirmar';
  @Output() closeEvent = new EventEmitter<void>();
  @Output() confirmEvent = new EventEmitter<void>();

  constructor() {}

  ngOnInit(): void {}

  close(): void {
    this.isOpen = false;
    this.closeEvent.emit();
  }

  confirm(): void {
    this.confirmEvent.emit();
  }
}
