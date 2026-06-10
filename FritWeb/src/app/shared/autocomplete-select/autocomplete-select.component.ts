import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-autocomplete-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './autocomplete-select.component.html',
  styleUrl: './autocomplete-select.component.css'
})
export class AutocompleteSelectComponent<T> {
  @Input() items: T[] = [];
  @Input() searchText = '';
  @Input() placeholder = '';
  @Input() emptyText = 'No hi ha coincidencies.';
  @Input() selected = false;
  @Input() disabled = false;
  @Input() displayWith: (item: T) => string = item => String(item ?? '');
  @Input() secondaryWith: ((item: T) => string) | null = null;
  @Input() trackBy: (index: number, item: T) => unknown = index => index;

  @Output() searchTextChange = new EventEmitter<string>();
  @Output() focused = new EventEmitter<void>();
  @Output() selectedChange = new EventEmitter<T>();
  @Output() cleared = new EventEmitter<void>();

  open = false;

  @HostListener('document:click')
  close(): void {
    this.open = false;
  }

  onWrapperClick(event: Event): void {
    event.stopPropagation();
  }

  onInput(value: string): void {
    if (this.disabled) {
      return;
    }

    this.open = true;
    this.searchTextChange.emit(value);
  }

  onFocus(): void {
    if (this.disabled) {
      return;
    }

    this.open = true;
    this.focused.emit();
  }

  select(item: T): void {
    if (this.disabled) {
      return;
    }

    this.selectedChange.emit(item);
    this.open = false;
  }

  clear(event: Event): void {
    event.stopPropagation();
    this.cleared.emit();
    this.open = false;
  }

  onFocusOut(event: FocusEvent): void {
    const nextFocusedElement = event.relatedTarget as Node | null;
    const wrapper = event.currentTarget as HTMLElement | null;

    if (wrapper?.contains(nextFocusedElement)) {
      return;
    }

    this.open = false;
  }
}
