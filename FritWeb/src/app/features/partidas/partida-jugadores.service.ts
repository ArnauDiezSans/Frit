import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';
import { PartidaJugador } from './partidas.models';

@Injectable({ providedIn: 'root' })
export class PartidaJugadoresService {
  private http = inject(HttpClient);
  private dataStore = inject(DataStoreService);
  private baseUrl = `${API_BASE_URL}/partidajugadores`;
  private cacheKey = 'partida-jugadores';

  getAll(): Observable<PartidaJugador[]> {
    return this.dataStore.get(this.cacheKey, () =>
      this.http.get<PartidaJugador[]>(this.baseUrl, {
        withCredentials: true
      })
    );
  }

  create(data: PartidaJugador): Observable<PartidaJugador> {
    return this.http.post<PartidaJugador>(this.baseUrl, data, {
      withCredentials: true
    }).pipe(
      tap(jugador => {
        this.dataStore.update<PartidaJugador[]>(this.cacheKey, current => [...(current ?? []), jugador]);
        this.dataStore.invalidate('rankings');
      })
    );
  }
}
