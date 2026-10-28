import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Verificación de estado raíz para ping y monitoreo (UptimeRobot / Render)',
  })
  @ApiResponse({ status: 200, description: 'Servicio en línea' })
  getRoot() {
    return this.appService.getHealth();
  }

  @Get(['health', 'api/v1/health'])
  @ApiOperation({ summary: 'Endpoint de salud del backend (Health Check)' })
  @ApiResponse({ status: 200, description: 'Servicio en línea' })
  getHealth() {
    return this.appService.getHealth();
  }
}
