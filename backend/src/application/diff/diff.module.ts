import { Module } from '@nestjs/common';
import { DiffService } from '@application/services/diff.service';

@Module({
  providers: [DiffService],
  exports: [DiffService],
})
export class DiffModule {}
