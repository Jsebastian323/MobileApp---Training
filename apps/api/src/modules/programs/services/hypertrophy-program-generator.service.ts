import { Injectable } from '@nestjs/common';
import {
  type ProgramGenerationRequest,
  type ProgramBlock,
  type WorkoutWeek,
  type WorkoutInstance,
  type ExercisePrescription,
  type ClientProfile,
  type ExerciseLog,
  type ExerciseTemplate,
  type WorkoutTemplate,
  type MuscleGroup,
  type VolumeLandmarks,
  type RepRange,
  type RepZone,
  type PerformanceSignal,
  resolveVolumeLandmarks,
} from '@training/shared';

// ============================================================
// Internal rep zone configuration
// ============================================================

interface RepZoneConfig {
  zone: RepZone;
  repRange: RepRange;
  baseRIR: number;
}

const REP_ZONES: [RepZoneConfig, RepZoneConfig, RepZoneConfig] = [
  { zone: 'heavy_hypertrophy', repRange: { min: 6, max: 10 }, baseRIR: 2 },
  { zone: 'standard', repRange: { min: 8, max: 12 }, baseRIR: 2 },
  { zone: 'metabolic', repRange: { min: 12, max: 20 }, baseRIR: 3 },
];

const DELOAD_ZONE: RepZoneConfig = {
  zone: 'standard',
  repRange: { min: 8, max: 12 },
  baseRIR: 4,
};

const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
];

@Injectable()
export class HypertrophyProgramGeneratorService {
  // ============================================================
  // Public entry point
  // ============================================================

