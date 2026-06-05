import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';
import { BggJuegoLookup, Juego } from './juegos.models';

@Injectable({ providedIn: 'root' })
export class JuegosService {
  private http = inject(HttpClient);
  private dataStore = inject(DataStoreService);
  private baseUrl = `${API_BASE_URL}/juegos`;
  private cacheKey = 'juegos';

  getAll(): Observable<Juego[]> {
    return this.dataStore.get(this.cacheKey, () =>
      this.http.get<Juego[]>(this.baseUrl, {
        withCredentials: true
      })
    );
  }

  create(data: Juego): Observable<Juego> {
    return this.http.post<Juego>(this.baseUrl, data, {
      withCredentials: true
    }).pipe(
      tap(juego => {
        this.dataStore.update<Juego[]>(this.cacheKey, current => [...(current ?? []), juego]);
        this.dataStore.invalidateMany(['la-llista', 'rankings']);
        this.dataStore.invalidateByPrefix('usuario-juegos-orden:');
      })
    );
  }

  update(id: number, data: Juego): Observable<Juego> {
    return this.http.put<Juego>(`${this.baseUrl}/${id}`, data, {
      withCredentials: true
    }).pipe(
      tap(juego => {
        this.dataStore.update<Juego[]>(this.cacheKey, current =>
          (current ?? []).map(item => item.juegoId === id ? juego : item)
        );
        this.dataStore.invalidateMany(['la-llista', 'rankings']);
        this.dataStore.invalidateByPrefix('usuario-juegos-orden:');
        this.dataStore.invalidateByPrefix('a-que-juguem:');
      })
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.dataStore.update<Juego[]>(this.cacheKey, current =>
          (current ?? []).filter(item => item.juegoId !== id)
        );
        this.dataStore.invalidateMany(['la-llista', 'rankings']);
        this.dataStore.invalidateByPrefix('usuario-juegos-orden:');
        this.dataStore.invalidateByPrefix('a-que-juguem:');
      })
    );
  }

  getFromBgg(bggId: number): Observable<BggJuegoLookup> {
    return this.http.get<BggJuegoLookup>(`${this.baseUrl}/bgg/${bggId}`, {
      withCredentials: true
    });
  }
}
