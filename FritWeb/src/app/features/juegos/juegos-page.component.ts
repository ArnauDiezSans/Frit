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

  userName = computed(() => this.authService.currentUser?.nombre ?? 'Usuario');
  totalJuegos = computed(() => this.juegos().length);

  form = this.fb.nonNullable.group(
    {
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
      juegoBaseId: ['']
    },
    {
      validators: minLessOrEqualMaxValidator()
    }
  );

  ngOnInit(): void {
    this.precargarPropietarioActual();
    this.inicializarFiltroPropietarios();
    this.cargarDatos();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen()) {
      this.cerrarModal();
    }
  }

  abrirModal(): void {
    this.formError.set('');
    this.success.set('');
    this.mostrarOpcionesPropietario();
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    if (this.saving()) {
      return;
    }

    this.modalOpen.set(false);
    this.showPropietarioOptions.set(false);
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
        this.error.set('No se pudieron cargar los juegos.');
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
        this.error.set('No se pudieron cargar los usuarios.');
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

      const selected = this.usuarios().find(u => u.nombre.toLowerCase() === term);
      this.form.patchValue({ propietarioId: selected?.usuarioId ?? 0 }, { emitEvent: false });
    });
  }

  private intentarFinalizarCarga(juegosCargados: boolean, usuariosCargados: boolean): void {
    if (juegosCargados && usuariosCargados) {
      this.loading.set(false);
    }
  }

  private precargarPropietarioActual(): void {
    const usuarioId = this.authService.currentUser?.usuarioId ?? 0;

    if (usuarioId > 0) {
      this.form.patchValue({ propietarioId: usuarioId }, { emitEvent: false });
    }
  }

  private seleccionarPropietarioPorDefecto(usuarios: UsuarioOption[]): void {
    const currentUserId = this.authService.currentUser?.usuarioId ?? 0;
    const existeUsuarioActual = usuarios.some(u => u.usuarioId === currentUserId);
    const propietarioActual = this.form.controls.propietarioId.value;

    if (propietarioActual > 0) {
      const actual = usuarios.find(u => u.usuarioId === propietarioActual);

      if (actual) {
        this.form.patchValue(
          {
            propietarioId: actual.usuarioId,
            propietarioSearch: actual.nombre
          },
          { emitEvent: false }
        );
        this.filteredUsuarios.set(usuarios);
        return;
      }
    }

    if (existeUsuarioActual) {
      const actual = usuarios.find(u => u.usuarioId === currentUserId)!;
      this.form.patchValue(
        {
          propietarioId: actual.usuarioId,
          propietarioSearch: actual.nombre
        },
        { emitEvent: false }
      );
      this.filteredUsuarios.set(usuarios);
      return;
    }

    if (usuarios.length > 0) {
      this.form.patchValue(
        {
          propietarioId: usuarios[0].usuarioId,
          propietarioSearch: usuarios[0].nombre
        },
        { emitEvent: false }
      );
      this.filteredUsuarios.set(usuarios);
    }
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
  }

  mostrarOpcionesPropietario(): void {
    const search = this.form.controls.propietarioSearch.value.trim().toLowerCase();
    this.filteredUsuarios.set(
      this.usuarios().filter(u => u.nombre.toLowerCase().includes(search))
    );
    this.showPropietarioOptions.set(true);
  }

  ocultarOpcionesPropietario(): void {
    setTimeout(() => this.showPropietarioOptions.set(false), 150);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set('');
    this.success.set('');

    const value = this.form.getRawValue();
    const propietarioValido = this.usuarios().some(
      u => u.usuarioId === Number(value.propietarioId)
    );

    if (!propietarioValido) {
      this.saving.set(false);
      this.formError.set('Debes seleccionar un propietario de la lista.');
      return;
    }

    this.juegosService
      .create({
        juegoId: 0,
        nombre: value.nombre.trim(),
        numeroJugadoresMin: Number(value.numeroJugadoresMin),
        numeroJugadoresMax: Number(value.numeroJugadoresMax),
        propietarioId: Number(value.propietarioId),
        tipo: value.tipo.trim(),
        bggId: this.toNullableNumber(value.bggId),
        dificultadBgg: this.toNullableNumber(value.dificultadBgg),
        pvp: this.toNullableNumber(value.pvp),
        fechaAdquisicion: value.fechaAdquisicion.trim() ? value.fechaAdquisicion : null,
        juegoBaseId: this.toNullableNumber(value.juegoBaseId)
      })
      .subscribe({
        next: juego => {
          this.juegos.set([...this.juegos(), juego].sort((a, b) => a.nombre.localeCompare(b.nombre)));
          this.saving.set(false);
          this.success.set('Juego creado correctamente.');
          this.resetFormManteniendoPropietario();
          this.modalOpen.set(false);
          this.showPropietarioOptions.set(false);
        },
        error: err => {
          this.saving.set(false);
          this.formError.set(err.error?.message ?? 'No se pudo crear el juego.');
        }
      });
  }

  private resetFormManteniendoPropietario(): void {
    const propietarioId = this.form.controls.propietarioId.value || this.authService.currentUser?.usuarioId || 0;
    const propietario = this.usuarios().find(u => u.usuarioId === propietarioId);

    this.form.reset({
      nombre: '',
      numeroJugadoresMin: 1,
      numeroJugadoresMax: 4,
      propietarioId,
      propietarioSearch: propietario?.nombre ?? '',
      tipo: '',
      bggId: '',
      dificultadBgg: '',
      pvp: '',
      fechaAdquisicion: '',
      juegoBaseId: ''
    });

    this.filteredUsuarios.set(this.usuarios());
  }

  private toNullableNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
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

  trackByJuegoId(_: number, juego: Juego): number {
    return juego.juegoId;
  }

  getNombrePropietario(propietarioId: number): string {
    return this.usuarios().find(u => u.usuarioId === propietarioId)?.nombre ?? String(propietarioId);
  }
}