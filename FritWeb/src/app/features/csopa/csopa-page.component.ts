import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { isExternalUser } from '../../core/users/external-user';
import { AutocompleteSelectComponent } from '../../shared/autocomplete-select/autocomplete-select.component';
import { MenuComponent } from '../../shared/menu/menu.component';
import { CinePelicula, CineService } from '../cine/cine.service';
import { UsuarioOption } from '../juegos/juegos.models';
import { UsuariosService } from '../juegos/usuarios.service';
import {
  CSOPA_TIPUS_ALTRES,
  CSOPA_TIPUS_GYMFRIT,
  CSOPA_TIPUS_SOPAR,
  CSOPA_TIPUS_SOPAR_DIMARTS,
  CsopaActivitat,
  CsopaService
} from './csopa.service';

type AssistenciaSortColumn = 'createdAt' | 'titol' | 'assistencies' | 'mediaNota' | 'userNota';
type SortDirection = 'asc' | 'desc';
type AssistenciaTipus = 'cine' | 'cine-por' | 'cine-diumenge' | 'cine-fantastic' | 'sopar' | 'sopar-dimarts' | 'gymfrit' | 'altres';

interface EntryTypeOption {
  id: AssistenciaTipus;
  label: string;
  source: 'cine' | 'csopa';
  movieGroup?: number | null;
  activityType?: number;
  requiresTitle: boolean;
  seasonal?: boolean;
}

interface AssistenciaFilters {
  fechaDesde: string;
  fechaHasta: string;
  usuarioId: string;
  tipus: string;
  scoreUsuarioId: string;
}

interface AssistenciaUserOption {
  usuarioId: number;
  nombre: string;
}

interface AssistenciaRow {
  key: string;
  source: 'cine' | 'csopa';
  id: number;
  createdAt: string;
  titol: string;
  tipus: AssistenciaTipus;
  tipusLabel: string;
  tipusIcon: string;
  usuarioCreadorId: number;
  usuarioCreadorNombre: string;
  assistenciesCount: number;
  assistenciesPrimaryText: string;
  assistenciesText: string;
  mediaNota: number | null;
  observacionsText: string;
  canRate: boolean;
  raw: CinePelicula | CsopaActivitat;
}

const EMPTY_ASSISTENCIA_FILTERS: AssistenciaFilters = {
  fechaDesde: '',
  fechaHasta: '',
  usuarioId: '',
  tipus: '',
  scoreUsuarioId: ''
};

