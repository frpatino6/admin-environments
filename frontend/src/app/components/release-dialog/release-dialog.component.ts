import { Component, Inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-release-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule],
  templateUrl: './release-dialog.component.html',
  styleUrl: './release-dialog.component.scss',
})
export class ReleaseDialogComponent {
  releasedBy = signal('');
  isValid = computed(() => this.releasedBy().trim().length > 0);

  constructor(
    public dialogRef: MatDialogRef<ReleaseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { environmentName: string },
  ) {}

  onConfirm(): void {
    if (this.isValid()) this.dialogRef.close(this.releasedBy().trim());
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
