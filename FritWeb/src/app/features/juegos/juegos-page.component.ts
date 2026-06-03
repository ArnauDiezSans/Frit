import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BggJuegoLookup, Juego, UsuarioOption } from './juegos.models';
import { JuegosService } from './juegos.service';
import { UsuariosService } from './usuarios.service';


function minLessOrEqualMaxValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const min = Number(group.get('numeroJugadoresMin')?.value);
    const max = Number(group.get('numeroJugadoresMax')?.value);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return null;
    }

    return min <= max ? null : { minGreaterThanMax: true };
  };
}

type SortColumn =
  | 'nombre'
  | 'numeroJugadoresMin'
  | 'numeroJugadoresMax'
  | 'propietario'
  | 'tipo'
  | 'pvp'
  | 'juegoBase';

type SortDirection = 'asc' | 'desc' | null;

interface JuegosFilters {
  nombre: string;
  numeroJugadoresMin: string;
  numeroJugadoresMax: string;
  propietario: string;
  tipo: string;
  pvp: string;
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
  pvp: '',
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
  sortDirection = signal<SortDirection>(null);
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

  juegosFiltradosOrdenados = computed(() => {
    const juegos = this.juegos();
    const filters = this.filters();
    const sortColumn = this.sortColumn();
    const sortDirection = this.sortDirection();

    const filtered = juegos.filter(juego => {
      if (filters.nombre.trim()) {
        if (!juego.nombre.toLowerCase().includes(filters.nombre.trim().toLowerCase())) {
          return false;
        }
      }

      if (filters.numeroJugadoresMin.trim()) {
        const minFilter = Number(filters.numeroJugadoresMin);
        if (Number.isFinite(minFilter) && juego.numeroJugadoresMin !== minFilter) {
          return false;
        }
      }

      if (filters.numeroJugadoresMax.trim()) {
        const maxFilter = Number(filters.numeroJugadoresMax);
        if (Number.isFinite(maxFilter) && juego.numeroJugadoresMax !== maxFilter) {
          return false;
        }
      }

      if (filters.propietario.trim()) {
        const propietario = this.getNombrePropietario(juego.propietarioId).toLowerCase();
        if (!propietario.includes(filters.propietario.trim().toLowerCase())) {
          return false;
        }
      }

      if (filters.tipo.trim()) {
        if (!(juego.tipo ?? '').toLowerCase().includes(filters.tipo.trim().toLowerCase())) {
          return false;
        }
      }

      if (filters.pvp.trim()) {
        const pvpFilter = Number(filters.pvp);
        if (Number.isFinite(pvpFilter) && Number(juego.pvp ?? 0) !== pvpFilter) {
          return false;
        }
      }

      if (filters.juegoBase.trim()) {
        const juegoBase = this.getNombreJuegoBase(juego.juegoBaseId).toLowerCase();
        if (!juegoBase.includes(filters.juegoBase.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    if (!sortColumn || !sortDirection) {
      return [...filtered];
    }

    return [...filtered].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      switch (sortColumn) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre) * direction;
        case 'numeroJugadoresMin':
          return (a.numeroJugadoresMin - b.numeroJugadoresMin) * direction;
        case 'numeroJugadoresMax':
          return (a.numeroJugadoresMax - b.numeroJugadoresMax) * direction;
        case 'propietario':
          return this.getNombrePropietario(a.propietarioId)
            .localeCompare(this.getNombrePropietario(b.propietarioId)) * direction;
        case 'tipo':
          return (a.tipo ?? '').localeCompare(b.tipo ?? '') * direction;
        case 'pvp':
          return ((a.pvp ?? 0) - (b.pvp ?? 0)) * direction;
        case 'juegoBase':
          return this.getNombreJuegoBase(a.juegoBaseId)
            .localeCompare(this.getNombreJuegoBase(b.juegoBaseId)) * direction;
        default:
          return 0;
      }
    });
  });

  allColumnsSelected = computed(() => {
    const columns = this.visibleColumns();
    return Object.values(columns).every(Boolean);
  });

  form = this.fb.group(
    {
      juegoId: this.fb.nonNullable.control(0),
      nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
      bggId: this.fb.control<number | null>(null),
      dificultadBgg: this.fb.control<number | null>(null),
      numeroJugadoresMin: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
      numeroJugadoresMax: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
      pvp: this.fb.control<number | null>(null),
      propietarioId: this.fb.control<number | null>(null, [Validators.required]),
      propietarioSearch: this.fb.nonNullable.control('', [Validators.required]),
      fechaAdquisicion: this.fb.control<string | null>(null),
      tipo: this.fb.nonNullable.control('', [Validators.maxLength(200)]),
      juegoBaseId: this.fb.control<number | null>(null),
      juegoBaseSearch: this.fb.nonNullable.control('')
    },
    { validators: minLessOrEqualMaxValidator() }
  );

  ngOnInit(): void {
    this.inicializarFiltroPropietarios();
    this.inicializarFiltroJuegosBase();
    this.precargarPropietarioActual();
    this.cargarDatos();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showPropietarioOptions.set(false);
    this.showJuegoBaseOptions.set(false);
    this.showColumnsPanel.set(false);
  }

  abrirModal(): void {
    this.form.reset({
      juegoId: 0,
      nombre: '',
      bggId: null,
      dificultadBgg: null,
      numeroJugadoresMin: 1,
      numeroJugadoresMax: 1,
      pvp: null,
      propietarioId: this.authService.currentUser?.usuarioId ?? null,
      propietarioSearch: this.authService.currentUser?.nombre ?? '',
      fechaAdquisicion: null,
      tipo: '',
      juegoBaseId: null,
      juegoBaseSearch: ''
    });

    this.formError.set('');
    this.success.set('');
    this.showPropietarioOptions.set(false);
    this.showJuegoBaseOptions.set(false);
    this.modalOpen.set(true);
    this.filteredUsuarios.set(this.usuarios());
    this.filteredJuegosBase.set(this.obtenerJuegosBaseFiltrados(''));
  }

  cerrarModal(): void {
    if (this.saving()) {
      return;
    }

    this.modalOpen.set(false);
    this.showPropietarioOptions.set(false);
    this.showJuegoBaseOptions.set(false);
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.error.set('');

    let juegosCargados = false;
    let usuariosCargados = false;

    this.juegosService.getAll().subscribe({
      next: juegos => {
        this.juegos.set(juegos);
        this.filteredJuegosBase.set(this.obtenerJuegosBaseFiltrados(this.form.controls.juegoBaseSearch.value));
        juegosCargados = true;
        this.intentarFinalizarCarga(juegosCargados, usuariosCargados);
      },
      error: () => {
        this.error.set('No s’han pogut carregar els jocs.');
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
        this.error.set('No s’han pogut carregar els usuaris.');
        this.loading.set(false);
      }
    });
  }

  private inicializarFiltroPropietarios(): void {
    this.form.controls.propietarioSearch.valueChanges.subscribe(value => {
      const term = value.trim().toLowerCase();

      const filtered = this.usuarios().filter(u =>
        u.nombre.toLowerCase().includes(term)
      );

      this.filteredUsuarios.set(filtered);
      this.showPropietarioOptions.set(true);

      const selected = this.usuarios().find(u => u.usuarioId === this.propietarioId.value);
      if (!selected || selected.nombre !== value) {
        this.form.controls.propietarioId.setValue(null, { emitEvent: false });
      }
    });
  }

  private inicializarFiltroJuegosBase(): void {
    this.form.controls.juegoBaseSearch.valueChanges.subscribe(value => {
      const filtered = this.obtenerJuegosBaseFiltrados(value);
      this.filteredJuegosBase.set(filtered);
      this.showJuegoBaseOptions.set(true);

      const selectedId = this.form.controls.juegoBaseId.value;
      const selected = this.juegos().find(j => j.juegoId === selectedId);

      if (!selected || selected.nombre !== value) {
        this.form.controls.juegoBaseId.setValue(null, { emitEvent: false });
      }
    });
  }

  cargarDesdeBgg(): void {
    this.formError.set('');
    this.success.set('');

    const bggId = this.form.controls.bggId.value;

    if (!bggId || bggId <= 0) {
      this.formError.set('Introdueix un BGG ID vàlid.');
      return;
    }

    this.bggLoading.set(true);

    this.juegosService.getFromBgg(bggId).subscribe({
      next: (bggJuego: BggJuegoLookup) => {
        this.form.patchValue({
          nombre: bggJuego.nombre,
          bggId: bggJuego.bggId,
          dificultadBgg: bggJuego.dificultadBgg ?? null,
          numeroJugadoresMin: bggJuego.numeroJugadoresMin,
          numeroJugadoresMax: bggJuego.numeroJugadoresMax,
          tipo: bggJuego.tipo ?? ''
        });

        this.success.set('Informació carregada des de BoardGameGeek.');
        this.bggLoading.set(false);
      },
      error: err => {
        this.formError.set(err?.error?.message ?? 'No s’ha pogut carregar la informació de BGG.');
        this.bggLoading.set(false);
      }
    });
  }

  submit(): void {
    this.formError.set('');
    this.success.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Revisa els camps del formulari.');
      return;
    }

    const raw = this.form.getRawValue();

    const payload: Juego = {
      juegoId: raw.juegoId,
      nombre: raw.nombre.trim(),
      bggId: raw.bggId ? Number(raw.bggId) : null,
      dificultadBgg: raw.dificultadBgg !== null && raw.dificultadBgg !== undefined
        ? Number(raw.dificultadBgg)
        : null,
      numeroJugadoresMin: Number(raw.numeroJugadoresMin),
      numeroJugadoresMax: Number(raw.numeroJugadoresMax),
      pvp: raw.pvp !== null && raw.pvp !== undefined ? Number(raw.pvp) : null,
      propietarioId: Number(raw.propietarioId),
      fechaAdquisicion: raw.fechaAdquisicion,
      tipo: raw.tipo.trim(),
      juegoBaseId: raw.juegoBaseId ? Number(raw.juegoBaseId) : null
    };

    this.saving.set(true);

    this.juegosService.create(payload).subscribe({
      next: juego => {
        this.juegos.update(current => [...current, juego]);
        this.filteredJuegosBase.set(this.obtenerJuegosBaseFiltrados(this.form.controls.juegoBaseSearch.value));
        this.success.set('Joc desat correctament.');
        this.saving.set(false);
        this.cerrarModal();
      },
      error: err => {
        this.formError.set(err?.error?.message ?? 'No s’ha pogut desar el joc.');
        this.saving.set(false);
      }
    });
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
    this.filteredUsuarios.set(this.usuarios());
  }

