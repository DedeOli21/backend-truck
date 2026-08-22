import { PartialType } from '@nestjs/swagger';
import { CreateFleetRouteDto } from '@applications/fleet-routes/presentation/dtos/create-fleet-route.dto';

export class UpdateFleetRouteDto extends PartialType(CreateFleetRouteDto) {}
