import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateTruckDto } from '@trucks/presentation/dtos/create-truck.dto';

const build = (plate: string) =>
  plainToInstance(CreateTruckDto, {
    plate,
    brandModel: 'Volvo FH 540',
    type: 'TRUCK',
    capacity: 14,
  });

describe('CreateTruckDto', () => {
  it('normaliza a placa antes de validar o tamanho', () => {
    const dto = build(' abc1d23 ');

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.plate).toBe('ABC1D23');
  });

  it('aceita placa com hifen, removendo o separador', () => {
    const dto = build('abc-1d23');

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.plate).toBe('ABC1D23');
  });

  it('rejeita placa curta demais depois de normalizada', () => {
    const errors = validateSync(build('ab 12'));

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('plate');
  });
});
