import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateQaRequestPayload, QaMember, QaRequest } from '../models/qa.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class QaService {
  private baseUrl = `${environment.apiUrl}/qa`;

  constructor(private http: HttpClient) {}

  // ── Members ──────────────────────────────────────────────────────────

  // QaMember rosters are per-team, so `team` is required — there is no
  // "everyone across every team" listing.
  getMembers(team: string, activeOnly = false): Observable<QaMember[]> {
    let params = new HttpParams().set('team', team);
    if (activeOnly) params = params.set('active', 'true');
    return this.http.get<QaMember[]>(`${this.baseUrl}/members`, { params });
  }

  createMember(name: string, slackUserId: string, team: string): Observable<QaMember> {
    return this.http.post<QaMember>(`${this.baseUrl}/members`, { name, slackUserId, team });
  }

  setMemberActive(id: string, active: boolean): Observable<QaMember> {
    return this.http.patch<QaMember>(`${this.baseUrl}/members/${id}/active`, { active });
  }

  // ── Requests ─────────────────────────────────────────────────────────

  getRequests(filters: { environmentName?: string; team?: string; status?: string } = {}): Observable<QaRequest[]> {
    let params = new HttpParams();
    if (filters.environmentName) params = params.set('environmentName', filters.environmentName);
    if (filters.team) params = params.set('team', filters.team);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<QaRequest[]>(`${this.baseUrl}/requests`, { params });
  }

  getRequest(id: string): Observable<QaRequest> {
    return this.http.get<QaRequest>(`${this.baseUrl}/requests/${id}`);
  }

  createRequest(payload: CreateQaRequestPayload): Observable<QaRequest> {
    return this.http.post<QaRequest>(`${this.baseUrl}/requests`, payload);
  }

  startQa(id: string): Observable<QaRequest> {
    return this.http.post<QaRequest>(`${this.baseUrl}/requests/${id}/start`, {});
  }

  rejectRequest(id: string, reason: string): Observable<QaRequest> {
    return this.http.post<QaRequest>(`${this.baseUrl}/requests/${id}/reject`, { reason });
  }

  reassignRequest(id: string, reviewerId: string): Observable<QaRequest> {
    return this.http.post<QaRequest>(`${this.baseUrl}/requests/${id}/reassign`, { reviewerId });
  }

  retryRequest(id: string): Observable<QaRequest> {
    return this.http.post<QaRequest>(`${this.baseUrl}/requests/${id}/retry`, {});
  }

  completeRequest(id: string, result: 'approved' | 'changes_requested' = 'approved'): Observable<QaRequest> {
    return this.http.post<QaRequest>(`${this.baseUrl}/requests/${id}/complete`, { result });
  }
}
