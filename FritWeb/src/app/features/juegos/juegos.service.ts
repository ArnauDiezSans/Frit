import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { BggJuegoLookup, Juego } from './juegos.models';

@Injectable({ providedIn: 'root' })
export class JuegosService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/juegos`;

  getAll(): Observable<Juego[]> {
    return this.http.get<Juego[]>(this.baseUrl, {
      withCredentials: true
    });
  }

  create(data: Juego): Observable<Juego> {
    return this.http.post<Juego>(this.baseUrl, data, {
      withCredentials: true
    });
  }

  getFromBgg(bggId: number): Observable<BggJuegoLookup> {
    return this.http.get<BggJuegoLookup>(`${this.baseUrl}/bgg/${bggId}`, {
      withCredentials: true
    });
  }
}