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
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Juego, UsuarioOption } from './juegos.models';
import { JuegosService } from './juegos.service';
import { UsuariosService } from './usuarios.service';

type SortColumn =
  | 'nombre'
  | 'numeroJugadoresMin'
  | 'numeroJugadoresMax'
  | 'propietario'
  | 'tipo'
  | 'pvp'
  | 'juegoBase';

type SortDirection = 'asc' | 'desc';

interface JuegosFilters {
  nombre: string;
  numeroJugadoresMin: string;
  numeroJugadoresMax: string;
  propietario: string;
  tipo: string;
  pvpMin: string;
  pvpMax: string;
  juegoBase: string;
}

interface VisibleColumns {
  nombre: boolean;
  numeroJugadoresMin: boolean;
  numeroJugadoresMax: boolean;
  propietario: boolean;
  tipo: boolean;
  pvp: boolean;
  juegoBase: boolean;
}

const EMPTY_FILTERS: JuegosFilters = {
  nombre: '',
  numeroJugadoresMin: '',
  numeroJugadoresMax: '',
  propietario: '',
  tipo: '',
  pvpMin: '',
  pvpMax: '',
  juegoBase: ''
};

@Component({
  selector: 'app-juegos-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './juegos-page.component.html',
  styleUrl: './juegos-page.component.css'
})
export class JuegosPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private juegosService = inject(JuegosService);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  bggLoading = signal(false);
  error = signal('');
  formError = signal('');
  success = signal('');
  modalOpen = signal(false);

  juegos = signal<Juego[]>([]);
  usuarios = signal<UsuarioOption[]>([]);

  filteredUsuarios = signal<UsuarioOption[]>([]);
  showPropietarioOptions = signal(false);

  filteredJuegosBase = signal<Juego[]>([]);
  showJuegoBaseOptions = signal(false);

  sortColumn = signal<SortColumn | null>(null);
  sortDirection = signal<SortDirection | null>(null);

  filters = signal<JuegosFilters>({ ...EMPTY_FILTERS });

  visibleColumns = signal<VisibleColumns>({
    nombre: true,
    numeroJugadoresMin: true,
    numeroJugadoresMax: true,
    propietario: true,
    tipo: true,
    pvp: true,
    juegoBase: true
  });

  showFilters = signal(false);
  showColumnsPanel = signal(false);

  userName = computed(() => this.authService.currentUser?.nombre ?? 'Usuari');
  totalJuegos = computed(() => this.juegos().length);

  allColumnsSelected = computed(() =>
    Object.values(this.visibleColumns()).every(Boolean)
  );

  juegosFiltradosOrdenados = computed(() => {
    const juegos = [...this.juegos()];
    const filters = this.filters();
    const usuarios = this.usuarios();
    const sortColumn = this.sortColumn();
    const sortDirection = this.sortDirection();

    const filtered = juegos.filter(juego => {
      if (
        filters.nombre.trim() &&
        !juego.nombre.toLowerCase().includes(filters.nombre.trim().toLowerCase())
      ) {
        return false;
      }

      if (filters.numeroJugadoresMin.trim()) {
        const minFilter = Number(filters.numeroJugadoresMin);
        if (Number.isFinite(minFilter) && juego.numeroJugadoresMin < minFilter) {
          return false;
        }
      }

      if (filters.numeroJugadoresMax.trim()) {
        const maxFilter = Number(filters.numeroJugadoresMax);
        if (Number.isFinite(maxFilter) && juego.numeroJugadoresMax > maxFilter) {
          return false;
        }
      }

      if (filters.propietario.trim()) {
        const propietarioNombre = this.getNombrePropietario(juego.propietarioId, usuarios);
        if (
          !propietarioNombre
            .toLowerCase()
            .includes(filters.propietario.trim().toLowerCase())
        ) {
          return false;
        }
      }

      if (
        filters.tipo.trim() &&
        !(juego.tipo ?? '').toLowerCase().includes(filters.tipo.trim().toLowerCase())
      ) {
        return false;
      }

      if (filters.pvpMin.trim()) {
        const pvpMin = Number(filters.pvpMin);
        if (Number.isFinite(pvpMin) && (juego.pvp ?? 0) < pvpMin) {
          return false;
        }
      }

      if (filters.pvpMax.trim()) {
        const pvpMax = Number(filters.pvpMax);
        if (Number.isFinite(pvpMax) && (juego.pvp ?? 0) > pvpMax) {
          return false;
        }
      }

      if (filters.juegoBase.trim()) {
        const juegoBaseNombre = this.getNombreJuegoBase(juego.juegoBaseId, juegos);
        if (
          !juegoBaseNombre.toLowerCase().includes(filters.juegoBase.trim().toLowerCase())
        ) {
          return false;
        }
      }

      return true;
    });

    if (!sortColumn || !sortDirection) {
      return filtered;
    }

    filtered.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      switch (sortColumn) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre) * direction;
        case 'numeroJugadoresMin':
          return (a.numeroJugadoresMin - b.numeroJugadoresMin) * direction;
        case 'numeroJugadoresMax':
          return (a.numeroJugadoresMax - b.numeroJugadoresMax) * direction;
        case 'propietario':
          return (
            this.getNombrePropietario(a.propietarioId, usuarios).localeCompare(
              this.getNombrePropietario(b.propietarioId, usuarios)
            ) * direction
          );
        case 'tipo':
          return (a.tipo ?? '').localeCompare(b.tipo ?? '') * direction;
        case 'pvp':
          return ((a.pvp ?? 0) - (b.pvp ?? 0)) * direction;
        case 'juegoBase':
          return (
            this.getNombreJuegoBase(a.juegoBaseId, juegos).localeCompare(
              this.getNombreJuegoBase(b.juegoBaseId, juegos)
            ) * direction
          );
        default:
          return 0;
      }
    });

    return filtered;
  });

  form = this.fb.group({
    juegoId: this.fb.nonNullable.control(0),
    bggId: this.fb.control<number | null>(null),
    nombre: this.fb.nonNullable.control('', [Validators.required]),
    dificultadBgg: this.fb.control<number | null>(null),
    numeroJugadoresMin: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    numeroJugadoresMax: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    pvp: this.fb.control<number | null>(null),
    propietarioId: this.fb.control<number | null>(null, [Validators.required]),
    propietarioSearch: this.fb.nonNullable.control(''),
    fechaAdquisicion: this.fb.control<string | null>(null),
    tipo: this.fb.nonNullable.control(''),
    juegoBaseId: this.fb.control<number | null>(null),
    juegoBaseSearch: this.fb.nonNullable.control('')
  });

  constructor() {
    effect(() => {
      if (!this.modalOpen()) {
        this.showPropietarioOptions.set(false);
        this.showJuegoBaseOptions.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    let juegosCargados = false;
    let usuariosCargados = false;

    this.juegosService.getAll().subscribe({
      next: juegos => {
        this.juegos.set(juegos);
        this.filteredJuegosBase.set(juegos);
        juegosCargados = true;
        this.intentarFinalizarCarga(juegosCargados, usuariosCargados);
      },
      error: () => {
        this.error.set('No s\'han pogut carregar els jocs.');
        this.loading.set(false);
      }
    });

    this.usuariosService.getAll().subscribe({
      next: usuarios => {
        this.usuarios.set(usuarios);
        this.filteredUsuarios.set(usuarios);
        this.seleccionarPropietarioPorDefecto(usuarios);
        usuariosCargados = true;
        this.intentarFinalizarCarga(juegosCargados, usuariosCargados);
      },
      error: () => {
        this.error.set('No s\'han pogut carregar els usuaris.');
        this.loading.set(false);
      }
    });
  }

  abrirModal(): void {
    this.form.reset({
      juegoId: 0,
      bggId: null,
      nombre: '',
      dificultadBgg: null,
      numeroJugadoresMin: 1,
      numeroJugadoresMax: 1,
      pvp: null,
      propietarioId: null,
      propietarioSearch: '',
      fechaAdquisicion: null,
      tipo: '',
      juegoBaseId: null,
      juegoBaseSearch: ''
    });

    this.precargarPropietarioActual();
    this.filteredUsuarios.set(this.usuarios());
    this.filteredJuegosBase.set(this.juegos());
    this.formError.set('');
    this.success.set('');
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    this.modalOpen.set(false);
    this.formError.set('');
    this.success.set('');
  }

  guardarJuego(): void {
    this.formError.set('');
    this.success.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Revisa els camps obligatoris.');
      return;
    }

    const raw = this.form.getRawValue();

    const propietarioId = raw.propietarioId;
    if (!propietarioId) {
      this.formError.set('Has de seleccionar un propietari vàlid.');
      return;
    }

    const juegoBaseId = this.parseJuegoBaseId(raw.juegoBaseSearch ?? '') ?? raw.juegoBaseId;

    const data: Juego = {
      juegoId: raw.juegoId ?? 0,
      nombre: raw.nombre.trim(),
      bggId: raw.bggId,
      dificultadBgg: raw.dificultadBgg,
      numeroJugadoresMin: raw.numeroJugadoresMin,
      numeroJugadoresMax: raw.numeroJugadoresMax,
      pvp: raw.pvp,
      propietarioId,
      fechaAdquisicion: raw.fechaAdquisicion || null,
      tipo: raw.tipo.trim(),
      juegoBaseId: juegoBaseId ?? null
    };

    this.saving.set(true);

    this.juegosService.create(data).subscribe({
      next: juego => {
        this.juegos.update(current => [...current, juego]);
        this.filteredJuegosBase.set(this.juegos());
        this.saving.set(false);
        this.success.set('Joc desat correctament.');
        this.cerrarModal();
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(
          err?.error?.message ?? 'No s\'ha pogut desar el joc.'
        );
      }
    });
  }

  loadFromBgg(): void {
    const raw = this.form.controls.bggId.value;
    const bggId = Number(raw);

    this.formError.set('');
    this.success.set('');

    if (!Number.isFinite(bggId) || bggId <= 0) {
      this.formError.set('Has d\'indicar un BGG ID vàlid.');
      return;
    }

    this.bggLoading.set(true);

    this.juegosService.getFromBgg(bggId).subscribe({
      next: juego => {
        this.bggLoading.set(false);
        this.form.patchValue(
          {
            bggId: juego.bggId,
            nombre: juego.nombre,
            dificultadBgg: juego.dificultadBgg ?? null,
            numeroJugadoresMin: juego.numeroJugadoresMin,
            numeroJugadoresMax: juego.numeroJugadoresMax,
            tipo: juego.tipo ?? ''
          },
          { emitEvent: false }
        );
        this.formError.set('');
        this.success.set('Informació carregada des de BoardGameGeek.');
      },
      error: err => {
        this.bggLoading.set(false);
        this.formError.set(
          err?.error?.message ?? 'No s\'ha pogut consultar BoardGameGeek.'
        );
      }
    });
  }

  onPropietarioInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.form.patchValue(
      {
        propietarioSearch: value,
        propietarioId: null
      },
      { emitEvent: false }
    );

    this.filteredUsuarios.set(this.filterUsuarios(value));
    this.showPropietarioOptions.set(true);
  }

  onJuegoBaseInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.form.patchValue(
      {
        juegoBaseSearch: value,
        juegoBaseId: null
      },
      { emitEvent: false }
    );

    this.filteredJuegosBase.set(this.filterJuegosBase(value));
    this.showJuegoBaseOptions.set(true);
  }

  onPropietarioFocus(): void {
    this.filteredUsuarios.set(this.filterUsuarios(this.form.controls.propietarioSearch.value));
    this.showPropietarioOptions.set(true);
  }

  onJuegoBaseFocus(): void {
    this.filteredJuegosBase.set(this.filterJuegosBase(this.form.controls.juegoBaseSearch.value));
    this.showJuegoBaseOptions.set(true);
  }

  seleccionarPropietario(usuario: UsuarioOption): void {
    this.form.patchValue(
      {
        propietarioId: usuario.usuarioId,
        propietarioSearch: usuario.nombre
      },
      { emitEvent: false }
    );
    this.showPropietarioOptions.set(false);
  }

  seleccionarJuegoBase(juego: Juego): void {
    this.form.patchValue(
      {
        juegoBaseId: juego.juegoId,
        juegoBaseSearch: juego.nombre
      },
      { emitEvent: false }
    );
    this.showJuegoBaseOptions.set(false);
  }

  limpiarJuegoBase(): void {
    this.form.patchValue(
      {
        juegoBaseId: null,
        juegoBaseSearch: ''
      },
      { emitEvent: false }
    );
    this.filteredJuegosBase.set(this.juegos());
  }

  updateFilter<K extends keyof JuegosFilters>(key: K, value: string): void {
    this.filters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  resetFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
  }

  toggleFilters(): void {
    this.showFilters.update(value => !value);
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
      nombre: nextValue,
      numeroJugadoresMin: nextValue,
      numeroJugadoresMax: nextValue,
      propietario: nextValue,
      tipo: nextValue,
      pvp: nextValue,
      juegoBase: nextValue
    });
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn() !== column) {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
      return;
    }

    if (this.sortDirection() === 'asc') {
      this.sortDirection.set('desc');
      return;
    }

    this.sortColumn.set(null);
    this.sortDirection.set(null);
  }

  getSortIndicator(column: SortColumn): string {
    if (this.sortColumn() !== column) {
      return '';
    }

    return this.sortDirection() === 'asc' ? ' ↑' : ' ↓';
  }

  getNombrePropietario(propietarioId: number, usuarios = this.usuarios()): string {
    return usuarios.find(u => u.usuarioId === propietarioId)?.nombre ?? '—';
  }

  getNombreJuegoBase(juegoBaseId: number | null | undefined, juegos = this.juegos()): string {
    if (!juegoBaseId) {
      return '—';
    }

    return juegos.find(j => j.juegoId === juegoBaseId)?.nombre ?? '—';
  }

  formatCurrency(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }

    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showColumnsPanel.set(false);
    this.showPropietarioOptions.set(false);
    this.showJuegoBaseOptions.set(false);
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  private filterUsuarios(search: string): UsuarioOption[] {
    const term = search.trim().toLowerCase();

    if (!term) {
      return this.usuarios();
    }

    return this.usuarios().filter(u =>
      u.nombre.toLowerCase().includes(term)
    );
  }

  private filterJuegosBase(search: string): Juego[] {
    const term = search.trim().toLowerCase();

    if (!term) {
      return this.juegos();
    }

    return this.juegos().filter(j =>
      j.nombre.toLowerCase().includes(term)
    );
  }

  private seleccionarPropietarioPorDefecto(usuarios: UsuarioOption[]): void {
    const currentUser = this.authService.currentUser;

    if (!currentUser) {
      return;
    }

    const usuario = usuarios.find(u => u.usuarioId === currentUser.usuarioId);
    if (!usuario) {
      return;
    }

    this.form.patchValue(
      {
        propietarioId: usuario.usuarioId,
        propietarioSearch: usuario.nombre
      },
      { emitEvent: false }
    );
  }

  private precargarPropietarioActual(): void {
    const currentUser = this.authService.currentUser;

    if (!currentUser) {
      return;
    }

    this.form.patchValue(
      {
        propietarioId: currentUser.usuarioId,
        propietarioSearch: currentUser.nombre
      },
      { emitEvent: false }
    );
  }

  private intentarFinalizarCarga(juegosCargados: boolean, usuariosCargados: boolean): void {
    if (juegosCargados && usuariosCargados) {
      this.loading.set(false);
    }
  }

  private parseJuegoBaseId(value: string): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  trackByJuegoId(_: number, juego: Juego): number {
    return juego.juegoId;
  }

  get nombre() {
    return this.form.controls.nombre;
  }

  get propietarioId() {
    return this.form.controls.propietarioId;
  }
}