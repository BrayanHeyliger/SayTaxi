#!/bin/bash
echo "🚕 Iniciando SayTaxi Passenger..."

# Submodulos
git submodule update --init --recursive

# Instalar dependencias
cd /workspaces/SayTaxi && pnpm install

# Crear .env si no existe
if [ ! -f .env ]; then
  echo "📝 Creando .env..."
  cat > .env << 'ENVEOF'
OAUTH_SERVER_URL=http://localhost:3000
JWT_SECRET=local-dev-secret-saytaxi
DATABASE_URL=file:./dev.db
VITE_APP_ID=saytaxi-local
OWNER_OPEN_ID=
ENVEOF
  echo "✅ .env creado"
fi

# Arrancar
echo "🚀 Arrancando servidor..."
pnpm run dev
