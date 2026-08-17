import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { UsuarioOption } from '../juegos/juegos.models';
import { UsuariosService } from '../juegos/usuarios.service';

type DrawMode = 0 | 2 | 3 | 4;

@Component({
  selector: 'app-aleatoritzador-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuComponent],
  templateUrl: './aleatoritzador-page.component.html',
  styleUrl: './aleatoritzador-page.component.css'
})
export class AleatoritzadorPageComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private usuariosService = inject(UsuariosService);

  @ViewChild('ring') ring?: ElementRef<HTMLElement>;

  readonly palette = ['#0F766E', '#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#CA8A04', '#16A34A'];
  readonly teamColors = ['#0F766E', '#2563EB', '#DB2777', '#EA580C'];
  loading = signal(true);
  error = signal('');
  users = signal<UsuarioOption[]>([]);
  selected = signal<UsuarioOption[]>([]);
  groups = signal<UsuarioOption[][]>([]);
  mode: DrawMode = 0;
  dragging = signal<UsuarioOption | null>(null);
  dragPosition = signal({ x: 0, y: 0 });
  availableUsers = computed(() => {
    const selectedIds = new Set(this.selected().map(user => user.usuarioId));
    return this.users().filter(user => !selectedIds.has(user.usuarioId));
  });
  private moved = false;
  private lastTouchAt = 0;

  constructor() {
    this.usuariosService.getJugadores().subscribe({
      next: users => { this.users.set(users); this.loading.set(false); },
      error: () => { this.error.set("No s'han pogut carregar els jugadors."); this.loading.set(false); }
    });
  }

  userColor(user: UsuarioOption): string {
    return user.color || this.palette[Math.abs(user.usuarioId) % this.palette.length];
  }

  changeMode(value: string): void {
    this.mode = Number(value) as DrawMode;
    this.groups.set([]);
  }

  startDrag(event: PointerEvent, user: UsuarioOption): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragging.set(user);
    this.dragPosition.set({ x: event.clientX, y: event.clientY });
    this.moved = false;
  }

  moveDrag(event: PointerEvent): void {
    if (!this.dragging()) return;
    event.preventDefault();
    this.moved = true;
    this.dragPosition.set({ x: event.clientX, y: event.clientY });
  }

  endDrag(event: PointerEvent): void {
    const user = this.dragging();
    if (!user) return;
    event.stopPropagation();
    const bounds = this.ring?.nativeElement.getBoundingClientRect();
    const inside = !!bounds && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    const currentlySelected = this.selected().some(item => item.usuarioId === user.usuarioId);
    if (inside && !currentlySelected) this.selected.update(items => [...items, user]);
    if (!inside && currentlySelected) this.selected.update(items => items.filter(item => item.usuarioId !== user.usuarioId));
    this.groups.set([]);
    this.dragging.set(null);
  }

  playerPosition(index: number, total: number): { left: string; top: string } {
    const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
    return {
      left: `${50 + Math.cos(angle) * 45}%`,
      top: `${50 + Math.sin(angle) * 43}%`
    };
  }

  draw(): void {
    if (this.selected().length < 2 || this.dragging()) return;
    const shuffled = [...this.selected()];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    if (this.mode === 0) {
      this.groups.set([shuffled]);
      return;
    }
    const teams = Array.from({ length: this.mode }, () => [] as UsuarioOption[]);
    shuffled.forEach((user, index) => teams[index % this.mode].push(user));
    this.groups.set(teams);
  }

  onRingPointerUp(event: PointerEvent): void {
    if (event.pointerType !== 'touch' || this.moved || this.dragging()) return;
    const now = Date.now();
    if (now - this.lastTouchAt < 350) {
      event.preventDefault();
      this.draw();
      this.lastTouchAt = 0;
    } else {
      this.lastTouchAt = now;
    }
  }

  onRingPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'touch' && !this.dragging()) this.moved = false;
  }

  onRingPointerMove(event: PointerEvent): void {
    if (event.pointerType === 'touch' && !this.dragging()) this.moved = true;
  }

  trackUser(_: number, user: UsuarioOption): number { return user.usuarioId; }
  logout(): void { this.auth.logout().subscribe({ complete: () => this.router.navigateByUrl('/login'), error: () => this.router.navigateByUrl('/login') }); }

  @HostListener('window:blur') cancelDrag(): void { this.dragging.set(null); }
}
