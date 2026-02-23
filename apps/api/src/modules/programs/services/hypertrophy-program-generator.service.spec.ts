import { Test, TestingModule } from '@nestjs/testing';
import type {
  ClientProfile,
  ExerciseLog,
  ProgramGenerationRequest,
  WorkoutTemplate,
} from '@training/shared';
import { HypertrophyProgramGeneratorService } from './hypertrophy-program-generator.service';

// ============================================================
// Fixtures
// ============================================================

const makeTemplate = (
  id: string,
  dayIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  exercises: WorkoutTemplate['exercises'],
): WorkoutTemplate => ({
  id,
  name: `Session ${id}`,
  dayIndex,
  exercises,
});

const CHEST_EXERCISE = {
  exerciseId: 'ex-bench-press',
  muscleGroup: 'chest' as const,
  baseSets: 3,
  repRange: { min: 8, max: 12 },
  defaultRIR: 2,
};

const BACK_EXERCISE = {
  exerciseId: 'ex-row',
  muscleGroup: 'back' as const,
  baseSets: 3,
  repRange: { min: 8, max: 12 },
  defaultRIR: 2,
};

const BASE_CLIENT_PROFILE: ClientProfile = {
  experienceLevel: 'intermediate',
  recoveryTolerance: 'moderate',
  priorityMuscles: [],
  daysPerWeek: 3,
};

const BASE_TEMPLATES: WorkoutTemplate[] = [
  makeTemplate('A', 0, [CHEST_EXERCISE]),           // Monday
  makeTemplate('B', 2, [BACK_EXERCISE]),             // Wednesday
  makeTemplate('C', 4, [CHEST_EXERCISE, BACK_EXERCISE]), // Friday
];

const BASE_REQUEST: ProgramGenerationRequest = {
  clientProfile: BASE_CLIENT_PROFILE,
  goal: 'hypertrophy',
  startDate: '2026-01-05', // Monday
  templates: BASE_TEMPLATES,
};

// ============================================================
// Test suite
// ============================================================

