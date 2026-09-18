import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QaRequest } from '../../models/qa.model';
import { QaService } from '../../services/qa.service';

@Component({
  selector: 'app-qa-reject-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './qa-reject-page.component.html',
})
export class QaRejectPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private qaService = inject(QaService);

  requestId = signal('');
  request = signal<QaRequest | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);

  reason = signal('');
  isValid = computed(() => this.reason().trim().length > 0);

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

  onSubmit(): void {
    if (!this.isValid() || this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set(null);
    this.qaService.rejectRequest(this.requestId(), this.reason().trim()).subscribe({
      next: (req) => {
        this.resultRequest.set(req);
        this.submitted.set(true);
        this.submitting.set(false);
      },
      error: (e) => {
        this.submitError.set(e.error?.message ?? 'Error al rechazar la solicitud');
        this.submitting.set(false);
      },
    });
  }

  goToQueue(): void {
    // The QA queue page is team-scoped now (teams/:slug/qa). This page
    // knows its request's team once loaded (or once the reject completes),
    // so route there directly instead of the removed global /qa page.
    const team = this.resultRequest()?.team ?? this.request()?.team;
    this.router.navigate(team ? ['/teams', team, 'qa'] : ['/teams']);
  }
}
