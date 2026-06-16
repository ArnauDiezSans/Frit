import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { isExternalUser } from '../../core/users/external-user';
import { MenuComponent } from '../../shared/menu/menu.component';
import { UsuarioOption } from '../juegos/juegos.models';
import { UsuariosService } from '../juegos/usuarios.service';
import { CinePelicula, CineService } from './cine.service';

type CineSortColumn = 'createdAt' | 'titulo' | 'usuario' | 'mediaNota' | 'userNota';
type SortDirection = 'asc' | 'desc';

interface CineFilters {
  fechaDesde: string;
  fechaHasta: string;
  usuarioId: string;
  tipo: string;
  scoreUsuarioId: string;
}

interface CineUserOption {
  usuarioId: number;
  nombre: string;
}

const EMPTY_CINE_FILTERS: CineFilters = {
  fechaDesde: '',
  fechaHasta: '',
  usuarioId: '',
  tipo: '',
  scoreUsuarioId: ''
};

@Component({
  selector: 'app-cine-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent],
  templateUrl: './cine-page.component.html',
  styleUrl: './cine-page.component.css'
})
export class CinePageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cineService = inject(CineService);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);

  loading = signal(true);
  savingMovie = signal(false);
  savingRatingId = signal<number | null>(null);
  savingAttendanceId = signal<number | null>(null);
  error = signal('');
  movieFormError = signal('');
  ratingFormError = signal('');
  attendanceFormError = signal('');
  showObservacions = signal(false);
  peliculas = signal<CinePelicula[]>([]);
  usuarios = signal<UsuarioOption[]>([]);
  highlightedPeliculaId = signal<number | null>(null);
  ratingOpenId = signal<number | null>(null);
  attendanceOpenId = signal<number | null>(null);
  filters = signal<CineFilters>({ ...EMPTY_CINE_FILTERS });
  showFilters = signal(false);
  sortColumn = signal<CineSortColumn>('createdAt');
  sortDirection = signal<SortDirection>('desc');

  canPublish = computed(() => {
    const currentUser = this.authService.currentUser;
    return currentUser ? !isExternalUser(currentUser) : false;
  });

  userOptions = computed<CineUserOption[]>(() => {
    const users = new Map<number, string>();

    for (const pelicula of this.peliculas()) {
      users.set(pelicula.usuarioCreadorId, pelicula.usuarioCreadorNombre);

      for (const valoracion of pelicula.valoraciones) {
        users.set(valoracion.usuarioId, valoracion.usuarioNombre);
      }
    }

    return Array.from(users.entries())
      .map(([usuarioId, nombre]) => ({ usuarioId, nombre }))
      .filter(usuario => !isExternalUser(usuario))
      .sort((left, right) => left.nombre.localeCompare(right.nombre));
  });

  filteredPeliculas = computed(() => {
    const filters = this.filters();
    const usuarioId = Number(filters.usuarioId);
    const grupoPelicula = Number(filters.tipo);
    const filtered = this.peliculas().filter(pelicula =>
      this.matchesDateRange(pelicula.createdAt, filters.fechaDesde, filters.fechaHasta) &&
      (!usuarioId || this.matchesUser(pelicula, usuarioId)) &&
      (!grupoPelicula || pelicula.grupoPelicula === grupoPelicula)
    );

    return this.sortPeliculas(filtered);
  });

  movieForm = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(300)]],
    estirarLaSetmana: [false],
    creepyjous: [false]
  });

  ratingForm = this.fb.group({
    nota: ['', [Validators.required, this.notaValidator]],
    observacion: ['', Validators.maxLength(200)]
  });

  attendanceForm = this.fb.group({
    usuarioId: ['', Validators.required]
  });

  ngOnInit(): void {
    this.cargarPeliculas();
    this.cargarUsuarios();
  }

  cargarPeliculas(): void {
    this.loading.set(true);
    this.error.set('');

    this.cineService.getAll().subscribe({
      next: peliculas => {
        this.peliculas.set(peliculas);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'ha pogut carregar Cine.");
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
    const grupoPelicula = this.getMovieGroup();

    if (!this.confirmMovieGroupDate(grupoPelicula)) {
      return;
    }

    this.savingMovie.set(true);
    this.movieFormError.set('');

    this.cineService.create({ titulo, grupoPelicula }).subscribe({
      next: pelicula => {
        this.peliculas.update(current => [pelicula, ...current]);
        this.highlightedPeliculaId.set(pelicula.cinePeliculaId);
        window.setTimeout(() => this.highlightedPeliculaId.set(null), 2500);
        this.movieForm.reset({
          titulo: '',
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

  updateMovieGroup(group: 'estirarLaSetmana' | 'creepyjous', checked: boolean): void {
    this.movieForm.patchValue({
      estirarLaSetmana: group === 'estirarLaSetmana' ? checked : false,
      creepyjous: group === 'creepyjous' ? checked : false
    });
  }

  abrirValoracion(pelicula: CinePelicula): void {
    if (!pelicula.puedeValorar) {
      return;
    }

    this.ratingForm.reset({
      nota: '',
      observacion: ''
    });
    this.ratingFormError.set('');
    this.ratingOpenId.set(pelicula.cinePeliculaId);
  }

  cancelarValoracion(): void {
    this.ratingOpenId.set(null);
    this.ratingFormError.set('');
  }

  abrirAsistencia(pelicula: CinePelicula): void {
    if (!this.canPublish()) {
      return;
    }

    this.attendanceForm.reset({ usuarioId: '' });
    this.attendanceFormError.set('');
    this.attendanceOpenId.set(pelicula.cinePeliculaId);
  }

  cancelarAsistencia(): void {
    this.attendanceOpenId.set(null);
    this.attendanceFormError.set('');
  }

  guardarAsistencia(pelicula: CinePelicula): void {
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

    this.savingAttendanceId.set(pelicula.cinePeliculaId);
    this.attendanceFormError.set('');

    this.cineService.marcarAsistencia(pelicula.cinePeliculaId, { usuarioId }).subscribe({
      next: updated => {
        this.peliculas.update(current =>
          current.map(item => item.cinePeliculaId === updated.cinePeliculaId ? updated : item)
        );
        this.attendanceOpenId.set(null);
        this.savingAttendanceId.set(null);
      },
      error: err => {
        this.attendanceFormError.set(err?.error?.message ?? "No s'ha pogut marcar l'assistència.");
        this.savingAttendanceId.set(null);
      }
    });
  }

  guardarValoracion(pelicula: CinePelicula): void {
    const raw = this.ratingForm.getRawValue();
    const nota = this.parseNota(raw.nota ?? '');

    if (this.ratingForm.invalid || nota === null) {
      this.ratingForm.markAllAsTouched();
      this.ratingFormError.set('La nota és obligatòria i ha d\'anar de 0 a 10.');
      return;
    }

    this.savingRatingId.set(pelicula.cinePeliculaId);
    this.ratingFormError.set('');

    this.cineService.valorar(pelicula.cinePeliculaId, {
      nota,
      observacion: raw.observacion?.trim() || null
    }).subscribe({
      next: updated => {
        this.peliculas.update(current =>
          current.map(item => item.cinePeliculaId === updated.cinePeliculaId ? updated : item)
        );
        this.ratingOpenId.set(null);
        this.savingRatingId.set(null);
      },
      error: err => {
        this.ratingFormError.set(err?.error?.message ?? "No s'ha pogut guardar la valoració.");
        this.savingRatingId.set(null);
      }
    });
  }

  toggleObservacions(): void {
    this.showObservacions.update(value => !value);
  }

  updateFilter<K extends keyof CineFilters>(key: K, value: string): void {
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
    this.filters.set({ ...EMPTY_CINE_FILTERS });
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

  sortBy(column: CineSortColumn): void {
    if (column === 'userNota' && !this.filters().scoreUsuarioId) {
      return;
    }

    if (this.sortColumn() !== column) {
      this.sortColumn.set(column);
      this.sortDirection.set(column === 'titulo' || column === 'usuario' ? 'asc' : 'desc');
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

  trackByPeliculaId(_: number, pelicula: CinePelicula): number {
    return pelicula.cinePeliculaId;
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('ca-ES');
  }

  formatDateTime(value: string): string {
    return new Date(value).toLocaleString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatMedia(pelicula: CinePelicula): string {
    if (pelicula.mediaNota === null || pelicula.mediaNota === undefined) {
      return '-';
    }

    return `${this.formatNumber(pelicula.mediaNota)} (${this.formatValoraciones(pelicula)})`;
  }

  formatValoraciones(pelicula: CinePelicula): string {
    return pelicula.valoraciones
      .filter(valoracion => valoracion.nota !== null && valoracion.nota !== undefined)
      .map(valoracion => `${valoracion.usuarioNombre} ${this.formatNumber(valoracion.nota!)}`)
      .join(', ');
  }

  formatAssistenciesSenseNota(pelicula: CinePelicula): string {
    return pelicula.valoraciones
      .filter(valoracion => valoracion.nota === null || valoracion.nota === undefined)
      .map(valoracion => valoracion.usuarioNombre)
      .join(', ');
  }

  formatObservacions(pelicula: CinePelicula): string {
    const observacions = pelicula.valoraciones
      .filter(valoracion => !!valoracion.observacion)
      .map(valoracion => `${valoracion.usuarioNombre}: ${valoracion.observacion}`);

    return observacions.length > 0 ? observacions.join(' | ') : '-';
  }

  formatUserNota(pelicula: CinePelicula): string {
    const nota = this.getSelectedUserNota(pelicula);
    return nota === null ? '-' : this.formatNumber(nota);
  }

  getSortIndicator(column: CineSortColumn): string {
    if (this.sortColumn() !== column) {
      return '';
    }

    return this.sortDirection() === 'asc' ? ' ↑' : ' ↓';
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('ca-ES', {
      maximumFractionDigits: 2
    }).format(value);
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

  private matchesUser(pelicula: CinePelicula, usuarioId: number): boolean {
    return pelicula.usuarioCreadorId === usuarioId ||
      pelicula.valoraciones.some(valoracion => valoracion.usuarioId === usuarioId);
  }

  private getSelectedUserNota(pelicula: CinePelicula): number | null {
    const usuarioId = Number(this.filters().scoreUsuarioId);
    if (!usuarioId) {
      return null;
    }

    return pelicula.valoraciones.find(valoracion => valoracion.usuarioId === usuarioId)?.nota ?? null;
  }

  private sortPeliculas(peliculas: CinePelicula[]): CinePelicula[] {
    const column = this.sortColumn();
    const direction = this.sortDirection();
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...peliculas].sort((left, right) => {
      switch (column) {
        case 'titulo':
          return left.titulo.localeCompare(right.titulo) * multiplier;
        case 'usuario':
          return left.usuarioCreadorNombre.localeCompare(right.usuarioCreadorNombre) * multiplier;
        case 'mediaNota':
          return this.compareNullableNumbers(left.mediaNota ?? null, right.mediaNota ?? null) * multiplier ||
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

  private confirmMovieGroupDate(grupoPelicula: number | null): boolean {
    const day = new Date().getDay();

    if (grupoPelicula === 1 && day !== 0) {
      return window.confirm("Estàs publicant un 'Estirar la setmana' en una data que no és diumenge. Vols continuar?");
    }

    if (grupoPelicula === 2 && day !== 4) {
      return window.confirm("Estàs publicant un 'Creepyjous' en una data que no és dijous. Vols continuar?");
    }

    return true;
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
