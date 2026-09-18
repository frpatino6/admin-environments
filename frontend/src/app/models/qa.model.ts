export interface QaMember {
  _id: string;
  name: string;
  slackUserId: string;
  team: string;
  active: boolean;
  lastAssignedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  // Current count of pending/in_progress QaRequests assigned to this member.
  // Only meaningful (non-null) for active members — GET /qa/members returns
  // active members first in the same order pickReviewer would assign them
  // (lowest activeLoad, ties by oldest lastAssignedAt), then inactive
  // members after. null for inactive members, who have no queue position.
  activeLoad?: number | null;
}

export type QaRequestStatus =
  | 'pending'
  | 'in_progress'
  | 'approved'
  | 'changes_requested'
  | 'unassignable';

export interface QaRejection {
  reviewerId: QaMember | string;
  reason: string;
  rejectedAt: Date;
}

export interface QaRequest {
  _id: string;
  jiraKey: string;
  jiraSummary: string;
  jiraUrl: string | null;
  requesterId: QaMember | string;
  reviewerId: QaMember | string | null;
  status: QaRequestStatus;
  environmentName: string;
  team: string;
  rejections: QaRejection[];
  assignedAt: Date;
  lastReminderAt: Date | null;
  acceptedAt: Date | null;
  completedAt: Date | null;
  escalatedCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateQaRequestPayload {
  jiraKey: string;
  jiraSummary: string;
  jiraUrl?: string | null;
  requesterId: string;
  environmentName: string;
  team: string;
}
