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
        const propietarioNombre = this.getNombrePropietario(
          juego.propietarioId,
          usuarios
        );
        if (
          !propietarioNombre
            .toLowerCase()
            .includes(filters.propietario.trim().toLowerCase())
        ) {
          return false;
        }
      }

      if (filters.tipo.trim()) {
        if (
          !juego.tipo
            .toLowerCase()
            .includes(filters.tipo.trim().toLowerCase())
        ) {
          return false;
        }
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
        const juegoBaseNombre = this.getNombreJuegoBase(juego.juegoBaseId);
        if (
          !juegoBaseNombre
            .toLowerCase()
            .includes(filters.juegoBase.trim().toLowerCase())
        ) {
          return false;
        }
      }

      return true;
    });

    if (!sortColumn || !sortDirection) {
      return filtered;
    }

    const directionFactor = sortDirection === 'asc' ? 1 : -1;

    return filtered.sort((a, b) => {
      let aValue: string | number | null = null;
      let bValue: string | number | null = null;

      switch (sortColumn) {
        case 'nombre':
          aValue = a.nombre.toLowerCase();
          bValue = b.nombre.toLowerCase();
          break;
        case 'numeroJugadoresMin':
          aValue = a.numeroJugadoresMin;
          bValue = b.numeroJugadoresMin;
          break;
        case 'numeroJugadoresMax':
          aValue = a.numeroJugadoresMax;
          bValue = b.numeroJugadoresMax;
          break;
        case 'propietario':
          aValue = this.getNombrePropietario(a.propietarioId, usuarios).toLowerCase();
          bValue = this.getNombrePropietario(b.propietarioId, usuarios).toLowerCase();
          break;
        case 'tipo':
          aValue = a.tipo.toLowerCase();
          bValue = b.tipo.toLowerCase();
          break;
        case 'pvp':
          aValue = a.pvp ?? 0;
          bValue = b.pvp ?? 0;
          break;
        case 'juegoBase':
          aValue = this.getNombreJuegoBase(a.juegoBaseId).toLowerCase();
          bValue = this.getNombreJuegoBase(b.juegoBaseId).toLowerCase();
          break;
      }

      if (aValue === bValue) {
        return 0;
      }

      if (aValue === null) {
        return 1;
      }

      if (bValue === null) {
        return -1;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * directionFactor;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * directionFactor;
      }

      return 0;
    });
  });

  form = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      bggId: [null as number | null],
      dificultadBgg: [null as number | null],
      numeroJugadoresMin: [1, [Validators.required, Validators.min(1)]],
      numeroJugadoresMax: [1, [Validators.required, Validators.min(1)]],
      pvp: [null as number | null],
      propietarioId: [null as number | null, Validators.required],
      propietarioSearch: [''],
      fechaAdquisicion: [null as string | null],
      tipo: ['', [Validators.maxLength(200)]],
      juegoBaseId: [null as number | null],
      juegoBaseSearch: ['']
    },
    {
      validators: control => {
        const min = control.get('numeroJugadoresMin')?.value;
        const max = control.get('numeroJugadoresMax')?.value;

        if (min && max && min > max) {
          return { minGreaterThanMax: true };
        }

        return null;
      }
    }
  );

  constructor() {
    effect(() => {
      const search = this.form.controls.propietarioSearch.value ?? '';
      const all = this.usuarios();

      if (!search.trim()) {
        this.filteredUsuarios.set(all.slice(0, 20));
        return;
      }

      const lower = search.toLowerCase();
      this.filteredUsuarios.set(
        all
          .filter(u => u.nombre.toLowerCase().includes(lower))
          .slice(0, 20)
      );
    });

    effect(() => {
      const search = this.form.controls.juegoBaseSearch.value ?? '';
      const all = this.juegos();

      if (!search.trim()) {
        this.filteredJuegosBase.set(all.slice(0, 20));
        return;
      }

      const lower = search.toLowerCase();
      this.filteredJuegosBase.set(
        all
          .filter(j => j.nombre.toLowerCase().includes(lower))
          .slice(0, 20)
      );
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.error.set('');
    let juegosCargados = false;
    let usuariosCargados = false;

    this.juegosService.getAll().subscribe({
      next: juegos => {
        this.juegos.set(juegos);
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
        usuariosCargados = true;
        this.intentarFinalizarCarga(juegosCargados, usuariosCargados);
        this.precargarPropietarioActual();
      },
      error: () => {
        this.error.set('No s\'han pogut carregar els usuaris.');
        this.loading.set(false);
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }

  toggleColumnsPanel(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.showColumnsPanel.update(v => !v);
  }

  @HostListener('document:click')
  closeColumnsPanel(): void {
    if (this.showColumnsPanel()) {
      this.showColumnsPanel.set(false);
    }
  }

  updateFilter<K extends keyof JuegosFilters>(key: K, value: string): void {
    this.filters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  clearAllFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
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

  toggleColumn(column: keyof VisibleColumns): void {
    this.visibleColumns.update(current => ({
      ...current,
      [column]: !current[column]
    }));
  }

  setSort(column: SortColumn): void {
    const currentColumn = this.sortColumn();
    const currentDirection = this.sortDirection();

    if (currentColumn === column) {
      if (currentDirection === 'asc') {
        this.sortDirection.set('desc');
      } else if (currentDirection === 'desc') {
        this.sortColumn.set(null);
        this.sortDirection.set(null);
      } else {
        this.sortDirection.set('asc');
      }
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  abrirModal(): void {
    this.form.reset({
      nombre: '',
      bggId: null,
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
    this.formError.set('');
    this.success.set('');
    this.precargarPropietarioActual();
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    if (this.saving()) {
      return;
    }
    this.modalOpen.set(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Revisa els camps del formulari.');
      this.success.set('');
      return;
    }

    const value = this.form.getRawValue();

    const juego: Juego = {
      juegoId: 0,
      nombre: value.nombre?.trim() ?? '',
      bggId: value.bggId ?? null,
      dificultadBgg: value.dificultadBgg ?? null,
      numeroJugadoresMin: value.numeroJugadoresMin ?? 1,
      numeroJugadoresMax: value.numeroJugadoresMax ?? 1,
      pvp: value.pvp ?? null,
      propietarioId: value.propietarioId!,
      fechaAdquisicion: value.fechaAdquisicion ?? null,
      tipo: value.tipo?.trim() ?? '',
      juegoBaseId: value.juegoBaseId ?? null
    };

    this.saving.set(true);
    this.formError.set('');
    this.success.set('');

    this.juegosService.create(juego).subscribe({
      next: created => {
        this.juegos.update(current => [...current, created]);
        this.saving.set(false);
        this.success.set('Joc creat correctament.');
        this.modalOpen.set(false);
      },
      error: err => {
        this.saving.set(false);
        const message =
          err?.error?.message ||
          'No s\'ha pogut desar el joc. Torna-ho a provar més tard.';
        this.formError.set(message);
      }
    });
  }

  buscarBgg(): void {
    const bggId = this.form.controls.bggId.value;

    if (!bggId || bggId <= 0) {
      this.formError.set('Introdueix un BGG ID vàlid.');
      this.success.set('');
      return;
    }

    this.bggLoading.set(true);
    this.formError.set('');
    this.success.set('');

    this.juegosService.getFromBgg(bggId).subscribe({
      next: data => {
        this.form.patchValue(
          {
            nombre: data.nombre,
            dificultadBgg: data.dificultadBgg ?? null,
            numeroJugadoresMin: data.numeroJugadoresMin,
            numeroJugadoresMax: data.numeroJugadoresMax,
            tipo: data.tipo
          },
          { emitEvent: false }
        );
        this.bggLoading.set(false);
        this.success.set('Dades carregades des de BoardGameGeek.');
      },
      error: err => {
        this.bggLoading.set(false);
        const message =
          err?.error?.message ||
          'No s\'han pogut carregar les dades de BoardGameGeek.';
        this.formError.set(message);
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
  }

  limpiarPropietario(): void {
    this.form.patchValue(
      {
        propietarioId: null,
        propietarioSearch: ''
      },
      { emitEvent: false }
    );
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
  }

  getNombrePropietario(
    propietarioId: number,
    usuariosList: UsuarioOption[] | null = null
  ): string {
    const list = usuariosList ?? this.usuarios();
    const usuario = list.find(u => u.usuarioId === propietarioId);
    return usuario?.nombre ?? '-';
  }

  getNombreJuegoBase(juegoBaseId: number | null | undefined): string {
    if (!juegoBaseId) {
      return '-';
    }
    const juego = this.juegos().find(j => j.juegoId === juegoBaseId);
    return juego?.nombre ?? '-';
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 820 && this.showColumnsPanel()) {
      this.showColumnsPanel.set(false);
    }
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

  private intentarFinalizarCarga(
    juegosCargados: boolean,
    usuariosCargados: boolean
  ): void {
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