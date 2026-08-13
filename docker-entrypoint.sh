#!/bin/sh
set -e

echo "========================================="
echo "🚀 Iniciando Backend Truck - Producao"
echo "========================================="

# Debug: verifica estrutura de arquivos
echo "📁 Verificando arquivos compilados..."
ls -la ./dist/database/typeorm/ 2>/dev/null || echo "⚠️  Diretorio database/typeorm nao encontrado"

# Aguarda o PostgreSQL ficar disponivel
echo "⏳ Aguardando PostgreSQL em $DATABASE_HOST:$DATABASE_PORT..."
until pg_isready -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" > /dev/null 2>&1; do
  echo "   PostgreSQL ainda nao esta pronto..."
  sleep 2
done
echo "✅ PostgreSQL pronto!"

# Roda migrations automaticamente via TypeORM CLI
echo "📦 Executando migrations..."
npx typeorm migration:run -d ./dist/database/typeorm/data-source.js || {
  echo "⚠️  Falha ao executar migrations via CLI, tentando fallback..."
  node -e "
const { DataSource } = require('typeorm');
const path = require('path');
const dsPath = path.resolve('./dist/database/typeorm/data-source.js');
console.log('Tentando carregar:', dsPath);
try {
  const dsModule = require(dsPath);
  const DSClass = dsModule.default || dsModule;
  const ds = new DSClass();
  ds.initialize()
    .then(() => ds.runMigrations())
    .then((migrations) => {
      if (migrations.length > 0) {
        console.log('✅ Migrations executadas:', migrations.map(m => m.name).join(', '));
      } else {
        console.log('✅ Banco ja esta atualizado (sem migrations pendentes)');
      }
      return ds.destroy();
    })
    .then(() => process.exit(0))
    .catch(e => {
      console.error('❌ Erro nas migrations:', e.message);
      process.exit(1);
    });
} catch(e) {
  console.error('❌ Erro ao carregar data-source:', e.message);
  process.exit(1);
}
" || { echo "⚠️  Falha ao executar migrations"; exit 1; }
}

echo "========================================="
echo "🌐 Iniciando servidor Node.js na porta ${PORT:-3000}"
echo "========================================="

# Executa o comando passado (node dist/src/main.js)
exec "$@"
