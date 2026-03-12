#!/bin/bash

# Script de deploy para produção
echo "🚀 Iniciando deploy para produção..."

# Instala dependências
echo "📦 Instalando dependências..."
npm ci

# Gera o cliente Prisma
echo "🔧 Gerando cliente Prisma..."
npx prisma generate

# Faz o build da aplicação
echo "🔨 Fazendo build da aplicação..."
npm run build

# Faz o push do schema para o banco de dados
echo "🗄️  Atualizando schema no banco de dados..."
npx prisma db push

echo "✅ Deploy concluído com sucesso!"
echo "🌐 Servidor pronto para iniciar com: npm run start:prod"