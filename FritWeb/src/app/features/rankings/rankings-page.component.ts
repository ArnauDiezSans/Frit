import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { isCooperativeType, isNoLlistaType } from '../../core/games/game-type';
import { isExternalUser } from '../../core/users/external-user';
import { MenuComponent } from '../../shared/menu/menu.component';
import { HallOfFamePageComponent } from '../hall-of-fame/hall-of-fame-page.component';
import {
  RankingJugador,
  RankingJuego,
  RankingPartida,
  Rankings,
  RankingsService
} from './rankings.service';

type GameSortColumn = 'nombre' | 'partidas' | 'horas' | 'mitjana' | 'preuPerPartida' | 'ultima';
type UserSortColumn = 'usuario' | 'joc' | 'partidas' | 'horas' | 'victorias' | 'posicionRelativa' | 'pesBggMig' | 'porcentaje' | 'ultima';
type GameDetailSortColumn = 'usuario' | 'partidas' | 'victorias' | 'posicionRelativa' | 'porcentaje';
type SortDirection = 'asc' | 'desc';
type ActiveRankingView = 'game' | 'user' | 'charts' | 'hallOfFame';

interface GameRankingRow {
  juegoId: number;
  nombre: string;
  numeroPartidas: number;
  duracionTotalMinutos: number;
  duracionMediaMinutos: number | null;
  precioPorPartida: number | null;
  ultimaPartida: string | null;
}

interface UserRankingRow {
  usuarioId: number;
  usuarioNombre: string;
  partidasTotales: number;
  duracionTotalMinutos: number;
  victorias: number;
  posicionRelativa: number;
  pesBggMig: number | null;
  porcentajeVictoria: number;
}

interface UserGameRankingRow {
  juegoId: number;
  juegoNombre: string;
  partidasTotales: number;
  duracionTotalMinutos: number;
  victorias: number;
  posicionRelativa: number;
  pesBggMig: number | null;
  porcentajeVictoria: number;
  ultimaPartida: string | null;
}

interface GameFilters {
  juegoId: string;
  fechaDesde: string;
  fechaHasta: string;
  minPartidas: string;
}

interface UserFilters {
  usuarioId: string;
  fechaDesde: string;
  fechaHasta: string;
  minPartidas: string;
}

interface ChartFilters {
  juegoId: string;
  fechaDesde: string;
  fechaHasta: string;
}

interface ChartUserOption {
  usuarioId: number;
  nombre: string;
  color: string;
  selected: boolean;
}

interface ChartMetricRow {
  usuarioId: number;
  usuarioNombre: string;
  color: string;
  percentage: number;
  detail: string;
}

interface ChartValueRow {
  usuarioId: number;
  usuarioNombre: string;
  color: string;
  value: number;
  width: number;
  detail: string;
  sourceLabel: string;
}

interface ChartLinePoint {
  fecha: string;
  label: string;
  value: number;
  detail: string;
  x: number;
  y: number;
}

interface ChartLineSeries {
  usuarioId: number;
  usuarioNombre: string;
  color: string;
  points: ChartLinePoint[];
  polylinePoints: string;
  lastValue: number;
  lastDetail: string;
}

interface ChartAxisTick {
  value: number;
  label: string;
  y: number;
}

interface ChartDateTick {
  fecha: string;
  label: string;
  x: number;
}

interface GameColumns {
  nombre: boolean;
  partidas: boolean;
  horas: boolean;
  mitjana: boolean;
  preuPerPartida: boolean;
  ultima: boolean;
}

interface DetailColumns {
  usuario: boolean;
  partidas: boolean;
  victorias: boolean;
  posicionRelativa: boolean;
  porcentaje: boolean;
}

interface UserColumns {
  usuario: boolean;
  joc: boolean;
  partidas: boolean;
  horas: boolean;
  victorias: boolean;
  posicionRelativa: boolean;
  pesBggMig: boolean;
  porcentaje: boolean;
  ultima: boolean;
}

const EMPTY_GAME_FILTERS: GameFilters = {
  juegoId: '',
  fechaDesde: '',
  fechaHasta: '',
  minPartidas: ''
};

const EMPTY_USER_FILTERS: UserFilters = {
  usuarioId: '',
  fechaDesde: '',
  fechaHasta: '',
  minPartidas: ''
};

const EMPTY_CHART_FILTERS: ChartFilters = {
  juegoId: '',
  fechaDesde: '',
  fechaHasta: ''
};

const CHART_COLORS = [
  '#0f766e',
  '#2563eb',
  '#db2777',
  '#ca8a04',
  '#7c3aed',
  '#dc2626',
  '#059669',
  '#ea580c',
  '#0891b2',
  '#4f46e5',
  '#be123c',
  '#65a30d',
  '#9333ea',
  '#0284c7'
];

const LINE_CHART_WIDTH = 640;
const LINE_CHART_HEIGHT = 260;
const LINE_CHART_PADDING = {
  top: 18,
  right: 18,
  bottom: 38,
  left: 44
};

@Component({
  selector: 'app-rankings-page',
  standalone: true,
  imports: [CommonModule, MenuComponent, HallOfFamePageComponent],
  templateUrl: './rankings-page.component.html',
  styleUrl: './rankings-page.component.css'
})
export class RankingsPageComponent {
  private authService = inject(AuthService);
  private rankingsService = inject(RankingsService);
  private router = inject(Router);
  protected readonly lineChartViewBox = `0 0 ${LINE_CHART_WIDTH} ${LINE_CHART_HEIGHT}`;
  protected readonly lineChartYAxisTicks = this.buildYAxisTicks();

