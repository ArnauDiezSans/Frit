import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';

export interface Rankings {
  resumen: RankingResumen;
  juegos: RankingJuego[];
  usuarios: RankingUsuario[];
  victoriasPorJuego: RankingVictoriaJuego[];
  periodos: RankingPeriodo[];
  partidas: RankingPartida[];
  jugadores: RankingJugador[];
}

export interface RankingResumen {
  partidasTotales: number;
  horasTotales: number;
  partidaMasLargaMinutos?: number | null;
  partidaMasLargaJuegoNombre?: string | null;
  juegoMasJugadoId?: number | null;
  juegoMasJugadoNombre?: string | null;
  juegoMasJugadoPartidas: number;
}

export interface RankingJuego {
  juegoId: number;
  nombre: string;
  tipo: string;
  numeroPartidas: number;
  duracionTotalMinutos: number;
  duracionMediaMinutos?: number | null;
  pvp?: number | null;
  precioPorPartida?: number | null;
  ultimaPartida?: string | null;
}

export interface RankingUsuario {
  usuarioId: number;
  usuarioNombre: string;
  partidasTotales: number;
  victorias: number;
  porcentajeVictoria: number;
}

export interface RankingVictoriaJuego {
  juegoId: number;
  juegoNombre: string;
  usuarioId: number;
  usuarioNombre: string;
  partidasTotales: number;
  victorias: number;
  porcentajeVictoria: number;
}

export interface RankingPeriodo {
  periodo: string;
  usuarioId: number;
  usuarioNombre: string;
  partidasTotales: number;
  victorias: number;
  porcentajeVictoria: number;
}

export interface RankingPartida {
  partidaId: number;
  juegoId: number;
  juegoNombre: string;
  juegoTipo: string;
  fecha: string;
  duracionMinutos?: number | null;
}

export interface RankingJugador {
  partidaId: number;
  juegoId: number;
  juegoNombre: string;
  juegoTipo: string;
  fecha: string;
  duracionMinutos?: number | null;
  numeroJugadores: number;
  dificultadBgg?: number | null;
  usuarioId: number;
  usuarioNombre: string;
  posicion: number;
}

@Injectable({ providedIn: 'root' })
export class RankingsService {
  private http = inject(HttpClient);
  private dataStore = inject(DataStoreService);
  private baseUrl = `${API_BASE_URL}/rankings`;
  private cacheKey = 'rankings';

  get(): Observable<Rankings> {
    return this.dataStore.get(this.cacheKey, () =>
      this.http.get<Rankings>(this.baseUrl, {
        withCredentials: true
      })
    );
  }
}
