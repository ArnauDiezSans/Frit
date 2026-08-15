import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { UsuariosService } from '../juegos/usuarios.service';
import { UsuarioOption } from '../juegos/juegos.models';
import { EncuestaDetalle, EncuestaEstado, EncuestaResumen, EncuestaWrite, EnquestesService, PreguntaTipo, PreguntaWrite, RespuestaValor, VisibilidadResultados } from './enquestes.service';

@Component({ selector: 'app-enquestes-page', standalone: true, imports: [CommonModule, FormsModule, MenuComponent], templateUrl: './enquestes-page.component.html', styleUrl: './enquestes-page.component.css' })
export class EnquestesPageComponent {
  private service = inject(EnquestesService); private auth = inject(AuthService); private usersService = inject(UsuariosService);
  private route = inject(ActivatedRoute); private router = inject(Router);
  readonly PreguntaTipo = PreguntaTipo; readonly Estado = EncuestaEstado; readonly Visibilidad = VisibilidadResultados;
  loading = signal(true); busy = signal(false); error = signal(''); message = signal(''); surveys = signal<EncuestaResumen[]>([]);
  detail = signal<EncuestaDetalle | null>(null); editorOpen = signal(false); editingId = signal<number | null>(null); users = signal<UsuarioOption[]>([]);
  answers: Record<number, RespuestaValor> = {};
  draft: EncuestaWrite = this.emptyDraft();
  ngOnInit(): void {
    this.load();
    this.usersService.getJugadores().subscribe(users => this.users.set(users));
  }
  load(): void {
    this.loading.set(true); this.service.list().subscribe({ next: rows => { this.surveys.set(rows); this.loading.set(false); const id = Number(this.route.snapshot.queryParamMap.get('enquestaId')); if (id) this.open(id); }, error: () => { this.error.set("No s'han pogut carregar les enquestes."); this.loading.set(false); } });
  }
  open(id: number): void {
    this.error.set(''); this.service.get(id).subscribe({ next: detail => { this.detail.set(detail); this.answers = {}; for (const q of detail.preguntas) this.answers[q.encuestaPreguntaId] = detail.miRespuesta?.find(a => a.encuestaPreguntaId === q.encuestaPreguntaId) ?? { encuestaPreguntaId: q.encuestaPreguntaId, opcionIds: [] }; }, error: () => this.error.set("No s'ha pogut obrir l'enquesta.") });
  }
  closeDetail(): void { this.detail.set(null); this.router.navigate([], { queryParams: { enquestaId: null }, queryParamsHandling: 'merge' }); }
  newSurvey(): void { this.editingId.set(null); this.draft = this.emptyDraft(); this.editorOpen.set(true); }
  editDraft(): void {
    const d = this.detail(); if (!d || d.resumen.estado !== EncuestaEstado.Borrador) return;
    this.editingId.set(d.resumen.encuestaId); this.draft = { titulo: d.resumen.titulo, descripcion: d.resumen.descripcion, esAnonima: d.resumen.esAnonima, permiteEditarRespuesta: d.permiteEditarRespuesta, visibilidadResultados: d.visibilidadResultados, fechaCierre: d.resumen.fechaCierre ? this.toLocalDate(d.resumen.fechaCierre) : null, destinatarioIds: d.destinatarioIds ?? [], preguntas: d.preguntas.map(q => ({ tipo: q.tipo, texto: q.texto, ayuda: q.ayuda, obligatoria: q.obligatoria, minimo: q.minimo, maximo: q.maximo, condicionPreguntaOrden: q.condicionPreguntaOrden, condicionOpcionOrden: q.condicionOpcionOrden, opciones: q.opciones.map(o => o.texto) })) }; this.editorOpen.set(true);
  }
  addQuestion(): void { this.draft.preguntas.push(this.emptyQuestion()); }
  removeQuestion(index: number): void { if (this.draft.preguntas.length <= 1) return; this.draft.preguntas.splice(index, 1); for (const q of this.draft.preguntas) { if (q.condicionPreguntaOrden === index) { q.condicionPreguntaOrden = null; q.condicionOpcionOrden = null; } else if (q.condicionPreguntaOrden !== null && q.condicionPreguntaOrden !== undefined && q.condicionPreguntaOrden > index) q.condicionPreguntaOrden--; } }
  addOption(q: PreguntaWrite): void { q.opciones.push(''); }
  removeOption(q: PreguntaWrite, index: number): void { if (q.opciones.length > 2) q.opciones.splice(index, 1); }
  typeChanged(q: PreguntaWrite): void { q.opciones = this.hasOptions(q) ? (q.opciones.length >= 2 ? q.opciones : ['', '']) : []; if (q.tipo === PreguntaTipo.Escala) { q.minimo ??= 1; q.maximo ??= 5; } if (!this.hasOptions(q)) { const index = this.draft.preguntas.indexOf(q); for (const dependent of this.draft.preguntas) if (dependent.condicionPreguntaOrden === index) { dependent.condicionPreguntaOrden = null; dependent.condicionOpcionOrden = null; } } }
  hasOptions(q: PreguntaWrite): boolean { return q.tipo === PreguntaTipo.OpcionUnica || q.tipo === PreguntaTipo.OpcionMultiple; }
  toggleRecipient(id: number, checked: boolean): void { this.draft.destinatarioIds = checked ? [...this.draft.destinatarioIds, id] : this.draft.destinatarioIds.filter(x => x !== id); }
  save(): void {
    if (!this.draft.titulo.trim() || this.draft.preguntas.some(q => !q.texto.trim() || this.hasOptions(q) && q.opciones.some(o => !o.trim()))) { this.error.set('Revisa el títol, les preguntes i les opcions.'); return; }
    const payload = { ...this.draft, fechaCierre: this.draft.fechaCierre ? new Date(this.draft.fechaCierre).toISOString() : null };
    this.busy.set(true); const id = this.editingId(); const req: Observable<unknown> = id ? this.service.update(id, payload) : this.service.create(payload);
    req.subscribe({ next: (result: any) => { this.busy.set(false); this.editorOpen.set(false); this.message.set('Esborrany desat.'); this.load(); this.open(id ?? result.encuestaId); }, error: (err: any) => { this.busy.set(false); this.error.set(err?.error?.message ?? "No s'ha pogut desar."); } });
  }
  submit(): void { const d = this.detail(); if (!d) return; this.busy.set(true); const visibleAnswers = d.preguntas.filter(q => this.isQuestionVisible(q)).map(q => this.answers[q.encuestaPreguntaId]); this.service.submit(d.resumen.encuestaId, visibleAnswers).subscribe({ next: () => { this.busy.set(false); this.message.set('Resposta desada.'); this.open(d.resumen.encuestaId); this.refreshList(); }, error: err => { this.busy.set(false); this.error.set(err?.error?.message ?? "No s'ha pogut desar la resposta."); } }); }
  setSingle(questionId: number, optionId: number): void { this.answers[questionId].opcionIds = [optionId]; }
  setMultiple(questionId: number, optionId: number, checked: boolean): void { const ids = this.answers[questionId].opcionIds; this.answers[questionId].opcionIds = checked ? [...ids, optionId] : ids.filter(id => id !== optionId); }
  isQuestionVisible(question: EncuestaDetalle['preguntas'][number]): boolean { const d = this.detail(); if (!d || question.condicionPreguntaOrden === null || question.condicionPreguntaOrden === undefined) return true; const source = d.preguntas.find(q => q.orden === question.condicionPreguntaOrden); if (!source || !this.isQuestionVisible(source)) return false; const option = source.opciones.find(o => o.orden === question.condicionOpcionOrden); return !!option && this.answers[source.encuestaPreguntaId]?.opcionIds.includes(option.encuestaOpcionId); }
  conditionSources(index: number): { question: PreguntaWrite; index: number }[] { return this.draft.preguntas.slice(0, index).map((question, sourceIndex) => ({ question, index: sourceIndex })).filter(item => this.hasOptions(item.question)); }
  conditionOptions(question: PreguntaWrite): string[] { const index = question.condicionPreguntaOrden; return index === null || index === undefined ? [] : this.draft.preguntas[index]?.opciones ?? []; }
  conditionChanged(question: PreguntaWrite): void { if (question.condicionPreguntaOrden === null || question.condicionPreguntaOrden === undefined) question.condicionOpcionOrden = null; else question.condicionOpcionOrden = 0; }
  manage(action: 'publish' | 'close' | 'remind' | 'delete'): void {
    const d = this.detail(); if (!d) return; if (action === 'delete' && !confirm('Eliminar aquest esborrany?')) return;
    this.busy.set(true); const requests: Record<typeof action, Observable<unknown>> = { publish: this.service.publish(d.resumen.encuestaId), close: this.service.close(d.resumen.encuestaId), remind: this.service.remind(d.resumen.encuestaId), delete: this.service.delete(d.resumen.encuestaId) };
    requests[action].subscribe({ next: (result: any) => { this.busy.set(false); this.message.set(action === 'remind' ? `Recordatori enviat a ${result.destinatarios} persones.` : 'Canvi desat.'); if (action === 'delete') this.closeDetail(); else this.open(d.resumen.encuestaId); this.refreshList(); }, error: (err: any) => { this.busy.set(false); this.error.set(err?.error?.message ?? "No s'ha pogut completar l'acció."); } });
  }
  logout(): void { this.auth.logout().subscribe(() => this.router.navigateByUrl('/login')); }
  statusLabel(s: EncuestaEstado): string { return ['Esborrany', 'Oberta', 'Tancada'][s]; }
  typeLabel(t: PreguntaTipo): string { return ['Opció única', 'Opció múltiple', 'Text curt', 'Text llarg', 'Escala'][t]; }
  trackByIndex(index: number): number { return index; }
  private refreshList(): void { this.service.list().subscribe(rows => this.surveys.set(rows)); }
  private emptyDraft(): EncuestaWrite { return { titulo: '', descripcion: '', esAnonima: false, permiteEditarRespuesta: true, visibilidadResultados: VisibilidadResultados.DespuesDeResponder, fechaCierre: null, destinatarioIds: [], preguntas: [this.emptyQuestion()] }; }
  private emptyQuestion(): PreguntaWrite { return { tipo: PreguntaTipo.OpcionUnica, texto: '', ayuda: '', obligatoria: true, opciones: ['', ''] }; }
  private toLocalDate(value: string): string { const d = new Date(value); const pad = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
}
