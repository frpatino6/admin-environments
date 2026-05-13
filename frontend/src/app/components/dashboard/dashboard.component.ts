import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { Environment } from '../../models/environment.model';
import { EnvironmentService } from '../../services/environment.service';
import { WebsocketService } from '../../services/websocket.service';
import { TeamService } from '../../services/team.service';
import { EnvironmentCardComponent } from '../environment-card/environment-card.component';
import { DeployDialogComponent } from '../deploy-dialog/deploy-dialog.component';
import { ReleaseDialogComponent } from '../release-dialog/release-dialog.component';
import { SlackWebhookDialogComponent } from '../slack-webhook-dialog/slack-webhook-dialog.component';

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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private envService = inject(EnvironmentService);
  private wsService = inject(WebsocketService);
  private teamService = inject(TeamService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  teamSlug = signal('');
  environments = signal<Environment[]>([]);
  loading = signal(true);

  private wsSub?: Subscription;

  ngOnInit(): void {
    this.teamSlug.set(this.route.snapshot.paramMap.get('slug') ?? '');
    this.refresh();
    this.setupWs();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  refresh(): void {
    this.loading.set(true);
    this.envService.getEnvironments(this.teamSlug()).subscribe({
      next: (data) => {
        if (data.length === 0) { this.initTeams(); return; }
        this.environments.set([...data].sort((a, b) => a.name.localeCompare(b.name)));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify('Error al cargar ambientes');
      },
    });
  }

  goToTeams(): void {
    this.teamService.clearSavedTeam();
    this.router.navigate(['/teams']);
  }

  private initTeams(): void {
    this.teamService.initTeams().subscribe({
      next: () => this.refresh(),
      error: () => { this.loading.set(false); this.notify('Error al inicializar ambientes'); },
    });
  }

  private setupWs(): void {
    this.wsSub = this.wsService.onEnvironmentUpdate().subscribe({
      next: (updated) => {
        if (updated.team !== this.teamSlug()) return;
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
        this.envService.deploy(this.teamSlug(), env.name, result).subscribe({
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
        this.envService.release(this.teamSlug(), env.name, releasedBy).subscribe({
          next: () => { this.notify(`${env.name} liberado por ${releasedBy}`); this.refresh(); },
          error: (e) => this.notify(e.error?.message ?? 'Error al liberar ambiente'),
        });
      }
    });
  }

  openSlackConfig(): void {
    this.teamService.getTeam(this.teamSlug()).subscribe({
      next: (team) => {
        const ref = this.dialog.open(SlackWebhookDialogComponent, {
          width: '520px',
          panelClass: 'glass-dialog',
          data: { teamDisplayName: team.displayName, currentUrl: team.slackWebhookUrl ?? null },
        });
        ref.afterClosed().subscribe((result) => {
          if (result !== undefined) {
            this.teamService.updateSlackWebhook(this.teamSlug(), result.webhookUrl).subscribe({
              next: () => this.notify(result.webhookUrl ? 'Webhook de Slack configurado' : 'Webhook de Slack eliminado'),
              error: () => this.notify('Error al guardar el webhook'),
            });
          }
        });
      },
      error: () => this.notify('Error al cargar configuración del equipo'),
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
