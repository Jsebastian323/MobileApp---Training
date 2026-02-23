import { z } from 'zod';

// ============================================================
// Primitive schemas
// ============================================================

const RepRangeSchema = z.object({
  min: z.number().int().min(1),
  max: z.number().int().min(1),
}).refine((r) => r.max > r.min, {
  message: 'repRange.max must be greater than repRange.min',
});

const MuscleGroupSchema = z.enum([
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'abs',
]);

const ExperienceLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
const RecoveryToleranceSchema = z.enum(['low', 'moderate', 'high']);

// ============================================================
// ExerciseTemplate schema
// ============================================================

const ExerciseTemplateSchema = z.object({
  exerciseId: z.string().min(1),
  muscleGroup: MuscleGroupSchema,
  baseSets: z.number().int().min(1).max(10),
  repRange: RepRangeSchema,
  defaultRIR: z.number().int().min(0).max(5),
});

// ============================================================
// WorkoutTemplate schema
// ============================================================

const WorkoutTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dayIndex: z.union([
    z.literal(0), z.literal(1), z.literal(2), z.literal(3),
    z.literal(4), z.literal(5), z.literal(6),
  ]),
  exercises: z.array(ExerciseTemplateSchema).min(1),
});

// ============================================================
// SetLog schema
// ============================================================

const SetLogSchema = z.object({
  reps: z.number().int().min(1),
  load: z.number().min(0).optional(),
  rir: z.number().int().min(0).max(10).optional(),
});

// ============================================================
// ExerciseLog schema
// ============================================================

const ExerciseLogSchema = z.object({
  exerciseId: z.string().min(1),
  muscleGroup: MuscleGroupSchema,
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'sessionDate must be YYYY-MM-DD'),
  sets: z.array(SetLogSchema).min(1),
});

// ============================================================
// VolumeLandmarks schema
// ============================================================

const VolumeLandmarksSchema = z.object({
  MV:  z.number().int().min(0),
  MEV: z.number().int().min(0),
  MAV: z.number().int().min(0),
  MRV: z.number().int().min(1),
});

// ============================================================
// ClientProfile schema
// ============================================================

const ClientProfileSchema = z.object({
  experienceLevel: ExperienceLevelSchema,
  recoveryTolerance: RecoveryToleranceSchema,
  priorityMuscles: z.array(MuscleGroupSchema),
  daysPerWeek: z.union([
    z.literal(1), z.literal(2), z.literal(3),
    z.literal(4), z.literal(5), z.literal(6),
  ]),
});

// ============================================================
// ProgramGenerationRequest schema (the main entry point)
// ============================================================

export const ProgramGenerationRequestSchema = z.object({
  clientProfile: ClientProfileSchema,
  goal: z.literal('hypertrophy'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  availableEquipment: z.array(z.string()).optional(),
  templates: z.array(WorkoutTemplateSchema).min(1, 'At least one workout template is required'),
  recentLogs: z.array(ExerciseLogSchema).optional(),
  volumeLandmarks: z.record(MuscleGroupSchema, VolumeLandmarksSchema).optional(),
});

export type ProgramGenerationRequestInput = z.input<typeof ProgramGenerationRequestSchema>;
