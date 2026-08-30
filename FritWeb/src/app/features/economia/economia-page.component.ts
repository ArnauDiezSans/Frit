import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { EconomiaDashboard, EconomiaMoviment, EconomiaPreviewRow, EconomiaService } from './economia.service';

@Component({ selector: 'app-economia-page', standalone: true, imports: [CommonModule, FormsModule, MenuComponent], templateUrl: './economia-page.component.html', styleUrl: './economia-page.component.css' })
export class EconomiaPageComponent {
  private service = inject(EconomiaService); private auth = inject(AuthService); private router = inject(Router);
  active = signal<'economia' | 'extracte'>('economia'); data = signal<EconomiaDashboard | null>(null); loading = signal(true); error = signal('');
  extractText = ''; preview = signal<EconomiaPreviewRow[]>([]); previewing = signal(false); importing = signal(false); message = signal(''); editingId = signal<number | null>(null); editDescriptor = '';
  highlightedMovementId = signal<number | null>(null);
  readonly mesos = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
  people = computed(() => [...new Set((this.data()?.quotes ?? []).map(x => x.persona))].sort((a, b) => a.localeCompare(b)));
  constructor() { this.load(); }
  load(): void { this.loading.set(true); this.service.get().subscribe({ next: d => { this.data.set(d); this.loading.set(false); }, error: () => { this.error.set("No s'han pogut carregar les dades econòmiques."); this.loading.set(false); } }); }
  total(category: string): number { return this.data()?.totals.find(x => x.categoria === category)?.import ?? 0; }
  quota(person: string, year: number, month: number): number | null { const rows = this.data()?.quotes.filter(x => x.persona === person && x.any === year && x.mes === month) ?? []; return rows.length ? rows.reduce((sum, x) => sum + x.import, 0) : null; }
  quotaMovementId(person: string, year: number, month: number): number | null { return this.data()?.quotes.find(x => x.persona === person && x.any === year && x.mes === month && x.movimentId)?.movimentId ?? null; }
  openQuotaMovement(person: string, year: number, month: number): void {
    const id = this.quotaMovementId(person, year, month); if (!id) return;
    this.active.set('extracte'); this.highlightedMovementId.set(id);
    setTimeout(() => document.getElementById(`economia-moviment-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }
  hasImportableRows(): boolean { return this.preview().some(row => !row.duplicat); }
  doPreview(): void { if (!this.extractText.trim()) return; this.previewing.set(true); this.message.set(''); this.service.preview(this.extractText).subscribe({ next: rows => { this.preview.set(rows); this.previewing.set(false); }, error: () => { this.message.set("No s'ha pogut interpretar l'extracte."); this.previewing.set(false); } }); }
  doImport(): void { const rows = this.preview().filter(x => !x.duplicat); if (!rows.length) return; this.importing.set(true); this.service.import(rows).subscribe({ next: r => { this.message.set(`${r.importats} moviments importats · ${r.duplicats} duplicats · ${r.pendentsRevisio} pendents de revisar`); this.preview.set([]); this.extractText = ''; this.importing.set(false); this.load(); }, error: () => { this.message.set("No s'han pogut importar els moviments."); this.importing.set(false); } }); }
  startEdit(row: EconomiaMoviment): void { this.editingId.set(row.id); this.editDescriptor = row.descriptor; }
  cancelEdit(): void { this.editingId.set(null); this.editDescriptor = ''; }
  saveEdit(row: EconomiaMoviment): void { if (!this.editDescriptor.trim()) return; this.service.updateDescriptor(row.id, this.editDescriptor).subscribe({ next: () => { this.cancelEdit(); this.load(); }, error: () => this.message.set("No s'ha pogut desar el descriptor.") }); }
  format(value: number): string { return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(value); }
  logout(): void { this.auth.logout().subscribe({ next: () => this.router.navigateByUrl('/login'), error: () => this.router.navigateByUrl('/login') }); }
}
