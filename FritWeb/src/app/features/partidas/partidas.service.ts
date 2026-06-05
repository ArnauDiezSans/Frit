import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';
import { Partida } from './partidas.models';

@Injectable({ providedIn: 'root' })
export class PartidasService {
  private http = inject(HttpClient);
  private dataStore = inject(DataStoreService);
  private baseUrl = `${API_BASE_URL}/partidas`;
  private cacheKey = 'partidas';

  getAll(): Observable<Partida[]> {
    return this.dataStore.get(this.cacheKey, () =>
      this.http.get<Partida[]>(this.baseUrl, {
        withCredentials: true
      })
    );
  }

  create(data: Partida): Observable<Partida> {
    return this.http.post<Partida>(this.baseUrl, data, {
      withCredentials: true
    }).pipe(
      tap(partida => {
        this.dataStore.update<Partida[]>(this.cacheKey, current => [partida, ...(current ?? [])]);
        this.dataStore.invalidateMany(['la-llista', 'rankings']);
      })
    );
  }
}
