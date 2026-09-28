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

  // Rows per page in the queue table. The whole queue is already loaded in
  // memory (getRequests has no server-side pagination), so this constant is
  // the only thing keeping the page from growing without bounds. 4 is
  // deliberately small: row height is not uniform because the actions cell
  // wraps to one or two lines depending on status, and a fatter page count
  // would simply make the page tall again.
  readonly REQUESTS_PAGE_SIZE = 4;

  requests = signal<QaRequest[]>([]);
  loadingRequests = signal(true);

  // Zero-based page currently shown in the queue table. Reset to 0 on every
  // successful load so a request pushed over the WebSocket is visible right
  // away instead of landing off-screen on page 2/3.
  pageIndex = signal(0);

  // Floor of 1 so an empty queue still has a (never rendered) page 0 and the
  // controls never have to special-case a zero page count.
  pageCount = computed(() => Math.max(1, Math.ceil(this.requests().length / this.REQUESTS_PAGE_SIZE)));

  // The index every read goes through, clamped to the last page: a list that
  // shrank under a stale index then shows that last page (possibly short)
  // instead of a header row with an empty body.
  private safePageIndex = computed(() =>
    Math.min(Math.max(this.pageIndex(), 0), this.pageCount() - 1),
  );

  pagedRequests = computed(() => {
    const start = this.safePageIndex() * this.REQUESTS_PAGE_SIZE;
    return this.requests().slice(start, start + this.REQUESTS_PAGE_SIZE);
  });

  // "Mostrando X–Y de Z" bounds; 0–0 while the queue is empty.
  rangeStart = computed(() => {
    const total = this.requests().length;
    return total === 0 ? 0 : this.safePageIndex() * this.REQUESTS_PAGE_SIZE + 1;
  });

  rangeEnd = computed(() => {
    const total = this.requests().length;
    return total === 0 ? 0 : Math.min(this.rangeStart() - 1 + this.REQUESTS_PAGE_SIZE, total);
  });

  // A queue that fits in a single page gets no control block at all.
  showPagination = computed(() => this.requests().length > this.REQUESTS_PAGE_SIZE);

  // Windowing rule: always the first and the last page, plus the current page
  // and its two neighbours on each side (clamped to the range), deduped and
  // sorted — at most 7 numbered buttons, with a "…" wherever the run has a gap.
  pageNumbers = computed(() => {
    const last = this.pageCount();
    const current = this.safePageIndex();
    const wanted = [1, last, current - 2, current - 1, current, current + 1, current + 2];
    return [...new Set(wanted.filter((p) => p >= 1 && p <= last))].sort((a, b) => a - b);
  });

  // A "…" belongs *between* two numbers of the run, so the leading gap is the
  // hole right after page 1 and the trailing one the hole right before the
  // last page. With 3 pages the run is [1,2,3] and neither fires.
  hasLeadingGap = computed(() => this.pageNumbers()[1] > 2);

  hasTrailingGap = computed(() => {
    const run = this.pageNumbers();
    return run[run.length - 2] < this.pageCount() - 1;
  });

  // The only way the page index is written apart from the load reset: clamping
  // here (instead of at each call site) means prev/next/number clicks can
  // never push the index below 0 or past the last page, whatever the list did
  // since the click.
  goToPage(index: number): void {
    this.pageIndex.set(Math.min(Math.max(index, 0), this.pageCount() - 1));
  }

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
        // Back to page 1 on every successful load, on purpose: a request
        // arriving over the WebSocket sits at the top of the queue, and
        // staying on page 2/3 would hide it. Owned here rather than in the
        // socket handler so the "Actualizar" button and the WS push follow one
        // rule. Not done on error, and not done by goToPage — paging is not a
        // reload, so it must not scroll the user back.
        this.pageIndex.set(0);
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
