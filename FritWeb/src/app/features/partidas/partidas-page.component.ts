import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { Juego, UsuarioOption } from '../juegos/juegos.models';
import { JuegosService } from '../juegos/juegos.service';
import { UsuariosService } from '../juegos/usuarios.service';
import {
  Partida,
  PartidaGridRow,
  PartidaJugador
} from './partidas.models';
import { PartidasService } from './partidas.service';
import { PartidaJugadoresService } from './partida-jugadores.service';

type FormJugador = {
  usuarioId: number | null;
  usuarioSearch: string;
  nombreMostrado: string;
  posicion: number;
  puntos: number | null;
};

type SortColumn =
  | 'fecha'
  | 'juegoNombre'
  | 'duracionMinutos'
  | 'numeroJugadores'
  | 'resultadoJugadores'
  | 'observaciones';

type SortDirection = 'asc' | 'desc';

interface PartidasFilters {
  fechaDesde: string;
  fechaHasta: string;
  juegoNombre: string;
  duracionMinutosMin: string;
  duracionMinutosMax: string;
  numeroJugadoresMin: string;
  numeroJugadoresMax: string;
  resultadoJugadores: string;
  observaciones: string;
}

interface VisibleColumns {
  fecha: boolean;
  juegoNombre: boolean;
  duracionMinutos: boolean;
  numeroJugadores: boolean;
  resultadoJugadores: boolean;
  observaciones: boolean;
}

const EMPTY_FILTERS: PartidasFilters = {
  fechaDesde: '',
  fechaHasta: '',
  juegoNombre: '',
  duracionMinutosMin: '',
  duracionMinutosMax: '',
  numeroJugadoresMin: '',
  numeroJugadoresMax: '',
  resultadoJugadores: '',
  observaciones: ''
};

