import { Grievance, Status } from '../types';

export const STAFF_REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;
export const ADMIN_ESCALATION_DELAY_MS = 48 * 60 * 60 * 1000;

export type EscalationStage = 'normal' | 'reminder-due' | 'escalation-due';

export const getEscalationState = (grievance: Grievance, now = Date.now()) => {
  const isActionable = grievance.status === Status.PENDING || grievance.status === Status.IN_PROGRESS;
  const lastActionAt = grievance.lastStatusChange || grievance.timestamp;
  const inactiveMs = Math.max(0, now - lastActionAt);

  let stage: EscalationStage = 'normal';
  if (isActionable && inactiveMs >= ADMIN_ESCALATION_DELAY_MS) {
    stage = 'escalation-due';
  } else if (isActionable && inactiveMs >= STAFF_REMINDER_DELAY_MS) {
    stage = 'reminder-due';
  }

  return {
    stage,
    inactiveMs,
    inactiveHours: Math.floor(inactiveMs / (60 * 60 * 1000)),
    isOverdue: stage !== 'normal',
    label: stage === 'escalation-due' ? 'Escalated' : stage === 'reminder-due' ? 'Reminder Due' : 'On Track',
  };
};
