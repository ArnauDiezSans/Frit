import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { PartidaJugador } from './partidas.models';

@Injectable({ providedIn: 'root' })
export class PartidaJugadoresService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/partidajugadores`;

  getAll(): Observable<PartidaJugador[]> {
    return this.http.get<PartidaJugador[]>(this.baseUrl, {
      withCredentials: true
    });
  }

  create(data: PartidaJugador): Observable<PartidaJugador> {
    return this.http.post<PartidaJugador>(this.baseUrl, data, {
      withCredentials: true
    });
  }
}
