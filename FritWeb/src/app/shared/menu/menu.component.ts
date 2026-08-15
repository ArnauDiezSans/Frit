import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DataStoreService } from '../../core/data/data-store.service';
import { EncuestaEstado, EnquestesService } from '../../features/enquestes/enquestes.service';

export type MenuPage = 'rankings' | 'hallOfFame' | 'partidas' | 'juegos' | 'laLlista' | 'pendentCompra' | 'aQueJuguem' | 'remar' | 'assistencia' | 'enquestes' | 'usuario' | 'auditoria';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent {
  constructor(
    private authService: AuthService,
    private dataStore: DataStoreService,
    private router: Router,
    private enquestesService: EnquestesService
  ) {}

  @Input({ required: true }) activePage!: MenuPage;
  @Input() primaryLabel = '';

  @Output() primaryAction = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  menuOpen = false;
  pendingSurveys = 0;

  ngOnInit(): void {
    this.enquestesService.list().subscribe({
      next: surveys => this.pendingSurveys = surveys.filter(survey => survey.estado === EncuestaEstado.Publicada && survey.esDestinatario && !survey.haRespondido).length,
      error: () => this.pendingSurveys = 0
    });
  }

  @HostListener('window:click')
  onWindowClick(): void {
    this.menuOpen = false;
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  canViewHallOfFame(): boolean {
    return this.authService.canViewHallOfFame();
  }

  canUseLaLlista(): boolean {
    return this.authService.canUseFeature('laLlista');
  }

  canUseAssistencia(): boolean {
    return this.authService.canUseFeature('assistencia');
  }

  onPrimaryAction(): void {
    this.closeMenu();
    this.primaryAction.emit();
  }

  onLogout(): void {
    this.closeMenu();
    this.logout.emit();
  }

  refresh(): void {
    this.closeMenu();
    this.dataStore.clear();
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/login', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl(currentUrl);
    });
  }
}
