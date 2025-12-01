export interface AppointmentPreset {
  id: string;
  displayName: string;
  itemCode: string;
  notes: string;
  taskMessage?: string; // NEW: Task message body for "Post Appointment Tasks"
}

// Matrix configuration for building custom appointments
export type AppointmentComplexity = 'simple' | 'complex';
export type AppointmentModality = 'f2f' | 'telehealth' | 'phone';
export type AppointmentType = 'new' | 'review';
export type FollowUpPeriod = '1wk' | '6wk' | '3mth' | '6mth' | '12mth' | 'none';

// NEW: Follow-up task structure
export interface FollowUpTask {
  name: string; // e.g., "TTE", "CTCA"
  location?: string; // e.g., "The Alfred", "Capital Radiology Carlton"
  timeframe?: string; // e.g., "2 weeks", "4 weeks", "6-8 weeks", "next available"
  notes?: string; // e.g., "chest discomfort", "worsening dyspnoea"
}

export interface AppointmentMatrix {
  complexity: AppointmentComplexity;
  modality: AppointmentModality;
  type: AppointmentType;
  followUp: FollowUpPeriod;
  followUpMethod: AppointmentModality; // NEW: How the follow-up will be conducted
  followUpTasks: FollowUpTask[]; // NEW: List of tasks to complete
}

// Item code mapping based on appointment characteristics
export const getItemCodeFromMatrix = (matrix: AppointmentMatrix): string => {
  const { complexity, modality, type } = matrix;

  // Face to face appointments
  if (modality === 'f2f') {
    if (complexity === 'simple') {
      return type === 'new' ? '110' : '116'; // Simple F2F: New=110, Review=116
    } else {
      return type === 'new' ? '132' : '133'; // Complex F2F: New=132, Review=133
    }
  }

  // Telehealth appointments
  if (modality === 'telehealth') {
    if (complexity === 'simple') {
      return type === 'new' ? '91824' : '91825'; // Simple TH: New=91824, Review=91825
    } else {
      return type === 'new' ? '92422' : '92423'; // Complex TH: New=92422, Review=92423
    }
  }

  // Phone call appointments
  if (modality === 'phone') {
    if (complexity === 'simple') {
      return '92440'; // Simple Phone (both new and review)
    } else {
      return '92443'; // Complex Phone (both new and review)
    }
  }

  return '116'; // Default fallback
};

export const getNotesFromMatrix = (matrix: AppointmentMatrix): string => {
  const { followUpMethod, followUp } = matrix;

  if (followUp === 'none') {
    return 'no follow up required';
  }

  const modalityText = followUpMethod === 'f2f' ? 'F2F' : followUpMethod === 'telehealth' ? 'TH' : 'Phone';
  const periodMap: Record<FollowUpPeriod, string> = {
    '1wk': '1 week',
    '6wk': '6 weeks',
    '3mth': '3 months',
    '6mth': '6 months',
    '12mth': '12 months',
    'none': ''
  };
  const periodText = periodMap[followUp] || '3 months';

  return `${modalityText} follow up in ${periodText} please`;
};

// NEW: Generate task message body combining follow-up notes + task list
export const getTaskMessageFromMatrix = (matrix: AppointmentMatrix): string => {
  const followUpText = getNotesFromMatrix(matrix); // e.g., "F2F follow up in 3 months please"

  if (matrix.followUpTasks.length === 0) {
    return followUpText; // Just the follow-up note if no tasks
  }

  const taskLines = matrix.followUpTasks.map(task => {
    let taskLine = `- ${task.name}`;

    // Add location if provided
    if (task.location) {
      taskLine += ` @ ${task.location}`;
    }

    // Add timeframe if provided
    if (task.timeframe) {
      taskLine += ` (${task.timeframe})`;
    }

    // Add notes/indication if provided
    if (task.notes) {
      taskLine += `, notes: ${task.notes}`;
    }

    return taskLine;
  });

  return `${followUpText}\n\nTasks to complete:\n${taskLines.join('\n')}`;
};

export const generatePresetFromMatrix = (matrix: AppointmentMatrix): AppointmentPreset => {
  const itemCode = getItemCodeFromMatrix(matrix);
  const notes = ''; // Always blank now - notes go into task instead
  const taskMessage = getTaskMessageFromMatrix(matrix); // NEW: Generate task message

  // Generate display name
  const complexityText = matrix.complexity === 'complex' ? 'complex ' : '';
  const typeText = matrix.type;
  const modalityText = matrix.modality === 'f2f' ? 'F2F' : matrix.modality === 'telehealth' ? 'TH' : 'Phone';
  const followUpTextMap: Record<FollowUpPeriod, string> = {
    'none': 'no FUP',
    '1wk': 'FUP 1wk',
    '6wk': 'FUP 6wk',
    '3mth': 'FUP 3mth',
    '6mth': 'FUP 6mth',
    '12mth': 'FUP 12mth'
  };
  const followUpText = followUpTextMap[matrix.followUp];

  const displayName = `${complexityText}${typeText} ${modalityText} + ${followUpText}`;

  return {
    id: `matrix-${itemCode}-${followUpText.replace(/\s+/g, '-')}`,
    displayName,
    itemCode,
    notes,
    taskMessage // NEW: Include task message in preset
  };
};

