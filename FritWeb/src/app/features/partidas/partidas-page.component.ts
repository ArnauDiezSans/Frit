import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { UiStateService } from '../../core/data/ui-state.service';
import { AutocompleteSelectComponent } from '../../shared/autocomplete-select/autocomplete-select.component';
import { GameTypeFilterComponent } from '../../shared/game-type-filter/game-type-filter.component';
import {
  GameTypeFilterStates,
  defaultGameTypeFilters,
  emptyGameTypeFilters,
  matchesGameTypeFilters
} from '../../shared/game-type-filter/game-type-filter.models';
import { MenuComponent } from '../../shared/menu/menu.component';
import { Juego, JuegoProgresoNivel, UsuarioOption } from '../juegos/juegos.models';
import { JuegosService } from '../juegos/juegos.service';
import { UsuariosService } from '../juegos/usuarios.service';
import { AQueJuguemService, Remada } from '../a-que-juguem/a-que-juguem.service';
import {
  Partida,
  PartidaGridRow,
  PartidaJugador
} from './partidas.models';
import { PartidasService } from './partidas.service';
import { PartidaJugadoresService } from './partida-jugadores.service';
import { getPartidaValidationErrors } from './partida-validation';
import { buildRemadaPartidaPrefill } from './remada-partida-prefill';
import { elapsedMinutes, elapsedSince, formatPartidaTimer } from './partida-timer';

type FormJugador = {
  partidaJugadorId: number;
  usuarioId: number | null;
  usuarioSearch: string;
  nombreMostrado: string;
  equipoColor: string;
  posicion: number;
  puntos: number | null;
  nivelIds: number[];
};

