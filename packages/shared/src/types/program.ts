import type { MuscleGroup, VolumeLandmarks } from './index';
import type { ExperienceLevel, RecoveryTolerance, RepRange, RepZone, WorkoutTemplate } from './training';
import type { ExerciseLog } from './logs';

// ============================================================
// Client profile
// ============================================================

export interface ClientProfile {
  experienceLevel: ExperienceLevel;
  recoveryTolerance: RecoveryTolerance;
  /** Muscle groups the client wants to prioritize (+volume bonus). */
  priorityMuscles: MuscleGroup[];
  /** Number of training days per week (1–6). */
  daysPerWeek: 1 | 2 | 3 | 4 | 5 | 6;
}

// ============================================================
// Program generation request (engine input)
// ============================================================

export interface ProgramGenerationRequest {
  clientProfile: ClientProfile;
  goal: 'hypertrophy';
  /** ISO 8601 date — the Monday of week 1. */
  startDate: string;
  /** Optional equipment list. Engine ignores exercises if not available. */
  availableEquipment?: string[];
  /**
   * Base workout templates defined by the trainer.
   * The engine converts these into dated workout instances.
   */
  templates: WorkoutTemplate[];
  /**
   * Recent performance logs. When present, drives autoregulation.
   * Engine accepts logs from the last 2–4 weeks.
   */
  recentLogs?: ExerciseLog[];
  /**
   * Per-muscle VolumeLandmarks overrides.
   * Falls back to defaults for any muscle not specified.
   */
  volumeLandmarks?: Partial<Record<MuscleGroup, VolumeLandmarks>>;
}

// ============================================================
// Program generation output
// ============================================================

export interface ExercisePrescription {
  exerciseId: string;
  muscleGroup: MuscleGroup;
  /** Total sets to perform in this session. */
  setsTarget: number;
  /** Rep range for this session (derived from rep zone + autoregulation). */
  repRangeTarget: RepRange;
  /** Reps in reserve to aim for. */
  targetRIR: number;
  /** The rep zone this session falls into. */
  repZone: RepZone;
  /** True when this prescription is part of the deload week. */
  deloadFlag: boolean;
  /**
   * Optional hint for the trainer/client based on double-progression logic.
   * Only present when recentLogs supplied evidence.
   */
  progressionHint?: string;
}

export interface WorkoutInstance {
  /** ISO 8601 date of the scheduled session. */
  date: string;
  templateId: string;
  templateName: string;
  exercises: ExercisePrescription[];
}

export interface WorkoutWeek {
  weekNumber: 1 | 2 | 3 | 4;
  isDeload: boolean;
  workouts: WorkoutInstance[];
  /**
   * Total sets per muscle group for this week.
   * Only includes muscles that appear in at least one workout.
   */
  volumeSummary: Partial<Record<MuscleGroup, number>>;
}

export interface ProgramBlock {
  /** UUIDv4 generated at creation time. */
  id: string;
  /** ISO 8601 date (start of week 1). */
  startDate: string;
  /** ISO 8601 date (end of week 4). */
  endDate: string;
  clientProfile: ClientProfile;
  /** Exactly 4 weeks: [acc1, acc2, acc3, deload]. */
  weeks: [WorkoutWeek, WorkoutWeek, WorkoutWeek, WorkoutWeek];
  /** ISO 8601 timestamp of when the program was generated. */
  generatedAt: string;
}
