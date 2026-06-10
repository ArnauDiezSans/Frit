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
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { UiStateService } from '../../core/data/ui-state.service';
import { AutocompleteSelectComponent } from '../../shared/autocomplete-select/autocomplete-select.component';
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
  partidaJugadorId: number;
  usuarioId: number | null;
  usuarioSearch: string;
  nombreMostrado: string;
  equipoColor: string;
  posicion: number;
  puntos: number | null;
};

const TEAM_COLORS = [
  { name: 'verd', value: '#16a34a' },
  { name: 'vermell', value: '#dc2626' },
  { name: 'blau', value: '#2563eb' },
  { name: 'groc', value: '#ca8a04' },
  { name: 'lila', value: '#7c3aed' },
  { name: 'taronja', value: '#ea580c' },
  { name: 'rosa', value: '#db2777' },
  { name: 'turquesa', value: '#0891b2' },
  { name: 'negre', value: '#111827' },
  { name: 'gris', value: '#6b7280' },
  { name: 'marró', value: '#92400e' },
  { name: 'blanc', value: '#f8fafc' }
];

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
  posicionUsuario: string;
  usuarioPosicionId: string;
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
  posicionUsuario: '',
  usuarioPosicionId: '',
  resultadoJugadores: '',
  observaciones: ''
};

