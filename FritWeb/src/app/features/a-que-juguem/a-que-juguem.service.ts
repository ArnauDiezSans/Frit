import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';

export interface AQueJuguemRecommendation {
  juegoId: number;
  nombre: string;
  numeroJugadoresMin: number;
  numeroJugadoresMax: number;
  puntuacion: number;
  puntuacionesUsuarios?: AQueJuguemPuntuacionUsuario[];
  tempsMigMinuts?: number | null;
  tempsMigFallback?: boolean;
  ultimaPartida?: string | null;
}

export interface AQueJuguemPuntuacionUsuario {
  usuarioId: number;
  usuarioNombre: string;
  puntuacion: number;
}

export interface RemadaCreate {
  tempsDisponibleMinuts: number;
  nombreJocs: 1 | 5 | 10;
  puntsPerJugador: 1 | 2 | 3;
  usuarioIds: number[];
  juegoIds: number[];
}

export interface Remada {
  remadaId: number;
  createdAt: string;
  tempsDisponibleMinuts: number;
  nombreJocs: 1 | 5 | 10;
  puntsPerJugador: 1 | 2 | 3;
  jugadors: RemadaParticipant[];
  jocs: RemadaGame[];
}

export interface RemadaParticipant {
  usuarioId: number;
  nombre: string;
  punts: number;
}

export interface RemadaGame {
  juegoId: number;
  nombre: string;
  posicion: number;
}

export interface RemadaUpdate extends RemadaCreate {
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AQueJuguemService {
  private http = inject(HttpClient);
  private dataStore = inject(DataStoreService);
  private baseUrl = `${API_BASE_URL}/a-que-juguem`;

  getRecommendations(
    numeroJugadores: number,
    usuarioIds: number[]
  ): Observable<AQueJuguemRecommendation[]> {
    const sortedUsuarioIds = [...usuarioIds].sort((a, b) => a - b);
    const cacheKey = `a-que-juguem:${numeroJugadores}:${sortedUsuarioIds.join(',')}`;

    return this.dataStore.get(cacheKey, () =>
      this.http.post<AQueJuguemRecommendation[]>(
        `${this.baseUrl}/recommendations`,
        { numeroJugadores, usuarioIds },
        { withCredentials: true }
      )
    );
  }

  registerRemada(data: RemadaCreate): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/remades`, data, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.dataStore.invalidate('hall-of-fame');
        this.dataStore.invalidateByPrefix('hall-of-fame:user:');
      })
    );
  }

  getRemades(): Observable<Remada[]> {
    return this.http.get<Remada[]>(`${this.baseUrl}/remades`, {
      withCredentials: true
    });
  }

  updateRemada(id: number, data: RemadaUpdate): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/remades/${id}`, data, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.dataStore.invalidate('hall-of-fame');
        this.dataStore.invalidateByPrefix('hall-of-fame:user:');
      })
    );
  }

  deleteRemada(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/remades/${id}`, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.dataStore.invalidate('hall-of-fame');
        this.dataStore.invalidateByPrefix('hall-of-fame:user:');
      })
    );
  }
}
