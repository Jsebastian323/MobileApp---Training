import { ProgramGenerationRequestSchema } from '@training/shared';
import { z } from 'zod';

/**
 * DTO for POST /programs/generate-preview.
 * Validated via the shared Zod schema at the controller level.
 * No class-validator decorators — we use Zod directly for Phase 1.
 */
export type GeneratePreviewDto = z.infer<typeof ProgramGenerationRequestSchema>;

export { ProgramGenerationRequestSchema as GeneratePreviewSchema };