  limpiarPropietario(): void {
    this.form.patchValue(
      {
        propietarioId: null,
        propietarioSearch: ''
      },
      { emitEvent: false }
    );

    this.filteredUsuarios.set(this.usuarios());
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
    this.filteredJuegosBase.set(this.obtenerJuegosBaseFiltrados(juego.nombre));
  }

  limpiarJuegoBase(): void {
    this.form.patchValue(
      {
        juegoBaseId: null,
        juegoBaseSearch: ''
      },
      { emitEvent: false }
    );

    this.filteredJuegosBase.set(this.obtenerJuegosBaseFiltrados(''));
    this.showJuegoBaseOptions.set(false);
  }

  updateFilter<K extends keyof JuegosFilters>(key: K, value: JuegosFilters[K]): void {
    this.filters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  clearAllFilters(): void {
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
    const allSelected = this.allColumnsSelected();

    this.visibleColumns.set({
      nombre: !allSelected,
      numeroJugadoresMin: !allSelected,
      numeroJugadoresMax: !allSelected,
      propietario: !allSelected,
      tipo: !allSelected,
      pvp: !allSelected,
      juegoBase: !allSelected
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

    if (this.sortDirection() === 'desc') {
      this.sortColumn.set(null);
      this.sortDirection.set(null);
      return;
    }

    this.sortDirection.set('asc');
  }

  getSortIndicator(column: SortColumn): string {
    if (this.sortColumn() !== column) {
      return '';
    }

    return this.sortDirection() === 'asc' ? '↑' : this.sortDirection() === 'desc' ? '↓' : '';
  }

  resetTableState(): void {
    this.visibleColumns.set({
      nombre: true,
      numeroJugadoresMin: true,
      numeroJugadoresMax: true,
      propietario: true,
      tipo: true,
      pvp: true,
      juegoBase: true
    });

    this.clearAllFilters();
    this.sortColumn.set(null);
    this.sortDirection.set(null);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  getNombrePropietario(propietarioId: number): string {
    return this.usuarios().find(u => u.usuarioId === propietarioId)?.nombre ?? `${propietarioId}`;
  }

  getNombreJuegoBase(juegoBaseId: number | null | undefined): string {
    if (!juegoBaseId) {
      return '-';
    }

    const juegoBase = this.juegos().find(j => j.juegoId === juegoBaseId);
    return juegoBase?.nombre ?? `${juegoBaseId}`;
  }

  private obtenerJuegosBaseFiltrados(value: string): Juego[] {
    const term = value.trim().toLowerCase();

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

  loadFromBgg(): void {
  const raw = this.form.controls.bggId.value;
  const bggId = Number(raw);

  this.formError.set('');

  if (!Number.isFinite(bggId) || bggId <= 0) {
    this.formError.set('Has d\'indicar un BGG ID vàlid.');
    return;
  }

  this.bggLoading.set(true);

  this.juegosService.getFromBgg(bggId).subscribe({
    next: (juego) => {
      this.bggLoading.set(false);

      this.form.patchValue(
        {
          nombre: juego.nombre,
          dificultadBgg: juego.dificultadBgg ?? null,
          numeroJugadoresMin: juego.numeroJugadoresMin,
          numeroJugadoresMax: juego.numeroJugadoresMax,
          tipo: juego.tipo ?? ''
        },
        { emitEvent: false }
      );
    },
    error: (err) => {
      this.bggLoading.set(false);

      const msg =
        err?.error?.message ??
        'No s\'ha pogut consultar BoardGameGeek. Torna-ho a provar més tard.';
      this.formError.set(msg);
    }
  });
}
}