@Component({
  selector: 'app-partidas-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent],
  templateUrl: './partidas-page.component.html',
  styleUrl: './partidas-page.component.css'
})
export class PartidasPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private partidasService = inject(PartidasService);
  private juegosService = inject(JuegosService);
  private usuariosService = inject(UsuariosService);
  private partidaJugadoresService = inject(PartidaJugadoresService);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  error = signal('');
  formError = signal('');
  success = signal('');
  modalOpen = signal(false);

  partidas = signal<Partida[]>([]);
  juegos = signal<Juego[]>([]);
  filteredJuegos = signal<Juego[]>([]);
  showJuegoOptions = signal(false);

  usuarios = signal<UsuarioOption[]>([]);
  filteredUsuarios = signal<UsuarioOption[]>([]);
  showUsuarioOptions = signal<number | null>(null);

  partidaJugadores = signal<PartidaJugador[]>([]);

  filters = signal<PartidasFilters>({ ...EMPTY_FILTERS });
  sortColumn = signal<SortColumn>('fecha');
  sortDirection = signal<SortDirection>('desc');
  visibleColumns = signal<VisibleColumns>({
    fecha: true,
    juegoNombre: true,
    duracionMinutos: true,
    numeroJugadores: true,
    resultadoJugadores: true,
    observaciones: true
  });
  showFilters = signal(false);
  showColumnsPanel = signal(false);
  isMobileFilters = signal(false);

  userName = computed(() => this.authService.currentUser?.nombre ?? 'Usuari');
  allColumnsSelected = computed(() => Object.values(this.visibleColumns()).every(Boolean));

  partidasGrid = computed<PartidaGridRow[]>(() => {
    const partidas = this.partidas();
    const juegos = this.juegos();
    const partidaJugadores = this.partidaJugadores();

    return partidas.map(partida => {
      const juego = juegos.find(item => item.juegoId === partida.juegoId);
      const jugadoresPartida = partidaJugadores
        .filter(jugador => jugador.partidaId === partida.partidaId)
        .sort((a, b) => a.posicion - b.posicion);

      const resultadoJugadores = jugadoresPartida.length
        ? jugadoresPartida
            .map(jugador =>
              jugador.puntos !== null && jugador.puntos !== undefined
                ? `${jugador.nombreMostrado}: ${this.formatPuntos(jugador.puntos)}`
                : `${jugador.nombreMostrado}: -`
            )
            .join(' · ')
        : '-';

      return {
        partidaId: partida.partidaId,
        juegoId: partida.juegoId,
        juegoNombre: juego?.nombre ?? `Joc #${partida.juegoId}`,
        fecha: partida.fecha,
        duracionMinutos: partida.duracionMinutos ?? null,
        numeroJugadores: partida.numeroJugadores,
        resultadoJugadores,
        observaciones: partida.observaciones?.trim() ?? ''
      };
    });
  });

  totalPartidas = computed(() => this.partidasGrid().length);

  partidasEsteMes = computed(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return this.partidasGrid().filter(partida => {
      const fecha = new Date(partida.fecha);
      return fecha.getMonth() === month && fecha.getFullYear() === year;
    }).length;
  });

  duracionMedia = computed(() => {
    const conDuracion = this.partidasGrid().filter(
      partida => partida.duracionMinutos !== null && partida.duracionMinutos > 0
    );

    if (conDuracion.length === 0) {
      return null;
    }

    const total = conDuracion.reduce(
      (sum, partida) => sum + (partida.duracionMinutos ?? 0),
      0
    );

    return Math.round(total / conDuracion.length);
  });

  partidasFiltradasOrdenadas = computed(() => {
    const filters = this.filters();
    const sortColumn = this.sortColumn();
    const sortDirection = this.sortDirection();
    const rows = [...this.partidasGrid()];

    const filtered = rows.filter(row => {
      const rowDate = this.parseDateOnly(row.fecha);
      const fechaDesde = this.parseDateOnly(filters.fechaDesde);
      const fechaHasta = this.parseDateOnly(filters.fechaHasta);

      if (fechaDesde !== null && (rowDate === null || rowDate < fechaDesde)) {
        return false;
      }

      if (fechaHasta !== null && (rowDate === null || rowDate > fechaHasta)) {
        return false;
      }

      if (
        filters.juegoNombre.trim() &&
        !row.juegoNombre.toLowerCase().includes(filters.juegoNombre.trim().toLowerCase())
      ) {
        return false;
      }

      const duracionMin = this.parseNumberFilter(filters.duracionMinutosMin);
      const duracionMax = this.parseNumberFilter(filters.duracionMinutosMax);
      const duracion = row.duracionMinutos;

      if (duracionMin !== null && (duracion === null || duracion < duracionMin)) {
        return false;
      }

      if (duracionMax !== null && (duracion === null || duracion > duracionMax)) {
        return false;
      }

      const jugadoresMin = this.parseNumberFilter(filters.numeroJugadoresMin);
      const jugadoresMax = this.parseNumberFilter(filters.numeroJugadoresMax);

      if (jugadoresMin !== null && row.numeroJugadores < jugadoresMin) {
        return false;
      }

      if (jugadoresMax !== null && row.numeroJugadores > jugadoresMax) {
        return false;
      }

      if (
        filters.resultadoJugadores.trim() &&
        !this.matchesAllTerms(row.resultadoJugadores, filters.resultadoJugadores)
      ) {
        return false;
      }

      if (
        filters.observaciones.trim() &&
        !(row.observaciones || '-')
          .toLowerCase()
          .includes(filters.observaciones.trim().toLowerCase())
      ) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      switch (sortColumn) {
        case 'fecha':
          return (
            (new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) * direction
          );

        case 'juegoNombre':
          return a.juegoNombre.localeCompare(b.juegoNombre, 'ca') * direction;

        case 'duracionMinutos':
          return ((a.duracionMinutos ?? -1) - (b.duracionMinutos ?? -1)) * direction;

        case 'numeroJugadores':
          return (a.numeroJugadores - b.numeroJugadores) * direction;

        case 'resultadoJugadores':
          return (
            a.resultadoJugadores.localeCompare(b.resultadoJugadores, 'ca') * direction
          );

        case 'observaciones':
          return (
            (a.observaciones || '-').localeCompare(b.observaciones || '-', 'ca') *
            direction
          );

        default:
          return 0;
      }
    });

    return filtered;
  });

  form = this.fb.group({
    juegoId: [null as number | null, Validators.required],
    juegoSearch: [''],
    fecha: [this.getTodayDate(), Validators.required],
    duracionMinutos: [null as number | null],
    numeroJugadores: [2, [Validators.required, Validators.min(1)]],
    observaciones: [''],
    jugadores: this.fb.array([])
  });

  constructor() {
    effect(() => {
      if (!this.modalOpen()) {
        this.showJuegoOptions.set(false);
        this.showUsuarioOptions.set(null);
      }
    });

    this.updateResponsiveState();
  }

  get jugadoresArray(): FormArray {
    return this.form.get('jugadores') as FormArray;
  }

  ngOnInit(): void {
    this.cargarPartidas();
  }

  @HostListener('window:click')
  onWindowClick(): void {
    this.showColumnsPanel.set(false);
    this.showJuegoOptions.set(false);
    this.showUsuarioOptions.set(null);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateResponsiveState();
  }

  cargarPartidas(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      partidas: this.partidasService.getAll(),
      juegos: this.juegosService.getAll(),
      usuarios: this.usuariosService.getAll(),
      partidaJugadores: this.partidaJugadoresService.getAll()
    }).subscribe({
      next: result => {
        this.partidas.set(result.partidas);
        this.juegos.set(result.juegos);
        this.filteredJuegos.set(result.juegos);
        this.usuarios.set(result.usuarios);
        this.filteredUsuarios.set(result.usuarios);
        this.partidaJugadores.set(result.partidaJugadores);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'han pogut carregar les partides.");
        this.loading.set(false);
      }
    });
  }

  abrirModal(): void {
    this.form.reset({
      juegoId: null,
      juegoSearch: '',
      fecha: this.getTodayDate(),
      duracionMinutos: null,
      numeroJugadores: 2,
      observaciones: ''
    });

    this.jugadoresArray.clear();
    this.filteredJuegos.set(this.juegos());
    this.filteredUsuarios.set(this.usuarios());
    this.syncJugadoresWithNumero(2);
    this.formError.set('');
    this.success.set('');
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    this.modalOpen.set(false);
    this.formError.set('');
    this.success.set('');
  }

  onNumeroJugadoresChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value) || value < 1) {
      return;
    }

    this.form.controls.numeroJugadores.setValue(value);
    this.syncJugadoresWithNumero(value);
  }

  onJuegoInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.form.controls.juegoSearch.setValue(value);
    this.showJuegoOptions.set(true);

    const normalized = value.trim().toLowerCase();
    this.filteredJuegos.set(
      this.juegos().filter(j => j.nombre.toLowerCase().includes(normalized))
    );
  }

  onJuegoFocus(): void {
    this.showJuegoOptions.set(true);
    const value = this.form.controls.juegoSearch.value ?? '';
    this.filteredJuegos.set(
      this.juegos().filter(j => j.nombre.toLowerCase().includes(value.toLowerCase()))
    );
  }

  seleccionarJuego(juego: Juego): void {
    this.form.patchValue({
      juegoId: juego.juegoId,
      juegoSearch: juego.nombre
    });
    this.showJuegoOptions.set(false);
  }

  limpiarJuegoSeleccionado(): void {
    this.form.patchValue({ juegoId: null, juegoSearch: '' });
    this.showJuegoOptions.set(false);
  }

  onUsuarioInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    const group = this.jugadoresArray.at(index);
    group.patchValue({
      usuarioId: null,
      usuarioSearch: value,
      nombreMostrado: ''
    });
    this.showUsuarioOptions.set(index);
    this.filteredUsuarios.set(this.getUsuariosDisponibles(index, value));
  }

  onUsuarioFocus(index: number): void {
    this.showUsuarioOptions.set(index);
    const value = this.jugadoresArray.at(index).get('usuarioSearch')?.value ?? '';
    this.filteredUsuarios.set(this.getUsuariosDisponibles(index, value));
  }

  seleccionarUsuario(index: number, usuario: UsuarioOption): void {
    const group = this.jugadoresArray.at(index);
    group.patchValue({
      usuarioId: usuario.usuarioId,
      usuarioSearch: usuario.nombre,
      nombreMostrado: usuario.nombre
    });
    this.showUsuarioOptions.set(null);
  }

  limpiarUsuario(index: number): void {
    const group = this.jugadoresArray.at(index);
    group.patchValue({
      usuarioId: null,
      usuarioSearch: '',
      nombreMostrado: ''
    });
    this.showUsuarioOptions.set(null);
  }

  addJugador(): void {
    const posicion = this.jugadoresArray.length + 1;
    this.jugadoresArray.push(
      this.fb.group({
        usuarioId: [null as number | null],
        usuarioSearch: ['', Validators.required],
        nombreMostrado: [''],
        posicion: [posicion, Validators.required],
        puntos: [null as number | null]
      })
    );

    this.form.controls.numeroJugadores.setValue(this.jugadoresArray.length);
  }

  removeJugador(index: number): void {
    this.jugadoresArray.removeAt(index);
    this.reindexJugadores();
    this.form.controls.numeroJugadores.setValue(this.jugadoresArray.length);
  }


  guardarPartida(): void {
    this.formError.set('');
    this.success.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Revisa els camps obligatoris.');
      return;
    }

