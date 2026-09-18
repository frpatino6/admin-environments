import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QaRequest } from '../../models/qa.model';
import { QaService } from '../../services/qa.service';

@Component({
  selector: 'app-qa-start-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './qa-start-page.component.html',
})
export class QaStartPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private qaService = inject(QaService);

  requestId = signal('');
  request = signal<QaRequest | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);

  submitting = signal(false);
  submitted = signal(false);
  submitError = signal<string | null>(null);
  resultRequest = signal<QaRequest | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.requestId.set(id);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.qaService.getRequest(this.requestId()).subscribe({
      next: (req) => {
        this.request.set(req);
        this.loading.set(false);
      },
      error: (e) => {
        this.loadError.set(e.error?.message ?? 'No se pudo cargar la solicitud de QA');
        this.loading.set(false);
      },
    });
  }

  onConfirm(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set(null);
    this.qaService.startQa(this.requestId()).subscribe({
      next: (req) => {
        this.resultRequest.set(req);
        this.submitted.set(true);
        this.submitting.set(false);
      },
      error: (e) => {
        this.submitError.set(e.error?.message ?? 'Error al iniciar la QA');
        this.submitting.set(false);
      },
    });
  }

  goToQueue(): void {
    // The QA queue page is team-scoped now (teams/:slug/qa). This page
    // knows its request's team once loaded (or once the start completes),
    // so route there directly instead of the removed global /qa page.
    const team = this.resultRequest()?.team ?? this.request()?.team;
    this.router.navigate(team ? ['/teams', team, 'qa'] : ['/teams']);
  }
}
