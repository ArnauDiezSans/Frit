import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AutocompleteSelectComponent } from '../../shared/autocomplete-select/autocomplete-select.component';
import { MenuComponent } from '../../shared/menu/menu.component';
import { Juego, UsuarioOption } from '../juegos/juegos.models';
import { JuegosService } from '../juegos/juegos.service';
import { LaLlistaService } from '../la-llista/la-llista.service';
import { UsuariosService } from '../juegos/usuarios.service';
import { Partida } from '../partidas/partidas.models';
import { PartidasService } from '../partidas/partidas.service';
import { UsuarioJuegoOrden, UsuarioService } from '../usuario/usuario.service';
import { AQueJuguemRecommendation, AQueJuguemService, Remada } from './a-que-juguem.service';

interface RowingRecommendation extends AQueJuguemRecommendation {
  llistaPosition: number;
  tempsMaximMinuts: number;
}

@Component({
  selector: 'app-a-que-juguem-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent, AutocompleteSelectComponent],
  templateUrl: './a-que-juguem-page.component.html',
  styleUrl: './a-que-juguem-page.component.css'
})
export class AQueJuguemPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private usuariosService = inject(UsuariosService);
  private juegosService = inject(JuegosService);
  private partidasService = inject(PartidasService);
  private usuarioService = inject(UsuarioService);
  private laLlistaService = inject(LaLlistaService);
  private aQueJuguemService = inject(AQueJuguemService);
  private router = inject(Router);

  loading = signal(true);
  calculating = signal(false);
  error = signal('');
  formError = signal('');
  usuarios = signal<UsuarioOption[]>([]);
  recommendations = signal<AQueJuguemRecommendation[]>([]);
  filteredRecommendations = computed(() => {
    const tempsMigMin = this.parseTempsMigFilter(this.tempsMigMesGranQue());
    const tempsMigMax = this.parseTempsMigFilter(this.tempsMigMesPetitQue());

    return this.recommendations().filter(juego => {
      if (tempsMigMin === null && tempsMigMax === null) {
        return true;
      }

      if (juego.tempsMigMinuts === null || juego.tempsMigMinuts === undefined) {
        return false;
      }

      return (tempsMigMin === null || juego.tempsMigMinuts > tempsMigMin) &&
        (tempsMigMax === null || juego.tempsMigMinuts < tempsMigMax);
    });
  });
  filteredUsuarios = signal<UsuarioOption[]>([]);
  showUsuarioOptions = signal<number | null>(null);
  showRecommendationFilters = signal(false);
  tempsMigMesGranQue = signal('');
  tempsMigMesPetitQue = signal('');
  rowingConfigOpen = signal(false);
  rowingResultsOpen = signal(false);
  rowingLoading = signal(false);
  rowingError = signal('');
  rowingTime = signal('');
  rowingStrength = signal<1 | 5 | 10>(1);
  rowingResults = signal<RowingRecommendation[]>([]);
  remadesAdminOpen = signal(false);
  remadesLoading = signal(false);
  remadesSaving = signal(false);
  remadesError = signal('');
  remades = signal<Remada[]>([]);
  adminGames = signal<Juego[]>([]);
  editingRemadaId = signal<number | null>(null);
  editRemadaDate = signal('');
  editRemadaTime = signal('');
  editRemadaStrength = signal<1 | 5 | 10>(1);
  editRemadaPoints = signal<-1 | 1 | 2 | 3>(3);
  editRemadaUsuarioIds = signal<number[]>([]);
  editRemadaJuegoIds = signal<number[]>([]);
  canManageRemades = computed(() => this.authService.currentUser?.nombre === 'Arnau');
  private calculationRequestId = 0;
  private lastRecommendationKey = '';
  displayUsuario = (usuario: UsuarioOption) => usuario.nombre;

  form = this.fb.group({
    numeroJugadores: [0, [Validators.required, Validators.min(1)]],
    jugadores: this.fb.array([])
  });

  get jugadoresArray(): FormArray {
    return this.form.get('jugadores') as FormArray;
  }

  ngOnInit(): void {
    this.cargarUsuarios();
    this.ensureTrailingEmptyJugador();
  }

  cargarUsuarios(): void {
    this.loading.set(true);
    this.error.set('');

    this.usuariosService.getJugadores().subscribe({
      next: usuarios => {
        this.usuarios.set(usuarios);
        this.filteredUsuarios.set(usuarios);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'han pogut carregar els usuaris.");
        this.loading.set(false);
      }
    });
  }

  onUsuarioInput(index: number, value: string): void {
    const group = this.jugadoresArray.at(index);
    const matchedUsuario = this.findExactUsuarioMatch(index, value);

    group.patchValue({
      usuarioId: matchedUsuario?.usuarioId ?? null,
      usuarioSearch: value
    });
    this.ensureTrailingEmptyJugador();
    this.showUsuarioOptions.set(index);
    this.filteredUsuarios.set(this.getUsuariosDisponibles(index, value));
    this.recalculateForCurrentPlayers();
  }

  onUsuarioFocus(index: number): void {
    const value = this.jugadoresArray.at(index).get('usuarioSearch')?.value ?? '';
    this.showUsuarioOptions.set(index);
    this.filteredUsuarios.set(this.getUsuariosDisponibles(index, value));
  }

  seleccionarUsuario(index: number, usuario: UsuarioOption): void {
    const group = this.jugadoresArray.at(index);
    group.patchValue({
      usuarioId: usuario.usuarioId,
      usuarioSearch: usuario.nombre
    });
    this.ensureTrailingEmptyJugador();
    this.showUsuarioOptions.set(null);
    this.recalculateForCurrentPlayers();
  }

  limpiarUsuario(index: number): void {
    const group = this.jugadoresArray.at(index);
    group.patchValue({
      usuarioId: null,
      usuarioSearch: ''
    });
    this.ensureTrailingEmptyJugador();
    this.showUsuarioOptions.set(null);
    this.recalculateForCurrentPlayers();
  }

  allPlayersSelected(): boolean {
    return this.getSelectedUsuarioIds().length > 0;
  }

  getSelectedPlayerNames(): string[] {
    const selectedIds = new Set(this.getSelectedUsuarioIds());
    return this.usuarios()
      .filter(usuario => selectedIds.has(usuario.usuarioId))
      .map(usuario => usuario.nombre);
  }

  openRemadesAdmin(): void {
    this.remadesAdminOpen.set(true);
    this.remadesLoading.set(true);
    this.remadesError.set('');
    this.cancelEditRemada();

    forkJoin({
      remades: this.aQueJuguemService.getRemades(),
      games: this.juegosService.getAll()
    }).subscribe({
      next: ({ remades, games }) => {
        this.remades.set(remades);
        this.adminGames.set([...games].sort((left, right) => left.nombre.localeCompare(right.nombre)));
        this.remadesLoading.set(false);
      },
      error: () => {
        this.remadesError.set("No s'han pogut carregar les remades.");
        this.remadesLoading.set(false);
      }
    });
  }

  closeRemadesAdmin(): void {
    if (!this.remadesSaving()) {
      this.remadesAdminOpen.set(false);
      this.cancelEditRemada();
    }
  }

  startEditRemada(remada: Remada): void {
    this.editingRemadaId.set(remada.remadaId);
    this.editRemadaDate.set(this.toDatetimeLocal(remada.createdAt));
    this.editRemadaTime.set(String(remada.tempsDisponibleMinuts));
    this.editRemadaStrength.set(remada.nombreJocs);
    this.editRemadaPoints.set(remada.puntsPerJugador);
    this.editRemadaUsuarioIds.set(remada.jugadors.map(jugador => jugador.usuarioId));
    this.editRemadaJuegoIds.set(remada.jocs.map(joc => joc.juegoId));
    this.remadesError.set('');
  }

  cancelEditRemada(): void {
    this.editingRemadaId.set(null);
    this.editRemadaDate.set('');
    this.editRemadaTime.set('');
    this.editRemadaStrength.set(1);
    this.editRemadaPoints.set(3);
    this.editRemadaUsuarioIds.set([]);
    this.editRemadaJuegoIds.set([]);
  }

  toggleEditRemadaUsuario(usuarioId: number): void {
    this.editRemadaUsuarioIds.update(current =>
      current.includes(usuarioId)
        ? current.filter(id => id !== usuarioId)
        : [...current, usuarioId]
    );
  }

  toggleEditRemadaJuego(juegoId: number): void {
    const maximum = this.editRemadaStrength();
    this.editRemadaJuegoIds.update(current => {
      if (current.includes(juegoId)) {
        return current.filter(id => id !== juegoId);
      }

      return current.length < maximum ? [...current, juegoId] : current;
    });
  }

  onEditRemadaStrengthChange(value: string): void {
    const parsed = Number(value);
    const strength: 1 | 5 | 10 = parsed === 5 ? 5 : parsed === 10 ? 10 : 1;
    this.editRemadaStrength.set(strength);
    if (this.editRemadaPoints() !== -1) {
      this.editRemadaPoints.set(strength === 1 ? 3 : strength === 5 ? 2 : 1);
    }
    this.editRemadaJuegoIds.update(current => current.slice(0, strength));
  }

  canSaveEditedRemada(): boolean {
    const time = Number(this.editRemadaTime());
    return Boolean(this.editingRemadaId()) &&
      Boolean(this.editRemadaDate()) &&
      Number.isFinite(time) &&
      time > 0 &&
      this.editRemadaUsuarioIds().length > 0 &&
      this.editRemadaJuegoIds().length === this.editRemadaStrength() &&
      !this.remadesSaving();
  }

  saveEditedRemada(): void {
    const id = this.editingRemadaId();
    if (!id || !this.canSaveEditedRemada()) {
      return;
    }

    const strength = this.editRemadaStrength();
    this.remadesSaving.set(true);
    this.remadesError.set('');

    this.aQueJuguemService.updateRemada(id, {
      createdAt: new Date(this.editRemadaDate()).toISOString(),
      tempsDisponibleMinuts: Number(this.editRemadaTime()),
      nombreJocs: strength,
      puntsPerJugador: this.editRemadaPoints(),
      usuarioIds: this.editRemadaUsuarioIds(),
      juegoIds: this.editRemadaJuegoIds()
    }).subscribe({
      next: () => {
        this.remadesSaving.set(false);
        this.openRemadesAdmin();
      },
      error: error => {
        this.remadesSaving.set(false);
        this.remadesError.set(error?.error?.message ?? "No s'ha pogut editar la remada.");
      }
    });
  }

  deleteRemada(remada: Remada): void {
    if (!window.confirm(`Eliminar la remada del ${this.formatRemadaDate(remada.createdAt)}?`)) {
      return;
    }

    this.remadesSaving.set(true);
    this.remadesError.set('');
    this.aQueJuguemService.deleteRemada(remada.remadaId).subscribe({
      next: () => {
        this.remades.update(current => current.filter(item => item.remadaId !== remada.remadaId));
        if (this.editingRemadaId() === remada.remadaId) {
          this.cancelEditRemada();
        }
        this.remadesSaving.set(false);
      },
      error: () => {
        this.remadesSaving.set(false);
        this.remadesError.set("No s'ha pogut eliminar la remada.");
      }
    });
  }

  formatRemadaDate(value: string): string {
    return new Date(value).toLocaleString('ca-ES');
  }

  formatRemadaPlayers(remada: Remada): string {
    return remada.jugadors.map(jugador => jugador.nombre).join(', ');
  }

  formatRemadaGames(remada: Remada): string {
    return remada.jocs.map(joc => joc.nombre).join(', ');
  }

  trackByRemadaId(_: number, remada: Remada): number {
    return remada.remadaId;
  }

  trackByAdminGameId(_: number, juego: Juego): number {
    return juego.juegoId;
  }

  openRowingConfig(): void {
    if (!this.allPlayersSelected()) {
      return;
    }

    this.rowingTime.set('');
    this.rowingStrength.set(1);
    this.rowingError.set('');
    this.rowingConfigOpen.set(true);
  }

  closeRowingConfig(): void {
    if (!this.rowingLoading()) {
      this.rowingConfigOpen.set(false);
      this.rowingError.set('');
    }
  }

  closeRowingResults(): void {
    if (!this.rowingLoading() && this.rowingResults().length === 0) {
      this.rowingResultsOpen.set(false);
      this.rowingError.set('');
    }
  }

  onRowingTimeInput(value: string): void {
    this.rowingTime.set(value);
    this.rowingError.set('');
  }

  onRowingStrengthChange(value: string): void {
    const parsed = Number(value);
    this.rowingStrength.set(parsed === 5 ? 5 : parsed === 10 ? 10 : 1);
  }

  canAcceptRowing(): boolean {
    const time = Number(this.rowingTime());
    return Number.isFinite(time) && time > 0 && !this.rowingLoading() && !this.calculating();
  }

  getRowingPoints(): 1 | 2 | 3 {
    return this.rowingStrength() === 1 ? 3 : this.rowingStrength() === 5 ? 2 : 1;
  }

  prepareRowing(): void {
    if (!this.canAcceptRowing()) {
      return;
    }

    const availableMinutes = Number(this.rowingTime());
    const resultCount = this.rowingStrength();
    this.rowingLoading.set(true);
    this.rowingError.set('');

    this.laLlistaService.getAll().subscribe({
      next: items => {
        const recommendationsById = new Map(
          this.recommendations().map(recommendation => [recommendation.juegoId, recommendation])
        );

        const results = items
          .map((item, index) => {
            const recommendation = recommendationsById.get(item.juegoId);

            if (recommendation?.tempsMigMinuts == null) {
              return null;
            }

            const tempsMaximMinuts = Math.ceil(recommendation.tempsMigMinuts * 1.25);
            if (tempsMaximMinuts > availableMinutes) {
              return null;
            }

            return {
              ...recommendation,
              llistaPosition: index + 1,
              tempsMaximMinuts
            };
          })
          .filter((item): item is RowingRecommendation => item !== null)
          .slice(0, resultCount);

        if (results.length !== resultCount) {
          this.rowingResults.set([]);
          this.rowingLoading.set(false);
          this.rowingConfigOpen.set(false);
          this.rowingResultsOpen.set(true);
          return;
        }

        this.rowingResults.set(results);
        this.rowingLoading.set(false);
        this.rowingConfigOpen.set(false);
        this.rowingResultsOpen.set(true);
      },
      error: () => {
        this.rowingLoading.set(false);
        this.rowingError.set("No s'ha pogut carregar l'ordre de La llista.");
      }
    });
  }

  resolveRowing(accepted: boolean): void {
    const results = this.rowingResults();
    if (this.rowingLoading() || results.length !== this.rowingStrength()) {
      return;
    }

    this.rowingLoading.set(true);
    this.rowingError.set('');
    this.aQueJuguemService.registerRemada({
      tempsDisponibleMinuts: Number(this.rowingTime()),
      nombreJocs: this.rowingStrength(),
      puntsPerJugador: accepted ? this.getRowingPoints() : -1,
      usuarioIds: this.getSelectedUsuarioIds(),
      juegoIds: results.map(result => result.juegoId)
    }).subscribe({
      next: () => {
        this.rowingLoading.set(false);
        this.rowingResultsOpen.set(false);
      },
      error: error => {
        this.rowingLoading.set(false);
        this.rowingError.set(error?.error?.message ?? "No s'ha pogut registrar la remada.");
      }
    });
  }

  calcular(): void {
    const usuarioIds = this.getSelectedUsuarioIds();

    if (usuarioIds.length === 0) {
      this.calculationRequestId++;
      this.form.controls.numeroJugadores.setValue(0);
      this.lastRecommendationKey = '';
      this.calculating.set(false);
      this.formError.set('');
      this.recommendations.set([]);
      return;
    }

    const numeroJugadores = usuarioIds.length;
    const recommendationKey = `${numeroJugadores}:${usuarioIds.join(',')}`;

    this.form.controls.numeroJugadores.setValue(numeroJugadores);

    if (recommendationKey === this.lastRecommendationKey) {
      return;
    }

    this.lastRecommendationKey = recommendationKey;
    const requestId = ++this.calculationRequestId;

    this.calculating.set(true);
    this.formError.set('');

    forkJoin({
      juegos: this.juegosService.getAll(),
      partidas: this.partidasService.getAll(),
      ordenes: forkJoin(usuarioIds.map(usuarioId => this.usuarioService.getJuegosOrden(usuarioId)))
    }).subscribe({
      next: ({ juegos, partidas, ordenes }) => {
        if (requestId !== this.calculationRequestId) {
          return;
        }

        this.recommendations.set(this.buildRecommendations(juegos, partidas, usuarioIds, ordenes));
        this.calculating.set(false);
      },
      error: err => {
        if (requestId !== this.calculationRequestId) {
          return;
        }

        this.formError.set(err?.error?.message ?? "No s'han pogut calcular els jocs.");
        this.recommendations.set([]);
        this.calculating.set(false);
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByJuegoId(_: number, juego: AQueJuguemRecommendation): number {
    return juego.juegoId;
  }

  formatPuntuacion(juego: AQueJuguemRecommendation): string {
    const detalle = juego.puntuacionesUsuarios
      ?.map(item => `${item.usuarioNombre} ${item.puntuacion}`)
      .join(', ');

    return detalle ? `${juego.puntuacion} (${detalle})` : String(juego.puntuacion);
  }

  formatTempsMig(juego: AQueJuguemRecommendation): string {
    if (juego.tempsMigMinuts === null || juego.tempsMigMinuts === undefined) {
      return '-';
    }

    return `${juego.tempsMigMinuts} min${juego.tempsMigFallback ? ' *' : ''}`;
  }

  formatUltimaPartida(juego: AQueJuguemRecommendation): string {
    return juego.ultimaPartida ? new Date(juego.ultimaPartida).toLocaleDateString('ca-ES') : '-';
  }

  toggleRecommendationFilters(): void {
    this.showRecommendationFilters.update(value => !value);
  }

  onTempsMigMesGranQueInput(event: Event): void {
    this.tempsMigMesGranQue.set((event.target as HTMLInputElement).value ?? '');
  }

  onTempsMigMesPetitQueInput(event: Event): void {
    this.tempsMigMesPetitQue.set((event.target as HTMLInputElement).value ?? '');
  }

  clearRecommendationFilters(): void {
    this.tempsMigMesGranQue.set('');
    this.tempsMigMesPetitQue.set('');
  }

  hasRecommendationFilters(): boolean {
    return this.parseTempsMigFilter(this.tempsMigMesGranQue()) !== null ||
      this.parseTempsMigFilter(this.tempsMigMesPetitQue()) !== null;
  }

  trackByUsuarioId(_: number, usuario: UsuarioOption): number {
    return usuario.usuarioId;
  }

  private buildRecommendations(
    juegos: Juego[],
    partidas: Partida[],
    usuarioIds: number[],
    ordenes: UsuarioJuegoOrden[][]
  ): AQueJuguemRecommendation[] {
    const numeroJugadores = usuarioIds.length;
    const usuarioNombreById = new Map(this.usuarios().map(usuario => [usuario.usuarioId, usuario.nombre]));
    const puntuacionesByUsuario = new Map<number, Map<number, number>>();

    usuarioIds.forEach((usuarioId, index) => {
      puntuacionesByUsuario.set(
        usuarioId,
        new Map(ordenes[index].map(orden => [orden.juegoId, orden.puntuacion]))
      );
    });

    return juegos
      .filter(juego =>
        juego.numeroJugadoresMin <= numeroJugadores &&
        juego.numeroJugadoresMax >= numeroJugadores
      )
      .map(juego => {
        const puntuacionesUsuarios = usuarioIds.map(usuarioId => ({
          usuarioId,
          usuarioNombre: usuarioNombreById.get(usuarioId) ?? '',
          puntuacion: puntuacionesByUsuario.get(usuarioId)?.get(juego.juegoId) ?? 0
        }));

        return {
          juegoId: juego.juegoId,
          nombre: juego.nombre,
          numeroJugadoresMin: juego.numeroJugadoresMin,
          numeroJugadoresMax: juego.numeroJugadoresMax,
          puntuacion: puntuacionesUsuarios.reduce((total, item) => total + item.puntuacion, 0),
          puntuacionesUsuarios,
          ...this.getTempsMig(juego.juegoId, numeroJugadores, partidas),
          ultimaPartida: this.getUltimaPartida(juego.juegoId, partidas)
        };
      })
      .sort((left, right) =>
        right.puntuacion - left.puntuacion ||
        left.nombre.localeCompare(right.nombre)
      );
  }

  private getTempsMig(
    juegoId: number,
    numeroJugadores: number,
    partidas: Partida[]
  ): Pick<AQueJuguemRecommendation, 'tempsMigMinuts' | 'tempsMigFallback'> {
    const partidasDelJuego = partidas.filter(partida =>
      partida.juegoId === juegoId &&
      partida.duracionMinutos !== null &&
      partida.duracionMinutos !== undefined
    );
    const partidasMismaCantidad = partidasDelJuego.filter(partida =>
      partida.numeroJugadores === numeroJugadores
    );
    const base = partidasMismaCantidad.length > 0 ? partidasMismaCantidad : partidasDelJuego;

    if (base.length === 0) {
      return {
        tempsMigMinuts: null,
        tempsMigFallback: false
      };
    }

    return {
      tempsMigMinuts: Math.round(
        base.reduce((total, partida) => total + Number(partida.duracionMinutos), 0) / base.length
      ),
      tempsMigFallback: partidasMismaCantidad.length === 0
    };
  }

  private getUltimaPartida(juegoId: number, partidas: Partida[]): string | null {
    return partidas
      .filter(partida => partida.juegoId === juegoId)
      .map(partida => partida.fecha)
      .sort((left, right) => right.localeCompare(left))[0] ?? null;
  }

  private parseTempsMigFilter(value: string): number | null {
    const parsed = Number(value);

    return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
  }

  private toDatetimeLocal(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  private recalculateForCurrentPlayers(): void {
    this.calcular();
  }

  private ensureTrailingEmptyJugador(): void {
    for (let i = this.jugadoresArray.length - 1; i >= 0; i--) {
      if (this.isJugadorEmpty(i)) {
        this.jugadoresArray.removeAt(i);
      }
    }

    this.jugadoresArray.push(this.createJugadorGroup());
  }

  private createJugadorGroup() {
    return this.fb.group({
      usuarioId: [null as number | null],
      usuarioSearch: ['']
    });
  }

  private isJugadorEmpty(index: number): boolean {
    const control = this.jugadoresArray.at(index);
    const usuarioId = Number(control.get('usuarioId')?.value);
    const search = String(control.get('usuarioSearch')?.value ?? '').trim();

    return (!Number.isFinite(usuarioId) || usuarioId <= 0) && search.length === 0;
  }

  private getSelectedUsuarioIds(): number[] {
    return this.jugadoresArray.controls
      .map(control => Number(control.get('usuarioId')?.value))
      .filter(id => Number.isFinite(id) && id > 0);
  }

  private findExactUsuarioMatch(index: number, value: string): UsuarioOption | null {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    return this.getUsuariosDisponibles(index, value).find(usuario =>
      usuario.nombre.toLowerCase() === normalized
    ) ?? null;
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
}