  loading = signal(true);
  error = signal('');
  rankings = signal<Rankings | null>(null);
  activeRankingView = signal<ActiveRankingView>('game');

  gameFilters = signal<GameFilters>({ ...EMPTY_GAME_FILTERS });
  userFilters = signal<UserFilters>({ ...EMPTY_USER_FILTERS });
  chartFilters = signal<ChartFilters>({ ...EMPTY_CHART_FILTERS });
  selectedChartUserIds = signal<number[]>([]);
  showNoLlistaGames = signal(false);
  showCooperativeGames = signal(false);

  gameColumns = signal<GameColumns>({
    nombre: true,
    partidas: true,
    horas: true,
    mitjana: true,
    preuPerPartida: false,
    ultima: true
  });

  detailColumns = signal<DetailColumns>({
    usuario: true,
    partidas: true,
    victorias: true,
    posicionRelativa: true,
    porcentaje: true
  });

  userColumns = signal<UserColumns>({
    usuario: true,
    joc: true,
    partidas: true,
    horas: true,
    victorias: true,
    posicionRelativa: true,
    pesBggMig: true,
    porcentaje: true,
    ultima: true
  });

  showGameFilters = signal(false);
  showUserFilters = signal(false);
  showGameColumnsPanel = signal(false);
  showUserColumnsPanel = signal(false);
  isMobileFilters = signal(false);

  gameSortColumn = signal<GameSortColumn | null>('partidas');
  gameSortDirection = signal<SortDirection | null>('desc');
  gameDetailSortColumn = signal<GameDetailSortColumn | null>('victorias');
  gameDetailSortDirection = signal<SortDirection | null>('desc');
  userSortColumn = signal<UserSortColumn | null>('victorias');
  userSortDirection = signal<SortDirection | null>('desc');

