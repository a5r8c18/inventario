import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';

@Component({
  selector: 'app-modal',
  imports: [CommonModule, NgIconsModule],
  styles: [
    `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      .animate-fadeIn {
        animation: fadeIn 0.2s ease-out;
      }
    `,
  ],
  template: `
    <div
      *ngIf="isOpen"
      class="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 transition-all"
    >
      <div
        [ngClass]="maxWidthClass"
        class="bg-white rounded-xl shadow-2xl p-6 w-full mx-4 transform transition-all animate-fadeIn"
      >
        <div class="flex items-start space-x-3 mb-4">
          <div
            *ngIf="iconName"
            [ngClass]="iconBgClass"
            class="p-3 rounded-full flex-shrink-0"
          >
            <ng-icon [name]="iconName" [class]="iconClass"></ng-icon>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-gray-800">{{ title }}</h3>
          </div>
        </div>
        <ng-content></ng-content>
        <div class="mt-6 flex justify-end space-x-3">
          <button
            (click)="close()"
            class="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            (click)="confirm()"
            [ngClass]="confirmButtonClass"
            class="px-5 py-2.5 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() confirmText = 'Confirmar';
  @Input() iconName = '';
  @Input() iconClass = 'h-8 w-8';
  @Input() iconBgClass = 'bg-blue-100';
  @Input() confirmButtonClass = 'bg-blue-600 hover:bg-blue-700';
  @Input() maxWidthClass = 'max-w-md';
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
