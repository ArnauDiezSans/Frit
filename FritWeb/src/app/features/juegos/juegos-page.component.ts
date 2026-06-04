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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
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
  imports: [CommonModule, ReactiveFormsModule, MenuComponent],
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
  isMobileFilters = signal(false);

  userName = computed(() => this.authService.currentUser?.nombre ?? 'Usuari');
  totalJuegos = computed(() => this.juegos().length);
  allColumnsSelected = computed(() => Object.values(this.visibleColumns()).every(Boolean));

  juegosFiltradosOrdenados = computed(() => {
    const juegos = [...this.juegos()];
    const filters = this.filters();
    const usuarios = this.usuarios();
    const allJuegos = this.juegos();
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
        if (!propietarioNombre.toLowerCase().includes(filters.propietario.trim().toLowerCase())) {
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
        const juegoBaseNombre = this.getNombreJuegoBase(juego.juegoBaseId, allJuegos);
        if (!juegoBaseNombre.toLowerCase().includes(filters.juegoBase.trim().toLowerCase())) {
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
          return ((a.tipo ?? '').localeCompare(b.tipo ?? '')) * direction;

        case 'pvp':
          return ((a.pvp ?? 0) - (b.pvp ?? 0)) * direction;

        case 'juegoBase':
          return (
            this.getNombreJuegoBase(a.juegoBaseId, allJuegos).localeCompare(
              this.getNombreJuegoBase(b.juegoBaseId, allJuegos)
            ) * direction
          );

        default:
          return 0;
      }
    });

    return filtered;
  });

  form = this.fb.group(
    {
      juegoId: [0, Validators.required],
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      bggId: [null as number | null],
      dificultadBgg: [null as number | null],
      numeroJugadoresMin: [1, [Validators.required, Validators.min(1)]],
      numeroJugadoresMax: [1, [Validators.required, Validators.min(1)]],
      pvp: [null as number | null],
      propietarioId: [null as number | null, Validators.required],
      propietarioSearch: [''],
      fechaAdquisicion: [''],
      tipo: [''],
      juegoBaseId: [null as number | null],
      juegoBaseSearch: ['']
    },
    {
      validators: control => {
        const min = Number(control.get('numeroJugadoresMin')?.value ?? 0);
        const max = Number(control.get('numeroJugadoresMax')?.value ?? 0);

        if (min > max) {
          return { minGreaterThanMax: true };
        }

        return null;
      }
    }
  );

  constructor() {
    effect(() => {
      if (!this.modalOpen()) {
        this.showPropietarioOptions.set(false);
        this.showJuegoBaseOptions.set(false);
      }
    });

    this.updateResponsiveState();
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  @HostListener('window:click')
  onWindowClick(): void {
    this.showColumnsPanel.set(false);
    this.showPropietarioOptions.set(false);
    this.showJuegoBaseOptions.set(false);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateResponsiveState();
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.error.set('');

    this.usuariosService.getAll().subscribe({
      next: usuarios => {
        this.usuarios.set(usuarios);
        this.filteredUsuarios.set(usuarios);

        this.juegosService.getAll().subscribe({
          next: juegos => {
            this.juegos.set(juegos);
            this.filteredJuegosBase.set(juegos);
            this.loading.set(false);
          },
          error: () => {
            this.error.set("No s'han pogut carregar els jocs.");
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.error.set("No s'han pogut carregar els usuaris.");
        this.loading.set(false);
      }
    });
  }

  updateFilter<K extends keyof JuegosFilters>(key: K, value: string): void {
    this.filters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  limpiarFiltros(): void {
    this.filters.set({ ...EMPTY_FILTERS });
  }

  resetFilters(): void {
    this.limpiarFiltros();
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

  ordenarPor(column: SortColumn): void {
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

  sortBy(column: SortColumn): void {
    this.ordenarPor(column);
  }

  getSortIndicator(column: SortColumn): string {
    if (this.sortColumn() !== column) {
      return '';
    }

    return this.sortDirection() === 'asc' ? ' ↑' : ' ↓';
  }

  getNombrePropietario(
    propietarioId: number,
    usuarios: UsuarioOption[] = this.usuarios()
  ): string {
    return usuarios.find(u => u.usuarioId === propietarioId)?.nombre ?? '';
  }

  getNombreJuegoBase(
    juegoBaseId: number | null | undefined,
    juegos: Juego[] = this.juegos()
  ): string {
    if (!juegoBaseId) {
      return '';
    }

    return juegos.find(j => j.juegoId === juegoBaseId)?.nombre ?? '';
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

  abrirModal(): void {
    this.form.reset({
      juegoId: 0,
      nombre: '',
      bggId: null,
      dificultadBgg: null,
      numeroJugadoresMin: 1,
      numeroJugadoresMax: 1,
      pvp: null,
      propietarioId: null,
      propietarioSearch: '',
      fechaAdquisicion: '',
      tipo: '',
      juegoBaseId: null,
      juegoBaseSearch: ''
    });

    this.formError.set('');
    this.success.set('');
    this.filteredUsuarios.set(this.usuarios());
    this.filteredJuegosBase.set(this.juegos());
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    this.modalOpen.set(false);
    this.formError.set('');
    this.success.set('');
  }

  buscarBgg(): void {
    const bggId = Number(this.form.controls.bggId.value);

    if (!Number.isFinite(bggId) || bggId <= 0) {
      this.formError.set('Introdueix un BGG ID vàlid.');
      return;
    }

    this.formError.set('');
    this.success.set('');
    this.bggLoading.set(true);

    this.juegosService.getFromBgg(bggId).subscribe({
      next: juego => {
        this.form.patchValue({
          nombre: juego.nombre,
          dificultadBgg: juego.dificultadBgg ?? null,
          numeroJugadoresMin: juego.numeroJugadoresMin,
          numeroJugadoresMax: juego.numeroJugadoresMax,
          tipo: juego.tipo ?? ''
        });

        this.bggLoading.set(false);
      },
      error: error => {
        this.formError.set(error?.error?.message ?? 'No s’han pogut carregar les dades de BGG.');
        this.bggLoading.set(false);
      }
    });
  }

  onPropietarioInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.form.controls.propietarioSearch.setValue(value);
    this.showPropietarioOptions.set(true);

    const normalized = value.trim().toLowerCase();
    this.filteredUsuarios.set(
      this.usuarios().filter(usuario =>
        usuario.nombre.toLowerCase().includes(normalized)
      )
    );
  }

  onPropietarioFocus(): void {
    this.showPropietarioOptions.set(true);
    const value = this.form.controls.propietarioSearch.value ?? '';
    const normalized = value.trim().toLowerCase();

    this.filteredUsuarios.set(
      this.usuarios().filter(usuario =>
        usuario.nombre.toLowerCase().includes(normalized)
      )
    );
  }

  seleccionarPropietario(usuario: UsuarioOption): void {
    this.form.patchValue({
      propietarioId: usuario.usuarioId,
      propietarioSearch: usuario.nombre
    });
    this.showPropietarioOptions.set(false);
  }

  limpiarPropietarioSeleccionado(): void {
    this.form.patchValue({
      propietarioId: null,
      propietarioSearch: ''
    });
    this.filteredUsuarios.set(this.usuarios());
    this.showPropietarioOptions.set(false);
  }

  limpiarPropietario(): void {
    this.limpiarPropietarioSeleccionado();
  }

  onJuegoBaseInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.form.controls.juegoBaseSearch.setValue(value);
    this.showJuegoBaseOptions.set(true);

    const normalized = value.trim().toLowerCase();
    this.filteredJuegosBase.set(
      this.juegos().filter(juego =>
        juego.nombre.toLowerCase().includes(normalized)
      )
    );
  }

  onJuegoBaseFocus(): void {
    this.showJuegoBaseOptions.set(true);
    const value = this.form.controls.juegoBaseSearch.value ?? '';
    const normalized = value.trim().toLowerCase();

    this.filteredJuegosBase.set(
      this.juegos().filter(juego =>
        juego.nombre.toLowerCase().includes(normalized)
      )
    );
  }

  seleccionarJuegoBase(juego: Juego): void {
    this.form.patchValue({
      juegoBaseId: juego.juegoId,
      juegoBaseSearch: juego.nombre
    });
    this.showJuegoBaseOptions.set(false);
  }

  limpiarJuegoBase(): void {
    this.form.patchValue({
      juegoBaseId: null,
      juegoBaseSearch: ''
    });
    this.filteredJuegosBase.set(this.juegos());
    this.showJuegoBaseOptions.set(false);
  }

  guardarJuego(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const payload: Juego = {
      juegoId: raw.juegoId ?? 0,
      nombre: raw.nombre?.trim() ?? '',
      bggId: raw.bggId,
      dificultadBgg: raw.dificultadBgg,
      numeroJugadoresMin: Number(raw.numeroJugadoresMin),
      numeroJugadoresMax: Number(raw.numeroJugadoresMax),
      pvp: raw.pvp,
      propietarioId: Number(raw.propietarioId),
      fechaAdquisicion: raw.fechaAdquisicion || null,
      tipo: raw.tipo?.trim() ?? '',
      juegoBaseId: raw.juegoBaseId
    };

    this.saving.set(true);
    this.formError.set('');
    this.success.set('');

    this.juegosService.create(payload).subscribe({
      next: juego => {
        this.juegos.update(current => [...current, juego]);
        this.filteredJuegosBase.set(this.juegos());
        this.success.set('Joc desat correctament.');
        this.saving.set(false);
        this.cerrarModal();
      },
      error: error => {
        this.formError.set(error?.error?.message ?? 'No s’ha pogut desar el joc.');
        this.saving.set(false);
      }
    });
  }

  submit(): void {
    this.guardarJuego();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  trackByJuegoId(_: number, juego: Juego): number {
    return juego.juegoId;
  }

  private updateResponsiveState(): void {
    const isMobile = window.innerWidth <= 820;
    this.isMobileFilters.set(isMobile);

    if (!isMobile) {
      this.showFilters.set(false);
    }
  }
}
