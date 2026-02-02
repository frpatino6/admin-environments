import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-deploy-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './deploy-dialog.component.html',
  styleUrl: './deploy-dialog.component.scss'
})
export class DeployDialogComponent {
  branch = '';
  deployedBy = '';

  constructor(
    public dialogRef: MatDialogRef<DeployDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { environmentName: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onDeploy(): void {
    if (this.branch.trim() && this.deployedBy.trim()) {
      this.dialogRef.close({
        branch: this.branch.trim(),
        deployedBy: this.deployedBy.trim()
      });
    }
  }

  isValid(): boolean {
    return this.branch.trim().length > 0 && this.deployedBy.trim().length > 0;
  }
}
