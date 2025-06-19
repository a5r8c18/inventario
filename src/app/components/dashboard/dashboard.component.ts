import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { Chart, registerables } from 'chart.js';
import { DashboardService } from '../../services/dashboard/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgIconsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  constructor(private dashboardService: DashboardService) {
    Chart.register(...registerables);
  }

  ngOnInit() {
    this.dashboardService.getInventoryData().subscribe((chartData) => {
      this.renderChart(chartData);
    });
  }

  renderChart(chartData: any) {
    const ctx = document.getElementById('inventoryChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }
}
