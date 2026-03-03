import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../services/dashboard/dashboard.service';
import { NotificationService } from '../../services/shared/notification.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgIconsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private chart: Chart | null = null;
  private refreshSub!: Subscription;

  constructor(
    private dashboardService: DashboardService,
    private notificationService: NotificationService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit() {
    this.loadData();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => this.loadData());
  }

  loadData() {
    this.dashboardService.getInventoryData().subscribe({
      next: (chartData) => {
        console.log('📊 Dashboard - Datos recibidos:', chartData);
        this.renderChart(chartData);
      },
      error: (error) => {
        console.error('❌ Dashboard - Error al obtener datos:', error);
      }
    });
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
    if (this.chart) { this.chart.destroy(); this.chart = null; }
  }

  renderChart(chartData: any) {
    console.log('📊 Dashboard - Intentando renderizar gráfico con datos:', chartData);
    
    const ctx = document.getElementById('inventoryChart') as HTMLCanvasElement;
    
    if (!ctx) {
      console.error('❌ Dashboard - No se encontró el elemento canvas #inventoryChart');
      return;
    }

    // Validar que los datos tengan la estructura esperada
    if (!chartData || !chartData.labels || !Array.isArray(chartData.labels)) {
      console.error('❌ Dashboard - Estructura de datos inválida:', chartData);
      return;
    }

    if (chartData.labels.length === 0) {
      console.warn('⚠️ Dashboard - No hay datos para mostrar (labels vacío)');
      return;
    }

    console.log('✅ Dashboard - Renderizando gráfico con', chartData.labels.length, 'productos');
    
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          title: {
            display: true,
            text: 'Existencias de Productos'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Cantidad en Stock'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Productos'
            }
          }
        },
      },
    });
  }
}
