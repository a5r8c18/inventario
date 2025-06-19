import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Filters {
  fromDate: string;
  toDate: string;
  product: string;
  expirationDate: string;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-bar.component.html',
})
export class FilterBarComponent {
  @Output() filterChange = new EventEmitter<Filters>(); // Define el Output con tipo Filters

  filters: Filters = {
    fromDate: '',
    toDate: '',
    product: '',
    expirationDate: '',
  };

  applyFilters() {
    // Validar que fromDate no sea posterior a toDate
    if (this.filters.fromDate && this.filters.toDate) {
      const fromDate = new Date(this.filters.fromDate);
      const toDate = new Date(this.filters.toDate);
      if (fromDate > toDate) {
        alert('La fecha de inicio no puede ser posterior a la fecha de fin');
        return;
      }
    }
    this.filterChange.emit(this.filters); // Emite los filtros
  }

  clearFilters() {
    this.filters = {
      fromDate: '',
      toDate: '',
      product: '',
      expirationDate: '',
    };
    this.filterChange.emit(this.filters); // Emite los filtros limpios
  }
}