type FormEquipo = {
  nombre: string;
  color: string;
  numeroJugadores: number;
  posicion: number;
  puntos: number | null;
  jugadores: FormJugador[];
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

const PARTIDAS_PAGE_SIZE = 50;

@Component({
  selector: 'app-partidas-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent, AutocompleteSelectComponent, GameTypeFilterComponent],
  templateUrl: './partidas-page.component.html',
  styleUrl: './partidas-page.component.css'
})
export class PartidasPageComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private partidasService = inject(PartidasService);
  private juegosService = inject(JuegosService);
  private usuariosService = inject(UsuariosService);
  private partidaJugadoresService = inject(PartidaJugadoresService);
  private aQueJuguemService = inject(AQueJuguemService);
  private uiState = inject(UiStateService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  error = signal('');
  formError = signal('');
  success = signal('');
  modalOpen = signal(false);
  editingPartidaId = signal<number | null>(null);
  removingJugadorIndex = signal<number | null>(null);
  removingEquipoIndex = signal<number | null>(null);

  partidas = signal<Partida[]>([]);
  juegos = signal<Juego[]>([]);
  filteredJuegos = signal<Juego[]>([]);
  showJuegoOptions = signal(false);

  usuarios = signal<UsuarioOption[]>([]);
  filteredUsuarios = signal<UsuarioOption[]>([]);
  showUsuarioOptions = signal<string | null>(null);
  progressLevels = signal<JuegoProgresoNivel[]>([]);
  progressLevelsLoading = signal(false);
  progressLevelsError = signal('');

  partidaJugadores = signal<PartidaJugador[]>([]);
  highlightedPartidaId = signal<number | null>(null);
  expandedPartidaId = signal<number | null>(null);
  sourceRemada = signal<Remada | null>(null);
  timerElapsedMilliseconds = signal(0);
  timerRunning = signal(false);
  currentPage = signal(1);

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
  private readonly mobileFiltersQuery = window.matchMedia('(max-width: 820px)');
  private progressLevelsRequestId = 0;
  private timerBaseMilliseconds = 0;
  private timerStartedAtMilliseconds = 0;
  private timerInterval?: ReturnType<typeof setInterval>;
  teamColors = TEAM_COLORS;
  displayJuego = (juego: Juego) => juego.nombre;
  displayUsuario = (usuario: UsuarioOption) => usuario.nombre;

  userName = computed(() => this.authService.currentUser?.nombre ?? 'Usuari');
  canEditPartidas = this.authService.isAdmin;
  modalTitle = computed(() => this.editingPartidaId() ? 'Editar partida' : 'Nova partida');
  modalDescription = computed(() =>
    this.editingPartidaId()
      ? 'Actualitza el joc, la data i els jugadors de la partida.'
      : this.sourceRemada()
        ? 'Completa els resultats de la Remada. La partida no es crearà fins que la desis.'
      : 'Selecciona el joc, la data i afegeix els jugadors de la partida.'
  );
  remadaCandidateGames = computed(() => {
    const candidateIds = new Set(this.sourceRemada()?.jocs.map(juego => juego.juegoId) ?? []);
    return this.juegos().filter(juego => candidateIds.has(juego.juegoId));
  });
  saveButtonText = computed(() => {
    if (this.saving()) {
      return this.editingPartidaId() ? 'Actualitzant...' : 'Desant...';
    }

    return this.editingPartidaId() ? 'Actualitzar partida' : 'Desar partida';
  });
  timerText = computed(() => formatPartidaTimer(this.timerElapsedMilliseconds()));
  allColumnsSelected = computed(() => Object.values(this.visibleColumns()).every(Boolean));
  juegosFiltro = computed(() => {
    const search = this.filters().juegoNombre.trim().toLocaleLowerCase('ca');
    if (!search || this.juegos().some(juego => juego.nombre.toLocaleLowerCase('ca') === search)) {
      return this.juegos();
    }
    return this.juegos().filter(juego => juego.nombre.toLocaleLowerCase('ca').includes(search));
  });
  gameTypeFilters = signal<GameTypeFilterStates>({
    ...defaultGameTypeFilters(),
    ...this.uiState.get('ui:partidas:gameTypeFilters', {} as Partial<GameTypeFilterStates>)
  });

  partidasGrid = computed<PartidaGridRow[]>(() => {
    const partidas = this.partidas();
    const juegos = this.juegos();
    const partidaJugadores = this.partidaJugadores();
    const juegosById = new Map(juegos.map(juego => [juego.juegoId, juego]));
    const jugadoresByPartidaId = new Map<number, PartidaJugador[]>();

    for (const jugador of partidaJugadores) {
      const jugadores = jugadoresByPartidaId.get(jugador.partidaId) ?? [];
      jugadores.push(jugador);
      jugadoresByPartidaId.set(jugador.partidaId, jugadores);
    }

    return partidas.map(partida => {
      const juego = juegosById.get(partida.juegoId);
      const jugadoresPartida = [...(jugadoresByPartidaId.get(partida.partidaId) ?? [])]
        .sort((a, b) => a.posicion - b.posicion);

      const groups = new Map<number, string[]>();
      for (const player of jugadoresPartida) {
        const players = groups.get(player.posicion) ?? [];
        players.push(player.puntos !== null && player.puntos !== undefined
          ? `${player.nombreMostrado}: ${this.formatPuntos(player.puntos)}`
          : player.nombreMostrado);
        groups.set(player.posicion, players);
      }
      const gruposResultado = [...groups].map(([posicion, players]) => ({ posicion, jugadores: players.join(' · ') }));
      const resultadoJugadores = jugadoresPartida.length
        ? gruposResultado.map(group => `${group.posicion} ${group.jugadores}`).join(' · ')
        : '-';

      return {
        partidaId: partida.partidaId,
        juegoId: partida.juegoId,
        juegoNombre: juego?.nombre ?? `Joc #${partida.juegoId}`,
        fecha: partida.fecha,
        duracionMinutos: partida.duracionMinutos ?? null,
        numeroJugadores: partida.numeroJugadores,
        resultadoJugadores,
        gruposResultado,
        juegoEsCooperativo: juego?.esCooperativo ?? false,
        juegoEsPorEquipos: juego?.esPorEquipos ?? false,
        juegoEsNoLista: juego?.esNoLista ?? false,
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
    const fechaDesde = this.parseDateOnly(filters.fechaDesde);
    const fechaHasta = this.parseDateOnly(filters.fechaHasta);
    const juegoNombre = filters.juegoNombre.trim().toLowerCase();
    const duracionMin = this.parseNumberFilter(filters.duracionMinutosMin);
    const duracionMax = this.parseNumberFilter(filters.duracionMinutosMax);
    const jugadoresMin = this.parseNumberFilter(filters.numeroJugadoresMin);
    const jugadoresMax = this.parseNumberFilter(filters.numeroJugadoresMax);
    const posicionUsuario = this.parseNumberFilter(filters.posicionUsuario);
    const usuarioPosicionId = Number(filters.usuarioPosicionId);
    const resultadoJugadores = filters.resultadoJugadores.trim();
    const observaciones = filters.observaciones.trim().toLowerCase();
    const partidasPosicionUsuario = posicionUsuario !== null && usuarioPosicionId
      ? new Set(
          this.partidaJugadores()
            .filter(jugador =>
              jugador.usuarioId === usuarioPosicionId && jugador.posicion === posicionUsuario
            )
            .map(jugador => jugador.partidaId)
        )
      : null;

    const filtered = rows.filter(row => {
      const rowDate = this.parseDateOnly(row.fecha);

      if (fechaDesde !== null && (rowDate === null || rowDate < fechaDesde)) {
        return false;
      }

      if (fechaHasta !== null && (rowDate === null || rowDate > fechaHasta)) {
        return false;
      }

      if (
        juegoNombre &&
        !row.juegoNombre.toLowerCase().includes(juegoNombre)
      ) {
        return false;
      }

      if (!matchesGameTypeFilters({
        noLlista: row.juegoEsNoLista,
        cooperative: row.juegoEsCooperativo,
        teams: row.juegoEsPorEquipos,
        solo: row.numeroJugadores === 1
      }, this.gameTypeFilters())) {
        return false;
      }

      const duracion = row.duracionMinutos;

      if (duracionMin !== null && (duracion === null || duracion < duracionMin)) {
        return false;
      }

      if (duracionMax !== null && (duracion === null || duracion > duracionMax)) {
        return false;
      }

      if (jugadoresMin !== null && row.numeroJugadores < jugadoresMin) {
        return false;
      }

      if (jugadoresMax !== null && row.numeroJugadores > jugadoresMax) {
        return false;
      }

      if (partidasPosicionUsuario && !partidasPosicionUsuario.has(row.partidaId)) {
        return false;
      }

      if (
        resultadoJugadores &&
        !this.matchesAllTerms(row.resultadoJugadores, resultadoJugadores)
      ) {
        return false;
      }

      if (
        observaciones &&
        !(row.observaciones || '-')
          .toLowerCase()
          .includes(observaciones)
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

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.partidasFiltradasOrdenadas().length / PARTIDAS_PAGE_SIZE))
  );

  effectivePage = computed(() => Math.min(this.currentPage(), this.totalPages()));

  partidasPaginadas = computed(() => {
    const page = this.effectivePage();
    const start = (page - 1) * PARTIDAS_PAGE_SIZE;
    return this.partidasFiltradasOrdenadas().slice(start, start + PARTIDAS_PAGE_SIZE);
  });

  firstVisiblePartida = computed(() =>
    this.partidasFiltradasOrdenadas().length === 0
      ? 0
      : (this.effectivePage() - 1) * PARTIDAS_PAGE_SIZE + 1
  );

  lastVisiblePartida = computed(() =>
    Math.min(
      this.firstVisiblePartida() + PARTIDAS_PAGE_SIZE - 1,
      this.partidasFiltradasOrdenadas().length
    )
  );

  form = this.fb.group({
    juegoId: [null as number | null, Validators.required],
    juegoSearch: [''],
    fecha: [this.getTodayDate(), Validators.required],
    duracionMinutos: [null as number | null],
    numeroJugadores: [2, [Validators.required, Validators.min(1)]],
    perEquips: [false],
    nivelIdsTodos: [[] as number[]],
    observaciones: [''],
    jugadores: this.fb.array([]),
    equipos: this.fb.array([])
  });

  constructor() {
    effect(() => {
      if (!this.modalOpen()) {
        this.showJuegoOptions.set(false);
        this.showUsuarioOptions.set(null);
      }
    });

    effect(() => this.uiState.set('ui:partidas:filters', this.filters()));
    effect(() => this.uiState.set('ui:partidas:gameTypeFilters', this.gameTypeFilters()));
    effect(() => this.uiState.set('ui:partidas:sortColumn', this.sortColumn()));
    effect(() => this.uiState.set('ui:partidas:sortDirection', this.sortDirection()));
    effect(() => this.uiState.set('ui:partidas:columns', this.visibleColumns()));

    this.updateResponsiveState();
  }

  get jugadoresArray(): FormArray {
    return this.form.get('jugadores') as FormArray;
  }

  get equiposArray(): FormArray {
    return this.form.get('equipos') as FormArray;
  }

  equipoJugadoresArray(equipoIndex: number): FormArray {
    return this.equiposArray.at(equipoIndex).get('jugadores') as FormArray;
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

    const remadaId = Number(this.route.snapshot.queryParamMap.get('remadaId'));
    const remadaJuegoId = Number(this.route.snapshot.queryParamMap.get('juegoId'));
    const sourceRemadaRequest = Number.isInteger(remadaId) && remadaId > 0
      ? this.aQueJuguemService.getRemades().pipe(
          map(remades => remades.find(remada => remada.remadaId === remadaId) ?? null)
        )
      : of(null);

    forkJoin({
      partidas: this.partidasService.getAll(),
      juegos: this.juegosService.getAll(),
      usuarios: this.usuariosService.getJugadores(),
      partidaJugadores: this.partidaJugadoresService.getAll(),
      sourceRemada: sourceRemadaRequest
    }).subscribe({
      next: result => {
        this.partidas.set(result.partidas);
        this.juegos.set(result.juegos);
        this.filteredJuegos.set(result.juegos);
        this.usuarios.set(result.usuarios);
        this.filteredUsuarios.set(result.usuarios);
        this.partidaJugadores.set(result.partidaJugadores);
        this.currentPage.set(1);
        this.loading.set(false);
        if (result.sourceRemada) {
          this.abrirModalDesdeRemada(result.sourceRemada, remadaJuegoId);
        } else if (Number.isInteger(remadaId) && remadaId > 0) {
          this.error.set("No s'ha trobat la Remada seleccionada.");
        }
        if (Number.isInteger(remadaId) && remadaId > 0) {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { remadaId: null, juegoId: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        }
      },
      error: () => {
        this.error.set("No s'han pogut carregar les partides.");
        this.loading.set(false);
      }
    });
  }

  abrirModal(): void {
    this.resetTimer();
    this.sourceRemada.set(null);
    this.editingPartidaId.set(null);
    this.form.reset({
      juegoId: null,
      juegoSearch: '',
      fecha: this.getTodayDate(),
      duracionMinutos: null,
      numeroJugadores: 2,
      perEquips: false,
      nivelIdsTodos: [],
      observaciones: ''
    });

    this.jugadoresArray.clear();
    this.equiposArray.clear();
    this.clearProgressLevels();
    this.filteredJuegos.set(this.juegos());
    this.filteredUsuarios.set(this.usuarios());
    this.syncJugadoresWithNumero(2);
    this.formError.set('');
    this.success.set('');
    this.modalOpen.set(true);
  }

  private abrirModalDesdeRemada(remada: Remada, requestedJuegoId: number | null = null): void {
    const prefill = buildRemadaPartidaPrefill(remada);
    const elapsedMilliseconds = elapsedSince(remada.createdAt);
    this.resetTimer(elapsedMilliseconds);
    const validRequestedJuegoId = requestedJuegoId !== null &&
      Number.isInteger(requestedJuegoId) &&
      prefill.juegoIds.includes(requestedJuegoId)
      ? requestedJuegoId
      : null;
    const selectedJuegoId = validRequestedJuegoId ?? (prefill.juegoIds.length === 1 ? prefill.juegoIds[0] : null);
    const selectedJuego = selectedJuegoId !== null
      ? this.juegos().find(juego => juego.juegoId === selectedJuegoId) ?? null
      : null;

    this.editingPartidaId.set(null);
    this.sourceRemada.set(remada);
    this.form.reset({
      juegoId: selectedJuego?.juegoId ?? null,
      juegoSearch: selectedJuego?.nombre ?? '',
      fecha: prefill.fecha || this.getTodayDate(),
      duracionMinutos: elapsedMinutes(elapsedMilliseconds),
      numeroJugadores: Math.max(prefill.jugadores.length, 1),
      perEquips: false,
      nivelIdsTodos: [],
      observaciones: `Partida creada des de la Remada #${remada.remadaId}`
    });

    this.jugadoresArray.clear();
    this.equiposArray.clear();
    this.clearProgressLevels();
    prefill.jugadores.forEach((jugador, index) => {
      this.jugadoresArray.push(this.createJugadorGroup(index + 1, {
        partidaJugadorId: 0,
        partidaId: 0,
        usuarioId: jugador.usuarioId,
        nombreMostrado: jugador.nombre,
        posicion: index + 1,
        puntos: null
      }));
    });
    if (prefill.jugadores.length === 0) {
      this.syncJugadoresWithNumero(1);
    }

    this.filteredJuegos.set(this.remadaCandidateGames());
    this.filteredUsuarios.set(this.usuarios());
    this.formError.set('');
    this.success.set('');
    this.modalOpen.set(true);

    if (selectedJuego) {
      this.loadProgressLevels(selectedJuego);
    }
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
      nivelIdsTodos: [],
      observaciones: partida.observaciones ?? ''
    });

    this.jugadoresArray.clear();
    this.equiposArray.clear();
    this.clearProgressLevels();

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
    this.resetTimer();
    this.modalOpen.set(false);
    this.editingPartidaId.set(null);
    this.sourceRemada.set(null);
    this.formError.set('');
    this.success.set('');
  }

  ngOnDestroy(): void {
    this.clearTimerInterval();
  }

  toggleTimer(): void {
    if (this.timerRunning()) {
      this.updateTimerElapsed();
      this.timerBaseMilliseconds = this.timerElapsedMilliseconds();
      this.timerRunning.set(false);
      this.clearTimerInterval();
      return;
    }

    this.timerBaseMilliseconds = this.timerElapsedMilliseconds();
    this.timerStartedAtMilliseconds = Date.now();
    this.timerRunning.set(true);
    this.clearTimerInterval();
    this.timerInterval = setInterval(() => this.updateTimerElapsed(), 250);
  }

  copyTimerToDuration(): void {
    if (this.timerRunning()) this.updateTimerElapsed();
    this.form.controls.duracionMinutos.setValue(elapsedMinutes(this.timerElapsedMilliseconds()));
  }

  private resetTimer(elapsedMilliseconds = 0): void {
    this.clearTimerInterval();
    this.timerBaseMilliseconds = Math.max(0, elapsedMilliseconds);
    this.timerStartedAtMilliseconds = 0;
    this.timerElapsedMilliseconds.set(this.timerBaseMilliseconds);
    this.timerRunning.set(false);
  }

  private updateTimerElapsed(): void {
    if (!this.timerRunning()) return;
    this.timerElapsedMilliseconds.set(
      this.timerBaseMilliseconds + Date.now() - this.timerStartedAtMilliseconds
    );
  }

  private clearTimerInterval(): void {
    if (this.timerInterval !== undefined) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  onNumeroJugadoresChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value) || value < 1) {
      return;
    }

    this.form.controls.numeroJugadores.setValue(value);
    if (this.form.controls.perEquips.value) {
      return;
    }

    this.syncJugadoresWithNumero(value);
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
    this.loadProgressLevels(juego);
  }

  limpiarJuegoSeleccionado(): void {
    this.form.patchValue({ juegoId: null, juegoSearch: '' });
    this.showJuegoOptions.set(false);
    this.clearProgressLevels();
  }

  isProgressLevelSelected(control: AbstractControl, levelId: number): boolean {
    return ((control.value as number[] | null) ?? []).includes(levelId);
  }

  toggleProgressLevel(control: AbstractControl, levelId: number, checked: boolean): void {
    const current = ((control.value as number[] | null) ?? []).filter(id => id !== levelId);
    control.setValue(checked ? [...current, levelId] : current);
  }

  selectedProgressLevelSummary(control: AbstractControl): string {
    const selectedIds = (control.value as number[] | null) ?? [];
    if (selectedIds.length === 0) return 'Cap nivell seleccionat';
    if (selectedIds.length === 1) {
      return this.progressLevels().find(level => level.juegoProgresoNivelId === selectedIds[0])?.nombre ?? '1 nivell';
    }
    return `${selectedIds.length} nivells seleccionats`;
  }

  selectedPlayerProgressLevelSummary(control: AbstractControl): string {
    const effectiveIds = [...new Set([
      ...(this.form.controls.nivelIdsTodos.value ?? []),
      ...((control.value as number[] | null) ?? [])
    ])];
    if (effectiveIds.length === 0) return 'Cap nivell seleccionat';
    if (effectiveIds.length === 1)
      return this.progressLevels().find(level => level.juegoProgresoNivelId === effectiveIds[0])?.nombre ?? '1 nivell';
    return `${effectiveIds.length} nivells seleccionats`;
  }

  onUsuarioInput(index: number, value: string): void {
    const group = this.jugadoresArray.at(index);
    group.patchValue({
      usuarioId: null,
      usuarioSearch: value,
      nombreMostrado: ''
    });
    this.showUsuarioOptions.set(this.getJugadorOptionKey(index));
    this.filteredUsuarios.set(this.getUsuariosDisponibles(index, value));
  }

  onUsuarioFocus(index: number): void {
    this.showUsuarioOptions.set(this.getJugadorOptionKey(index));
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

  onPerEquipsChange(): void {
    if (!this.form.controls.perEquips.value) {
      this.buildJugadoresFromEquipos();
      this.equiposArray.clear();
      return;
    }

    this.buildEquiposFromJugadores();
  }

  onEquipoColorChange(index: number, color: string): void {
    this.jugadoresArray.at(index).get('equipoColor')?.setValue(color);
  }

  onEquipoCardColorChange(equipoIndex: number, color: string): void {
    const equipo = this.equiposArray.at(equipoIndex);
    equipo.get('color')?.setValue(color);
    this.equipoJugadoresArray(equipoIndex).controls.forEach(jugador => {
      jugador.get('equipoColor')?.setValue(color);
    });
  }

  onEquipoNumeroJugadoresChange(equipoIndex: number, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value) || value < 1) {
      return;
    }

    this.syncEquipoJugadoresWithNumero(equipoIndex, value);
    this.syncNumeroJugadoresFromEquipos();
  }

  onEquipoDefaultsChange(equipoIndex: number): void {
    const equipo = this.equiposArray.at(equipoIndex);
    const posicion = Number(equipo.get('posicion')?.value) || equipoIndex + 1;
    const puntosValue = equipo.get('puntos')?.value;
    const puntos = puntosValue === null || puntosValue === undefined || puntosValue === '' ? null : Number(puntosValue);

    this.equipoJugadoresArray(equipoIndex).controls.forEach(jugador => {
      jugador.get('posicion')?.setValue(posicion);
      jugador.get('puntos')?.setValue(Number.isFinite(puntos) ? puntos : null);
    });
  }

  onEquipoUsuarioInput(equipoIndex: number, jugadorIndex: number, value: string): void {
    const group = this.equipoJugadoresArray(equipoIndex).at(jugadorIndex);
    group.patchValue({
      usuarioId: null,
      usuarioSearch: value,
      nombreMostrado: ''
    });
    this.showUsuarioOptions.set(this.getEquipoJugadorOptionKey(equipoIndex, jugadorIndex));
    this.filteredUsuarios.set(this.getEquipoUsuariosDisponibles(equipoIndex, jugadorIndex, value));
  }

  onEquipoUsuarioFocus(equipoIndex: number, jugadorIndex: number): void {
    const value = this.equipoJugadoresArray(equipoIndex).at(jugadorIndex).get('usuarioSearch')?.value ?? '';
    this.showUsuarioOptions.set(this.getEquipoJugadorOptionKey(equipoIndex, jugadorIndex));
    this.filteredUsuarios.set(this.getEquipoUsuariosDisponibles(equipoIndex, jugadorIndex, value));
  }

  seleccionarEquipoUsuario(equipoIndex: number, jugadorIndex: number, usuario: UsuarioOption): void {
    const group = this.equipoJugadoresArray(equipoIndex).at(jugadorIndex);
    group.patchValue({
      usuarioId: usuario.usuarioId,
      usuarioSearch: usuario.nombre,
      nombreMostrado: usuario.nombre
    });
    this.showUsuarioOptions.set(null);
  }

  limpiarEquipoUsuario(equipoIndex: number, jugadorIndex: number): void {
    const group = this.equipoJugadoresArray(equipoIndex).at(jugadorIndex);
    group.patchValue({
      usuarioId: null,
      usuarioSearch: '',
      nombreMostrado: ''
    });
    this.showUsuarioOptions.set(null);
  }

  addEquipo(): void {
    const posicion = this.equiposArray.length + 1;
    this.equiposArray.push(this.createEquipoGroup(posicion, 1));
    this.syncNumeroJugadoresFromEquipos();
  }

  removeEquipo(index: number): void {
    if (this.removingEquipoIndex() !== null || this.equiposArray.length <= 1) return;
    this.removingEquipoIndex.set(index);
    window.setTimeout(() => {
      this.equiposArray.removeAt(index);
      this.removingEquipoIndex.set(null);
      this.syncNumeroJugadoresFromEquipos();
    }, 420);
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
        posicion: [posicion, [Validators.required, Validators.min(1)]],
        puntos: [null as number | null]
      })
    );

    this.form.controls.numeroJugadores.setValue(this.jugadoresArray.length);
  }

  removeJugador(index: number): void {
    if (this.removingJugadorIndex() !== null || this.jugadoresArray.length <= 1) return;
    this.removingJugadorIndex.set(index);
    window.setTimeout(() => {
      this.jugadoresArray.removeAt(index);
      this.removingJugadorIndex.set(null);
      this.form.controls.numeroJugadores.setValue(this.jugadoresArray.length);
    }, 420);
  }


  guardarPartida(): void {
    this.formError.set('');
    this.success.set('');

    const raw = this.form.getRawValue() as {
      juegoId: number | null;
      fecha: string | null;
      duracionMinutos: number | null;
      numeroJugadores: number | null;
      perEquips: boolean | null;
      observaciones: string | null;
      nivelIdsTodos: number[] | null;
      jugadores: FormJugador[];
      equipos: FormEquipo[];
    };

    const validationErrors = getPartidaValidationErrors({
      juegoId: raw.juegoId,
      fecha: raw.fecha,
      numeroJugadores: raw.numeroJugadores,
      perEquips: !!raw.perEquips,
      jugadores: (raw.jugadores ?? []).map(jugador => ({
        usuarioId: jugador.usuarioId,
        usuarioSearch: jugador.usuarioSearch,
        nombreMostrado: jugador.nombreMostrado,
        posicion: jugador.posicion
      })),
      equipos: (raw.equipos ?? []).map(equipo => ({
        numeroJugadores: equipo.numeroJugadores,
        posicion: equipo.posicion,
        jugadores: (equipo.jugadores ?? []).map(jugador => ({
          usuarioId: jugador.usuarioId,
          usuarioSearch: jugador.usuarioSearch,
          nombreMostrado: jugador.nombreMostrado,
          posicion: jugador.posicion
        }))
      }))
    });

    if (validationErrors.length > 0) {
      this.form.markAllAsTouched();
      this.formError.set(validationErrors[0] ?? 'Revisa els camps obligatoris.');
      return;
    }

    const rawJugadores = raw.perEquips
      ? (raw.equipos ?? []).flatMap(equipo => equipo.jugadores ?? [])
      : (raw.jugadores ?? []);
    const globalLevelIds = raw.nivelIdsTodos ?? [];

    const jugadores: PartidaJugador[] = rawJugadores.map(
      (jugador: FormJugador, index: number) => ({
        partidaJugadorId: jugador.partidaJugadorId ?? 0,
        partidaId: 0,
        usuarioId: jugador.usuarioId ?? null,
        nombreMostrado: (jugador.usuarioSearch ?? '').trim(),
        posicion: Number(jugador.posicion) || index + 1,
        puntos: jugador.puntos ?? null
      })
    );

    const currentUser = this.authService.currentUser;

    if (!currentUser) {
      this.formError.set('No s’ha pogut identificar l’usuari actual.');
      return;
    }

    if (raw.juegoId === null || raw.juegoId === undefined) {
      this.formError.set('Has de seleccionar un joc.');
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
              switchMap(jugadoresCreados =>
                this.applyCreatedPartidaProgress(partidaCreada.partidaId, jugadoresCreados, rawJugadores, globalLevelIds).pipe(
                  switchMap(() => this.partidasService.notifyCreated(partidaCreada.partidaId)),
                  map(() => ({ partida: partidaCreada, jugadores: jugadoresCreados }))
                )
              )
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
    this.currentPage.set(1);
  }

  clearAllFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
    this.gameTypeFilters.set(emptyGameTypeFilters());
    this.currentPage.set(1);
  }

  updateGameTypeFilters(filters: GameTypeFilterStates): void {
    this.gameTypeFilters.set(filters);
    this.currentPage.set(1);
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
    this.currentPage.set(1);
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

  previousPage(): void {
    this.currentPage.update(page => Math.max(1, page - 1));
    this.expandedPartidaId.set(null);
  }

  nextPage(): void {
    this.currentPage.update(page => Math.min(this.totalPages(), page + 1));
    this.expandedPartidaId.set(null);
  }

  rowNumber(index: number): number {
    return (this.effectivePage() - 1) * PARTIDAS_PAGE_SIZE + index + 1;
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

  private getDefaultTeamColor(index: number): string {
    return TEAM_COLORS[index % TEAM_COLORS.length].value;
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
  }

  private createJugadorGroup(posicion: number, jugador?: PartidaJugador, nivelIds: number[] = []) {
    return this.fb.group({
      partidaJugadorId: [jugador?.partidaJugadorId ?? 0],
      usuarioId: [jugador?.usuarioId ?? null as number | null],
      usuarioSearch: [jugador?.nombreMostrado ?? '', Validators.required],
      nombreMostrado: [jugador?.nombreMostrado ?? ''],
      equipoColor: [this.getDefaultTeamColor(posicion - 1)],
      posicion: [jugador?.posicion ?? posicion, [Validators.required, Validators.min(1)]],
      puntos: [jugador?.puntos ?? null as number | null],
      nivelIds: [[...nivelIds]]
    });
  }

  private createEquipoGroup(posicion: number, numeroJugadores: number, jugadores: PartidaJugador[] = [], nivelIds: number[][] = []) {
    const color = this.getDefaultTeamColor(posicion - 1);
    const equipo = this.fb.group({
      nombre: [`Equip ${posicion}`],
      color: [color],
      numeroJugadores: [Math.max(numeroJugadores, jugadores.length, 1), [Validators.required, Validators.min(1)]],
      posicion: [jugadores[0]?.posicion ?? posicion, [Validators.required, Validators.min(1)]],
      puntos: [jugadores[0]?.puntos ?? null as number | null],
      jugadores: this.fb.array([])
    });

    const jugadoresArray = equipo.get('jugadores') as FormArray;
    const target = Math.max(numeroJugadores, jugadores.length, 1);

    for (let index = 0; index < target; index += 1) {
      jugadoresArray.push(this.createEquipoJugadorGroup(posicion, color, jugadores[index], nivelIds[index] ?? []));
    }

    return equipo;
  }

  private createEquipoJugadorGroup(posicion: number, color: string, jugador?: PartidaJugador, nivelIds: number[] = []) {
    return this.fb.group({
      partidaJugadorId: [jugador?.partidaJugadorId ?? 0],
      usuarioId: [jugador?.usuarioId ?? null as number | null],
      usuarioSearch: [jugador?.nombreMostrado ?? '', Validators.required],
      nombreMostrado: [jugador?.nombreMostrado ?? ''],
      equipoColor: [color],
      posicion: [jugador?.posicion ?? posicion, [Validators.required, Validators.min(1)]],
      puntos: [jugador?.puntos ?? null as number | null],
      nivelIds: [[...nivelIds]]
    });
  }

  private buildEquiposFromJugadores(): void {
    if (this.equiposArray.length > 0) {
      return;
    }

    const current = this.jugadoresArray.getRawValue() as FormJugador[];
    const source = current.length > 0
      ? current
      : [
          { partidaJugadorId: 0, usuarioId: null, usuarioSearch: '', nombreMostrado: '', equipoColor: this.getDefaultTeamColor(0), posicion: 1, puntos: null, nivelIds: [] },
          { partidaJugadorId: 0, usuarioId: null, usuarioSearch: '', nombreMostrado: '', equipoColor: this.getDefaultTeamColor(1), posicion: 2, puntos: null, nivelIds: [] }
        ];

    source.forEach((jugador, index) => {
      this.equiposArray.push(this.createEquipoGroup(index + 1, 1, [{
        partidaJugadorId: jugador.partidaJugadorId,
        partidaId: 0,
        usuarioId: jugador.usuarioId,
        nombreMostrado: jugador.usuarioSearch,
        posicion: Number(jugador.posicion) || index + 1,
        puntos: jugador.puntos
      }], [jugador.nivelIds ?? []]));
    });

    this.syncNumeroJugadoresFromEquipos();
  }

  private syncEquipoJugadoresWithNumero(equipoIndex: number, numero: number): void {
    const equipo = this.equiposArray.at(equipoIndex);
    const jugadores = this.equipoJugadoresArray(equipoIndex);
    const posicion = Number(equipo.get('posicion')?.value) || equipoIndex + 1;
    const puntosValue = equipo.get('puntos')?.value;
    const puntos = puntosValue === null || puntosValue === undefined || puntosValue === '' ? null : Number(puntosValue);
    const color = equipo.get('color')?.value || this.getDefaultTeamColor(equipoIndex);

    while (jugadores.length < numero) {
      const jugador = this.createEquipoJugadorGroup(posicion, color);
      jugador.get('puntos')?.setValue(Number.isFinite(puntos) ? puntos : null);
      jugadores.push(jugador);
    }

    while (jugadores.length > numero) {
      jugadores.removeAt(jugadores.length - 1);
    }

    equipo.get('numeroJugadores')?.setValue(jugadores.length);
  }

  private syncNumeroJugadoresFromEquipos(): void {
    const total = this.equiposArray.controls.reduce(
      (sum, _equipo, index) => sum + this.equipoJugadoresArray(index).length,
      0
    );
    this.form.controls.numeroJugadores.setValue(Math.max(total, 1));
  }

  private buildJugadoresFromEquipos(): void {
    if (this.equiposArray.length === 0) {
      return;
    }

    const raw = this.form.getRawValue() as { equipos: FormEquipo[] };
    const jugadores = (raw.equipos ?? [])
      .flatMap((equipo: FormEquipo) => equipo.jugadores ?? []);

    this.jugadoresArray.clear();
    jugadores.forEach((jugador: FormJugador, index: number) => {
      this.jugadoresArray.push(this.createJugadorGroup(index + 1, {
        partidaJugadorId: jugador.partidaJugadorId,
        partidaId: 0,
        usuarioId: jugador.usuarioId,
        nombreMostrado: jugador.usuarioSearch,
        posicion: Number(jugador.posicion) || index + 1,
        puntos: jugador.puntos
      }, jugador.nivelIds ?? []));
    });

    this.form.controls.numeroJugadores.setValue(Math.max(this.jugadoresArray.length, 1));
  }

  getJugadorOptionKey(index: number): string {
    return `jugador:${index}`;
  }

  getEquipoJugadorOptionKey(equipoIndex: number, jugadorIndex: number): string {
    return `equipo:${equipoIndex}:${jugadorIndex}`;
  }

  updateJuegoFilterSearch(value: string): void {
    this.updateFilter('juegoNombre', value);
  }

  selectJuegoFilter(juego: Juego): void {
    this.updateFilter('juegoNombre', juego.nombre);
  }

  clearJuegoFilter(): void {
    this.updateFilter('juegoNombre', '');
  }

  private loadProgressLevels(juego: Juego): void {
    this.clearProgressLevels();
    if (this.editingPartidaId() || !juego.tieneProgresoNiveles) return;

    const requestId = ++this.progressLevelsRequestId;
    this.progressLevelsLoading.set(true);
    this.juegosService.getProgressLevels(juego.juegoId).subscribe({
      next: levels => {
        if (requestId !== this.progressLevelsRequestId) return;
        this.progressLevels.set(levels);
        this.progressLevelsLoading.set(false);
      },
      error: error => {
        if (requestId !== this.progressLevelsRequestId) return;
        this.progressLevelsLoading.set(false);
        this.progressLevelsError.set(error?.error?.message ?? 'No s’han pogut carregar els nivells del joc.');
      }
    });
  }

  private clearProgressLevels(): void {
    this.progressLevelsRequestId += 1;
    this.progressLevels.set([]);
    this.progressLevelsLoading.set(false);
    this.progressLevelsError.set('');
    this.form.controls.nivelIdsTodos.setValue([]);
    this.jugadoresArray.controls.forEach(control => control.get('nivelIds')?.setValue([]));
    this.equiposArray.controls.forEach((_, equipoIndex) =>
      this.equipoJugadoresArray(equipoIndex).controls.forEach(control => control.get('nivelIds')?.setValue([]))
    );
  }

  private applyCreatedPartidaProgress(
    partidaId: number,
    createdPlayers: PartidaJugador[],
    formPlayers: FormJugador[],
    globalLevelIds: number[]
  ): Observable<void> {
    const jugadores = createdPlayers.map((player, index) => ({
      partidaJugadorId: player.partidaJugadorId,
      nivelIds: [...new Set([...globalLevelIds, ...(formPlayers[index]?.nivelIds ?? [])])]
    })).filter(player => player.nivelIds.length > 0);

    return jugadores.length > 0 ? this.partidasService.applyProgress(partidaId, jugadores) : of(undefined);
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

  private getEquipoUsuariosDisponibles(equipoIndex: number, jugadorIndex: number, filter: string): UsuarioOption[] {
    const selectedIds = this.equiposArray.controls
      .flatMap((_, currentEquipoIndex) =>
        this.equipoJugadoresArray(currentEquipoIndex).controls.map((control, currentJugadorIndex) =>
          currentEquipoIndex === equipoIndex && currentJugadorIndex === jugadorIndex
            ? null
            : Number(control.get('usuarioId')?.value)
        )
      )
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
    const isMobile = this.mobileFiltersQuery.matches;
    this.isMobileFilters.set(isMobile);

    if (!isMobile) {
      this.expandedPartidaId.set(null);
    }
  }
}
