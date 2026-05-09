import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { Environment } from '../../models/environment.model';
import { EnvironmentService } from '../../services/environment.service';
import { WebsocketService } from '../../services/websocket.service';
import { EnvironmentCardComponent } from '../environment-card/environment-card.component';
import { DeployDialogComponent } from '../deploy-dialog/deploy-dialog.component';
import { ReleaseDialogComponent } from '../release-dialog/release-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatSnackBarModule,
    EnvironmentCardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private envService = inject(EnvironmentService);
  private wsService = inject(WebsocketService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  environments = signal<Environment[]>([]);
  loading = signal(true);

  private wsSub?: Subscription;

  ngOnInit(): void {
    this.refresh();
    this.setupWs();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  refresh(): void {
    this.loading.set(true);
    this.envService.getEnvironments().subscribe({
      next: (data) => {
        this.environments.set([...data].sort((a, b) => a.name.localeCompare(b.name)));
        this.loading.set(false);
        if (data.length === 0) this.initEnvs();
      },
      error: () => {
        this.loading.set(false);
        this.notify('Error al cargar ambientes');
      },
    });
  }

  private initEnvs(): void {
    this.envService.initializeEnvironments().subscribe({
      next: () => this.refresh(),
      error: () => this.notify('Error al inicializar ambientes'),
    });
  }

  private setupWs(): void {
    this.wsSub = this.wsService.onEnvironmentUpdate().subscribe({
      next: (updated) => {
        this.environments.update((envs) => {
          const idx = envs.findIndex((e) => e._id === updated._id);
          const next = [...envs];
          if (idx !== -1) next[idx] = updated;
          else next.push(updated);
          return next.sort((a, b) => a.name.localeCompare(b.name));
        });
        this.notify(`Ambiente ${updated.name} actualizado`);
      },
    });
  }

  onDeploy(env: Environment): void {
    const ref = this.dialog.open(DeployDialogComponent, {
      width: '480px',
      panelClass: 'glass-dialog',
      data: { environmentName: env.name },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.envService.deploy(env.name, result).subscribe({
          next: () => { this.notify(`${env.name} ocupado exitosamente`); this.refresh(); },
          error: (e) => this.notify(e.error?.message ?? 'Error al desplegar'),
        });
      }
    });
  }

  onRelease(env: Environment): void {
    const ref = this.dialog.open(ReleaseDialogComponent, {
      width: '400px',
      panelClass: 'glass-dialog',
      data: { environmentName: env.name },
    });
    ref.afterClosed().subscribe((releasedBy: string | undefined) => {
      if (releasedBy) {
        this.envService.release(env.name, releasedBy).subscribe({
          next: () => { this.notify(`${env.name} liberado por ${releasedBy}`); this.refresh(); },
          error: (e) => this.notify(e.error?.message ?? 'Error al liberar ambiente'),
        });
      }
    });
  }

  private notify(msg: string): void {
    this.snackBar.open(msg, 'OK', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