const raw = this.form.getRawValue() as {
  juegoId: number | null;
  fecha: string | null;
  duracionMinutos: number | null;
  numeroJugadores: number | null;
  observaciones: string | null;
  jugadores: FormJugador[];
};

const jugadores: PartidaJugador[] = (raw.jugadores ?? []).map(
  (jugador: FormJugador, index: number) => ({
    partidaJugadorId: 0,
    partidaId: 0,
    usuarioId: jugador.usuarioId ?? null,
    nombreMostrado: (jugador.usuarioSearch ?? '').trim(),
    posicion: index + 1,
    puntos: jugador.puntos ?? null
  })
);

    if (!raw.juegoId) {
      this.formError.set('Has de seleccionar un joc.');
      return;
    }

    if (jugadores.length === 0) {
      this.formError.set('Has d’afegir almenys un jugador.');
      return;
    }

    if (jugadores.some(j => !j.nombreMostrado)) {
      this.formError.set('Tots els jugadors han de tenir nom.');
      return;
    }

const currentUser = this.authService.currentUser;

if (!currentUser) {
  this.formError.set('No s’ha pogut identificar l’usuari actual.');
  return;
}

const partidaPayload: Partida = {
  partidaId: 0,
  juegoId: raw.juegoId,
  usuarioCreadorId: currentUser.usuarioId,
  fecha: raw.fecha ?? this.getTodayDate(),
  duracionMinutos: raw.duracionMinutos ?? null,
  numeroJugadores: raw.numeroJugadores ?? jugadores.length,
  observaciones: raw.observaciones?.trim() || null,
  createdAt: new Date().toISOString()
};

    this.saving.set(true);

    this.partidasService
      .create(partidaPayload)
      .pipe(
        switchMap(partidaCreada => {
          const requests = jugadores.map(jugador =>
            this.partidaJugadoresService.create({
              ...jugador,
              partidaId: partidaCreada.partidaId
            })
          );

          if (requests.length === 0) {
            return forkJoin([]);
          }

          return forkJoin(requests).pipe(
            switchMap(jugadoresCreados =>
              forkJoin({
                partida: [partidaCreada],
                jugadores: [jugadoresCreados]
              })
            )
          );
        })
      )
      .subscribe({
        next: result => {
          const partidaCreada = Array.isArray((result as any).partida)
            ? (result as any).partida[0]
            : null;

          const jugadoresCreados = Array.isArray((result as any).jugadores)
            ? (result as any).jugadores[0]
            : [];

          if (partidaCreada) {
            this.partidas.update(current => [partidaCreada, ...current]);
          }

          if (jugadoresCreados?.length) {
            this.partidaJugadores.update(current => [...current, ...jugadoresCreados]);
          }

          this.saving.set(false);
          this.success.set('Partida desada correctament.');
          this.cerrarModal();
        },
        error: err => {
          this.saving.set(false);
          this.formError.set(err?.error?.message ?? 'No s’ha pogut desar la partida.');
        }
      });
  }

  updateFilter(field: keyof PartidasFilters, value: string): void {
    this.filters.update(current => ({
      ...current,
      [field]: value
    }));
  }

  clearAllFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
  }

  limpiarFiltros(): void {
    this.clearAllFilters();
  }

  toggleFilters(): void {
    this.showFilters.update(value => {
      if (value) {
        this.clearAllFilters();
      }

      return !value;
    });
  }

  toggleColumnsPanel(event: Event): void {
    event.stopPropagation();
    this.showColumnsPanel.update(value => !value);
  }

  toggleColumn(column: keyof VisibleColumns): void {
    this.visibleColumns.update(current => ({
      ...current,
      [column]: !current[column]
    }));
  }

  selectAllColumns(): void {
    const nextValue = !this.allColumnsSelected();
    this.visibleColumns.set({
      fecha: nextValue,
      juegoNombre: nextValue,
      duracionMinutos: nextValue,
      numeroJugadores: nextValue,
      resultadoJugadores: nextValue,
      observaciones: nextValue
    });
  }

  setSort(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortColumn.set(column);
    this.sortDirection.set(column === 'fecha' ? 'desc' : 'asc');
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  formatFecha(value: string): string {
    return new Date(value).toLocaleDateString('ca-ES');
  }

  getJuegoNombre(juegoId: number): string {
    return this.juegos().find(j => j.juegoId === juegoId)?.nombre ?? `Joc #${juegoId}`;
  }

  trackByJuegoId(_: number, juego: Juego): number {
    return juego.juegoId;
  }

  trackByPartidaId(_: number, partida: PartidaGridRow): number {
    return partida.partidaId;
  }

  trackByUsuarioId(_: number, usuario: UsuarioOption): number {
    return usuario.usuarioId;
  }

  private formatPuntos(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  private parseDateOnly(value: string): number | null {
    if (!value.trim()) {
      return null;
    }

    const time = new Date(`${value}T00:00:00`).getTime();
    return Number.isFinite(time) ? time : null;
  }

  private parseNumberFilter(value: string): number | null {
    if (!value.trim()) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private matchesAllTerms(value: string, filter: string): boolean {
    const normalizedValue = value.toLowerCase();
    const terms = filter
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return terms.every(term => normalizedValue.includes(term));
  }

  private syncJugadoresWithNumero(numero: number): void {
    while (this.jugadoresArray.length < numero) {
      const posicion = this.jugadoresArray.length + 1;
      this.jugadoresArray.push(
        this.fb.group({
          usuarioId: [null as number | null],
          usuarioSearch: ['', Validators.required],
          nombreMostrado: [''],
          posicion: [posicion, Validators.required],
          puntos: [null as number | null]
        })
      );
    }

    while (this.jugadoresArray.length > numero) {
      this.jugadoresArray.removeAt(this.jugadoresArray.length - 1);
    }

    this.reindexJugadores();
  }

  private reindexJugadores(): void {
    this.jugadoresArray.controls.forEach((control, index) => {
      control.get('posicion')?.setValue(index + 1);
    });
  }

  private getUsuariosDisponibles(index: number, filter: string): UsuarioOption[] {
    const selectedIds = this.jugadoresArray.controls
      .map((control, controlIndex) => controlIndex === index ? null : Number(control.get('usuarioId')?.value))
      .filter((id): id is number => id !== null && Number.isFinite(id) && id > 0);

    const normalized = filter.trim().toLowerCase();

    return this.usuarios().filter(usuario =>
      !selectedIds.includes(usuario.usuarioId) &&
      usuario.nombre.toLowerCase().includes(normalized)
    );
  }

  private getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private updateResponsiveState(): void {
    const isMobile = window.innerWidth <= 820;
    this.isMobileFilters.set(isMobile);

    if (!isMobile) {
      this.showFilters.set(false);
    }
  }
}
