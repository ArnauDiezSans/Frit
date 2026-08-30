import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';

export interface EconomiaTotal { categoria: string; import: number; }
export interface EconomiaQuota { persona: string; any: number; mes: number; import: number; movimentId: number | null; dataMoviment: string | null; }
export interface EconomiaMoviment { id: number; data: string; dataValor: string; descriptorOriginal: string; descriptor: string; import: number; saldo: number | null; categoria: string; requereixRevisio: boolean; importImputat: number; teAssignacions: boolean; }
export interface EconomiaDashboard { totals: EconomiaTotal[]; quotes: EconomiaQuota[]; moviments: EconomiaMoviment[]; anys: number[]; }
export interface EconomiaPreviewRow { data: string; dataValor: string; descriptorOriginal: string; descriptor: string; import: number; saldo: number | null; categoria: string; requereixRevisio: boolean; quotes: EconomiaQuota[]; duplicat: boolean; }
export interface EconomiaImportResult { importats: number; duplicats: number; pendentsRevisio: number; }
export interface EconomiaAutoAssignResult { assignats: number; pendents: number; }

@Injectable({ providedIn: 'root' })
export class EconomiaService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/economia`;
  get(): Observable<EconomiaDashboard> { return this.http.get<EconomiaDashboard>(this.baseUrl, { withCredentials: true }); }
  preview(text: string): Observable<EconomiaPreviewRow[]> { return this.http.post<EconomiaPreviewRow[]>(`${this.baseUrl}/preview`, { text }, { withCredentials: true }); }
  import(moviments: EconomiaPreviewRow[]): Observable<EconomiaImportResult> { return this.http.post<EconomiaImportResult>(`${this.baseUrl}/import`, { moviments }, { withCredentials: true }); }
  updateDescriptor(id: number, descriptor: string): Observable<void> { return this.http.patch<void>(`${this.baseUrl}/moviments/${id}/descriptor`, { descriptor }, { withCredentials: true }); }
  updateCategory(id: number, categoria: string): Observable<void> { return this.http.patch<void>(`${this.baseUrl}/moviments/${id}/categoria`, { categoria }, { withCredentials: true }); }
  assignQuota(id: number, persona: string, any: number, mes: number, importValue: number): Observable<void> { return this.http.post<void>(`${this.baseUrl}/moviments/${id}/assignar-quota`, { persona, any, mes, import: importValue }, { withCredentials: true }); }
  undoAssignments(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/moviments/${id}/assignacions`, { withCredentials: true }); }
  autoAssign(): Observable<EconomiaAutoAssignResult> { return this.http.post<EconomiaAutoAssignResult>(`${this.baseUrl}/assignar-automaticament`, {}, { withCredentials: true }); }
}