@Component({
  selector: 'app-csopa-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent, AutocompleteSelectComponent],
  templateUrl: './csopa-page.component.html',
  styleUrl: './csopa-page.component.css'
})
export class CsopaPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cineService = inject(CineService);
  private csopaService = inject(CsopaService);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);

  readonly entryTypeOptions: EntryTypeOption[] = [
    { id: 'cine', label: 'Pel·lícula', source: 'cine', movieGroup: null, requiresTitle: true },
    { id: 'cine-diumenge', label: 'Pel·lícula de diumenge', source: 'cine', movieGroup: 1, requiresTitle: true },
    { id: 'cine-por', label: 'Pel·lícula de Creepyjous', source: 'cine', movieGroup: 2, requiresTitle: true },
    { id: 'cine-fantastic', label: 'Cicle de cine fantàstic', source: 'cine', movieGroup: 3, requiresTitle: true, seasonal: true },
    { id: 'sopar', label: 'Sopar', source: 'csopa', activityType: CSOPA_TIPUS_SOPAR, requiresTitle: false },
    { id: 'sopar-dimarts', label: 'Sopar de dimarts', source: 'csopa', activityType: CSOPA_TIPUS_SOPAR_DIMARTS, requiresTitle: false },
    { id: 'gymfrit', label: 'Gymfrit', source: 'csopa', activityType: CSOPA_TIPUS_GYMFRIT, requiresTitle: false },
    { id: 'altres', label: 'Altres', source: 'csopa', activityType: CSOPA_TIPUS_ALTRES, requiresTitle: true }
  ];
  displayEntryType = (option: EntryTypeOption) => option.label;
  entryTypeSecondary = (option: EntryTypeOption) => option.seasonal && !this.isFantasticCycleAvailable()
    ? 'Disponible del 15 de juny al 15 de setembre'
    : '';
  trackByEntryType = (_: number, option: EntryTypeOption) => option.id;
  isEntryTypeDisabled = (option: EntryTypeOption) => option.seasonal === true && !this.isFantasticCycleAvailable();

  loading = signal(true);
  savingEntry = signal(false);
  savingRatingKey = signal<string | null>(null);
  savingAttendanceKey = signal<string | null>(null);
  deletingRowKey = signal<string | null>(null);
  deletingAttendanceKey = signal<string | null>(null);
  error = signal('');
  entryFormError = signal('');
  ratingFormError = signal('');
  attendanceFormError = signal('');
  editFormError = signal('');
  showObservacions = signal(false);
  peliculas = signal<CinePelicula[]>([]);
  activitats = signal<CsopaActivitat[]>([]);
  usuarios = signal<UsuarioOption[]>([]);
  highlightedKey = signal<string | null>(null);
  ratingOpenKey = signal<string | null>(null);
  attendanceOpenKey = signal<string | null>(null);
  editOpenKey = signal<string | null>(null);
  filters = signal<AssistenciaFilters>({ ...EMPTY_ASSISTENCIA_FILTERS });
  showFilters = signal(false);
  sortColumn = signal<AssistenciaSortColumn>('createdAt');
  sortDirection = signal<SortDirection>('desc');
  selectedEntryType = signal<EntryTypeOption | null>(this.entryTypeOptions[0]);
  entryTypeSearch = signal(this.entryTypeOptions[0].label);
  filteredEntryTypes = computed(() => {
    const search = this.entryTypeSearch().trim().toLocaleLowerCase('ca');
    if (this.selectedEntryType()?.label.toLocaleLowerCase('ca') === search) return this.entryTypeOptions;
    return this.entryTypeOptions.filter(option => option.label.toLocaleLowerCase('ca').includes(search));
  });

  canPublish = computed(() => {
    const currentUser = this.authService.currentUser;
    return currentUser ? !isExternalUser(currentUser) : false;
  });

  canEdit(): boolean {
    return this.authService.currentUser?.esAdmin === true;
  }

  userOptions = computed<AssistenciaUserOption[]>(() => {
    const users = new Map<number, string>();

    for (const pelicula of this.peliculas()) {
      users.set(pelicula.usuarioCreadorId, pelicula.usuarioCreadorNombre);
      for (const valoracion of pelicula.valoraciones) {
        if (valoracion.usuarioId !== null) {
          users.set(valoracion.usuarioId, valoracion.usuarioNombre);
        }
      }
    }

    for (const activitat of this.activitats()) {
      users.set(activitat.usuarioCreadorId, activitat.usuarioCreadorNombre);
      for (const assistencia of activitat.assistencies) {
        if (assistencia.usuarioId !== null) {
          users.set(assistencia.usuarioId, assistencia.usuarioNombre);
        }
      }
    }

    return Array.from(users.entries())
      .map(([usuarioId, nombre]) => ({ usuarioId, nombre }))
      .filter(usuario => !isExternalUser(usuario))
      .sort((left, right) => left.nombre.localeCompare(right.nombre));
  });

  rows = computed<AssistenciaRow[]>(() => [
    ...this.peliculas().map(pelicula => this.mapPeliculaToRow(pelicula)),
    ...this.activitats().map(activitat => this.mapActivitatToRow(activitat))
  ]);

  filteredRows = computed(() => {
    const filters = this.filters();
    const usuarioId = Number(filters.usuarioId);
    const filtered = this.rows().filter(row =>
      this.matchesDateRange(row.createdAt, filters.fechaDesde, filters.fechaHasta) &&
      (!usuarioId || this.matchesUser(row, usuarioId)) &&
      this.matchesTipus(row, filters.tipus)
    );

    return this.sortRows(filtered);
  });

  entryForm = this.fb.group({
    titulo: ['', Validators.maxLength(300)],
    fecha: [this.getTodayInputValue(), Validators.required]
  });

  ratingForm = this.fb.group({
    nota: ['', [Validators.required, this.notaValidator]],
    observacion: ['', Validators.maxLength(200)]
  });

  attendanceForm = this.fb.group({
    usuarioId: [''],
    nombreMostrado: ['', Validators.maxLength(200)]
  });

  ngOnInit(): void {
    this.cargarAssistencia();
    this.cargarUsuarios();
  }

  cargarAssistencia(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      peliculas: this.cineService.getAll(),
      activitats: this.csopaService.getAll()
    }).subscribe({
      next: ({ peliculas, activitats }) => {
        this.peliculas.set(peliculas);
        this.activitats.set(activitats);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'ha pogut carregar Assistència.");
        this.loading.set(false);
      }
    });
  }

  cargarUsuarios(): void {
    this.usuariosService.getJugadores().subscribe({
      next: usuarios => this.usuarios.set(usuarios),
      error: () => this.usuarios.set([])
    });
  }

  publicarEntrada(): void {
    if (!this.canPublish()) {
      return;
    }

    const option = this.selectedEntryType();
    const titulo = this.entryForm.controls.titulo.value?.trim() ?? '';

    if (!option || this.entryForm.invalid || (option.requiresTitle && !titulo)) {
      this.entryForm.markAllAsTouched();
      this.entryFormError.set(!option ? 'Selecciona un tipus.' : option.requiresTitle ? 'Escriu un títol.' : 'Indica una data vàlida.');
      return;
    }

    const fecha = this.entryForm.controls.fecha.value ?? this.getTodayInputValue();
    this.entryFormError.set('');

    if (option.source === 'cine') {
      const grupoPelicula = option.movieGroup ?? null;
      if (!this.confirmMovieGroupDate(grupoPelicula, fecha)) return;

      this.savingEntry.set(true);
      this.cineService.create({ titulo, grupoPelicula, fecha }).subscribe({
        next: pelicula => {
          const key = this.getPeliculaKey(pelicula.cinePeliculaId);
          this.peliculas.update(current => [pelicula, ...current]);
          this.finishEntryCreation(key);
        },
        error: err => {
          this.entryFormError.set(err?.error?.message ?? "No s'ha pogut publicar la pel·lícula.");
          this.savingEntry.set(false);
        }
      });
      return;
    }

    const tipus = option.activityType!;
    if (!this.confirmActivityDate(tipus, fecha)) return;

    this.savingEntry.set(true);
    this.csopaService.create({ tipus, fecha, titol: option.requiresTitle ? titulo : null }).subscribe({
      next: activitat => {
        const key = this.getActivitatKey(activitat.csopaActivitatId);
        this.activitats.update(current => [activitat, ...current]);
        this.finishEntryCreation(key);
      },
      error: err => {
        this.entryFormError.set(err?.error?.message ?? "No s'ha pogut publicar l'activitat.");
        this.savingEntry.set(false);
      }
    });
  }

  updateEntryTypeSearch(value: string): void {
    this.entryTypeSearch.set(value);
    if (value !== this.selectedEntryType()?.label) this.selectedEntryType.set(null);
  }

  selectEntryType(option: EntryTypeOption): void {
    this.selectedEntryType.set(option);
    this.entryTypeSearch.set(option.label);
    this.entryFormError.set('');
    if (!option.requiresTitle) this.entryForm.controls.titulo.setValue('');
  }

  clearEntryType(): void {
    this.entryTypeSearch.set('');
    this.selectedEntryType.set(null);
  }

  abrirValoracion(row: AssistenciaRow): void {
    if (row.source !== 'cine' || !row.canRate) {
      return;
    }

    this.attendanceOpenKey.set(null);
    this.ratingForm.reset({
      nota: '',
      observacion: ''
    });
    this.ratingFormError.set('');
    this.ratingOpenKey.set(row.key);
  }

  cancelarValoracion(): void {
    this.ratingOpenKey.set(null);
    this.ratingFormError.set('');
  }

  abrirAssistencia(row: AssistenciaRow): void {
    if (!this.canPublish()) {
      return;
    }

    this.ratingOpenKey.set(null);
    this.editOpenKey.set(null);
    this.attendanceForm.reset({ usuarioId: '', nombreMostrado: '' });
    this.attendanceFormError.set('');
    this.attendanceOpenKey.set(row.key);
  }

  cancelarAssistencia(): void {
    this.attendanceOpenKey.set(null);
    this.attendanceFormError.set('');
  }

  guardarValoracion(row: AssistenciaRow): void {
    if (row.source !== 'cine') {
      return;
    }

    const pelicula = row.raw as CinePelicula;
    const raw = this.ratingForm.getRawValue();
    const nota = this.parseNota(raw.nota ?? '');

    if (this.ratingForm.invalid || nota === null) {
      this.ratingForm.markAllAsTouched();
      this.ratingFormError.set("La nota es obligatoria i ha d'anar de 0 a 10.");
      return;
    }

    this.savingRatingKey.set(row.key);
    this.ratingFormError.set('');

    this.cineService.valorar(pelicula.cinePeliculaId, {
      nota,
      observacion: raw.observacion?.trim() || null
    }).subscribe({
      next: updated => {
        this.peliculas.update(current =>
          current.map(item => item.cinePeliculaId === updated.cinePeliculaId ? updated : item)
        );
        this.ratingOpenKey.set(null);
        this.savingRatingKey.set(null);
      },
      error: err => {
        this.ratingFormError.set(err?.error?.message ?? "No s'ha pogut guardar la valoracio.");
        this.savingRatingKey.set(null);
      }
    });
  }

  guardarAssistencia(row: AssistenciaRow): void {
    const usuarioId = Number(this.attendanceForm.controls.usuarioId.value);
    const nombreMostrado = this.attendanceForm.controls.nombreMostrado.value?.trim() ?? '';
    const hasUsuario = Number.isFinite(usuarioId) && usuarioId > 0;

    if (this.attendanceForm.invalid || (!hasUsuario && !nombreMostrado)) {
      this.attendanceForm.markAllAsTouched();
      this.attendanceFormError.set('Selecciona un usuari o escriu el nom d’un assistent extern.');
      return;
    }

    const attendance = hasUsuario
      ? { usuarioId, nombreMostrado: null }
      : { usuarioId: null, nombreMostrado };

    this.savingAttendanceKey.set(row.key);
    this.attendanceFormError.set('');

    if (row.source === 'cine') {
      const pelicula = row.raw as CinePelicula;
      this.cineService.marcarAsistencia(pelicula.cinePeliculaId, attendance).subscribe({
        next: updated => {
          this.peliculas.update(current =>
            current.map(item => item.cinePeliculaId === updated.cinePeliculaId ? updated : item)
          );
          this.attendanceOpenKey.set(null);
          this.savingAttendanceKey.set(null);
        },
        error: err => {
          this.attendanceFormError.set(err?.error?.message ?? "No s'ha pogut marcar l'assistència.");
          this.savingAttendanceKey.set(null);
        }
      });
      return;
    }

    const activitat = row.raw as CsopaActivitat;
    this.csopaService.marcarAssistencia(activitat.csopaActivitatId, attendance).subscribe({
      next: updated => {
        this.activitats.update(current =>
          current.map(item => item.csopaActivitatId === updated.csopaActivitatId ? updated : item)
        );
        this.attendanceOpenKey.set(null);
        this.savingAttendanceKey.set(null);
      },
      error: err => {
        this.attendanceFormError.set(err?.error?.message ?? "No s'ha pogut marcar l'assistència.");
        this.savingAttendanceKey.set(null);
      }
    });
  }

  toggleEditar(row: AssistenciaRow): void {
    if (!this.canEdit()) {
      return;
    }

    this.attendanceOpenKey.set(null);
    this.ratingOpenKey.set(null);
    this.editFormError.set('');
    this.editOpenKey.update(current => current === row.key ? null : row.key);
  }

  eliminarRegistre(row: AssistenciaRow): void {
    if (!this.canEdit()) {
      return;
    }

    if (!window.confirm(`Eliminar ${row.tipusLabel} del ${this.formatDate(row.createdAt)}?`)) {
      return;
    }

    this.deletingRowKey.set(row.key);
    this.editFormError.set('');

    if (row.source === 'cine') {
      const pelicula = row.raw as CinePelicula;
      this.cineService.deletePelicula(pelicula.cinePeliculaId).subscribe({
        next: () => {
          this.peliculas.update(current =>
            current.filter(item => item.cinePeliculaId !== pelicula.cinePeliculaId)
          );
          this.editOpenKey.set(null);
          this.deletingRowKey.set(null);
        },
        error: err => {
          this.editFormError.set(err?.error?.message ?? "No s'ha pogut eliminar la pel·lícula.");
          this.deletingRowKey.set(null);
        }
      });
      return;
    }

    const activitat = row.raw as CsopaActivitat;
    this.csopaService.deleteActivitat(activitat.csopaActivitatId).subscribe({
      next: () => {
        this.activitats.update(current =>
          current.filter(item => item.csopaActivitatId !== activitat.csopaActivitatId)
        );
        this.editOpenKey.set(null);
        this.deletingRowKey.set(null);
      },
      error: err => {
        this.editFormError.set(err?.error?.message ?? "No s'ha pogut eliminar l'activitat.");
        this.deletingRowKey.set(null);
      }
    });
  }

  eliminarAssistencia(row: AssistenciaRow, assistenciaId: number): void {
    if (!this.canEdit()) {
      return;
    }

    const attendanceKey = `${row.key}-${assistenciaId}`;
    this.deletingAttendanceKey.set(attendanceKey);
    this.editFormError.set('');

    if (row.source === 'cine') {
      const pelicula = row.raw as CinePelicula;
      this.cineService.deleteValoracion(pelicula.cinePeliculaId, assistenciaId).subscribe({
        next: updated => {
          this.peliculas.update(current =>
            current.map(item => item.cinePeliculaId === updated.cinePeliculaId ? updated : item)
          );
          this.deletingAttendanceKey.set(null);
        },
        error: err => {
          this.editFormError.set(err?.error?.message ?? "No s'ha pogut treure l'assistència.");
          this.deletingAttendanceKey.set(null);
        }
      });
      return;
    }

    const activitat = row.raw as CsopaActivitat;
    this.csopaService.deleteAssistencia(activitat.csopaActivitatId, assistenciaId).subscribe({
      next: updated => {
        this.activitats.update(current =>
          current.map(item => item.csopaActivitatId === updated.csopaActivitatId ? updated : item)
        );
        this.deletingAttendanceKey.set(null);
      },
      error: err => {
        this.editFormError.set(err?.error?.message ?? "No s'ha pogut treure l'assistència.");
        this.deletingAttendanceKey.set(null);
      }
    });
  }

  toggleObservacions(): void {
    this.showObservacions.update(value => !value);
  }

  updateFilter<K extends keyof AssistenciaFilters>(key: K, value: string): void {
    this.filters.update(current => ({
      ...current,
      [key]: value
    }));

    if (key === 'scoreUsuarioId' && value) {
      this.sortColumn.set('userNota');
      this.sortDirection.set('desc');
    }

    if (key === 'scoreUsuarioId' && !value && this.sortColumn() === 'userNota') {
      this.sortColumn.set('createdAt');
      this.sortDirection.set('desc');
    }
  }

  clearFilters(): void {
    this.filters.set({ ...EMPTY_ASSISTENCIA_FILTERS });
    this.sortColumn.set('createdAt');
    this.sortDirection.set('desc');
  }

  toggleFilters(): void {
    if (this.showFilters()) {
      this.clearFilters();
      this.showFilters.set(false);
      return;
    }

    this.showFilters.set(true);
  }

  sortBy(column: AssistenciaSortColumn): void {
    if (column === 'userNota' && !this.filters().scoreUsuarioId) {
      return;
    }

    if (this.sortColumn() !== column) {
      this.sortColumn.set(column);
      this.sortDirection.set(column === 'titol' ? 'asc' : 'desc');
      return;
    }

    this.sortDirection.update(direction => direction === 'asc' ? 'desc' : 'asc');
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  trackByRowKey(_: number, row: AssistenciaRow): string {
    return row.key;
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('ca-ES');
  }

  formatPrimaryValue(row: AssistenciaRow): string {
    if (row.source === 'cine') {
      if (row.mediaNota === null) {
        return '-';
      }

      return `${this.formatNumber(row.mediaNota)} (${this.formatValoraciones(row.raw as CinePelicula)})`;
    }

    return String(row.assistenciesCount);
  }

  formatUserNota(row: AssistenciaRow): string {
    const nota = this.getSelectedUserNota(row);
    return nota === null ? '-' : this.formatNumber(nota);
  }

  getSortIndicator(column: AssistenciaSortColumn): string {
    if (this.sortColumn() !== column) {
      return '';
    }

    return this.sortDirection() === 'asc' ? ' ↑' : ' ↓';
  }

  getTipusLabel(tipus: number): string {
    switch (tipus) {
      case CSOPA_TIPUS_SOPAR_DIMARTS: return 'Sopar de dimarts';
      case CSOPA_TIPUS_GYMFRIT: return 'Gymfrit';
      case CSOPA_TIPUS_SOPAR: return 'Sopar';
      default: return 'Altres';
    }
  }

  getTipusIcon(tipus: number): string {
    if (tipus === CSOPA_TIPUS_GYMFRIT) return 'fa-solid fa-dumbbell';
    if (tipus === CSOPA_TIPUS_SOPAR_DIMARTS) return 'fa-solid fa-carrot';
    if (tipus === CSOPA_TIPUS_SOPAR) return 'fa-solid fa-pizza-slice';
    return 'fa-solid fa-star';
  }

  getEditAssistencies(row: AssistenciaRow): { id: number; nombre: string }[] {
    if (row.source === 'cine') {
      return (row.raw as CinePelicula).valoraciones.map(valoracion => ({
        id: valoracion.cineValoracionId,
        nombre: valoracion.nota === null || valoracion.nota === undefined
          ? valoracion.usuarioNombre
          : `${valoracion.usuarioNombre} ${this.formatNumber(valoracion.nota)}`
      }));
    }

    return (row.raw as CsopaActivitat).assistencies.map(assistencia => ({
      id: assistencia.csopaAssistenciaId,
      nombre: assistencia.usuarioNombre
    }));
  }

  private mapPeliculaToRow(pelicula: CinePelicula): AssistenciaRow {
    const presentation = this.getMoviePresentation(pelicula.grupoPelicula ?? null);
    return {
      key: this.getPeliculaKey(pelicula.cinePeliculaId),
      source: 'cine',
      id: pelicula.cinePeliculaId,
      createdAt: pelicula.createdAt,
      titol: pelicula.titulo,
      tipus: presentation.tipus,
      tipusLabel: presentation.label,
      tipusIcon: presentation.icon,
      usuarioCreadorId: pelicula.usuarioCreadorId,
      usuarioCreadorNombre: pelicula.usuarioCreadorNombre,
      assistenciesCount: pelicula.valoraciones.length,
      assistenciesPrimaryText: this.formatAssistenciesAmbNota(pelicula),
      assistenciesText: this.formatAssistenciesSenseNota(pelicula),
      mediaNota: pelicula.mediaNota ?? null,
      observacionsText: this.formatObservacions(pelicula),
      canRate: pelicula.puedeValorar,
      raw: pelicula
    };
  }

  private mapActivitatToRow(activitat: CsopaActivitat): AssistenciaRow {
    return {
      key: this.getActivitatKey(activitat.csopaActivitatId),
      source: 'csopa',
      id: activitat.csopaActivitatId,
      createdAt: activitat.createdAt,
      titol: activitat.tipus === CSOPA_TIPUS_ALTRES ? activitat.titol : this.getTipusLabel(activitat.tipus),
      tipus: this.getActivityRowType(activitat.tipus),
      tipusLabel: this.getTipusLabel(activitat.tipus),
      tipusIcon: this.getTipusIcon(activitat.tipus),
      usuarioCreadorId: activitat.usuarioCreadorId,
      usuarioCreadorNombre: activitat.usuarioCreadorNombre,
      assistenciesCount: activitat.assistencies.length,
      assistenciesPrimaryText: activitat.assistencies.map(assistencia => assistencia.usuarioNombre).join(', '),
      assistenciesText: '',
      mediaNota: null,
      observacionsText: '-',
      canRate: false,
      raw: activitat
    };
  }

  private matchesDateRange(value: string, fechaDesde: string, fechaHasta: string): boolean {
    const fecha = value.slice(0, 10);

    if (fechaDesde && fecha < fechaDesde) {
      return false;
    }

    if (fechaHasta && fecha > fechaHasta) {
      return false;
    }

    return true;
  }

  private matchesUser(row: AssistenciaRow, usuarioId: number): boolean {
    if (row.usuarioCreadorId === usuarioId) {
      return true;
    }

    if (row.source === 'cine') {
      return (row.raw as CinePelicula).valoraciones.some(valoracion => valoracion.usuarioId === usuarioId);
    }

    return (row.raw as CsopaActivitat).assistencies.some(assistencia => assistencia.usuarioId === usuarioId);
  }

  private matchesTipus(row: AssistenciaRow, tipus: string): boolean {
    if (!tipus) {
      return true;
    }

    if (tipus === 'cine') {
      return row.source === 'cine';
    }

    return row.tipus === tipus;
  }

  private sortRows(rows: AssistenciaRow[]): AssistenciaRow[] {
    const column = this.sortColumn();
    const direction = this.sortDirection();
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...rows].sort((left, right) => {
      switch (column) {
        case 'titol':
          return left.titol.localeCompare(right.titol) * multiplier;
        case 'assistencies':
          return (left.assistenciesCount - right.assistenciesCount) * multiplier ||
            right.createdAt.localeCompare(left.createdAt);
        case 'mediaNota':
          return this.compareNullableNumbers(left.mediaNota, right.mediaNota) * multiplier ||
            right.createdAt.localeCompare(left.createdAt);
        case 'userNota':
          return this.compareNullableNumbers(this.getSelectedUserNota(left), this.getSelectedUserNota(right)) * multiplier ||
            right.createdAt.localeCompare(left.createdAt);
        case 'createdAt':
        default:
          return left.createdAt.localeCompare(right.createdAt) * multiplier;
      }
    });
  }

  private getSelectedUserNota(row: AssistenciaRow): number | null {
    const usuarioId = Number(this.filters().scoreUsuarioId);
    if (!usuarioId || row.source !== 'cine') {
      return null;
    }

    return (row.raw as CinePelicula).valoraciones.find(valoracion => valoracion.usuarioId === usuarioId)?.nota ?? null;
  }

  private formatValoraciones(pelicula: CinePelicula): string {
    return pelicula.valoraciones
      .filter(valoracion => valoracion.nota !== null && valoracion.nota !== undefined)
      .map(valoracion => `${valoracion.usuarioNombre} ${this.formatNumber(valoracion.nota!)}`)
      .join(', ');
  }

  private formatAssistenciesAmbNota(pelicula: CinePelicula): string {
    return pelicula.valoraciones
      .filter(valoracion => valoracion.nota !== null && valoracion.nota !== undefined)
      .map(valoracion => valoracion.usuarioNombre)
      .join(', ');
  }

  private formatAssistenciesSenseNota(pelicula: CinePelicula): string {
    return pelicula.valoraciones
      .filter(valoracion => valoracion.nota === null || valoracion.nota === undefined)
      .map(valoracion => valoracion.usuarioNombre)
      .join(', ');
  }

  private formatObservacions(pelicula: CinePelicula): string {
    const observacions = pelicula.valoraciones
      .filter(valoracion => !!valoracion.observacion)
      .map(valoracion => `${valoracion.usuarioNombre}: ${valoracion.observacion}`);

    return observacions.length > 0 ? observacions.join(' | ') : '-';
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('ca-ES', {
      maximumFractionDigits: 2
    }).format(value);
  }

  private compareNullableNumbers(left: number | null, right: number | null): number {
    if (left === null && right === null) {
      return 0;
    }

    if (left === null) {
      return -1;
    }

    if (right === null) {
      return 1;
    }

    return left - right;
  }

  private parseNota(value: string): number | null {
    const normalized = value.trim().replace(',', '.');
    const parsed = Number(normalized);

    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10 ? parsed : null;
  }

  private confirmMovieGroupDate(grupoPelicula: number | null, fecha: string): boolean {
    const day = new Date(`${fecha}T12:00:00`).getDay();

    if (grupoPelicula === 3 && !this.isFantasticCycleDate(fecha)) {
      this.entryFormError.set('El Cicle de cine fantàstic només es pot registrar del 15 de juny al 15 de setembre.');
      return false;
    }

    if (grupoPelicula === 1 && day !== 0) {
      return window.confirm("Estàs publicant un 'Estirar la setmana' en una data que no és diumenge. Vols continuar?");
    }

    if (grupoPelicula === 2 && day !== 4) {
      return window.confirm("Estàs publicant un 'Creepyjous' en una data que no és dijous. Vols continuar?");
    }

    return true;
  }

  isFantasticCycleAvailable(): boolean {
    return this.isFantasticCycleDate(this.getTodayInputValue());
  }

  private isFantasticCycleDate(fecha: string): boolean {
    const year = fecha.slice(0, 4);
    return fecha >= `${year}-06-15` && fecha <= `${year}-09-15`;
  }

  private getMoviePresentation(grupo: number | null): { tipus: AssistenciaTipus; label: string; icon: string } {
    switch (grupo) {
      case 1: return { tipus: 'cine-diumenge', label: 'Pel·lícula de diumenge — «Estirar la setmana»', icon: 'fa-solid fa-film' };
      case 2: return { tipus: 'cine-por', label: 'Pel·lícula de Creepyjous', icon: 'fa-solid fa-ghost' };
      case 3: return { tipus: 'cine-fantastic', label: 'Cicle de cine fantàstic', icon: 'fa-solid fa-hat-wizard' };
      default: return { tipus: 'cine', label: 'Pel·lícula', icon: 'fa-solid fa-clapperboard' };
    }
  }

  private confirmActivityDate(tipus: number, fecha: string): boolean {
    const day = new Date(`${fecha}T12:00:00`).getDay();

    if (tipus === CSOPA_TIPUS_SOPAR_DIMARTS && day !== 2) {
      return window.confirm("Estàs publicant un sopar en una data que no és dimarts. Vols continuar?");
    }

    if (tipus === CSOPA_TIPUS_GYMFRIT && day !== 4) {
      return window.confirm("Estàs publicant un Gymfrit en una data que no és dijous. Vols continuar?");
    }

    return true;
  }

  private getActivityRowType(tipus: number): AssistenciaTipus {
    switch (tipus) {
      case CSOPA_TIPUS_SOPAR_DIMARTS: return 'sopar-dimarts';
      case CSOPA_TIPUS_GYMFRIT: return 'gymfrit';
      case CSOPA_TIPUS_SOPAR: return 'sopar';
      default: return 'altres';
    }
  }

  private finishEntryCreation(key: string): void {
    this.highlightedKey.set(key);
    window.setTimeout(() => this.highlightedKey.set(null), 2500);
    this.entryForm.reset({ titulo: '', fecha: this.getTodayInputValue() });
    const defaultOption = this.entryTypeOptions[0];
    this.selectedEntryType.set(defaultOption);
    this.entryTypeSearch.set(defaultOption.label);
    this.savingEntry.set(false);
  }

  private getTodayInputValue(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getPeliculaKey(id: number): string {
    return `cine-${id}`;
  }

  private getActivitatKey(id: number): string {
    return `csopa-${id}`;
  }

  private notaValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    const parsed = Number(value.replace(',', '.'));

    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10
      ? null
      : { notaRange: true };
  }
}
