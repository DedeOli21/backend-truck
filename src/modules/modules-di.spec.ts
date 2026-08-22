import { Test } from '@nestjs/testing';
import { CustomersModule } from '@applications/customers/customers.module';
import { CteDocumentsModule } from '@cte-documents/cte-documents.module';
import { DriversModule } from '@applications/drivers/drivers.module';
import { FleetRoutesModule } from '@applications/fleet-routes/fleet-routes.module';
import { FreightExpensesModule } from '@applications/freight-expenses/freight-expenses.module';
import { FreightsModule } from '@freights/freights.module';
import { RefuelingsModule } from '@refuelings/refuelings.module';
import { SuppliersModule } from '@applications/suppliers/suppliers.module';
import { TrucksModule } from '@trucks/trucks.module';
import { VehicleExpensesModule } from '@vehicle-expenses/vehicle-expenses.module';

/**
 * Os specs de service instanciam as classes na mão, com dependências
 * mockadas — então um módulo que esquece de importar outro passa neles e só
 * quebra ao subir a aplicação. Aqui cada módulo é compilado de verdade.
 */
const MODULOS = [
  ['CustomersModule', CustomersModule],
  ['SuppliersModule', SuppliersModule],
  ['FleetRoutesModule', FleetRoutesModule],
  ['DriversModule', DriversModule],
  ['TrucksModule', TrucksModule],
  ['RefuelingsModule', RefuelingsModule],
  ['VehicleExpensesModule', VehicleExpensesModule],
  ['CteDocumentsModule', CteDocumentsModule],
  ['FreightsModule', FreightsModule],
  ['FreightExpensesModule', FreightExpensesModule],
] as const;

describe('Injeção de dependências dos módulos', () => {
  it.each(MODULOS)('%s resolve todas as dependências', async (_nome, modulo) => {
    const moduleRef = await Test.createTestingModule({ imports: [modulo] }).compile();

    await moduleRef.close();
  });
});
