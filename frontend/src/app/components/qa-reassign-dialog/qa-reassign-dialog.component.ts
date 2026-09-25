import { Component, Inject, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { QaMember } from '../../models/qa.model';
import { QaService } from '../../services/qa.service';

export interface QaReassignDialogData {
  jiraKey: string;
  team: string;
  currentReviewerId: string | null;
  requesterId: string | null;
}

@Component({
  selector: 'app-qa-reassign-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule],
  templateUrl: './qa-reassign-dialog.component.html',
})
export class QaReassignDialogComponent implements OnInit {
  private qaService = inject(QaService);

  selectedReviewerId = signal('');

  members = signal<QaMember[]>([]);
  loadingMembers = signal(true);

  isValid = computed(() => this.selectedReviewerId().length > 0);

  constructor(
    public dialogRef: MatDialogRef<QaReassignDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QaReassignDialogData,
  ) {}

  ngOnInit(): void {
    this.qaService.getMembers(this.data.team, true).subscribe({
      next: (members) => {
        // The requester can never be picked as their own reviewer — the
        // backend enforces this too, but excluding it here avoids offering
        // a choice that can only fail.
        this.members.set(members.filter((m) => m._id !== this.data.requesterId));
        this.loadingMembers.set(false);
      },
      error: () => this.loadingMembers.set(false),
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (!this.isValid()) return;
    this.dialogRef.close(this.selectedReviewerId());
  }
}
