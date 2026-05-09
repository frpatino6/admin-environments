import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './action-button.component.html',
})
export class ActionButtonComponent {
  @Input() label = 'Liberar Ambiente';
  @Input() disabled = false;
  @Output() onClick = new EventEmitter<void>();

  handleClick(): void {
    if (!this.disabled) {
      this.onClick.emit();
    }
  }
}
