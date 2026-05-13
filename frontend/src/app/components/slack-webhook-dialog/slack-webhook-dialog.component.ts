import { Component, Inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface SlackWebhookDialogData {
  teamDisplayName: string;
  currentUrl: string | null;
}

export interface SlackWebhookDialogResult {
  webhookUrl: string | null;
}

@Component({
  selector: 'app-slack-webhook-dialog',
  standalone: true,
  imports: [NgClass, FormsModule, MatDialogModule],
  templateUrl: './slack-webhook-dialog.component.html',
})
export class SlackWebhookDialogComponent {
  webhookUrl = signal(this.data.currentUrl ?? '');
  isValid = computed(() => {
    const url = this.webhookUrl().trim();
    return url === '' || url.startsWith('https://hooks.slack.com/');
  });

  constructor(
    public dialogRef: MatDialogRef<SlackWebhookDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SlackWebhookDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.isValid()) return;
    const url = this.webhookUrl().trim();
    this.dialogRef.close({ webhookUrl: url === '' ? null : url } satisfies SlackWebhookDialogResult);
  }

  onClear(): void {
    this.webhookUrl.set('');
  }
}
