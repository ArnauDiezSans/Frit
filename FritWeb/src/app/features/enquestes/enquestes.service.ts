import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';

export enum PreguntaTipo { OpcionUnica, OpcionMultiple, TextoCorto, TextoLargo, Escala }
export enum EncuestaEstado { Borrador, Publicada, Cerrada }
export enum VisibilidadResultados { Administradores, DespuesDeResponder, AlCerrar, Siempre }

export interface EncuestaOpcion { encuestaOpcionId: number; texto: string; orden: number; }
export interface EncuestaPregunta { encuestaPreguntaId: number; tipo: PreguntaTipo; texto: string; ayuda?: string; obligatoria: boolean; orden: number; minimo?: number; maximo?: number; condicionPreguntaOrden?: number | null; condicionOpcionOrden?: number | null; opciones: EncuestaOpcion[]; }
export interface EncuestaResumen { encuestaId: number; titulo: string; descripcion?: string; estado: EncuestaEstado; esAnonima: boolean; fechaCierre?: string; createdAt: string; creadorNombre: string; haRespondido: boolean; esDestinatario: boolean; respuestas: number; destinatarios: number; puedeGestionar: boolean; }
export interface RespuestaValor { encuestaPreguntaId: number; texto?: string | null; numero?: number | null; opcionIds: number[]; }
export interface ResultadoPregunta { encuestaPreguntaId: number; texto: string; tipo: PreguntaTipo; respuestas: number; media?: number; opciones: { encuestaOpcionId: number; texto: string; votos: number; porcentaje: number; votantes?: string[] }[]; textos: string[]; }
export interface EncuestaDetalle { resumen: EncuestaResumen; permiteEditarRespuesta: boolean; visibilidadResultados: VisibilidadResultados; preguntas: EncuestaPregunta[]; miRespuesta?: RespuestaValor[]; resultados?: ResultadoPregunta[]; pendientes?: string[]; destinatarioIds?: number[]; }
export interface PreguntaWrite { tipo: PreguntaTipo; texto: string; ayuda?: string; obligatoria: boolean; minimo?: number; maximo?: number; condicionPreguntaOrden?: number | null; condicionOpcionOrden?: number | null; opciones: string[]; }
export interface EncuestaWrite { titulo: string; descripcion?: string; esAnonima: boolean; permiteEditarRespuesta: boolean; visibilidadResultados: VisibilidadResultados; fechaCierre?: string | null; destinatarioIds: number[]; preguntas: PreguntaWrite[]; }

@Injectable({ providedIn: 'root' })
export class EnquestesService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/encuestas`;
  list(): Observable<EncuestaResumen[]> { return this.http.get<EncuestaResumen[]>(this.baseUrl, { withCredentials: true }); }
  get(id: number): Observable<EncuestaDetalle> { return this.http.get<EncuestaDetalle>(`${this.baseUrl}/${id}`, { withCredentials: true }); }
  create(value: EncuestaWrite): Observable<{ encuestaId: number }> { return this.http.post<{ encuestaId: number }>(this.baseUrl, value, { withCredentials: true }); }
  update(id: number, value: EncuestaWrite): Observable<void> { return this.http.put<void>(`${this.baseUrl}/${id}`, value, { withCredentials: true }); }
  publish(id: number): Observable<void> { return this.http.post<void>(`${this.baseUrl}/${id}/publicar`, {}, { withCredentials: true }); }
  close(id: number): Observable<void> { return this.http.post<void>(`${this.baseUrl}/${id}/cerrar`, {}, { withCredentials: true }); }
  remind(id: number): Observable<{ destinatarios: number }> { return this.http.post<{ destinatarios: number }>(`${this.baseUrl}/${id}/recordar`, {}, { withCredentials: true }); }
  submit(id: number, respuestas: RespuestaValor[]): Observable<void> { return this.http.post<void>(`${this.baseUrl}/${id}/respuestas`, { respuestas }, { withCredentials: true }); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}`, { withCredentials: true }); }
}
