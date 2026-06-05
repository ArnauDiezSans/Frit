import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';

export interface Rankings {
  resumen: RankingResumen;
  juegos: RankingJuego[];
  usuarios: RankingUsuario[];
  victoriasPorJuego: RankingVictoriaJuego[];
  periodos: RankingPeriodo[];
}

export interface RankingResumen {
  partidasTotales: number;
  horasTotales: number;
  partidaMasLargaMinutos?: number | null;
  juegosConPartidas: number;
}

export interface RankingJuego {
  juegoId: number;
  nombre: string;
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

@Injectable({ providedIn: 'root' })
export class RankingsService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/rankings`;

  get(): Observable<Rankings> {
    return this.http.get<Rankings>(this.baseUrl, {
      withCredentials: true
    });
  }
}
