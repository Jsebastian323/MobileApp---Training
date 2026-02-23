import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { HypertrophyProgramGeneratorService } from './services/hypertrophy-program-generator.service';

@Module({
  controllers: [ProgramsController],
  providers: [HypertrophyProgramGeneratorService],
  exports: [HypertrophyProgramGeneratorService],
})
export class ProgramsModule {}
