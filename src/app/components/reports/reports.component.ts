import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconsModule, provideIcons } from '@ng-icons/core';
import { lucideFileText, lucideTruck, lucidePackage } from '@ng-icons/lucide';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconsModule],
  providers: [
    provideIcons({
      lucideFileText,
      lucideTruck,
      lucidePackage,
    }),
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent {
  reportOptions = [
    {
      title: 'Informes de Recepción',
      description: 'Ver y gestionar informes de recepción de productos',
      icon: 'lucidePackage',
      route: '/reports/reception',
      color: 'blue'
    },
    {
      title: 'Vales de Entrega',
      description: 'Ver y gestionar vales de entrega de productos',
      icon: 'lucideTruck',
      route: '/reports/delivery',
      color: 'green'
    }
  ];
}