describe('HypertrophyProgramGeneratorService', () => {
  let service: HypertrophyProgramGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HypertrophyProgramGeneratorService],
    }).compile();

    service = module.get<HypertrophyProgramGeneratorService>(
      HypertrophyProgramGeneratorService,
    );
  });

  // ============================================================
  // Test 1: 4-week block structure
  // ============================================================

  describe('generateProgram — basic structure', () => {
    it('returns a ProgramBlock with exactly 4 weeks', () => {
      const block = service.generateProgram(BASE_REQUEST);

      expect(block.id).toBeDefined();
      expect(block.startDate).toBe('2026-01-05');
      expect(block.weeks).toHaveLength(4);
    });

    it('assigns correct week numbers 1-4', () => {
      const block = service.generateProgram(BASE_REQUEST);

      expect(block.weeks[0]?.weekNumber).toBe(1);
      expect(block.weeks[1]?.weekNumber).toBe(2);
      expect(block.weeks[2]?.weekNumber).toBe(3);
      expect(block.weeks[3]?.weekNumber).toBe(4);
    });

    it('each week has the same number of workouts as templates', () => {
      const block = service.generateProgram(BASE_REQUEST);
      const templateCount = BASE_TEMPLATES.length;

      for (const week of block.weeks) {
        expect(week.workouts).toHaveLength(templateCount);
      }
    });

    it('workout dates are correctly offset from startDate', () => {
      const block = service.generateProgram(BASE_REQUEST);

      // Week 1: Mon=Jan 5, Wed=Jan 7, Fri=Jan 9
      const week1 = block.weeks[0];
      expect(week1?.workouts[0]?.date).toBe('2026-01-05'); // dayIndex 0 = Mon
      expect(week1?.workouts[1]?.date).toBe('2026-01-07'); // dayIndex 2 = Wed
      expect(week1?.workouts[2]?.date).toBe('2026-01-09'); // dayIndex 4 = Fri

      // Week 2 starts 7 days later
      const week2 = block.weeks[1];
      expect(week2?.workouts[0]?.date).toBe('2026-01-12');
    });

    it('volumeSummary tracks total sets per muscle per week', () => {
      const block = service.generateProgram(BASE_REQUEST);
      const week1 = block.weeks[0];

      // Chest appears in template A (3 sets) and template C (3 sets) = 6 sets minimum
      expect(week1?.volumeSummary['chest']).toBeGreaterThanOrEqual(6);
      expect(week1?.volumeSummary['back']).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================================
  // Test 2: Week 4 is deload
  // ============================================================

  describe('week 4 — deload', () => {
    it('week 4 has isDeload === true, others are false', () => {
      const block = service.generateProgram(BASE_REQUEST);

      expect(block.weeks[0]?.isDeload).toBe(false);
      expect(block.weeks[1]?.isDeload).toBe(false);
      expect(block.weeks[2]?.isDeload).toBe(false);
      expect(block.weeks[3]?.isDeload).toBe(true);
    });

    it('deload week volume is ~60% of peak (week 3)', () => {
      const block = service.generateProgram(BASE_REQUEST);

      const week3Volume = block.weeks[2]?.volumeSummary['chest'] ?? 0;
      const week4Volume = block.weeks[3]?.volumeSummary['chest'] ?? 0;

      // Deload should be between 50% and 75% of peak
      expect(week4Volume).toBeLessThan(week3Volume);
      expect(week4Volume).toBeGreaterThanOrEqual(Math.round(week3Volume * 0.5));
      expect(week4Volume).toBeLessThanOrEqual(Math.round(week3Volume * 0.75));
    });

    it('deload week all exercises have deloadFlag === true', () => {
      const block = service.generateProgram(BASE_REQUEST);

      const week4 = block.weeks[3];
      for (const workout of week4?.workouts ?? []) {
        for (const ex of workout.exercises) {
          expect(ex.deloadFlag).toBe(true);
        }
      }
    });

    it('deload week all exercises use standard rep zone', () => {
      const block = service.generateProgram(BASE_REQUEST);

      const week4 = block.weeks[3];
      for (const workout of week4?.workouts ?? []) {
        for (const ex of workout.exercises) {
          expect(ex.repZone).toBe('standard');
        }
      }
    });

    it('deload week targetRIR is higher than accumulation weeks', () => {
      const block = service.generateProgram(BASE_REQUEST);

      const week1RIR = block.weeks[0]?.workouts[0]?.exercises[0]?.targetRIR ?? 0;
      const week4RIR = block.weeks[3]?.workouts[0]?.exercises[0]?.targetRIR ?? 0;

      expect(week4RIR).toBeGreaterThan(week1RIR);
    });
  });

  // ============================================================
  // Test 3: Volume ramp weeks 1-3 without exceeding MRV
  // ============================================================

  describe('volume ramp — accumulation weeks 1-3', () => {
    it('weekly volume increases from week 1 to week 3', () => {
      const block = service.generateProgram(BASE_REQUEST);

      const w1 = block.weeks[0]?.volumeSummary['chest'] ?? 0;
      const w2 = block.weeks[1]?.volumeSummary['chest'] ?? 0;
      const w3 = block.weeks[2]?.volumeSummary['chest'] ?? 0;

      expect(w2).toBeGreaterThanOrEqual(w1);
      expect(w3).toBeGreaterThanOrEqual(w2);
    });

    it('week 3 volume does not exceed MRV for intermediate chest (22 sets)', () => {
      const block = service.generateProgram(BASE_REQUEST);

      const w3Chest = block.weeks[2]?.volumeSummary['chest'] ?? 0;
      const MRV_INTERMEDIATE_CHEST = 22;

      expect(w3Chest).toBeLessThanOrEqual(MRV_INTERMEDIATE_CHEST);
    });

    it('priority muscles start with higher volume', () => {
      const priorityRequest: ProgramGenerationRequest = {
        ...BASE_REQUEST,
        clientProfile: {
          ...BASE_CLIENT_PROFILE,
          priorityMuscles: ['chest'],
        },
      };
      const normalRequest = BASE_REQUEST;

      const priorityBlock = service.generateProgram(priorityRequest);
      const normalBlock = service.generateProgram(normalRequest);

      const priorityW1Chest = priorityBlock.weeks[0]?.volumeSummary['chest'] ?? 0;
      const normalW1Chest = normalBlock.weeks[0]?.volumeSummary['chest'] ?? 0;

      expect(priorityW1Chest).toBeGreaterThan(normalW1Chest);
    });

    it('low recovery tolerance produces slower ramp than moderate', () => {
      const lowRecoveryRequest: ProgramGenerationRequest = {
        ...BASE_REQUEST,
        clientProfile: { ...BASE_CLIENT_PROFILE, recoveryTolerance: 'low' },
      };
      const moderateRecoveryRequest = BASE_REQUEST;

      const lowBlock = service.generateProgram(lowRecoveryRequest);
      const modBlock = service.generateProgram(moderateRecoveryRequest);

      // By week 3, moderate should be >= low recovery volume
      const lowW3 = lowBlock.weeks[2]?.volumeSummary['chest'] ?? 0;
      const modW3 = modBlock.weeks[2]?.volumeSummary['chest'] ?? 0;

      expect(modW3).toBeGreaterThanOrEqual(lowW3);
    });
  });

  // ============================================================
  // Test 4: Autoregulation — good logs increase volume
  // ============================================================

  describe('autoregulation — good logs (progressing signal)', () => {
    const goodLogs: ExerciseLog[] = [
      {
        exerciseId: 'ex-bench-press',
        muscleGroup: 'chest',
        sessionDate: '2025-12-22',
        sets: [
          { reps: 12, load: 80, rir: 4 }, // above target RIR
          { reps: 12, load: 80, rir: 4 },
          { reps: 12, load: 80, rir: 4 },
        ],
      },
      {
        exerciseId: 'ex-bench-press',
        muscleGroup: 'chest',
        sessionDate: '2025-12-25',
        sets: [
          { reps: 12, load: 82, rir: 4 },
          { reps: 12, load: 82, rir: 4 },
          { reps: 11, load: 82, rir: 3 },
        ],
      },
    ];

    it('week 3 chest volume is higher with good logs than without logs', () => {
      const requestWithLogs: ProgramGenerationRequest = {
        ...BASE_REQUEST,
        recentLogs: goodLogs,
      };

      const blockWithLogs = service.generateProgram(requestWithLogs);
      const blockNoLogs = service.generateProgram(BASE_REQUEST);

      const w3WithLogs = blockWithLogs.weeks[2]?.volumeSummary['chest'] ?? 0;
      const w3NoLogs = blockNoLogs.weeks[2]?.volumeSummary['chest'] ?? 0;

      // Good performance (progressing signal) should push volume up
      expect(w3WithLogs).toBeGreaterThanOrEqual(w3NoLogs);
    });
  });

  // ============================================================
  // Test 5: Autoregulation — bad logs reduce or hold volume
  // ============================================================

  describe('autoregulation — bad logs (fatigued signal)', () => {
    const fatiguedLogs: ExerciseLog[] = [
      {
        exerciseId: 'ex-bench-press',
        muscleGroup: 'chest',
        sessionDate: '2025-12-22',
        sets: [
          { reps: 8, load: 90, rir: 0 }, // RIR way below target (2) → fatigued
          { reps: 7, load: 90, rir: 0 },
          { reps: 6, load: 90, rir: 0 },
        ],
      },
      {
        exerciseId: 'ex-bench-press',
        muscleGroup: 'chest',
        sessionDate: '2025-12-25',
        sets: [
          { reps: 7, load: 90, rir: 0 }, // again very low RIR = second fatigued session
          { reps: 6, load: 90, rir: 0 },
          { reps: 6, load: 90, rir: 0 },
        ],
      },
    ];

    it('week 3 chest volume is lower or equal with fatigued logs vs no logs', () => {
      const requestWithFatigue: ProgramGenerationRequest = {
        ...BASE_REQUEST,
        recentLogs: fatiguedLogs,
      };

      const blockFatigued = service.generateProgram(requestWithFatigue);
      const blockNoLogs = service.generateProgram(BASE_REQUEST);

      const w3Fatigued = blockFatigued.weeks[2]?.volumeSummary['chest'] ?? 0;
      const w3NoLogs = blockNoLogs.weeks[2]?.volumeSummary['chest'] ?? 0;

      // Fatigue should keep volume at or below baseline
      expect(w3Fatigued).toBeLessThanOrEqual(w3NoLogs);
    });

    it('fatigued exercises have deloadFlag === true', () => {
      const requestWithFatigue: ProgramGenerationRequest = {
        ...BASE_REQUEST,
        recentLogs: fatiguedLogs,
      };

      const block = service.generateProgram(requestWithFatigue);

      // Find chest exercises in week 1 and check they're flagged
      const chestExercises = block.weeks[0]?.workouts
        .flatMap((w) => w.exercises)
        .filter((ex) => ex.muscleGroup === 'chest');

      expect(chestExercises?.length).toBeGreaterThan(0);
      chestExercises?.forEach((ex) => {
        expect(ex.deloadFlag).toBe(true);
      });
    });
  });

  // ============================================================
  // Test 6 (bonus): Rep zone undulation within a week
  // ============================================================

  describe('rep zone undulation', () => {
    it('different sessions in a week have different rep zones', () => {
      // Create a request with 3 sessions per week for each muscle
      const multiSessionRequest: ProgramGenerationRequest = {
        ...BASE_REQUEST,
        templates: [
          makeTemplate('A', 0, [CHEST_EXERCISE]),
          makeTemplate('B', 2, [CHEST_EXERCISE]),
          makeTemplate('C', 4, [CHEST_EXERCISE]),
        ],
      };

      const block = service.generateProgram(multiSessionRequest);
      const week1 = block.weeks[0];

      const zones = week1?.workouts.map(
        (w) => w.exercises[0]?.repZone,
      );

      // Expect zone rotation: heavy_hypertrophy, standard, metabolic
      expect(zones).toEqual([
        'heavy_hypertrophy',
        'standard',
        'metabolic',
      ]);
    });

    it('heavy_hypertrophy zone has repRange 6-10', () => {
      const block = service.generateProgram(BASE_REQUEST);
      const week1 = block.weeks[0];

      const heavySession = week1?.workouts.find(
        (w) => w.exercises.some((ex) => ex.repZone === 'heavy_hypertrophy'),
      );
      const heavyEx = heavySession?.exercises.find(
        (ex) => ex.repZone === 'heavy_hypertrophy',
      );

      expect(heavyEx?.repRangeTarget).toEqual({ min: 6, max: 10 });
    });

    it('metabolic zone has repRange 12-20', () => {
      const multiSessionRequest: ProgramGenerationRequest = {
        ...BASE_REQUEST,
        templates: [
          makeTemplate('A', 0, [CHEST_EXERCISE]),
          makeTemplate('B', 2, [CHEST_EXERCISE]),
          makeTemplate('C', 4, [CHEST_EXERCISE]),
        ],
      };

      const block = service.generateProgram(multiSessionRequest);
      const week1 = block.weeks[0];

      // Session index 2 = metabolic zone
      const metabolicEx = week1?.workouts[2]?.exercises[0];
      expect(metabolicEx?.repZone).toBe('metabolic');
      expect(metabolicEx?.repRangeTarget).toEqual({ min: 12, max: 20 });
    });
  });

  // ============================================================
  // Test 7: Double progression hints
  // ============================================================

  describe('double progression hints', () => {
    it('provides "increase load" hint when reps hit top of range with good RIR', () => {
      const progressLogs: ExerciseLog[] = [
        {
          exerciseId: 'ex-bench-press',
          muscleGroup: 'chest',
          sessionDate: '2025-12-29',
          sets: [
            { reps: 12, load: 80, rir: 3 }, // top of range (8-12), RIR >= targetRIR
            { reps: 12, load: 80, rir: 3 },
            { reps: 12, load: 80, rir: 3 },
          ],
        },
      ];

      const block = service.generateProgram({ ...BASE_REQUEST, recentLogs: progressLogs });

      const chestExercises = block.weeks[0]?.workouts
        .flatMap((w) => w.exercises)
        .filter((ex) => ex.exerciseId === 'ex-bench-press');

      const hasProgressHint = chestExercises?.some(
        (ex) => ex.progressionHint?.includes('progress'),
      );

      expect(hasProgressHint).toBe(true);
    });

    it('provides "reduce load" hint when reps below range with poor RIR', () => {
      const poorLogs: ExerciseLog[] = [
        {
          exerciseId: 'ex-bench-press',
          muscleGroup: 'chest',
          sessionDate: '2025-12-29',
          sets: [
            { reps: 5, load: 100, rir: 0 }, // below range (min 8), RIR < targetRIR - 1
            { reps: 5, load: 100, rir: 0 },
            { reps: 4, load: 100, rir: 0 },
          ],
        },
      ];

      const block = service.generateProgram({ ...BASE_REQUEST, recentLogs: poorLogs });

      const chestExercises = block.weeks[0]?.workouts
        .flatMap((w) => w.exercises)
        .filter((ex) => ex.exerciseId === 'ex-bench-press');

      const hasReduceHint = chestExercises?.some(
        (ex) => ex.progressionHint?.toLowerCase().includes('reduce'),
      );

      expect(hasReduceHint).toBe(true);
    });
  });
});
