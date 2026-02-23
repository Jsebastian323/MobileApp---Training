import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProgramsModule } from './modules/programs/programs.module';

@Module({
  imports: [ProgramsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
