import { Component, Inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-deploy-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule],
  templateUrl: './deploy-dialog.component.html',
  styleUrl: './deploy-dialog.component.scss',
})
export class DeployDialogComponent {
  branch = signal('');
  deployedBy = signal('');
  isValid = computed(
    () => this.branch().trim().length > 0 && this.deployedBy().trim().length > 0,
  );

  constructor(
    public dialogRef: MatDialogRef<DeployDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { environmentName: string },
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onDeploy(): void {
    if (this.isValid()) {
      this.dialogRef.close({
        branch: this.branch().trim(),
        deployedBy: this.deployedBy().trim(),
      });
    }
  }
}
