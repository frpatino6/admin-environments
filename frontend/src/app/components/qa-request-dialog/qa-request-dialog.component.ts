import { Component, Inject, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { QaMember } from '../../models/qa.model';
import { QaService } from '../../services/qa.service';

export interface QaRequestDialogData {
  environmentName: string;
  team: string;
  branch?: string | null;
  deployedBy?: string | null;
}

export interface QaRequestDialogResult {
  jiraKey: string;
  jiraSummary: string;
  requesterId: string;
}

// Branches in this app commonly embed a Jira-style key (e.g.
// "feature/XQA-857", "XQO-1016-XQO-1017", "perf/fix/XQO-1025"), but not
// always (e.g. "poc/no-cretendials-webconfig"). Returns the first match,
// uppercased to match this app's existing jiraKey convention, or null.
export const extractJiraKey = (branch: string | null | undefined): string | null => {
  if (!branch) return null;
  const match = branch.match(/[A-Z][A-Z0-9]{1,9}-\d+/i);
  return match ? match[0].toUpperCase() : null;
};

@Component({
  selector: 'app-qa-request-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule],
  templateUrl: './qa-request-dialog.component.html',
  styleUrl: './qa-request-dialog.component.scss',
})
export class QaRequestDialogComponent implements OnInit {
  private qaService = inject(QaService);

  jiraKey = signal('');
  jiraSummary = signal('');
  requesterId = signal('');

  members = signal<QaMember[]>([]);
  loadingMembers = signal(true);

  isValid = computed(
    () =>
      this.jiraKey().trim().length > 0 &&
      this.jiraSummary().trim().length > 0 &&
      this.requesterId().length > 0,
  );

  constructor(
    public dialogRef: MatDialogRef<QaRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QaRequestDialogData,
  ) {
    if (data.branch) {
      this.jiraSummary.set(data.branch);
      const key = extractJiraKey(data.branch);
      if (key) this.jiraKey.set(key);
    }
  }

  ngOnInit(): void {
    this.qaService.getMembers(this.data.team, true).subscribe({
      next: (members) => {
        this.members.set(members);
        this.loadingMembers.set(false);
        this.preselectRequester(members);
      },
      error: () => this.loadingMembers.set(false),
    });
  }

  private preselectRequester(members: QaMember[]): void {
    const deployedBy = this.data.deployedBy?.trim().toLowerCase();
    if (!deployedBy) return;
    const match = members.find((m) => m.name.trim().toLowerCase() === deployedBy);
    if (match) this.requesterId.set(match._id);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (!this.isValid()) return;
    this.dialogRef.close({
      jiraKey: this.jiraKey().trim(),
      jiraSummary: this.jiraSummary().trim(),
      requesterId: this.requesterId(),
    } as QaRequestDialogResult);
  }
}
