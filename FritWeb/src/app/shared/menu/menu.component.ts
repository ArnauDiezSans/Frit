import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

export type MenuPage = 'partidas' | 'juegos' | 'pendentCompra' | 'aQueJuguem' | 'usuario';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent {
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
}
