import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { QaMember, QaRequest } from '../../models/qa.model';
import { QaService } from '../../services/qa.service';
import { WebsocketService } from '../../services/websocket.service';
import { QaRejectDialogComponent } from '../qa-reject-dialog/qa-reject-dialog.component';
import { QaReassignDialogComponent } from '../qa-reassign-dialog/qa-reassign-dialog.component';

@Component({
  selector: 'app-qa-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatDialogModule, MatSnackBarModule],
  templateUrl: './qa-dashboard.component.html',
  styleUrl: './qa-dashboard.component.scss',
})
export class QaDashboardComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private qaService = inject(QaService);
  private wsService = inject(WebsocketService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // This page is reached at teams/:slug/qa — every request and every
  // member shown/managed here belongs to this one team's roster.
  teamSlug = signal('');

  requests = signal<QaRequest[]>([]);
  loadingRequests = signal(true);

  members = signal<QaMember[]>([]);
  loadingMembers = signal(true);

  newMemberName = signal('');
  newMemberSlackId = signal('');
  canAddMember = computed(
    () => this.newMemberName().trim().length > 0 && this.newMemberSlackId().trim().length > 0,
  );

  // Guards against a double-click / stacked-dialog double submit: while a
  // reject is being confirmed (dialog open) or in flight (HTTP call
  // pending) for a given request id, a second "Rechazar" click on the same
  // row is a no-op instead of opening another dialog or firing a second
  // concurrent request.
  private pendingRejectIds = new Set<string>();

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
    this.refreshRequests();
    this.refreshMembers();
  }

  private setupWs(): void {
    this.wsSub = this.wsService.onQaUpdate().subscribe({
      next: (updated) => {
        if (updated.team !== this.teamSlug()) return;
        this.refreshRequests();
      },
    });
  }

  goToTeamDashboard(): void {
    this.router.navigate(['/teams', this.teamSlug()]);
  }

  private refreshRequests(): void {
    this.loadingRequests.set(true);
    this.qaService.getRequests({ team: this.teamSlug() }).subscribe({
      next: (data) => {
        this.requests.set(data);
        this.loadingRequests.set(false);
      },
      error: () => {
        this.loadingRequests.set(false);
        this.notify('Error al cargar la cola de QA');
      },
    });
  }

  private refreshMembers(): void {
    this.loadingMembers.set(true);
    this.qaService.getMembers(this.teamSlug()).subscribe({
      next: (data) => {
        this.members.set(data);
        this.loadingMembers.set(false);
      },
      error: () => {
        this.loadingMembers.set(false);
        this.notify('Error al cargar integrantes de QA');
      },
    });
  }

  // GET /qa/members already returns members in queue order (active members
  // first, ranked exactly as pickReviewer would pick them; inactive members
  // after). This just makes that order visible: the first active member in
  // the list is genuinely who gets assigned next.
  isNextInQueue(member: QaMember, index: number): boolean {
    return index === 0 && member.active;
  }

  memberName(entity: QaMember | string | null | undefined): string {
    if (!entity) return '—';
    if (typeof entity === 'string') return entity;
    return entity.name;
  }

  private idOf(entity: QaMember | string | null | undefined): string | null {
    if (!entity) return null;
    return typeof entity === 'string' ? entity : entity._id;
  }

  statusLabel(req: QaRequest): string {
    switch (req.status) {
      case 'pending':
        return `Pendiente — ${this.memberName(req.reviewerId)}`;
      case 'in_progress':
        return `Iniciado — ${this.memberName(req.reviewerId)}`;
      case 'approved':
        return 'Aprobado ✅';
      case 'changes_requested':
        return 'Cambios solicitados';
      case 'unassignable':
        return 'Sin revisores ⚠️';
      default:
        return req.status;
    }
  }

  onStart(req: QaRequest): void {
    this.qaService.startQa(req._id).subscribe({
      next: () => { this.notify('QA iniciado'); this.refreshRequests(); },
      error: (e) => this.notify(e.error?.message ?? 'Error al iniciar QA'),
    });
  }

  onReject(req: QaRequest): void {
    if (this.pendingRejectIds.has(req._id)) return;
    this.pendingRejectIds.add(req._id);

    const ref = this.dialog.open(QaRejectDialogComponent, {
      width: '480px',
      panelClass: 'glass-dialog',
      data: { jiraKey: req.jiraKey, environmentName: req.environmentName },
    });
    ref.afterClosed().subscribe((reason: string | undefined) => {
      if (reason) {
        this.qaService.rejectRequest(req._id, reason).subscribe({
          next: (updated) => {
            this.pendingRejectIds.delete(req._id);
            this.notify(
              updated.status === 'unassignable'
                ? 'Sin revisores disponibles — solicitud marcada como no asignable'
                : 'Solicitud reasignada',
            );
            this.refreshRequests();
          },
          error: (e) => {
            this.pendingRejectIds.delete(req._id);
            this.notify(e.error?.message ?? 'Error al rechazar la solicitud');
          },
        });
      } else {
        this.pendingRejectIds.delete(req._id);
      }
    });
  }

  onReassign(req: QaRequest): void {
    const ref = this.dialog.open(QaReassignDialogComponent, {
      width: '480px',
      panelClass: 'glass-dialog',
      data: {
        jiraKey: req.jiraKey,
        team: this.teamSlug(),
        currentReviewerId: this.idOf(req.reviewerId),
        requesterId: this.idOf(req.requesterId),
      },
    });
    ref.afterClosed().subscribe((reviewerId: string | undefined) => {
      if (reviewerId) {
        this.qaService.reassignRequest(req._id, reviewerId).subscribe({
          next: () => { this.notify('Solicitud reasignada'); this.refreshRequests(); },
          error: (e) => this.notify(e.error?.message ?? 'Error al reasignar la solicitud'),
        });
      }
    });
  }

  onComplete(req: QaRequest, result: 'approved' | 'changes_requested'): void {
    this.qaService.completeRequest(req._id, result).subscribe({
      next: () => { this.notify('Solicitud actualizada'); this.refreshRequests(); },
      error: (e) => this.notify(e.error?.message ?? 'Error al completar la solicitud'),
    });
  }

  onRetry(req: QaRequest): void {
    this.qaService.retryRequest(req._id).subscribe({
      next: () => { this.notify('Solicitud reabierta para el mismo revisor'); this.refreshRequests(); },
      error: (e) => this.notify(e.error?.message ?? 'Error al reabrir la solicitud'),
    });
  }

  onAddMember(): void {
    if (!this.canAddMember()) return;
    const name = this.newMemberName().trim();
    const slackUserId = this.newMemberSlackId().trim();
    this.qaService.createMember(name, slackUserId, this.teamSlug()).subscribe({
      next: () => {
        this.newMemberName.set('');
        this.newMemberSlackId.set('');
        this.notify('Integrante de QA agregado');
        this.refreshMembers();
      },
      error: (e) => this.notify(e.error?.message ?? 'Error al agregar integrante'),
    });
  }

  onToggleMemberActive(member: QaMember): void {
    this.qaService.setMemberActive(member._id, !member.active).subscribe({
      next: () => { this.refreshMembers(); },
      error: () => this.notify('Error al actualizar integrante'),
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