@Component({
  selector: 'app-partidas-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent, AutocompleteSelectComponent],
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
  private uiState = inject(UiStateService);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  error = signal('');
  formError = signal('');
  success = signal('');
  modalOpen = signal(false);
  editingPartidaId = signal<number | null>(null);

  partidas = signal<Partida[]>([]);
  juegos = signal<Juego[]>([]);
  filteredJuegos = signal<Juego[]>([]);
  showJuegoOptions = signal(false);

  usuarios = signal<UsuarioOption[]>([]);
  filteredUsuarios = signal<UsuarioOption[]>([]);
  showUsuarioOptions = signal<number | null>(null);

  partidaJugadores = signal<PartidaJugador[]>([]);
  highlightedPartidaId = signal<number | null>(null);
  expandedPartidaId = signal<number | null>(null);

  filters = signal<PartidasFilters>({
    ...EMPTY_FILTERS,
    ...this.uiState.get('ui:partidas:filters', {} as Partial<PartidasFilters>)
  });
  sortColumn = signal<SortColumn | null>(this.uiState.get('ui:partidas:sortColumn', null as SortColumn | null));
  sortDirection = signal<SortDirection | null>(this.uiState.get('ui:partidas:sortDirection', null as SortDirection | null));
  visibleColumns = signal<VisibleColumns>(this.uiState.get('ui:partidas:columns', {
    fecha: true,
    juegoNombre: true,
    duracionMinutos: true,
    numeroJugadores: true,
    resultadoJugadores: true,
    observaciones: true
  }));
  showFilters = signal(false);
  showColumnsPanel = signal(false);
  isMobileFilters = signal(false);
  teamColors = TEAM_COLORS;
  displayJuego = (juego: Juego) => juego.nombre;
  displayUsuario = (usuario: UsuarioOption) => usuario.nombre;

  userName = computed(() => this.authService.currentUser?.nombre ?? 'Usuari');
  canEditPartidas = computed(() => this.userName().trim().toLowerCase() === 'arnau');
  modalTitle = computed(() => this.editingPartidaId() ? 'Editar partida' : 'Nova partida');
  modalDescription = computed(() =>
    this.editingPartidaId()
      ? 'Actualitza el joc, la data i els jugadors de la partida.'
      : 'Selecciona el joc, la data i afegeix els jugadors de la partida.'
  );
  saveButtonText = computed(() => {
    if (this.saving()) {
      return this.editingPartidaId() ? 'Actualitzant...' : 'Desant...';
    }

    return this.editingPartidaId() ? 'Actualitzar partida' : 'Desar partida';
  });
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

  duracionAcumulada = computed(() => {
    const conDuracion = this.partidasGrid().filter(
      partida => partida.duracionMinutos !== null && partida.duracionMinutos > 0
    );

    if (conDuracion.length === 0) {
      return null;
    }

    return conDuracion.reduce(
      (sum, partida) => sum + (partida.duracionMinutos ?? 0),
      0
    );
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

      const posicionUsuario = this.parseNumberFilter(filters.posicionUsuario);
      const usuarioPosicionId = Number(filters.usuarioPosicionId);

      if (posicionUsuario !== null && usuarioPosicionId) {
        const hasMatchingPlayer = this.partidaJugadores().some(jugador =>
          jugador.partidaId === row.partidaId &&
          jugador.usuarioId === usuarioPosicionId &&
          jugador.posicion === posicionUsuario
        );

        if (!hasMatchingPlayer) {
          return false;
        }
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

    if (!sortColumn || !sortDirection) {
      return filtered;
    }

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
    perEquips: [false],
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

    effect(() => this.uiState.set('ui:partidas:filters', this.filters()));
    effect(() => this.uiState.set('ui:partidas:sortColumn', this.sortColumn()));
    effect(() => this.uiState.set('ui:partidas:sortDirection', this.sortDirection()));
    effect(() => this.uiState.set('ui:partidas:columns', this.visibleColumns()));

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
      usuarios: this.usuariosService.getJugadores(),
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
    this.editingPartidaId.set(null);
    this.form.reset({
      juegoId: null,
      juegoSearch: '',
      fecha: this.getTodayDate(),
      duracionMinutos: null,
      numeroJugadores: 2,
      perEquips: false,
      observaciones: ''
    });

    this.jugadoresArray.clear();
    this.filteredJuegos.set(this.juegos());
    this.filteredUsuarios.set(this.usuarios());
    this.syncJugadoresWithNumero(2);
    this.updateTeamSummary();
    this.formError.set('');
    this.success.set('');
    this.modalOpen.set(true);
  }

  abrirEditarPartida(partidaId: number, event: Event): void {
    event.stopPropagation();

    if (!this.canEditPartidas()) {
      return;
    }

    const partida = this.partidas().find(item => item.partidaId === partidaId);
    if (!partida) {
      this.error.set('No s\'ha trobat la partida seleccionada.');
      return;
    }

    const juego = this.juegos().find(item => item.juegoId === partida.juegoId);
    const jugadores = this.partidaJugadores()
      .filter(jugador => jugador.partidaId === partidaId)
      .sort((a, b) => a.posicion - b.posicion);

    this.form.reset({
      juegoId: partida.juegoId,
      juegoSearch: juego?.nombre ?? '',
      fecha: partida.fecha,
      duracionMinutos: partida.duracionMinutos ?? null,
      numeroJugadores: partida.numeroJugadores,
      perEquips: false,
      observaciones: partida.observaciones ?? ''
    });

    this.jugadoresArray.clear();

    if (jugadores.length > 0) {
      jugadores.forEach((jugador, index) => {
        this.jugadoresArray.push(this.createJugadorGroup(index + 1, jugador));
      });
    } else {
      this.syncJugadoresWithNumero(partida.numeroJugadores);
    }

    this.filteredJuegos.set(this.juegos());
    this.filteredUsuarios.set(this.usuarios());
    this.formError.set('');
    this.success.set('');
    this.editingPartidaId.set(partidaId);
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    this.modalOpen.set(false);
    this.editingPartidaId.set(null);
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
    this.updateTeamSummary();
  }

  onJuegoInput(value: string): void {
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

  onUsuarioInput(index: number, value: string): void {
    const group = this.jugadoresArray.at(index);
    group.patchValue({
      usuarioId: null,
      usuarioSearch: value,
      nombreMostrado: ''
    });
    this.showUsuarioOptions.set(index);
    this.filteredUsuarios.set(this.getUsuariosDisponibles(index, value));
    this.updateTeamSummary();
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
    this.updateTeamSummary();
  }

  limpiarUsuario(index: number): void {
    const group = this.jugadoresArray.at(index);
    group.patchValue({
      usuarioId: null,
      usuarioSearch: '',
      nombreMostrado: ''
    });
    this.showUsuarioOptions.set(null);
    this.updateTeamSummary();
  }

  onPerEquipsChange(): void {
    if (!this.form.controls.perEquips.value) {
      this.form.controls.observaciones.setValue('');
      return;
    }

    this.updateTeamSummary();
  }

  onEquipoColorChange(index: number, color: string): void {
    this.jugadoresArray.at(index).get('equipoColor')?.setValue(color);
    this.updateTeamSummary();
  }

  addJugador(): void {
    const posicion = this.jugadoresArray.length + 1;
    this.jugadoresArray.push(
      this.fb.group({
        partidaJugadorId: [0],
        usuarioId: [null as number | null],
        usuarioSearch: ['', Validators.required],
        nombreMostrado: [''],
        equipoColor: [this.getDefaultTeamColor(posicion - 1)],
        posicion: [posicion, Validators.required],
        puntos: [null as number | null]
      })
    );

    this.form.controls.numeroJugadores.setValue(this.jugadoresArray.length);
    this.updateTeamSummary();
  }

  removeJugador(index: number): void {
    this.jugadoresArray.removeAt(index);
    this.reindexJugadores();
    this.form.controls.numeroJugadores.setValue(this.jugadoresArray.length);
    this.updateTeamSummary();
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
  perEquips: boolean | null;
  observaciones: string | null;
  jugadores: FormJugador[];
};

const jugadores: PartidaJugador[] = (raw.jugadores ?? []).map(
  (jugador: FormJugador, index: number) => ({
    partidaJugadorId: jugador.partidaJugadorId ?? 0,
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

const existingPartida = this.partidas().find(partida => partida.partidaId === this.editingPartidaId());
const partidaPayload: Partida = {
  partidaId: this.editingPartidaId() ?? 0,
  juegoId: raw.juegoId,
  usuarioCreadorId: existingPartida?.usuarioCreadorId ?? currentUser.usuarioId,
  fecha: raw.fecha ?? this.getTodayDate(),
  duracionMinutos: raw.duracionMinutos ?? null,
  numeroJugadores: raw.numeroJugadores ?? jugadores.length,
  observaciones: raw.observaciones?.trim() || null,
  createdAt: existingPartida?.createdAt ?? new Date().toISOString()
};

    this.saving.set(true);

    const editingPartidaId = this.editingPartidaId();
    const saveRequest = editingPartidaId
      ? this.partidasService.update(editingPartidaId, partidaPayload).pipe(
          switchMap(partidaActualizada =>
            this.syncPartidaJugadores(editingPartidaId, jugadores).pipe(
              map(jugadoresActualizados => ({
                partida: partidaActualizada,
                jugadores: jugadoresActualizados
              }))
            )
          )
        )
      : this.partidasService.create(partidaPayload).pipe(
          switchMap(partidaCreada =>
            this.createPartidaJugadores(partidaCreada.partidaId, jugadores).pipe(
              map(jugadoresCreados => ({
                partida: partidaCreada,
                jugadores: jugadoresCreados
              }))
            )
          )
        );

    saveRequest.subscribe({
        next: result => {
          if (editingPartidaId) {
            this.partidas.update(current =>
              current.map(partida => partida.partidaId === editingPartidaId ? result.partida : partida)
            );
            this.partidaJugadores.update(current => [
              ...current.filter(jugador => jugador.partidaId !== editingPartidaId),
              ...result.jugadores
            ]);
          } else {
            this.partidas.update(current => [result.partida, ...current]);
            this.partidaJugadores.update(current => [...current, ...result.jugadores]);
          }

          this.highlightedPartidaId.set(result.partida.partidaId);
          window.setTimeout(() => this.highlightedPartidaId.set(null), 2500);

          this.saving.set(false);
          this.success.set(editingPartidaId ? 'Partida actualitzada correctament.' : 'Partida desada correctament.');
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

  toggleFilters(): void {
    if (this.showFilters()) {
      this.clearAllFilters();
      this.showFilters.set(false);
      return;
    }

    this.showFilters.set(true);
  }

  togglePartidaDetail(partidaId: number): void {
    if (!this.isMobileFilters()) {
      return;
    }

    this.expandedPartidaId.update(current => current === partidaId ? null : partidaId);
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
    if (this.sortColumn() !== column) {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
      return;
    }

    if (this.sortDirection() === 'desc') {
      this.sortDirection.set('asc');
      return;
    }

    this.sortColumn.set(null);
    this.sortDirection.set(null);
  }

  getSortIndicator(column: SortColumn): string {
    if (this.sortColumn() !== column || !this.sortDirection()) {
      return '';
    }

    return this.sortDirection() === 'asc' ? ' ↑' : ' ↓';
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  formatFecha(value: string): string {
    return new Date(value).toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatDuracionAcumulada(totalMinutes: number | null): string {
    if (totalMinutes === null) {
      return '-';
    }

    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];

    if (days > 0) {
      parts.push(`${days}d`);
    }

    if (hours > 0) {
      parts.push(`${hours}h`);
    }

    if (minutes > 0 || parts.length === 0) {
      parts.push(`${minutes}min`);
    }

    return parts.join(' ');
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

  private updateTeamSummary(): void {
    if (!this.form.controls.perEquips.value) {
      return;
    }

    const groups = new Map<string, string[]>();

    this.jugadoresArray.controls.forEach((control, index) => {
      const color = control.get('equipoColor')?.value || this.getDefaultTeamColor(index);
      const name = (control.get('usuarioSearch')?.value ?? '').trim();

      if (!name) {
        return;
      }

      const current = groups.get(color) ?? [];
      current.push(name);
      groups.set(color, current);
    });

    const summary = Array.from(groups.entries())
      .map(([color, names]) => `Equip ${this.getTeamColorName(color)}: ${names.join(', ')}.`)
      .join(' ');

    this.form.controls.observaciones.setValue(summary);
  }

  private getDefaultTeamColor(index: number): string {
    return TEAM_COLORS[index % TEAM_COLORS.length].value;
  }

  private getTeamColorName(value: string): string {
    return TEAM_COLORS.find(color => color.value === value)?.name ?? 'sense color';
  }

  private parseDateOnly(value: string): number | null {
    if (!value.trim()) {
      return null;
    }

    const time = new Date(`${value}T00:00:00`).getTime();
    return Number.isFinite(time) ? time : null;
  }

  private parseNumberFilter(value: string | null | undefined): number | null {
    if (!value?.trim()) {
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
      this.jugadoresArray.push(this.createJugadorGroup(posicion));
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

  private createJugadorGroup(posicion: number, jugador?: PartidaJugador) {
    return this.fb.group({
      partidaJugadorId: [jugador?.partidaJugadorId ?? 0],
      usuarioId: [jugador?.usuarioId ?? null as number | null],
      usuarioSearch: [jugador?.nombreMostrado ?? '', Validators.required],
      nombreMostrado: [jugador?.nombreMostrado ?? ''],
      equipoColor: [this.getDefaultTeamColor(posicion - 1)],
      posicion: [jugador?.posicion ?? posicion, Validators.required],
      puntos: [jugador?.puntos ?? null as number | null]
    });
  }

  private createPartidaJugadores(partidaId: number, jugadores: PartidaJugador[]): Observable<PartidaJugador[]> {
    const requests = jugadores.map(jugador =>
      this.partidaJugadoresService.create({
        ...jugador,
        partidaJugadorId: 0,
        partidaId
      })
    );

    return requests.length > 0 ? forkJoin(requests) : of([]);
  }

  private syncPartidaJugadores(partidaId: number, jugadores: PartidaJugador[]): Observable<PartidaJugador[]> {
    const currentJugadores = this.partidaJugadores().filter(jugador => jugador.partidaId === partidaId);
    const nextIds = jugadores
      .map(jugador => jugador.partidaJugadorId)
      .filter(id => id > 0);

    const requests: Observable<PartidaJugador | null>[] = jugadores.map(jugador => {
      const payload = {
        ...jugador,
        partidaId
      };

      if (jugador.partidaJugadorId > 0) {
        return this.partidaJugadoresService.update(jugador.partidaJugadorId, payload);
      }

      return this.partidaJugadoresService.create({
        ...payload,
        partidaJugadorId: 0
      });
    });

    currentJugadores
      .filter(jugador => !nextIds.includes(jugador.partidaJugadorId))
      .forEach(jugador => {
        requests.push(this.partidaJugadoresService.delete(jugador.partidaJugadorId).pipe(map(() => null)));
      });

    return requests.length > 0
      ? forkJoin(requests).pipe(
          map(items => items.filter((item): item is PartidaJugador => item !== null))
        )
      : of([]);
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
      this.expandedPartidaId.set(null);
    }
  }
}
