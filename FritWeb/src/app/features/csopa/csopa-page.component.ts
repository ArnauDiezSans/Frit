import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { isExternalUser } from '../../core/users/external-user';
import { MenuComponent } from '../../shared/menu/menu.component';
import { CinePelicula, CineService } from '../cine/cine.service';
import { UsuarioOption } from '../juegos/juegos.models';
import { UsuariosService } from '../juegos/usuarios.service';
import {
  CSOPA_TIPUS_GYMFRIT,
  CSOPA_TIPUS_SOPAR,
  CsopaActivitat,
  CsopaService
} from './csopa.service';

type AssistenciaSortColumn = 'createdAt' | 'titol' | 'assistencies' | 'mediaNota' | 'userNota';
type SortDirection = 'asc' | 'desc';
type AssistenciaTipus = 'cine' | 'cine-por' | 'cine-diumenge' | 'sopar' | 'gymfrit';

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
  imports: [CommonModule, ReactiveFormsModule, MenuComponent],
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

  readonly tipusSopar = CSOPA_TIPUS_SOPAR;
  readonly tipusGymfrit = CSOPA_TIPUS_GYMFRIT;

  loading = signal(true);
  savingMovie = signal(false);
  savingActivity = signal(false);
  savingRatingKey = signal<string | null>(null);
  savingAttendanceKey = signal<string | null>(null);
  deletingActivityId = signal<number | null>(null);
  deletingAttendanceId = signal<number | null>(null);
  error = signal('');
  movieFormError = signal('');
  activityFormError = signal('');
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
  editOpenId = signal<number | null>(null);
  filters = signal<AssistenciaFilters>({ ...EMPTY_ASSISTENCIA_FILTERS });
  showFilters = signal(false);
  sortColumn = signal<AssistenciaSortColumn>('createdAt');
  sortDirection = signal<SortDirection>('desc');

  canPublish = computed(() => {
    const currentUser = this.authService.currentUser;
    return currentUser ? !isExternalUser(currentUser) : false;
  });

  canEdit = computed(() => this.authService.currentUser?.nombre === 'Arnau');

  userOptions = computed<AssistenciaUserOption[]>(() => {
    const users = new Map<number, string>();

    for (const pelicula of this.peliculas()) {
      users.set(pelicula.usuarioCreadorId, pelicula.usuarioCreadorNombre);
      for (const valoracion of pelicula.valoraciones) {
        users.set(valoracion.usuarioId, valoracion.usuarioNombre);
      }
    }

    for (const activitat of this.activitats()) {
      users.set(activitat.usuarioCreadorId, activitat.usuarioCreadorNombre);
      for (const assistencia of activitat.assistencies) {
        users.set(assistencia.usuarioId, assistencia.usuarioNombre);
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

  movieForm = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(300)]],
    fecha: [this.getTodayInputValue(), Validators.required],
    estirarLaSetmana: [false],
    creepyjous: [false]
  });

  activityForm = this.fb.group({
    fecha: [this.getTodayInputValue(), Validators.required],
    tipus: [CSOPA_TIPUS_SOPAR, [Validators.required]]
  });

  ratingForm = this.fb.group({
    nota: ['', [Validators.required, this.notaValidator]],
    observacion: ['', Validators.maxLength(200)]
  });

  attendanceForm = this.fb.group({
    usuarioId: ['', Validators.required]
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

  publicarPelicula(): void {
    if (!this.canPublish()) {
      return;
    }

    if (this.movieForm.invalid) {
      this.movieForm.markAllAsTouched();
      this.movieFormError.set('Escriu el títol de la pel·lícula.');
      return;
    }

    const titulo = this.movieForm.controls.titulo.value?.trim() ?? '';
    const fecha = this.movieForm.controls.fecha.value ?? this.getTodayInputValue();
    const grupoPelicula = this.getMovieGroup();

    if (!this.confirmMovieGroupDate(grupoPelicula, fecha)) {
      return;
    }

    this.savingMovie.set(true);
    this.movieFormError.set('');

    this.cineService.create({ titulo, grupoPelicula, fecha }).subscribe({
      next: pelicula => {
        const key = this.getPeliculaKey(pelicula.cinePeliculaId);
        this.peliculas.update(current => [pelicula, ...current]);
        this.highlightedKey.set(key);
        window.setTimeout(() => this.highlightedKey.set(null), 2500);
        this.movieForm.reset({
          titulo: '',
          fecha: this.getTodayInputValue(),
          estirarLaSetmana: false,
          creepyjous: false
        });
        this.savingMovie.set(false);
      },
      error: err => {
        this.movieFormError.set(err?.error?.message ?? "No s'ha pogut publicar la pel·lícula.");
        this.savingMovie.set(false);
      }
    });
  }

  publicarActivitat(): void {
    if (!this.canPublish()) {
      return;
    }

    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      this.activityFormError.set('Selecciona un tipus valid.');
      return;
    }

    const raw = this.activityForm.getRawValue();
    const tipus = Number(raw.tipus);
    const fecha = raw.fecha ?? this.getTodayInputValue();

    if (!this.confirmActivityDate(tipus, fecha)) {
      return;
    }

    this.savingActivity.set(true);
    this.activityFormError.set('');

    this.csopaService.create({ tipus, fecha }).subscribe({
      next: activitat => {
        const key = this.getActivitatKey(activitat.csopaActivitatId);
        this.activitats.update(current => [activitat, ...current]);
        this.highlightedKey.set(key);
        window.setTimeout(() => this.highlightedKey.set(null), 2500);
        this.activityForm.reset({
          fecha: this.getTodayInputValue(),
          tipus
        });
        this.savingActivity.set(false);
      },
      error: err => {
        this.activityFormError.set(err?.error?.message ?? "No s'ha pogut publicar l'activitat.");
        this.savingActivity.set(false);
      }
    });
  }

  updateMovieGroup(group: 'estirarLaSetmana' | 'creepyjous', checked: boolean): void {
    this.movieForm.patchValue({
      estirarLaSetmana: group === 'estirarLaSetmana' ? checked : false,
      creepyjous: group === 'creepyjous' ? checked : false
    });
  }

  updateActivityType(tipus: number, checked: boolean): void {
    this.activityForm.patchValue({
      tipus: checked ? tipus : null
    });
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
    this.editOpenId.set(null);
    this.attendanceForm.reset({ usuarioId: '' });
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
    if (this.attendanceForm.invalid) {
      this.attendanceForm.markAllAsTouched();
      this.attendanceFormError.set('Selecciona un usuari.');
      return;
    }

    const usuarioId = Number(this.attendanceForm.controls.usuarioId.value);
    if (!Number.isFinite(usuarioId) || usuarioId <= 0) {
      this.attendanceFormError.set('Selecciona un usuari.');
      return;
    }

    this.savingAttendanceKey.set(row.key);
    this.attendanceFormError.set('');

    if (row.source === 'cine') {
      const pelicula = row.raw as CinePelicula;
      this.cineService.marcarAsistencia(pelicula.cinePeliculaId, { usuarioId }).subscribe({
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
    this.csopaService.marcarAssistencia(activitat.csopaActivitatId, { usuarioId }).subscribe({
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
    if (!this.canEdit() || row.source !== 'csopa') {
      return;
    }

    const activitat = row.raw as CsopaActivitat;
    this.attendanceOpenKey.set(null);
    this.ratingOpenKey.set(null);
    this.editFormError.set('');
    this.editOpenId.update(current => current === activitat.csopaActivitatId ? null : activitat.csopaActivitatId);
  }

  eliminarActivitat(row: AssistenciaRow): void {
    if (!this.canEdit() || row.source !== 'csopa') {
      return;
    }

    const activitat = row.raw as CsopaActivitat;
    if (!window.confirm(`Eliminar ${this.getTipusLabel(activitat.tipus)} del ${this.formatDate(activitat.createdAt)}?`)) {
      return;
    }

    this.deletingActivityId.set(activitat.csopaActivitatId);
    this.editFormError.set('');

    this.csopaService.deleteActivitat(activitat.csopaActivitatId).subscribe({
      next: () => {
        this.activitats.update(current =>
          current.filter(item => item.csopaActivitatId !== activitat.csopaActivitatId)
        );
        this.editOpenId.set(null);
        this.deletingActivityId.set(null);
      },
      error: err => {
        this.editFormError.set(err?.error?.message ?? "No s'ha pogut eliminar l'activitat.");
        this.deletingActivityId.set(null);
      }
    });
  }

  eliminarAssistencia(row: AssistenciaRow, assistenciaId: number): void {
    if (!this.canEdit() || row.source !== 'csopa') {
      return;
    }

    const activitat = row.raw as CsopaActivitat;
    this.deletingAttendanceId.set(assistenciaId);
    this.editFormError.set('');

    this.csopaService.deleteAssistencia(activitat.csopaActivitatId, assistenciaId).subscribe({
      next: updated => {
        this.activitats.update(current =>
          current.map(item => item.csopaActivitatId === updated.csopaActivitatId ? updated : item)
        );
        this.deletingAttendanceId.set(null);
      },
      error: err => {
        this.editFormError.set(err?.error?.message ?? "No s'ha pogut treure l'assistència.");
        this.deletingAttendanceId.set(null);
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
    return tipus === CSOPA_TIPUS_GYMFRIT ? 'Gymfrit' : 'Sopar';
  }

  getTipusIcon(tipus: number): string {
    return tipus === CSOPA_TIPUS_GYMFRIT ? 'assets/gymfrit.png' : 'assets/sopar.png';
  }

  getCsopaAssistencies(row: AssistenciaRow) {
    return row.source === 'csopa' ? (row.raw as CsopaActivitat).assistencies : [];
  }

  private mapPeliculaToRow(pelicula: CinePelicula): AssistenciaRow {
    return {
      key: this.getPeliculaKey(pelicula.cinePeliculaId),
      source: 'cine',
      id: pelicula.cinePeliculaId,
      createdAt: pelicula.createdAt,
      titol: pelicula.titulo,
      tipus: pelicula.grupoPelicula === 2 ? 'cine-por' : pelicula.grupoPelicula === 1 ? 'cine-diumenge' : 'cine',
      tipusLabel: pelicula.grupoPelicula === 2 ? 'Creepyjous' : pelicula.grupoPelicula === 1 ? 'Estirar la setmana' : 'Pel·lícula',
      tipusIcon: pelicula.grupoPelicula === 2 ? 'assets/terror.png' : pelicula.grupoPelicula === 1 ? 'assets/diumenge.png' : '',
      usuarioCreadorId: pelicula.usuarioCreadorId,
      usuarioCreadorNombre: pelicula.usuarioCreadorNombre,
      assistenciesCount: pelicula.valoraciones.length,
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
      titol: this.getTipusLabel(activitat.tipus),
      tipus: activitat.tipus === CSOPA_TIPUS_GYMFRIT ? 'gymfrit' : 'sopar',
      tipusLabel: this.getTipusLabel(activitat.tipus),
      tipusIcon: this.getTipusIcon(activitat.tipus),
      usuarioCreadorId: activitat.usuarioCreadorId,
      usuarioCreadorNombre: activitat.usuarioCreadorNombre,
      assistenciesCount: activitat.assistencies.length,
      assistenciesText: activitat.assistencies.map(assistencia => assistencia.usuarioNombre).join(', '),
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

  private getMovieGroup(): number | null {
    if (this.movieForm.controls.estirarLaSetmana.value) {
      return 1;
    }

    if (this.movieForm.controls.creepyjous.value) {
      return 2;
    }

    return null;
  }

  private confirmMovieGroupDate(grupoPelicula: number | null, fecha: string): boolean {
    const day = new Date(`${fecha}T12:00:00`).getDay();

    if (grupoPelicula === 1 && day !== 0) {
      return window.confirm("Estàs publicant un 'Estirar la setmana' en una data que no és diumenge. Vols continuar?");
    }

    if (grupoPelicula === 2 && day !== 4) {
      return window.confirm("Estàs publicant un 'Creepyjous' en una data que no és dijous. Vols continuar?");
    }

    return true;
  }

  private confirmActivityDate(tipus: number, fecha: string): boolean {
    const day = new Date(`${fecha}T12:00:00`).getDay();

    if (tipus === CSOPA_TIPUS_SOPAR && day !== 2) {
      return window.confirm("Estàs publicant un sopar en una data que no és dimarts. Vols continuar?");
    }

    if (tipus === CSOPA_TIPUS_GYMFRIT && day !== 4) {
      return window.confirm("Estàs publicant un Gymfrit en una data que no és dijous. Vols continuar?");
    }

    return true;
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
