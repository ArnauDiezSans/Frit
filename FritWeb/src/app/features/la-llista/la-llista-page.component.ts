import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { LaLlistaItem, LaLlistaService } from './la-llista.service';

@Component({
  selector: 'app-la-llista-page',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './la-llista-page.component.html',
  styleUrl: './la-llista-page.component.css'
})
export class LaLlistaPageComponent {
  private authService = inject(AuthService);
  private laLlistaService = inject(LaLlistaService);
  private router = inject(Router);

  loading = signal(true);
  error = signal('');
  items = signal<LaLlistaItem[]>([]);

  ngOnInit(): void {
    this.cargarItems();
  }

  cargarItems(): void {
    this.loading.set(true);
    this.error.set('');

    this.laLlistaService.getAll().subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'ha pogut carregar la llista.");
        this.loading.set(false);
      }
    });
  }

  getRowClass(item: LaLlistaItem): string {
    if (item.estadoCaducidad === 'red' || item.estadoCaducidad === 'expired') {
      return 'row-red';
    }

    if (item.estadoCaducidad === 'yellow') {
      return 'row-yellow';
    }

    return '';
  }

  formatFecha(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleDateString('ca-ES') : 'Mai';
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  trackByJuegoId(_: number, item: LaLlistaItem): number {
    return item.juegoId;
  }
}
