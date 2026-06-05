import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataStoreService } from '../../core/data/data-store.service';

export type MenuPage = 'rankings' | 'partidas' | 'juegos' | 'laLlista' | 'pendentCompra' | 'aQueJuguem' | 'usuario';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent {
  constructor(
    private dataStore: DataStoreService,
    private router: Router
  ) {}

  @Input({ required: true }) activePage!: MenuPage;
  @Input() primaryLabel = '';

  @Output() primaryAction = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  onPrimaryAction(): void {
    this.primaryAction.emit();
  }

  onLogout(): void {
    this.logout.emit();
  }

  refresh(): void {
    this.dataStore.clear();
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/login', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl(currentUrl);
    });
  }
}
