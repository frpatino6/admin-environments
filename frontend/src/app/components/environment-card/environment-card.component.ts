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
import { EnvironmentService } from '../../services/environment.service';
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

  private envService = inject(EnvironmentService);

  history = signal<ActivityLog[]>([]);
  loadingHistory = signal(true);

  isOccupied = computed(() => this.env().status === 'Ocupado');
  isFree = computed(() => this.env().status === 'Libre');

  constructor() {
    // Runs once on init (effect always fires at least once) and again on any
    // env input change (e.g. websocket update from dashboard).
    effect(() => {
      const name = this.env().name; // reactive tracking
      untracked(() => this.loadHistory(name));
    }, { allowSignalWrites: true });
  }

  private loadHistory(envName: string): void {
    this.loadingHistory.set(true);
    this.envService.getHistory(envName, 5).subscribe({
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
