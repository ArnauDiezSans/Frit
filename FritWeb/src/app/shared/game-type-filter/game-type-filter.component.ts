import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  GameTypeFilterKey,
  GameTypeFilterState,
  GameTypeFilterStates
} from './game-type-filter.models';

@Component({
  selector: 'app-game-type-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-type-filter.component.html'
})
export class GameTypeFilterComponent {
  @Input({ required: true }) states!: GameTypeFilterStates;
  @Output() statesChange = new EventEmitter<GameTypeFilterStates>();

  readonly options: Array<{ key: GameTypeFilterKey; label: string }> = [
    { key: 'noLlista', label: 'No llista' },
    { key: 'cooperative', label: 'Cooperatiu' },
    { key: 'teams', label: 'Equips' },
    { key: 'solo', label: 'En solitari' }
  ];

  toggle(key: GameTypeFilterKey): void {
    const current = this.states[key];
    const next: GameTypeFilterState = current === 'hidden'
      ? 'include'
      : current === 'include'
        ? 'only'
        : 'hidden';

    const updated = next === 'only'
      ? Object.fromEntries(this.options.map(option => [
          option.key,
          option.key === key ? 'only' : 'hidden'
        ])) as GameTypeFilterStates
      : { ...this.states, [key]: next };

    this.statesChange.emit(updated);
  }
}
