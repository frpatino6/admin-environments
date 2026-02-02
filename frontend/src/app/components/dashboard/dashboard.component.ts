import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EnvironmentService } from '../../services/environment.service';
import { Environment } from '../../models/environment.model';
import { DeployDialogComponent } from '../deploy-dialog/deploy-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  environments: Environment[] = [];
  loading = true;

  constructor(
    private environmentService: EnvironmentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadEnvironments();
  }

  loadEnvironments(): void {
    this.loading = true;
    this.environmentService.getEnvironments().subscribe({
      next: (data) => {
        this.environments = data;
        this.loading = false;
        
        // Si no hay ambientes, inicializarlos
        if (data.length === 0) {
          this.initializeEnvironments();
        }
      },
      error: (error) => {
        console.error('Error loading environments:', error);
        this.loading = false;
        this.showMessage('Error al cargar ambientes');
      }
    });
  }

  initializeEnvironments(): void {
    this.environmentService.initializeEnvironments().subscribe({
      next: () => {
        this.showMessage('Ambientes inicializados correctamente');
        this.loadEnvironments();
      },
      error: (error) => {
        console.error('Error initializing environments:', error);
        this.showMessage('Error al inicializar ambientes');
      }
    });
  }

  openDeployDialog(env: Environment): void {
    const dialogRef = this.dialog.open(DeployDialogComponent, {
      width: '500px',
      data: { environmentName: env.name }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deployBranch(env.name, result);
      }
    });
  }

  deployBranch(envName: string, data: { branch: string, deployedBy: string }): void {
    this.environmentService.deploy(envName, data).subscribe({
      next: () => {
        this.showMessage(`✅ Ambiente ${envName} ocupado exitosamente`);
        this.loadEnvironments();
      },
      error: (error) => {
        console.error('Error deploying:', error);
        this.showMessage(error.error?.message || 'Error al desplegar');
      }
    });
  }

  releaseEnvironment(env: Environment): void {
    if (confirm(`¿Estás seguro de liberar el ambiente ${env.name}?`)) {
      this.environmentService.release(env.name).subscribe({
        next: () => {
          this.showMessage(`🎉 Ambiente ${env.name} liberado exitosamente`);
          this.loadEnvironments();
        },
        error: (error) => {
          console.error('Error releasing:', error);
          this.showMessage(error.error?.message || 'Error al liberar ambiente');
        }
      });
    }
  }

  showMessage(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  getStatusColor(status: string): string {
    return status === 'Libre' ? 'primary' : 'accent';
  }

  formatDate(date: Date | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('es-ES');
  }
}
