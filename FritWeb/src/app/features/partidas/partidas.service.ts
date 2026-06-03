import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { Partida } from './partidas.models';

@Injectable({ providedIn: 'root' })
export class PartidasService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/partidas`;

  getAll(): Observable<Partida[]> {
    return this.http.get<Partida[]>(this.baseUrl, {
      withCredentials: true
    });
  }

  create(data: Partida): Observable<Partida> {
    return this.http.post<Partida>(this.baseUrl, data, {
      withCredentials: true
    });
  }
}