  gameOptions = computed(() => {
    const data = this.rankings();
    if (!data) {
      return [];
    }

    return this.filterRankingJuegos(data.juegos)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  userOptions = computed(() => {
    const data = this.rankings();
    if (!data) {
      return [];
    }

    const users = new Map<number, string>();
    for (const jugador of this.filterRankingJugadores(data.jugadores)) {
      if (this.isExternalRankingJugador(jugador)) {
        continue;
      }

      users.set(jugador.usuarioId, jugador.usuarioNombre);
    }

    return Array.from(users.entries())
      .map(([usuarioId, nombre]) => ({ usuarioId, nombre }))
      .filter(usuario => !isExternalUser(usuario))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  chartUserOptions = computed<ChartUserOption[]>(() => {
    const selectedIds = new Set(this.selectedChartUserIds());

    return this.userOptions().map((usuario, index) => ({
      ...usuario,
      color: CHART_COLORS[index % CHART_COLORS.length],
      selected: selectedIds.has(usuario.usuarioId)
    }));
  });

  selectedChartUsers = computed(() =>
    this.chartUserOptions().filter(usuario => usuario.selected)
  );

  selectedGameName = computed(() => {
    const juegoId = Number(this.gameFilters().juegoId);
    return this.gameOptions().find(juego => juego.juegoId === juegoId)?.nombre ?? '';
  });

  selectedGameTotalPartidas = computed(() => {
    const data = this.rankings();
    const filters = this.gameFilters();
    const juegoId = Number(filters.juegoId);

    if (!data || !juegoId) {
      return 0;
    }

    return this.filterPartidas(
      this.filterRankingPartidas(data.partidas)
        .filter(partida => partida.juegoId === juegoId),
      filters.fechaDesde,
      filters.fechaHasta
    ).length;
  });

  selectedUserName = computed(() => {
    const usuarioId = Number(this.userFilters().usuarioId);
    return this.userOptions().find(usuario => usuario.usuarioId === usuarioId)?.nombre ?? '';
  });

  selectedChartGameName = computed(() => {
    const juegoId = Number(this.chartFilters().juegoId);
    return this.gameOptions().find(juego => juego.juegoId === juegoId)?.nombre ?? '';
  });

  topUserByGames = computed(() => {
    const data = this.rankings();
    if (!data) {
      return null;
    }

    return this.buildUserRows(
      this.filterRankingJugadores(data.jugadores)
        .filter(jugador => !this.isExternalRankingJugador(jugador)),
      { ...EMPTY_USER_FILTERS }
    )
      .sort((a, b) =>
        b.partidasTotales - a.partidasTotales ||
        b.victorias - a.victorias ||
        a.usuarioNombre.localeCompare(b.usuarioNombre)
      )[0] ?? null;
  });

  topUserByWinrate = computed(() => {
    const data = this.rankings();
    if (!data) {
      return null;
    }

    return this.buildUserRows(
      this.filterRankingJugadores(data.jugadores)
        .filter(jugador => !this.isExternalRankingJugador(jugador)),
      { ...EMPTY_USER_FILTERS }
    )
      .sort((a, b) =>
        b.porcentajeVictoria - a.porcentajeVictoria ||
        b.partidasTotales - a.partidasTotales ||
        a.usuarioNombre.localeCompare(b.usuarioNombre)
      )[0] ?? null;
  });

  topGameByActivity = computed(() => {
    const data = this.rankings();
    if (!data) {
      return null;
    }

    return this.buildGameRows(this.filterRankingPartidas(data.partidas), { ...EMPTY_GAME_FILTERS }, data.juegos)
      .sort((a, b) =>
        b.numeroPartidas - a.numeroPartidas ||
        a.nombre.localeCompare(b.nombre)
      )[0] ?? null;
  });

  longestGame = computed(() => {
    const data = this.rankings();
    if (!data) {
      return null;
    }

    return this.filterRankingPartidas(data.partidas)
      .filter(partida => partida.duracionMinutos !== null && partida.duracionMinutos !== undefined)
      .sort((a, b) =>
        (b.duracionMinutos ?? 0) - (a.duracionMinutos ?? 0) ||
        b.fecha.localeCompare(a.fecha)
      )[0] ?? null;
  });

  gameRows = computed(() => {
    const data = this.rankings();
    if (!data) {
      return [];
    }

    const rows = this.buildGameRows(this.filterRankingPartidas(data.partidas), this.gameFilters(), data.juegos);
    return this.sortGameRows(rows);
  });

  selectedGameRows = computed(() => {
    const data = this.rankings();
    const juegoId = Number(this.gameFilters().juegoId);
    if (!data || !juegoId) {
      return [];
    }

    const rows = this.buildUserRows(
      this.filterRankingJugadores(data.jugadores)
        .filter(jugador => jugador.juegoId === juegoId && !this.isExternalRankingJugador(jugador)),
      {
        juegoId: String(juegoId),
        fechaDesde: this.gameFilters().fechaDesde,
        fechaHasta: this.gameFilters().fechaHasta,
        minPartidas: this.gameFilters().minPartidas
      }
    );

    return this.sortDetailRows(rows, this.gameDetailSortColumn(), this.gameDetailSortDirection());
  });

  userRows = computed(() => {
    const data = this.rankings();
    if (!data || this.userFilters().usuarioId) {
      return [];
    }

    const rows = this.buildUserRows(
      this.filterRankingJugadores(data.jugadores)
        .filter(jugador => !this.isExternalRankingJugador(jugador)),
      this.userFilters()
    );
    return this.sortDetailRows(rows, this.userSortColumn(), this.userSortDirection());
  });

  selectedUserGameRows = computed(() => {
    const data = this.rankings();
    const usuarioId = Number(this.userFilters().usuarioId);
    if (!data || !usuarioId) {
      return [];
    }

    const rows = this.buildUserGameRows(
      this.filterRankingJugadores(data.jugadores)
        .filter(jugador => !this.isExternalRankingJugador(jugador)),
      this.userFilters()
    );
    return this.sortUserGameRows(rows);
  });

  chartPartidas = computed(() => {
    const data = this.rankings();
    if (!data) {
      return [];
    }

    const filters = this.chartFilters();
    const juegoId = Number(filters.juegoId);

    return this.filterRankingPartidas(data.partidas)
      .filter(partida => !juegoId || partida.juegoId === juegoId)
      .filter(partida => this.matchesDateRange(partida.fecha, filters.fechaDesde, filters.fechaHasta));
  });

  chartJugadores = computed(() => {
    const data = this.rankings();
    if (!data) {
      return [];
    }

    const filters = this.chartFilters();
    const juegoId = Number(filters.juegoId);
    const selectedIds = new Set(this.selectedChartUserIds());

    return this.filterRankingJugadores(data.jugadores)
      .filter(jugador => !this.isExternalRankingJugador(jugador))
      .filter(jugador => selectedIds.has(jugador.usuarioId))
      .filter(jugador => !juegoId || jugador.juegoId === juegoId)
      .filter(jugador => this.matchesDateRange(jugador.fecha, filters.fechaDesde, filters.fechaHasta));
  });

  victoryChartRows = computed(() => {
    const jugadores = this.chartJugadores();

    return this.selectedChartUsers()
      .map(usuario => {
        const rows = jugadores.filter(jugador => jugador.usuarioId === usuario.usuarioId);
        const victorias = rows.filter(row => row.posicion === 1).length;

        return {
          usuarioId: usuario.usuarioId,
          usuarioNombre: usuario.nombre,
          color: usuario.color,
          percentage: this.calculatePercentage(victorias, rows.length),
          detail: `${victorias}/${rows.length}`
        };
      })
      .sort((a, b) => b.percentage - a.percentage || a.usuarioNombre.localeCompare(b.usuarioNombre));
  });

  playedChartRows = computed(() => {
    const jugadores = this.chartJugadores();
    const totalPartidas = new Set(this.chartPartidas().map(partida => partida.partidaId)).size;

    return this.selectedChartUsers()
      .map(usuario => {
        const userPartidas = new Set(
          jugadores
            .filter(jugador => jugador.usuarioId === usuario.usuarioId)
            .map(jugador => jugador.partidaId)
        ).size;

        return {
          usuarioId: usuario.usuarioId,
          usuarioNombre: usuario.nombre,
          color: usuario.color,
          percentage: this.calculatePercentage(userPartidas, totalPartidas),
          detail: `${userPartidas}/${totalPartidas}`
        };
      })
      .sort((a, b) => b.percentage - a.percentage || a.usuarioNombre.localeCompare(b.usuarioNombre));
  });

  maxScoreChartRows = computed<ChartValueRow[]>(() => {
    const jugadores = this.chartJugadores();
    const rows = this.selectedChartUsers()
      .map(usuario => {
        const scoreRows = jugadores
          .filter(jugador => jugador.usuarioId === usuario.usuarioId)
          .filter(jugador => jugador.puntos !== null && jugador.puntos !== undefined)
          .sort((a, b) =>
            (b.puntos ?? 0) - (a.puntos ?? 0) ||
            b.fecha.localeCompare(a.fecha) ||
            a.juegoNombre.localeCompare(b.juegoNombre)
          );
        const bestScoreRow = scoreRows[0];
        const maxScore = bestScoreRow?.puntos ?? 0;

        return {
          usuarioId: usuario.usuarioId,
          usuarioNombre: usuario.nombre,
          color: usuario.color,
          value: maxScore,
          width: 0,
          detail: `${scoreRows.length} puntuacions`,
          sourceLabel: bestScoreRow
            ? `${bestScoreRow.juegoNombre} · ${this.formatDate(bestScoreRow.fecha)}`
            : '',
          hasScores: scoreRows.length > 0
        };
      })
      .filter(row => row.hasScores)
      .sort((a, b) => b.value - a.value || a.usuarioNombre.localeCompare(b.usuarioNombre));
    const maxValue = Math.max(...rows.map(row => row.value), 0);

    return rows.map(row => ({
      ...row,
      width: maxValue > 0 ? Math.round((row.value * 1000) / maxValue) / 10 : 0
    }));
  });

  chartDateTicks = computed(() =>
    this.buildDateTicks(this.chartTimelineDates())
  );

  victoryTimeChartSeries = computed(() =>
    this.buildTimeChartSeries('victory')
  );

  playedTimeChartSeries = computed(() =>
    this.buildTimeChartSeries('played')
  );

  allGameColumnsSelected = computed(() => Object.values(this.gameColumns()).every(Boolean));
  allDetailColumnsSelected = computed(() => Object.values(this.detailColumns()).every(Boolean));
  allUserColumnsSelected = computed(() => Object.values(this.userColumns()).every(Boolean));

  constructor() {
    this.updateResponsiveState();
  }

  ngOnInit(): void {
    this.cargarRankings();
  }

  @HostListener('window:click')
  onWindowClick(): void {
    this.showGameColumnsPanel.set(false);
    this.showUserColumnsPanel.set(false);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateResponsiveState();
  }

  cargarRankings(): void {
    this.loading.set(true);
    this.error.set('');

    this.rankingsService.get().subscribe({
      next: rankings => {
        this.rankings.set(rankings);
        this.initializeChartUsers(rankings);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'han pogut carregar els rankings.");
        this.loading.set(false);
      }
    });
  }

  updateGameFilter<K extends keyof GameFilters>(key: K, value: string): void {
    this.gameFilters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  updateUserFilter<K extends keyof UserFilters>(key: K, value: string): void {
    this.userFilters.update(current => ({
      ...current,
      [key]: value
    }));

    if (key === 'usuarioId') {
      this.userSortColumn.set(value ? 'partidas' : 'victorias');
      this.userSortDirection.set('desc');
    }
  }

  updateChartFilter<K extends keyof ChartFilters>(key: K, value: string): void {
    this.chartFilters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  selectRankingView(view: ActiveRankingView): void {
    if (view === 'hallOfFame' && !this.canViewHallOfFame()) {
      return;
    }

    this.activeRankingView.set(view);
    this.showGameColumnsPanel.set(false);
    this.showUserColumnsPanel.set(false);
  }

  canViewHallOfFame(): boolean {
    return this.authService.canViewHallOfFame();
  }

  clearChartFilters(): void {
    this.chartFilters.set({ ...EMPTY_CHART_FILTERS });
    this.clearGameTypeFilters();
  }

  clearGameFilters(): void {
    this.gameFilters.set({ ...EMPTY_GAME_FILTERS });
    this.clearGameTypeFilters();
  }

  clearUserFilters(): void {
    this.userFilters.set({ ...EMPTY_USER_FILTERS });
    this.clearGameTypeFilters();
  }

  toggleGameFilters(): void {
    if (this.showGameFilters()) {
      this.clearGameFilters();
      this.showGameFilters.set(false);
      return;
    }

    this.showGameFilters.set(true);
  }

  toggleUserFilters(): void {
    if (this.showUserFilters()) {
      this.clearUserFilters();
      this.showUserFilters.set(false);
      return;
    }

    this.showUserFilters.set(true);
  }

  toggleShowNoLlistaGames(): void {
    this.showNoLlistaGames.update(value => !value);
  }

  toggleShowCooperativeGames(): void {
    this.showCooperativeGames.update(value => !value);
  }

  toggleChartUser(usuarioId: number): void {
    this.selectedChartUserIds.update(current =>
      current.includes(usuarioId)
        ? current.filter(id => id !== usuarioId)
        : [...current, usuarioId]
    );
  }

  selectAllChartUsers(): void {
    this.selectedChartUserIds.set(this.userOptions().map(usuario => usuario.usuarioId));
  }

  clearChartUsers(): void {
    this.selectedChartUserIds.set([]);
  }

  private clearGameTypeFilters(): void {
    this.showNoLlistaGames.set(false);
    this.showCooperativeGames.set(false);
  }

  toggleGameColumnsPanel(event: Event): void {
    event.stopPropagation();
    this.showGameColumnsPanel.update(value => !value);
  }

  toggleUserColumnsPanel(event: Event): void {
    event.stopPropagation();
    this.showUserColumnsPanel.update(value => !value);
  }

  toggleGameColumn(column: keyof GameColumns): void {
    this.gameColumns.update(current => ({
      ...current,
      [column]: !current[column]
    }));
  }

  toggleDetailColumn(column: keyof DetailColumns): void {
    this.detailColumns.update(current => ({
      ...current,
      [column]: !current[column]
    }));
  }

  toggleUserColumn(column: keyof UserColumns): void {
    this.userColumns.update(current => ({
      ...current,
      [column]: !current[column]
    }));
  }

  selectAllGameColumns(): void {
    const nextValue = !this.allGameColumnsSelected();
    this.gameColumns.set({
      nombre: nextValue,
      partidas: nextValue,
      horas: nextValue,
      mitjana: nextValue,
      preuPerPartida: nextValue,
      ultima: nextValue
    });
  }

  selectAllDetailColumns(): void {
    const nextValue = !this.allDetailColumnsSelected();
    this.detailColumns.set({
      usuario: nextValue,
      partidas: nextValue,
      victorias: nextValue,
      posicionRelativa: nextValue,
      porcentaje: nextValue
    });
  }

  selectAllUserColumns(): void {
    const nextValue = !this.allUserColumnsSelected();
    this.userColumns.set({
      usuario: nextValue,
      joc: nextValue,
      partidas: nextValue,
      horas: nextValue,
      victorias: nextValue,
      posicionRelativa: nextValue,
      pesBggMig: nextValue,
      porcentaje: nextValue,
      ultima: nextValue
    });
  }

  sortGamesBy(column: GameSortColumn): void {
    const currentColumn = this.gameSortColumn();
    const currentDirection = this.gameSortDirection();

    if (currentColumn !== column) {
      this.gameSortColumn.set(column);
      this.gameSortDirection.set('desc');
      return;
    }

    if (currentDirection === 'desc') {
      this.gameSortDirection.set('asc');
      return;
    }

    this.gameSortColumn.set(null);
    this.gameSortDirection.set(null);
  }

  sortGameDetailBy(column: GameDetailSortColumn): void {
    this.updateDetailSort(this.gameDetailSortColumn, this.gameDetailSortDirection, column);
  }

  sortUsersBy(column: UserSortColumn): void {
    this.updateDetailSort(this.userSortColumn, this.userSortDirection, column);
  }

  getGameSortIndicator(column: GameSortColumn): string {
    return this.getSortIndicator(this.gameSortColumn(), this.gameSortDirection(), column);
  }

  getGameDetailSortIndicator(column: GameDetailSortColumn): string {
    return this.getSortIndicator(this.gameDetailSortColumn(), this.gameDetailSortDirection(), column);
  }

  getUserSortIndicator(column: UserSortColumn): string {
    return this.getSortIndicator(this.userSortColumn(), this.userSortDirection(), column);
  }

  formatMinutes(value: number | null | undefined): string {
    return value || value === 0 ? `${value} min` : '-';
  }

  formatHours(value: number | null | undefined): string {
    if (value == null) {
      return '-';
    }

    return `${Math.round((value / 60) * 10) / 10} h`;
  }

  formatDate(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleDateString('ca-ES') : 'Mai';
  }

  formatPercent(value: number | null | undefined): string {
    return value || value === 0 ? `${value}%` : '-';
  }

  formatCurrency(value: number | null | undefined): string {
    if (value == null) {
      return '-';
    }

    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  formatScore(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  formatBggWeight(value: number | null | undefined): string {
    return value == null ? '-' : value.toFixed(2);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  trackByGameRow(_: number, item: GameRankingRow): number {
    return item.juegoId;
  }

  trackByUserRow(_: number, item: UserRankingRow): number {
    return item.usuarioId;
  }

  trackByUserGameRow(_: number, item: UserGameRankingRow): number {
    return item.juegoId;
  }

  trackByChartUser(_: number, item: ChartUserOption): number {
    return item.usuarioId;
  }

  trackByChartMetricRow(_: number, item: ChartMetricRow): number {
    return item.usuarioId;
  }

  trackByChartValueRow(_: number, item: ChartValueRow): number {
    return item.usuarioId;
  }

  trackByChartLineSeries(_: number, item: ChartLineSeries): number {
    return item.usuarioId;
  }

  trackByChartLinePoint(_: number, item: ChartLinePoint): string {
    return `${item.fecha}-${item.value}-${item.detail}`;
  }

  trackByChartAxisTick(_: number, item: ChartAxisTick): number {
    return item.value;
  }

  trackByChartDateTick(_: number, item: ChartDateTick): string {
    return item.fecha;
  }

  getChartBarWidth(value: number): string {
    return `${Math.max(0, Math.min(value, 100))}%`;
  }

  hasLineChartData(series: ChartLineSeries[]): boolean {
    return series.some(item => item.points.length > 0);
  }

  private initializeChartUsers(rankings: Rankings): void {
    if (this.selectedChartUserIds().length > 0) {
      return;
    }

    const users = new Map<number, string>();
    for (const jugador of rankings.jugadores) {
      if (this.isExternalRankingJugador(jugador)) {
        continue;
      }

      users.set(jugador.usuarioId, jugador.usuarioNombre);
    }

    const userIds = Array.from(users.entries())
      .map(([usuarioId, nombre]) => ({ usuarioId, nombre }))
      .filter(usuario => !isExternalUser(usuario))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(usuario => usuario.usuarioId);

    this.selectedChartUserIds.set(userIds);
  }

  private isExternalRankingJugador(jugador: RankingJugador): boolean {
    return isExternalUser({
      usuarioId: jugador.usuarioId,
      nombre: jugador.usuarioNombre
    });
  }

  private filterRankingJuegos(juegos: RankingJuego[]): RankingJuego[] {
    return juegos.filter(juego => this.shouldShowGameType(juego.tipo));
  }

  private filterRankingPartidas(partidas: RankingPartida[]): RankingPartida[] {
    return partidas.filter(partida => this.shouldShowGameType(partida.juegoTipo));
  }

  private filterRankingJugadores(jugadores: RankingJugador[]): RankingJugador[] {
    return jugadores.filter(jugador => this.shouldShowGameType(jugador.juegoTipo));
  }

  private shouldShowGameType(value: string | null | undefined): boolean {
    if (isNoLlistaType(value)) {
      return this.showNoLlistaGames();
    }

    if (isCooperativeType(value)) {
      return this.showCooperativeGames();
    }

    return true;
  }

  private buildGameRows(partidas: RankingPartida[], filters: GameFilters, juegos: RankingJuego[]): GameRankingRow[] {
    const filtered = this.filterPartidas(partidas, filters.fechaDesde, filters.fechaHasta);
    const grouped = new Map<number, RankingPartida[]>();
    const juegosById = new Map(juegos.map(juego => [juego.juegoId, juego]));

    for (const partida of filtered) {
      grouped.set(partida.juegoId, [...(grouped.get(partida.juegoId) ?? []), partida]);
    }

    return Array.from(grouped.entries()).map(([juegoId, partidasJuego]) => {
      const duraciones = partidasJuego
        .map(partida => partida.duracionMinutos)
        .filter((value): value is number => value != null);
      const juego = juegosById.get(juegoId);
      const totalJugadores = partidasJuego.reduce((total, partida) => total + partida.numeroJugadores, 0);

      return {
        juegoId,
        nombre: partidasJuego[0].juegoNombre,
        numeroPartidas: partidasJuego.length,
        duracionTotalMinutos: duraciones.reduce((total, value) => total + value, 0),
        duracionMediaMinutos: duraciones.length > 0
          ? Math.round(duraciones.reduce((total, value) => total + value, 0) / duraciones.length)
          : null,
        precioPorPartida: juego?.pvp != null && totalJugadores > 0
          ? Math.round((juego.pvp / totalJugadores) * 100) / 100
          : null,
        ultimaPartida: partidasJuego
          .map(partida => partida.fecha)
          .sort((a, b) => b.localeCompare(a))[0] ?? null
      };
    }).filter(row => this.matchesMinPartidas(row.numeroPartidas, filters.minPartidas));
  }

  private buildUserRows(jugadores: RankingJugador[], filters: UserFilters | GameFilters): UserRankingRow[] {
    const filtered = jugadores.filter(jugador => {
      const maybeGameFilters = filters as Partial<GameFilters>;
      const juegoId = Number(maybeGameFilters.juegoId);
      if (juegoId && jugador.juegoId !== juegoId) {
        return false;
      }

      const maybeUserFilters = filters as Partial<UserFilters>;
      const usuarioId = Number(maybeUserFilters.usuarioId);
      if (usuarioId && jugador.usuarioId !== usuarioId) {
        return false;
      }

      return this.matchesDateRange(jugador.fecha, filters.fechaDesde, filters.fechaHasta);
    });

    const grouped = new Map<number, RankingJugador[]>();
    for (const jugador of filtered) {
      grouped.set(jugador.usuarioId, [...(grouped.get(jugador.usuarioId) ?? []), jugador]);
    }

    return Array.from(grouped.entries()).map(([usuarioId, rows]) => {
      const victorias = rows.filter(row => row.posicion === 1).length;
      const duracionTotalMinutos = rows.reduce((total, row) => total + (row.duracionMinutos ?? 0), 0);
      const posicionRelativa = this.calculateAverageRelativePosition(rows);
      const pesBggMig = this.calculateAverageBggWeight(rows);

      return {
        usuarioId,
        usuarioNombre: rows[0].usuarioNombre,
        partidasTotales: rows.length,
        duracionTotalMinutos,
        victorias,
        posicionRelativa,
        pesBggMig,
        porcentajeVictoria: this.calculatePercentage(victorias, rows.length)
      };
    }).filter(row => this.matchesMinPartidas(row.partidasTotales, filters.minPartidas));
  }

  private buildUserGameRows(jugadores: RankingJugador[], filters: UserFilters): UserGameRankingRow[] {
    const usuarioId = Number(filters.usuarioId);
    const filtered = jugadores.filter(jugador =>
      jugador.usuarioId === usuarioId &&
      this.matchesDateRange(jugador.fecha, filters.fechaDesde, filters.fechaHasta)
    );

    const grouped = new Map<number, RankingJugador[]>();
    for (const jugador of filtered) {
      grouped.set(jugador.juegoId, [...(grouped.get(jugador.juegoId) ?? []), jugador]);
    }

    return Array.from(grouped.entries()).map(([juegoId, rows]) => {
      const victorias = rows.filter(row => row.posicion === 1).length;
      const duracionTotalMinutos = rows.reduce((total, row) => total + (row.duracionMinutos ?? 0), 0);
      const posicionRelativa = this.calculateAverageRelativePosition(rows);
      const pesBggMig = this.calculateAverageBggWeight(rows);

      return {
        juegoId,
        juegoNombre: rows[0].juegoNombre,
        partidasTotales: rows.length,
        duracionTotalMinutos,
        victorias,
        posicionRelativa,
        pesBggMig,
        porcentajeVictoria: this.calculatePercentage(victorias, rows.length),
        ultimaPartida: rows
          .map(row => row.fecha)
          .sort((a, b) => b.localeCompare(a))[0] ?? null
      };
    }).filter(row => this.matchesMinPartidas(row.partidasTotales, filters.minPartidas));
  }

  private filterPartidas(partidas: RankingPartida[], fechaDesde: string, fechaHasta: string): RankingPartida[] {
    return partidas.filter(partida => this.matchesDateRange(partida.fecha, fechaDesde, fechaHasta));
  }

  private chartTimelineDates(): string[] {
    return Array.from(new Set(this.chartPartidas().map(partida => partida.fecha)))
      .sort((a, b) => a.localeCompare(b));
  }

  private buildTimeChartSeries(kind: 'victory' | 'played'): ChartLineSeries[] {
    const dates = this.chartTimelineDates();
    if (dates.length === 0) {
      return [];
    }

    const jugadores = this.chartJugadores();
    const partidas = this.chartPartidas();
    const lastDateIndex = Math.max(dates.length - 1, 1);

    return this.selectedChartUsers().map(usuario => {
      const userRows = jugadores
        .filter(jugador => jugador.usuarioId === usuario.usuarioId)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

      const points = dates.map((fecha, index) => {
        const x = this.getChartX(index, lastDateIndex);
        const rowsUntilDate = userRows.filter(jugador => jugador.fecha <= fecha);
        let value = 0;
        let detail = '0/0';

        if (kind === 'victory') {
          const wins = rowsUntilDate.filter(jugador => jugador.posicion === 1).length;
          value = this.calculatePercentage(wins, rowsUntilDate.length);
          detail = `${wins}/${rowsUntilDate.length}`;
        } else {
          const totalPartidas = new Set(
            partidas
              .filter(partida => partida.fecha <= fecha)
              .map(partida => partida.partidaId)
          ).size;
          const userPartidas = new Set(rowsUntilDate.map(jugador => jugador.partidaId)).size;
          value = this.calculatePercentage(userPartidas, totalPartidas);
          detail = `${userPartidas}/${totalPartidas}`;
        }

        return {
          fecha,
          label: this.formatDate(fecha),
          value,
          detail,
          x,
          y: this.getChartY(value)
        };
      });

      const lastPoint = points[points.length - 1];

      return {
        usuarioId: usuario.usuarioId,
        usuarioNombre: usuario.nombre,
        color: usuario.color,
        points,
        polylinePoints: points.map(point => `${point.x},${point.y}`).join(' '),
        lastValue: lastPoint?.value ?? 0,
        lastDetail: lastPoint?.detail ?? '0/0'
      };
    });
  }

  private buildYAxisTicks(): ChartAxisTick[] {
    return [100, 75, 50, 25, 0].map(value => ({
      value,
      label: `${value}%`,
      y: this.getChartY(value)
    }));
  }

  private buildDateTicks(dates: string[]): ChartDateTick[] {
    if (dates.length === 0) {
      return [];
    }

    const lastDateIndex = Math.max(dates.length - 1, 1);
    const tickIndexes = new Set<number>([0, dates.length - 1]);
    if (dates.length > 2) {
      tickIndexes.add(Math.floor((dates.length - 1) / 2));
    }
    if (dates.length > 8) {
      tickIndexes.add(Math.floor((dates.length - 1) / 4));
      tickIndexes.add(Math.floor(((dates.length - 1) * 3) / 4));
    }

    return Array.from(tickIndexes)
      .sort((a, b) => a - b)
      .map(index => ({
        fecha: dates[index],
        label: this.formatDate(dates[index]),
        x: this.getChartX(index, lastDateIndex)
      }));
  }

  private getChartX(index: number, lastDateIndex: number): number {
    const plotWidth = LINE_CHART_WIDTH - LINE_CHART_PADDING.left - LINE_CHART_PADDING.right;
    return LINE_CHART_PADDING.left + (plotWidth * index) / lastDateIndex;
  }

  private getChartY(value: number): number {
    const plotHeight = LINE_CHART_HEIGHT - LINE_CHART_PADDING.top - LINE_CHART_PADDING.bottom;
    const safeValue = Math.max(0, Math.min(value, 100));
    return LINE_CHART_PADDING.top + plotHeight - (plotHeight * safeValue) / 100;
  }

  private matchesDateRange(fecha: string, fechaDesde: string, fechaHasta: string): boolean {
    if (fechaDesde && fecha < fechaDesde) {
      return false;
    }

    if (fechaHasta && fecha > fechaHasta) {
      return false;
    }

    return true;
  }

  private matchesMinPartidas(partidas: number, minPartidas: string): boolean {
    const min = Number(minPartidas);
    return !min || partidas >= min;
  }

  private sortGameRows(rows: GameRankingRow[]): GameRankingRow[] {
    const column = this.gameSortColumn();
    const direction = this.gameSortDirection();

    if (!column || !direction) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (column) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre) * multiplier;
        case 'partidas':
          return (a.numeroPartidas - b.numeroPartidas) * multiplier;
        case 'horas':
          return (a.duracionTotalMinutos - b.duracionTotalMinutos) * multiplier;
        case 'mitjana':
          return ((a.duracionMediaMinutos ?? 0) - (b.duracionMediaMinutos ?? 0)) * multiplier;
        case 'preuPerPartida':
          return this.compareNullableNumbers(a.precioPorPartida, b.precioPorPartida) * multiplier;
        case 'ultima':
          return ((a.ultimaPartida ?? '').localeCompare(b.ultimaPartida ?? '')) * multiplier;
        default:
          return 0;
      }
    });
  }

  private sortDetailRows(
    rows: UserRankingRow[],
    column: UserSortColumn | GameDetailSortColumn | null,
    direction: SortDirection | null
  ): UserRankingRow[] {
    if (!column || !direction) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (column) {
        case 'usuario':
          return a.usuarioNombre.localeCompare(b.usuarioNombre) * multiplier;
        case 'partidas':
          return (a.partidasTotales - b.partidasTotales) * multiplier;
        case 'horas':
          return (a.duracionTotalMinutos - b.duracionTotalMinutos) * multiplier;
        case 'victorias':
          return (a.victorias - b.victorias) * multiplier;
        case 'posicionRelativa':
          return (a.posicionRelativa - b.posicionRelativa) * multiplier;
        case 'pesBggMig':
          return this.compareNullableNumbers(a.pesBggMig, b.pesBggMig) * multiplier;
        case 'porcentaje':
          return (a.porcentajeVictoria - b.porcentajeVictoria) * multiplier;
        case 'ultima':
          return 0;
        default:
          return 0;
      }
    });
  }

  private sortUserGameRows(rows: UserGameRankingRow[]): UserGameRankingRow[] {
    const column = this.userSortColumn();
    const direction = this.userSortDirection();

    if (!column || !direction) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (column) {
        case 'joc':
          return a.juegoNombre.localeCompare(b.juegoNombre) * multiplier;
        case 'partidas':
          return (a.partidasTotales - b.partidasTotales) * multiplier;
        case 'horas':
          return (a.duracionTotalMinutos - b.duracionTotalMinutos) * multiplier;
        case 'victorias':
          return (a.victorias - b.victorias) * multiplier;
        case 'posicionRelativa':
          return (a.posicionRelativa - b.posicionRelativa) * multiplier;
        case 'pesBggMig':
          return this.compareNullableNumbers(a.pesBggMig, b.pesBggMig) * multiplier;
        case 'porcentaje':
          return (a.porcentajeVictoria - b.porcentajeVictoria) * multiplier;
        case 'ultima':
          return ((a.ultimaPartida ?? '').localeCompare(b.ultimaPartida ?? '')) * multiplier;
        default:
          return 0;
      }
    });
  }

  private updateDetailSort<T extends UserSortColumn | GameDetailSortColumn>(
    columnSignal: { (): T | null; set(value: T | null): void },
    directionSignal: { (): SortDirection | null; set(value: SortDirection | null): void },
    column: T
  ): void {
    if (columnSignal() !== column) {
      columnSignal.set(column);
      directionSignal.set('desc');
      return;
    }

    if (directionSignal() === 'desc') {
      directionSignal.set('asc');
      return;
    }

    columnSignal.set(null);
    directionSignal.set(null);
  }

  private getSortIndicator<T>(currentColumn: T | null, direction: SortDirection | null, column: T): string {
    if (currentColumn !== column || !direction) {
      return '';
    }

    return direction === 'asc' ? ' ↑' : ' ↓';
  }

  private calculatePercentage(victorias: number, partidas: number): number {
    if (partidas === 0) {
      return 0;
    }

    return Math.round((victorias * 1000) / partidas) / 10;
  }

  private calculateAverageRelativePosition(rows: RankingJugador[]): number {
    if (rows.length === 0) {
      return 0;
    }

    const total = rows.reduce((sum, row) =>
      sum + this.calculateRelativePosition(row.posicion, row.numeroJugadores),
      0
    );

    return Math.round((total * 10) / rows.length) / 10;
  }

  private calculateRelativePosition(posicion: number, numeroJugadores: number): number {
    if (numeroJugadores <= 1) {
      return 100;
    }

    return Math.floor(((numeroJugadores - posicion) * 100) / (numeroJugadores - 1));
  }

  private calculateAverageBggWeight(rows: RankingJugador[]): number | null {
    const weights = rows
      .map(row => row.dificultadBgg)
      .filter((value): value is number => value !== null && value !== undefined);

    if (weights.length === 0) {
      return null;
    }

    return Math.round((weights.reduce((total, value) => total + value, 0) * 100) / weights.length) / 100;
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

  private updateResponsiveState(): void {
    const isMobile = window.innerWidth <= 820;
    this.isMobileFilters.set(isMobile);

    if (!isMobile) {
      this.showGameFilters.set(false);
      this.showUserFilters.set(false);
    }
  }
}
