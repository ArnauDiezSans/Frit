import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';
import { BggJuegoLookup, Juego, JuegoProgreso, JuegoProgresoJugador, JuegoProgresoNivel } from './juegos.models';

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

  getProgress(id: number): Observable<JuegoProgreso> { return this.http.get<JuegoProgreso>(`${this.baseUrl}/${id}/progreso`, { withCredentials: true }); }
  addProgressVisitor(id: number, nombre: string): Observable<JuegoProgresoJugador> { return this.http.post<JuegoProgresoJugador>(`${this.baseUrl}/${id}/progreso/visitantes`, { nombre }, { withCredentials: true }); }
  deleteProgressVisitor(id: number, jugadorId: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}/progreso/jugadores/${jugadorId}`, { withCredentials: true }); }
  addProgressLevel(id: number, nombre: string): Observable<JuegoProgresoNivel> { return this.http.post<JuegoProgresoNivel>(`${this.baseUrl}/${id}/progreso/niveles`, { nombre }, { withCredentials: true }); }
  renameProgressLevel(id: number, nivelId: number, nombre: string): Observable<JuegoProgresoNivel> { return this.http.put<JuegoProgresoNivel>(`${this.baseUrl}/${id}/progreso/niveles/${nivelId}`, { nombre }, { withCredentials: true }); }
  deleteProgressLevel(id: number, nivelId: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}/progreso/niveles/${nivelId}`, { withCredentials: true }); }
  reorderProgressLevels(id: number, nivelIds: number[]): Observable<void> { return this.http.put<void>(`${this.baseUrl}/${id}/progreso/niveles/orden`, { nivelIds }, { withCredentials: true }); }
  setProgressMark(id: number, juegoProgresoJugadorId: number, juegoProgresoNivelId: number, assolit: boolean): Observable<void> { return this.http.put<void>(`${this.baseUrl}/${id}/progreso/marcas`, { juegoProgresoJugadorId, juegoProgresoNivelId, assolit }, { withCredentials: true }); }
}
