import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment, DeployRequest } from '../models/environment.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private teamEnvsUrl(team: string): string {
    return `${this.baseUrl}/teams/${team}/environments`;
  }

  getEnvironments(team: string): Observable<Environment[]> {
    return this.http.get<Environment[]>(this.teamEnvsUrl(team));
  }

  deploy(team: string, name: string, data: DeployRequest): Observable<Environment> {
    return this.http.post<Environment>(`${this.teamEnvsUrl(team)}/${name}/deploy`, data);
  }

  release(team: string, name: string, releasedBy: string): Observable<Environment> {
    return this.http.post<Environment>(`${this.teamEnvsUrl(team)}/${name}/release`, { releasedBy });
  }

  getHistory(team: string, name?: string, limit = 50): Observable<any[]> {
    if (name) {
      return this.http.get<any[]>(`${this.teamEnvsUrl(team)}/${name}/history?limit=${limit}`);
    }
    return this.http.get<any[]>(`${this.baseUrl}/teams/${team}/history?limit=${limit}`);
  }
}
