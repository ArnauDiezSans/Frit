import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

function exactValueValidator(expected: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return control.value?.trim() === expected ? null : { exactValue: true };
  };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = false;
  error = '';
  success = '';

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    grupo: ['', [Validators.required, Validators.maxLength(200), exactValueValidator('Frit14')]],
    observaciones: ['', [Validators.maxLength(800)]],
    password: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(100)]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const value = this.form.getRawValue();

    this.authService.register({
      nombre: value.nombre,
      grupo: value.grupo || null,
      observaciones: value.observaciones || null,
      password: value.password
    }).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Usuario creado correctamente.';
        this.router.navigateByUrl('/login');
      },
      error: err => {
        this.loading = false;

        if (err.status === 409) {
          this.error = 'Ya existe un usuario con ese nombre.';
          return;
        }

        if (err.status === 400) {
          this.error = err.error?.message ?? 'Datos de registro no válidos.';
          return;
        }

        this.error = 'No se pudo crear el usuario.';
      }
    });
  }

  get nombre() { return this.form.controls.nombre; }
  get grupo() { return this.form.controls.grupo; }
  get observaciones() { return this.form.controls.observaciones; }
  get password() { return this.form.controls.password; }
}