  generateProgram(request: ProgramGenerationRequest): ProgramBlock {
    const { clientProfile, startDate, templates, recentLogs, volumeLandmarks } = request;

    const sortedTemplates = [...templates].sort((a, b) => a.dayIndex - b.dayIndex);

    const performanceSignals = this.analyzeAllMuscleSignals(
      sortedTemplates,
      recentLogs,
      clientProfile,
    );

    const weeks = this.generateAllWeeks(
      sortedTemplates,
      clientProfile,
      performanceSignals,
      startDate,
      volumeLandmarks,
      recentLogs,
    );

    const endDate = this.addDays(startDate, 27); // 4 weeks x 7 days - 1

    return {
      id: crypto.randomUUID(),
      startDate,
      endDate,
      clientProfile,
      weeks,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // Week generation
  // ============================================================

  private generateAllWeeks(
    templates: WorkoutTemplate[],
    clientProfile: ClientProfile,
    performanceSignals: Map<MuscleGroup, PerformanceSignal>,
    startDate: string,
    volumeLandmarks: Partial<Record<MuscleGroup, VolumeLandmarks>> | undefined,
    recentLogs: ExerciseLog[] | undefined,
  ): [WorkoutWeek, WorkoutWeek, WorkoutWeek, WorkoutWeek] {
    const args = [templates, clientProfile, performanceSignals, startDate, volumeLandmarks, recentLogs] as const;
    return [
      this.buildWeek(1, false, 0, ...args),
      this.buildWeek(2, false, 1, ...args),
      this.buildWeek(3, false, 2, ...args),
      this.buildWeek(4, true, 3, ...args),
    ];
  }

  private buildWeek(
    weekNumber: 1 | 2 | 3 | 4,
    isDeload: boolean,
    weekIndex: number,
    templates: WorkoutTemplate[],
    clientProfile: ClientProfile,
    performanceSignals: Map<MuscleGroup, PerformanceSignal>,
    startDate: string,
    volumeLandmarks: Partial<Record<MuscleGroup, VolumeLandmarks>> | undefined,
    recentLogs: ExerciseLog[] | undefined,
  ): WorkoutWeek {
    const weekStartDate = this.addDays(startDate, weekIndex * 7);

    let workouts = templates.map((template, sessionIndex) => {
      const sessionDate = this.addDays(weekStartDate, template.dayIndex);
      return this.buildWorkoutInstance(
        template,
        sessionDate,
        sessionIndex,
        weekIndex,
        isDeload,
        clientProfile,
        performanceSignals,
        recentLogs,
      );
    });

    workouts = this.clampToMRV(workouts, clientProfile, volumeLandmarks, isDeload);

    const volumeSummary = this.computeVolumeSummary(workouts);
    return { weekNumber, isDeload, workouts, volumeSummary };
  }

  // ============================================================
  // Workout instance + prescriptions
  // ============================================================

  private buildWorkoutInstance(
    template: WorkoutTemplate,
    sessionDate: string,
    sessionIndex: number,
    weekIndex: number,
    isDeload: boolean,
    clientProfile: ClientProfile,
    performanceSignals: Map<MuscleGroup, PerformanceSignal>,
    recentLogs: ExerciseLog[] | undefined,
  ): WorkoutInstance {
    const zoneConfig = this.getRepZoneConfig(sessionIndex, isDeload);

    const exercises = template.exercises.map((ex) =>
      this.buildExercisePrescription(
        ex,
        weekIndex,
        isDeload,
        zoneConfig,
        clientProfile,
        performanceSignals,
        recentLogs,
      ),
    );

    return {
      date: sessionDate,
      templateId: template.id,
      templateName: template.name,
      exercises,
    };
  }

  private buildExercisePrescription(
    ex: ExerciseTemplate,
    weekIndex: number,
    isDeload: boolean,
    zoneConfig: RepZoneConfig,
    clientProfile: ClientProfile,
    performanceSignals: Map<MuscleGroup, PerformanceSignal>,
    recentLogs: ExerciseLog[] | undefined,
  ): ExercisePrescription {
    const signal: PerformanceSignal = performanceSignals.get(ex.muscleGroup) ?? 'stable';
    const isPriority = clientProfile.priorityMuscles.includes(ex.muscleGroup);
    const rampPerWeek = this.getRampPerWeek(clientProfile.recoveryTolerance);
    const priorityBonus = isPriority ? 2 : 0;

    let setsTarget: number;

    if (isDeload) {
      // Reference peak = week-3 equivalent sets
      const autoBonus = this.getAutoregulationBonus(signal, rampPerWeek);
      const peakSets = ex.baseSets + priorityBonus + 2 * rampPerWeek + autoBonus;
      setsTarget = Math.max(1, Math.round(peakSets * 0.6));
    } else {
      const autoBonus = this.getAutoregulationBonus(signal, rampPerWeek);
      setsTarget = Math.max(1, ex.baseSets + priorityBonus + weekIndex * rampPerWeek + autoBonus);
    }

    const targetRIR = isDeload ? zoneConfig.baseRIR + 2 : zoneConfig.baseRIR;

    const hint = this.getProgressionHint(
      ex.exerciseId,
      recentLogs,
      zoneConfig.repRange,
      targetRIR,
    );

    // exactOptionalPropertyTypes: use conditional spread for optional field
    return {
      exerciseId: ex.exerciseId,
      muscleGroup: ex.muscleGroup,
      setsTarget,
      repRangeTarget: zoneConfig.repRange,
      targetRIR,
      repZone: zoneConfig.zone,
      deloadFlag: isDeload || signal === 'fatigued',
      ...(hint !== undefined ? { progressionHint: hint } : {}),
    };
  }

  // ============================================================
  // MRV clamping
  // ============================================================

  private clampToMRV(
    workouts: WorkoutInstance[],
    clientProfile: ClientProfile,
    volumeLandmarks: Partial<Record<MuscleGroup, VolumeLandmarks>> | undefined,
    isDeload: boolean,
  ): WorkoutInstance[] {
    if (isDeload) return workouts; // Deload already at 60% of peak

    const weeklyVolume = this.computeVolumeSummary(workouts);
    const scalingFactors = new Map<MuscleGroup, number>();

    for (const muscle of ALL_MUSCLE_GROUPS) {
      const total = weeklyVolume[muscle] ?? 0;
      if (total === 0) continue;
      const landmarks = resolveVolumeLandmarks(
        muscle,
        clientProfile.experienceLevel,
        volumeLandmarks,
      );
      if (total > landmarks.MRV) {
        scalingFactors.set(muscle, landmarks.MRV / total);
      }
    }

    if (scalingFactors.size === 0) return workouts;

    return workouts.map((workout) => ({
      ...workout,
      exercises: workout.exercises.map((ex) => {
        const scale = scalingFactors.get(ex.muscleGroup);
        if (scale === undefined) return ex;
        return { ...ex, setsTarget: Math.max(1, Math.round(ex.setsTarget * scale)) };
      }),
    }));
  }

  // ============================================================
  // Performance signal analysis (autoregulation)
  // ============================================================

  private analyzeAllMuscleSignals(
    templates: WorkoutTemplate[],
    recentLogs: ExerciseLog[] | undefined,
    clientProfile: ClientProfile,
  ): Map<MuscleGroup, PerformanceSignal> {
    const signals = new Map<MuscleGroup, PerformanceSignal>();

    if (!recentLogs || recentLogs.length === 0) return signals;

    const musclesInProgram = new Set<MuscleGroup>();
    for (const template of templates) {
      for (const ex of template.exercises) {
        musclesInProgram.add(ex.muscleGroup);
      }
    }

    const defaultRIR = this.getDefaultTargetRIR(clientProfile);

    for (const muscle of musclesInProgram) {
      const signal = this.analyzePerformanceSignal(muscle, recentLogs, defaultRIR);
      signals.set(muscle, signal);
    }

    return signals;
  }

  private analyzePerformanceSignal(
    muscle: MuscleGroup,
    logs: ExerciseLog[],
    targetRIR: number,
  ): PerformanceSignal {
    const muscleLogs = logs.filter((l) => l.muscleGroup === muscle);
    if (muscleLogs.length === 0) return 'stable';

    let fatiguedSessionCount = 0;
    let totalMeanRIR = 0;
    let sessionsWithRIR = 0;
    let totalMeanReps = 0;
    let sessionsWithReps = 0;
    // Standard rep range upper bound used as threshold for "progressing" detection
    const standardRepMax = 12;

    for (const exerciseLog of muscleLogs) {
      const rirValues = exerciseLog.sets
        .map((s) => s.rir)
        .filter((r): r is number => r !== undefined);

      if (rirValues.length > 0) {
        const meanRIR = rirValues.reduce((a, b) => a + b, 0) / rirValues.length;
        totalMeanRIR += meanRIR;
        sessionsWithRIR++;
        if (meanRIR < targetRIR - 1) fatiguedSessionCount++;
      }

      const repValues = exerciseLog.sets.map((s) => s.reps);
      if (repValues.length > 0) {
        const meanReps = repValues.reduce((a, b) => a + b, 0) / repValues.length;
        totalMeanReps += meanReps;
        sessionsWithReps++;
      }
    }

    if (sessionsWithRIR === 0) return 'stable';

    const avgMeanRIR = totalMeanRIR / sessionsWithRIR;
    const avgMeanReps =
      sessionsWithReps > 0 ? totalMeanReps / sessionsWithReps : 0;

    if (fatiguedSessionCount >= 2) return 'fatigued';
    if (avgMeanRIR < targetRIR) return 'struggling';
    if (avgMeanRIR > targetRIR + 1 && avgMeanReps >= standardRepMax) return 'progressing';

    return 'stable';
  }

  // ============================================================
  // Double progression hints
  // ============================================================

  private getProgressionHint(
    exerciseId: string,
    recentLogs: ExerciseLog[] | undefined,
    repRange: RepRange,
    targetRIR: number,
  ): string | undefined {
    if (!recentLogs || recentLogs.length === 0) return undefined;

    const exerciseLogs = recentLogs
      .filter((l) => l.exerciseId === exerciseId)
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));

    const lastLog = exerciseLogs[0];
    if (lastLog === undefined || lastLog.sets.length === 0) return undefined;

    const setRIRs = lastLog.sets
      .map((s) => s.rir)
      .filter((r): r is number => r !== undefined);
    const setReps = lastLog.sets.map((s) => s.reps);

    if (setRIRs.length === 0) return undefined;

    const avgRIR = setRIRs.reduce((a, b) => a + b, 0) / setRIRs.length;
    const avgReps = setReps.reduce((a, b) => a + b, 0) / setReps.length;

    if (avgReps >= repRange.max && avgRIR >= targetRIR) {
      return 'Ready to progress: increase load or target upper rep range';
    }

    if (avgReps < repRange.min && avgRIR < targetRIR - 1) {
      return 'Reduce load or lower rep target for better form and RIR control';
    }

    return undefined;
  }

