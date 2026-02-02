import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment, DeployRequest } from '../models/environment.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private apiUrl = `${environment.apiUrl}/environments`;

  constructor(private http: HttpClient) { }

  getEnvironments(): Observable<Environment[]> {
    return this.http.get<Environment[]>(this.apiUrl);
  }

  getEnvironment(name: string): Observable<Environment> {
    return this.http.get<Environment>(`${this.apiUrl}/${name}`);
  }

  deploy(name: string, data: DeployRequest): Observable<Environment> {
    return this.http.post<Environment>(`${this.apiUrl}/${name}/deploy`, data);
  }

  release(name: string): Observable<Environment> {
    return this.http.post<Environment>(`${this.apiUrl}/${name}/release`, {});
  }

  initializeEnvironments(): Observable<any> {
    return this.http.post('/api/environments/init', {});
  }
}
