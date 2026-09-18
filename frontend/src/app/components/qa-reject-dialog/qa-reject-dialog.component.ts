import { Component, Inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface QaRejectDialogData {
  jiraKey: string;
  environmentName?: string;
}

@Component({
  selector: 'app-qa-reject-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule],
  templateUrl: './qa-reject-dialog.component.html',
  styleUrl: './qa-reject-dialog.component.scss',
})
export class QaRejectDialogComponent {
  reason = signal('');
  isValid = computed(() => this.reason().trim().length > 0);

  constructor(
    public dialogRef: MatDialogRef<QaRejectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QaRejectDialogData,
  ) {}

  onConfirm(): void {
    if (this.isValid()) this.dialogRef.close(this.reason().trim());
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
