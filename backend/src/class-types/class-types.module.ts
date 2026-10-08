import { Module } from '@nestjs/common';
import { ClassTypesService } from './class-types.service.js';
import { ClassTypesController } from './class-types.controller.js';

@Module({
  controllers: [ClassTypesController],
  providers: [ClassTypesService],
  exports: [ClassTypesService],
})
export class ClassTypesModule {}