  // ============================================================
  // Pure helper methods
  // ============================================================

  private getRepZoneConfig(sessionIndex: number, isDeload: boolean): RepZoneConfig {
    if (isDeload) return DELOAD_ZONE;
    const zoneIndex = sessionIndex % 3;
    // REP_ZONES is a fixed 3-tuple; zoneIndex is always 0, 1, or 2
    return REP_ZONES[zoneIndex] ?? REP_ZONES[1];
  }

  private getRampPerWeek(recoveryTolerance: ClientProfile['recoveryTolerance']): number {
    return recoveryTolerance === 'low' ? 1 : 2;
  }

  private getDefaultTargetRIR(clientProfile: ClientProfile): number {
    if (clientProfile.experienceLevel === 'beginner') return 3;
    if (clientProfile.experienceLevel === 'advanced') return 1;
    return 2;
  }

  /**
   * Returns the set delta to apply on top of the standard ramp.
   * - progressing: +1 bonus set (above standard ramp)
   * - stable: no delta
   * - struggling: negate the ramp (rampPerWeek cancels out)
   * - fatigued: negate ramp AND remove priority bonus (force minimum volume)
   */
  private getAutoregulationBonus(signal: PerformanceSignal, rampPerWeek: number): number {
    if (signal === 'progressing') return 1;
    if (signal === 'struggling') return -rampPerWeek; // cancels ramp for that week
    if (signal === 'fatigued') return -(rampPerWeek + 2); // reduces below baseline
    return 0;
  }

  private computeVolumeSummary(
    workouts: WorkoutInstance[],
  ): Partial<Record<MuscleGroup, number>> {
    const summary: Partial<Record<MuscleGroup, number>> = {};
    for (const workout of workouts) {
      for (const ex of workout.exercises) {
        const current = summary[ex.muscleGroup] ?? 0;
        summary[ex.muscleGroup] = current + ex.setsTarget;
      }
    }
    return summary;
  }

  private addDays(isoDate: string, days: number): string {
    const date = new Date(isoDate);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().substring(0, 10);
  }
}
