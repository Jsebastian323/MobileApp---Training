import { Body, Controller, HttpCode, HttpStatus, Post, UsePipes } from '@nestjs/common';
import type { ProgramBlock, ProgramGenerationRequest } from '@training/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { GeneratePreviewDto } from './dto/generate-preview.dto';
import { GeneratePreviewSchema } from './dto/generate-preview.dto';
import { HypertrophyProgramGeneratorService } from './services/hypertrophy-program-generator.service';

// TODO: Add AuthGuard + RolesGuard (trainer/org_owner only) in Phase 1 auth sprint.
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programGenerator: HypertrophyProgramGeneratorService) {}

  /**
   * Generate a hypertrophy program preview.
   * No auth guard for Phase 1 — for manual testing only.
   *
   * POST /programs/generate-preview
   */
  @Post('generate-preview')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(GeneratePreviewSchema))
  generatePreview(@Body() dto: GeneratePreviewDto): ProgramBlock {
    // Safe cast: Zod validation pipe already guarantees structural correctness at runtime.
    // The only type mismatch is exactOptionalPropertyTypes: Zod infers `T | undefined`
    // for optional fields while the domain interface uses `T?` (absent-only semantics).
    // At runtime these are identical — the cast is safe.
    const request = dto as unknown as ProgramGenerationRequest;
    return this.programGenerator.generateProgram(request);
  }
}
