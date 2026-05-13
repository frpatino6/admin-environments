import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team } from '../models/environment.model';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'selectedTeam';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private apiUrl = `${environment.apiUrl}/teams`;

  constructor(private http: HttpClient) {}

  getTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(this.apiUrl);
  }

  getTeam(slug: string): Observable<Team> {
    return this.http.get<Team>(`${this.apiUrl}/${slug}`);
  }

  initTeams(): Observable<any> {
    return this.http.post(`${this.apiUrl}/init`, {});
  }

  updateSlackWebhook(slug: string, slackWebhookUrl: string | null): Observable<{ slug: string; slackWebhookUrl: string | null }> {
    return this.http.patch<{ slug: string; slackWebhookUrl: string | null }>(
      `${this.apiUrl}/${slug}/slack-webhook`,
      { slackWebhookUrl }
    );
  }

  getSavedTeam(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }

  saveTeam(slug: string): void {
    localStorage.setItem(STORAGE_KEY, slug);
  }

  clearSavedTeam(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
