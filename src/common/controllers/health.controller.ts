import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Infraestrutura')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Verificar se a API está no ar',
    description: 'Rota pública, sem autenticação. Usada pelo container e pelo monitoramento.',
  })
  @ApiOkResponse({
    description: 'API respondendo.',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-08-21T20:00:00.000Z',
        service: 'backend-truck',
      },
    },
  })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'backend-truck',
    };
  }
}
