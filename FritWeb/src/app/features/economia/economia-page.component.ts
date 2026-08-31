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
  movementSearch = signal('');
  personFilter = signal('');
  assigningMovementId = signal<number | null>(null);
  assignmentTarget = signal<{ person: string; year: number; month: number } | null>(null);
  assignmentAmount: number | null = null;
  assignmentError = signal('');
  autoAssigning = signal(false);
  categorySavingId = signal<number | null>(null);
  readonly expenseCategories = ['Lloguer', 'Llum', 'Internet', 'Aigua', 'Neteja', 'Altres'];
  highlightedQuotaCells = signal<readonly string[]>([]);
  private scrollAfterLoadId: number | null = null;
  private quotaHighlightTimer: ReturnType<typeof setTimeout> | null = null;
  readonly mesos = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
  people = computed(() => [...new Set((this.data()?.quotes ?? []).map(x => x.persona))].sort((a, b) => a.localeCompare(b)));
  filteredMovements = computed(() => {
    const rows = this.data()?.moviments ?? []; const query = this.normalize(this.movementSearch());
    if (!query) return rows;
    return rows.filter(row => this.normalize(`${this.displayDate(row.data)} ${row.descriptorOriginal} ${row.descriptor} ${row.import} ${this.format(row.import)} ${row.categoria}`).includes(query));
  });
  constructor() { this.load(); }
  load(silent = false): void { if (!silent) this.loading.set(true); this.service.get().subscribe({ next: d => { this.data.set(d); this.loading.set(false); if (this.scrollAfterLoadId) { const id = this.scrollAfterLoadId; this.scrollAfterLoadId = null; setTimeout(() => document.getElementById(`economia-moviment-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })); } }, error: () => { this.error.set("No s'han pogut carregar les dades econòmiques."); this.loading.set(false); } }); }
  total(category: string): number { return this.data()?.totals.find(x => x.categoria === category)?.import ?? 0; }
  quota(person: string, year: number, month: number): number | null { const rows = this.data()?.quotes.filter(x => x.persona === person && x.any === year && x.mes === month) ?? []; return rows.length ? rows.reduce((sum, x) => sum + x.import, 0) : null; }
  peopleForYear(year: number): string[] {
    const selected = this.personFilter();
    if (selected) return [selected];
    if (this.assigningMovementId()) return this.people();
    return [...new Set([...(this.data()?.quotes ?? []).filter(x => x.any === year).map(x => x.persona), 'Jaume'])].sort((a, b) => a.localeCompare(b));
  }
  quotaMovementId(person: string, year: number, month: number): number | null { return this.data()?.quotes.find(x => x.persona === person && x.any === year && x.mes === month && x.movimentId)?.movimentId ?? null; }
  hasInheritedQuota(person: string, year: number, month: number): boolean { return this.data()?.quotes.some(x => x.persona === person && x.any === year && x.mes === month && x.heretada && !x.movimentId) ?? false; }
  deleteInheritedQuota(person: string, year: number, month: number): void {
    this.message.set('');
    this.service.deleteInheritedQuota(person, year, month).subscribe({ next: () => this.load(true), error: err => this.message.set(err?.error?.message ?? "No s'ha pogut esborrar l'import heretat.") });
  }
  quotaCellKey(person: string, year: number, month: number): string { return `${person}-${year}-${month}`; }
  isQuotaHighlighted(person: string, year: number, month: number): boolean { return this.highlightedQuotaCells().includes(this.quotaCellKey(person, year, month)); }
  hasQuotaAllocations(row: EconomiaMoviment): boolean { return this.data()?.quotes.some(x => x.movimentId === row.id) ?? false; }
  openMovementAllocations(row: EconomiaMoviment): void {
    const quotes = this.data()?.quotes.filter(x => x.movimentId === row.id) ?? [];
    if (!quotes.length) return;
    const keys = quotes.map(x => this.quotaCellKey(x.persona, x.any, x.mes));
    this.active.set('economia'); this.highlightedQuotaCells.set(keys);
    if (this.quotaHighlightTimer) clearTimeout(this.quotaHighlightTimer);
    setTimeout(() => document.getElementById(`economia-quota-${keys[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }));
    this.quotaHighlightTimer = setTimeout(() => { this.highlightedQuotaCells.set([]); this.quotaHighlightTimer = null; }, 2600);
  }
  openQuotaMovement(person: string, year: number, month: number): void {
    if (this.assigningMovementId()) { this.openAssignment(person, year, month); return; }
    const id = this.quotaMovementId(person, year, month); if (!id) return;
    this.active.set('extracte'); this.highlightedMovementId.set(id);
    setTimeout(() => document.getElementById(`economia-moviment-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }
  selectedMovement(): EconomiaMoviment | null { const id = this.assigningMovementId(); return this.data()?.moviments.find(x => x.id === id) ?? null; }
  remainingToAssign(): number { const row = this.selectedMovement(); return row ? Math.max(0, row.import - row.importImputat) : 0; }
  startAssignment(row: EconomiaMoviment): void { this.assigningMovementId.set(row.id); this.active.set('economia'); this.assignmentError.set(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  cancelAssignment(): void { this.assigningMovementId.set(null); this.assignmentTarget.set(null); this.assignmentAmount = null; this.assignmentError.set(''); }
  openAssignment(person: string, year: number, month: number): void { if (!this.assigningMovementId()) return; this.assignmentTarget.set({ person, year, month }); this.assignmentAmount = this.remainingToAssign(); this.assignmentError.set(''); }
  confirmAssignment(): void {
    const movement = this.selectedMovement(); const target = this.assignmentTarget(); const amount = Number(this.assignmentAmount);
    if (!movement || !target || !Number.isFinite(amount) || amount <= 0) { this.assignmentError.set('Indica un import vàlid.'); return; }
    const completesMovement = amount >= this.remainingToAssign();
    this.service.assignQuota(movement.id, target.person, target.year, target.month, amount).subscribe({ next: () => { this.assignmentTarget.set(null); this.assignmentAmount = null; if (completesMovement) { this.assigningMovementId.set(null); this.active.set('extracte'); this.highlightedMovementId.set(movement.id); this.scrollAfterLoadId = movement.id; } this.load(); }, error: err => this.assignmentError.set(err?.error?.message ?? "No s'ha pogut assignar la quota.") });
  }
  undoAssignments(row: EconomiaMoviment): void { this.service.undoAssignments(row.id).subscribe({ next: () => this.load(), error: () => this.message.set("No s'han pogut desfer les assignacions.") }); }
  autoAssign(): void { this.autoAssigning.set(true); this.message.set(''); this.service.autoAssign().subscribe({ next: result => { this.autoAssigning.set(false); this.message.set(`${result.assignats} moviments assignats automàticament · ${result.pendents} continuen pendents`); this.load(); }, error: () => { this.autoAssigning.set(false); this.message.set("No s'ha pogut completar l'assignació automàtica."); } }); }
  hasImportableRows(): boolean { return this.preview().some(row => !row.duplicat); }
  doPreview(): void { if (!this.extractText.trim()) return; this.previewing.set(true); this.message.set(''); this.service.preview(this.extractText).subscribe({ next: rows => { this.preview.set(rows); this.previewing.set(false); }, error: () => { this.message.set("No s'ha pogut interpretar l'extracte."); this.previewing.set(false); } }); }
  doImport(): void { const rows = this.preview().filter(x => !x.duplicat); if (!rows.length) return; this.importing.set(true); this.service.import(rows).subscribe({ next: r => { this.message.set(`${r.importats} moviments importats · ${r.duplicats} duplicats · ${r.pendentsRevisio} pendents de revisar`); this.preview.set([]); this.extractText = ''; this.importing.set(false); this.load(); }, error: () => { this.message.set("No s'han pogut importar els moviments."); this.importing.set(false); } }); }
  startEdit(row: EconomiaMoviment): void { this.editingId.set(row.id); this.editDescriptor = row.descriptor; }
  cancelEdit(): void { this.editingId.set(null); this.editDescriptor = ''; }
  saveEdit(row: EconomiaMoviment): void { if (!this.editDescriptor.trim()) return; this.service.updateDescriptor(row.id, this.editDescriptor).subscribe({ next: () => { this.cancelEdit(); this.load(); }, error: () => this.message.set("No s'ha pogut desar el descriptor.") }); }
  updateCategory(row: EconomiaMoviment, category: string): void {
    if (!category || category === row.categoria) return;
    this.categorySavingId.set(row.id); this.message.set('');
    this.service.updateCategory(row.id, category).subscribe({ next: () => { this.categorySavingId.set(null); this.load(true); }, error: err => { this.categorySavingId.set(null); this.message.set(err?.error?.message ?? "No s'ha pogut desar la categoria."); } });
  }
  format(value: number): string { return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(value); }
  displayDate(value: string): string { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}`; }
  private normalize(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(',', '.').trim(); }
  logout(): void { this.auth.logout().subscribe({ next: () => this.router.navigateByUrl('/login'), error: () => this.router.navigateByUrl('/login') }); }
}
