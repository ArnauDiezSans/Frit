import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';

export interface CineValoracion {
  cineValoracionId: number;
  usuarioId: number;
  usuarioNombre: string;
  nota?: number | null;
  observacion?: string | null;
  createdAt: string;
}

export interface CinePelicula {
  cinePeliculaId: number;
  titulo: string;
  usuarioCreadorId: number;
  usuarioCreadorNombre: string;
  createdAt: string;
  cierraAt: string;
  puedeValorar: boolean;
  yaValoradaPorUsuario: boolean;
  yaAsistidaPorUsuario: boolean;
  mediaNota?: number | null;
  valoraciones: CineValoracion[];
}

export interface CinePeliculaCreate {
  titulo: string;
}

export interface CineValoracionCreate {
  nota: number;
  observacion?: string | null;
}

export interface CineAsistenciaCreate {
  usuarioId: number;
}

@Injectable({ providedIn: 'root' })
export class CineService {
  private http = inject(HttpClient);
  private dataStore = inject(DataStoreService);
  private baseUrl = `${API_BASE_URL}/cine`;
  private cacheKey = 'cine';

  getAll(): Observable<CinePelicula[]> {
    return this.dataStore.get(this.cacheKey, () =>
      this.http.get<CinePelicula[]>(this.baseUrl, {
        withCredentials: true
      })
    );
  }

  create(data: CinePeliculaCreate): Observable<CinePelicula> {
    return this.http.post<CinePelicula>(this.baseUrl, data, {
      withCredentials: true
    }).pipe(
      tap(pelicula => {
        this.dataStore.update<CinePelicula[]>(this.cacheKey, current => [pelicula, ...(current ?? [])]);
        this.invalidateHallOfFame();
      })
    );
  }

  valorar(peliculaId: number, data: CineValoracionCreate): Observable<CinePelicula> {
    return this.http.post<CinePelicula>(`${this.baseUrl}/${peliculaId}/valoracions`, data, {
      withCredentials: true
    }).pipe(
      tap(updated => {
        this.dataStore.update<CinePelicula[]>(this.cacheKey, current =>
          (current ?? []).map(pelicula => pelicula.cinePeliculaId === peliculaId ? updated : pelicula)
        );
        this.invalidateHallOfFame();
      })
    );
  }

  marcarAsistencia(peliculaId: number, data: CineAsistenciaCreate): Observable<CinePelicula> {
    return this.http.post<CinePelicula>(`${this.baseUrl}/${peliculaId}/assistencies`, data, {
      withCredentials: true
    }).pipe(
      tap(updated => {
        this.dataStore.update<CinePelicula[]>(this.cacheKey, current =>
          (current ?? []).map(pelicula => pelicula.cinePeliculaId === peliculaId ? updated : pelicula)
        );
        this.invalidateHallOfFame();
      })
    );
  }

  private invalidateHallOfFame(): void {
    this.dataStore.invalidate('hall-of-fame');
    this.dataStore.invalidateByPrefix('hall-of-fame:user:');
  }
}
