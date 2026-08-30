import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';

export interface EconomiaTotal { categoria: string; import: number; }
export interface EconomiaQuota { persona: string; any: number; mes: number; import: number; }
export interface EconomiaMoviment { id: number; data: string; dataValor: string; descriptorOriginal: string; descriptor: string; import: number; saldo: number | null; categoria: string; requereixRevisio: boolean; }
export interface EconomiaDashboard { totals: EconomiaTotal[]; quotes: EconomiaQuota[]; moviments: EconomiaMoviment[]; anys: number[]; }
export interface EconomiaPreviewRow { data: string; dataValor: string; descriptorOriginal: string; descriptor: string; import: number; saldo: number | null; categoria: string; requereixRevisio: boolean; quotes: EconomiaQuota[]; duplicat: boolean; }
export interface EconomiaImportResult { importats: number; duplicats: number; pendentsRevisio: number; }

@Injectable({ providedIn: 'root' })
export class EconomiaService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/economia`;
  get(): Observable<EconomiaDashboard> { return this.http.get<EconomiaDashboard>(this.baseUrl, { withCredentials: true }); }
  preview(text: string): Observable<EconomiaPreviewRow[]> { return this.http.post<EconomiaPreviewRow[]>(`${this.baseUrl}/preview`, { text }, { withCredentials: true }); }
  import(moviments: EconomiaPreviewRow[]): Observable<EconomiaImportResult> { return this.http.post<EconomiaImportResult>(`${this.baseUrl}/import`, { moviments }, { withCredentials: true }); }
  updateDescriptor(id: number, descriptor: string): Observable<void> { return this.http.patch<void>(`${this.baseUrl}/moviments/${id}/descriptor`, { descriptor }, { withCredentials: true }); }
}
