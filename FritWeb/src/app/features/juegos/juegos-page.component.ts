import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Juego, UsuarioOption } from './juegos.models';
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

  userName = computed(() => this.authService.currentUser?.nombre ?? 'Usuari');
  totalJuegos = computed(() => this.juegos().length);

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    numeroJugadoresMin: [1, [Validators.required, Validators.min(1)]],
    numeroJugadoresMax: [4, [Validators.required, Validators.min(1)]],
    propietarioId: [0, [Validators.required, Validators.min(1)]],
    propietarioSearch: [''],
    tipo: ['', [Validators.maxLength(200)]],
    bggId: [''],
    dificultadBgg: [''],
    pvp: [''],
    fechaAdquisicion: [''],
    juegoBaseId: [''],
    juegoBaseSearch: ['']
  }, { validators: minLessOrEqualMaxValidator() });

  ngOnInit(): void {
    this.precargarPropietarioActual();
    this.inicializarFiltroPropietarios();
    this.inicializarFiltroJuegosBase();
    this.cargarDatos();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen()) {
      this.cerrarModal();
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showPropietarioOptions.set(false);
    this.showJuegoBaseOptions.set(false);
  }

  abrirModal(): void {
    this.formError.set('');
    this.success.set('');
    this.showPropietarioOptions.set(false);
    this.showJuegoBaseOptions.set(false);
    this.modalOpen.set(true);
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

  private inicializarFiltroPropietarios(): void {
    this.form.controls.propietarioSearch.valueChanges.subscribe(value => {
      const term = value.trim().toLowerCase();
      const filtered = this.usuarios().filter(u => u.nombre.toLowerCase().includes(term));

      this.filteredUsuarios.set(filtered);
      this.showPropietarioOptions.set(true);

      const selected = this.usuarios().find(u => u.usuarioId === this.propietarioId.value);
      if (!selected || selected.nombre !== value) {
        this.form.patchValue({ propietarioId: 0 }, { emitEvent: false });
      }
    });
  }

  private inicializarFiltroJuegosBase(): void {
    this.form.controls.juegoBaseSearch.valueChanges.subscribe(value => {
      const term = value.trim().toLowerCase();
      this.filteredJuegosBase.set(this.obtenerJuegosBaseFiltrados(term));
      this.showJuegoBaseOptions.set(true);

      const selected = this.juegos().find(j => j.juegoId === this.parseJuegoBaseId(this.form.controls.juegoBaseId.value));
      if (!selected || selected.nombre !== value) {
        this.form.patchValue({ juegoBaseId: '' }, { emitEvent: false });
      }
    });
  }

  private obtenerJuegosBaseFiltrados(term: string): Juego[] {
    return this.juegos()
      .filter(j => j.nombre.toLowerCase().includes(term.toLowerCase()))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  seleccionarPropietario(usuario: UsuarioOption): void {
    this.form.patchValue(
      {
        propietarioId: usuario.usuarioId,
        propietarioSearch: usuario.nombre
      },
      { emitEvent: false }
    );

    this.filteredUsuarios.set(
      this.usuarios().filter(u => u.nombre.toLowerCase().includes(usuario.nombre.toLowerCase()))
    );
    this.showPropietarioOptions.set(false);
    this.propietarioId.markAsTouched();
    this.propietarioId.updateValueAndValidity();
  }

  seleccionarJuegoBase(juego: Juego): void {
    this.form.patchValue(
      {
        juegoBaseId: String(juego.juegoId),
        juegoBaseSearch: juego.nombre
      },
      { emitEvent: false }
    );

    this.filteredJuegosBase.set(
      this.obtenerJuegosBaseFiltrados(juego.nombre)
    );
    this.showJuegoBaseOptions.set(false);
  }

  limpiarJuegoBase(): void {
    this.form.patchValue(
      {
        juegoBaseId: '',
        juegoBaseSearch: ''
      },
      { emitEvent: false }
    );

    this.filteredJuegosBase.set(this.obtenerJuegosBaseFiltrados(''));
    this.showJuegoBaseOptions.set(false);
  }

  submit(): void {
    this.formError.set('');
    this.success.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Revisa els camps obligatoris del formulari.');
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);

    this.juegosService.create({
      juegoId: 0,
      nombre: value.nombre.trim(),
      numeroJugadoresMin: Number(value.numeroJugadoresMin),
      numeroJugadoresMax: Number(value.numeroJugadoresMax),
      propietarioId: Number(value.propietarioId),
      tipo: value.tipo.trim(),
      bggId: value.bggId === '' ? null : Number(value.bggId),
      dificultadBgg: value.dificultadBgg === '' ? null : Number(value.dificultadBgg),
      pvp: value.pvp === '' ? null : Number(value.pvp),
      fechaAdquisicion: value.fechaAdquisicion || null,
      juegoBaseId: value.juegoBaseId === '' ? null : Number(value.juegoBaseId)
    }).subscribe({
      next: juego => {
        this.juegos.update(current =>
          [...current, juego].sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
        this.filteredJuegosBase.set(this.obtenerJuegosBaseFiltrados(''));
        this.success.set('Joc desat correctament.');
        this.saving.set(false);
        this.resetFormAfterSave();
        this.cerrarModal();
      },
      error: err => {
        this.formError.set(err?.error?.message ?? 'No s\'ha pogut desar el joc.');
        this.saving.set(false);
      }
    });
  }

  private resetFormAfterSave(): void {
    const propietarioActual = this.usuarios().find(u => u.usuarioId === this.propietarioId.value);
    this.form.reset({
      nombre: '',
      numeroJugadoresMin: 1,
      numeroJugadoresMax: 4,
      propietarioId: propietarioActual?.usuarioId ?? 0,
      propietarioSearch: propietarioActual?.nombre ?? '',
      tipo: '',
      bggId: '',
      dificultadBgg: '',
      pvp: '',
      fechaAdquisicion: '',
      juegoBaseId: '',
      juegoBaseSearch: ''
    });

    this.filteredUsuarios.set(this.usuarios());
    this.filteredJuegosBase.set(this.obtenerJuegosBaseFiltrados(''));
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

  getNombrePropietario(propietarioId: number): string {
    return this.usuarios().find(u => u.usuarioId === propietarioId)?.nombre ?? `#${propietarioId}`;
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

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  get nombre() {
    return this.form.controls.nombre;
  }

  get propietarioId() {
    return this.form.controls.propietarioId;
  }
}