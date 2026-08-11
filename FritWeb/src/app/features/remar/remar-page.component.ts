import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { AQueJuguemPageComponent } from '../a-que-juguem/a-que-juguem-page.component';
import { LaLlistaPageComponent } from '../la-llista/la-llista-page.component';

type RemarView = 'a-que-juguem' | 'la-llista';

@Component({
  selector: 'app-remar-page',
  standalone: true,
  imports: [CommonModule, MenuComponent, AQueJuguemPageComponent, LaLlistaPageComponent],
  templateUrl: './remar-page.component.html',
  styleUrl: './remar-page.component.css'
})
export class RemarPageComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  activeView = signal<RemarView>('a-que-juguem');

  canUseLaLlista(): boolean {
    return this.authService.canUseFeature('laLlista');
  }

  selectView(view: RemarView): void {
    if (view === 'la-llista' && !this.canUseLaLlista()) return;
    this.activeView.set(view);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }
}
