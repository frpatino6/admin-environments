import {
  Component,
  inject,
  input,
  output,
  signal,
  computed,
  effect,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Environment, ActivityLog } from '../../models/environment.model';
import { QaRequest } from '../../models/qa.model';
import { EnvironmentService } from '../../services/environment.service';
import { QaService } from '../../services/qa.service';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { ActionButtonComponent } from '../action-button/action-button.component';

@Component({
  selector: 'app-environment-card',
  standalone: true,
  imports: [CommonModule, TooltipDirective, ActionButtonComponent],
  templateUrl: './environment-card.component.html',
})
export class EnvironmentCardComponent {
  env = input.required<Environment>();

  deployClicked = output<Environment>();
  releaseClicked = output<Environment>();
  qaRequested = output<Environment>();

  private envService = inject(EnvironmentService);
  private qaService = inject(QaService);

  history = signal<ActivityLog[]>([]);
  loadingHistory = signal(true);

  qaRequest = signal<QaRequest | null>(null);

  isOccupied = computed(() => this.env().status === 'Ocupado');
  isFree = computed(() => this.env().status === 'Libre');
  isShared = computed(() => !!this.env().shared);

  qaStatusLabel = computed(() => {
    const req = this.qaRequest();
    if (!req) return null;
    const reviewerName = typeof req.reviewerId === 'object' && req.reviewerId ? req.reviewerId.name : null;
    switch (req.status) {
      case 'pending':
        return `QA: pendiente${reviewerName ? ' — ' + reviewerName : ''}`;
      case 'in_progress':
        return `QA: iniciado${reviewerName ? ' — ' + reviewerName : ''}`;
      case 'approved':
        return 'QA: aprobado ✅';
      case 'changes_requested':
        return 'QA: cambios solicitados';
      case 'unassignable':
        return 'QA: sin revisores ⚠️';
      default:
        return null;
    }
  });

  hasOpenQaRequest = computed(() => {
    const req = this.qaRequest();
    return !!req && req.status !== 'approved';
  });

  qaButtonLabel = computed(() => {
    const req = this.qaRequest();
    if (!req || req.status === 'approved') return 'Solicitar QA';
    switch (req.status) {
      case 'pending':
        return 'QA pendiente';
      case 'in_progress':
        return 'QA iniciado';
      case 'changes_requested':
        return 'Cambios solicitados';
      case 'unassignable':
        return 'QA sin revisores';
      default:
        return 'Solicitar QA';
    }
  });

  constructor() {
    effect(() => {
      const name = this.env().name;
      const team = this.env().team;
      untracked(() => {
        this.loadHistory(team, name);
        this.loadQaStatus(name);
      });
    }, { allowSignalWrites: true });
  }

  private loadHistory(team: string, envName: string): void {
    this.loadingHistory.set(true);
    this.envService.getHistory(team, envName, 5).subscribe({
      next: (h) => {
        this.history.set(h as ActivityLog[]);
        this.loadingHistory.set(false);
      },
      error: (err) => {
        console.error(`[Card:${envName}] history load failed:`, err);
        this.loadingHistory.set(false);
      },
    });
  }

  private loadQaStatus(envName: string): void {
    // environmentName is unique per environment, so filtering by team is
    // unnecessary and actively wrong for shared environments (their
    // QaRequest documents carry the real occupying team, not the literal
    // "shared" placeholder stored on Environment.team).
    this.qaService.getRequests({ environmentName: envName }).subscribe({
      next: (requests) => {
        // Backend returns requests sorted newest-first; show the most recent one
        // (including 'approved' — it's one of the chip states, not hidden).
        this.qaRequest.set(requests[0] ?? null);
      },
      error: (err) => {
        console.error(`[Card:${envName}] QA status load failed:`, err);
      },
    });
  }

  formatDate(date: Date | null): string {
    if (!date) return '—';
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  formatActivityDate(record: ActivityLog): string {
    const raw = record.performedAt ?? record.timestamp;
    if (!raw) return '—';
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(raw));
  }
}
