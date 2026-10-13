import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/api/api.config';
import { AuthService } from '../../core/auth/auth.service';

interface ScoredGame { partidaId: number; juego: string; fecha: string; posicion: number; peso: number; multiplicador: number; puntos: number; }
interface Player { key: string; nombre: string; posicion: number; puntos: number; partidasTotales: number; partidas: ScoredGame[]; }
interface Edition { fritPartyId: number; nombre: string; inicio: string; fin: string; frozenAt: string | null; jugadores: Player[]; errores: string[]; }

@Component({
  selector: 'app-fritpartys', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './fritpartys.component.html', styleUrl: './fritpartys.component.css'
})
export class FritPartysComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private url = `${API_BASE_URL}/fritpartys`;
  editions = signal<Edition[]>([]);
  missing = signal<string[]>([]);
  selectedId = signal<number>(0);
  selected = computed(() => this.editions().find(e => e.fritPartyId === this.selectedId()));
  canEdit = computed(() => this.auth.currentUserSignal()?.nombre.trim().toLowerCase() === 'arnau');
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  formOpen = signal(false);
  editingId: number | null = null;
  form = { nombre: '', inicio: '', fin: '' };
  pending: 'delete' | 'recalculate' | null = null;
  gamesPlayer = signal<Player | null>(null);

  ngOnInit(): void { this.load(); }
  load(id?: number): void {
    this.loading.set(true); this.error.set('');
    this.http.get<{ ediciones: Edition[]; juegosSinPeso: string[] }>(this.url, { withCredentials: true }).subscribe({
      next: result => {
        this.editions.set(result.ediciones); this.missing.set(result.juegosSinPeso);
        const nextId = id ?? this.selectedId();
        this.selectedId.set(result.ediciones.some(e => e.fritPartyId === nextId) ? nextId : result.ediciones[0]?.fritPartyId ?? 0);
        this.loading.set(false);
      }, error: err => { this.error.set(err.error?.message ?? 'No s’han pogut carregar les FritPartys.'); this.loading.set(false); }
    });
  }
  open(edition?: Edition): void {
    this.editingId = edition?.fritPartyId ?? null;
    const now = new Date();
    const month = new Intl.DateTimeFormat('ca-ES', { month: 'long', timeZone: 'Europe/Madrid' }).format(now);
    const year = new Intl.DateTimeFormat('ca-ES', { year: 'numeric', timeZone: 'Europe/Madrid' }).format(now);
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(now);
    this.form = edition ? { nombre: edition.nombre, inicio: edition.inicio, fin: edition.fin } : { nombre: `Fritparty ${month} ${year}`, inicio: today, fin: today };
    this.error.set(''); this.formOpen.set(true);
  }
  save(): void {
    if (!this.form.nombre.trim() || !this.form.inicio || !this.form.fin || this.form.fin < this.form.inicio) {
      this.error.set('Indica un nom i unes dates vàlides.'); return;
    }
    this.saving.set(true); this.error.set('');
    const request = this.editingId
      ? this.http.put<{ fritPartyId: number } | null>(`${this.url}/${this.editingId}`, this.form, { withCredentials: true })
      : this.http.post<{ fritPartyId: number }>(this.url, this.form, { withCredentials: true });
    request.subscribe({ next: result => { this.saving.set(false); this.formOpen.set(false); this.load(result?.fritPartyId ?? this.editingId ?? undefined); },
      error: err => { this.saving.set(false); this.error.set(err.error?.message ?? 'No s’ha pogut desar l’edició.'); } });
  }
  confirmAction(): void {
    const edition = this.selected(); if (!edition || !this.pending) return;
    const action = this.pending; this.saving.set(true); this.error.set('');
    const request = action === 'delete'
      ? this.http.delete(`${this.url}/${edition.fritPartyId}`, { withCredentials: true })
      : this.http.post(`${this.url}/${edition.fritPartyId}/recalcular`, {}, { withCredentials: true });
    request.subscribe({ next: () => { this.pending = null; this.saving.set(false); this.load(); },
      error: err => { this.pending = null; this.saving.set(false); this.error.set(err.error?.message ?? 'No s’ha pogut completar l’acció.'); } });
  }
}
