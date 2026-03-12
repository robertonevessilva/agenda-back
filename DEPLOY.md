# Deploy da Aplicação

Este documento descreve o processo de deploy da aplicação Agenda no Render.

## Banco de Dados

O banco de dados PostgreSQL já foi criado no Render com as seguintes configurações:

- **Nome**: agenda-db
- **Plano**: Free
- **Conexão**: `postgresql://agenda_db_nr4u_user:JZkngZhp5NpJBvJqxutGSiSqxE131hw4@dpg-d6pfgem3jp1c73cbuqh0-a.ohio-postgres.render.com/agenda_db_nr4u`

## Configuração do Backend

As seguintes alterações foram feitas para configurar o backend para usar o PostgreSQL:

1. **Arquivo `.env`**: Atualizado com a string de conexão do banco de dados PostgreSQL
2. **Arquivo `schema.prisma`**: Alterado o provider de `sqlite` para `postgresql`
3. **Arquivo `render.yaml`**: Configurado para usar o banco de dados agenda-db

## Deploy no Render

Para fazer o deploy no Render:

1. **Backend**: O serviço `agenda-backend` será automaticamente configurado com:
   - Build command: `npm ci && npx prisma generate && npm run build`
   - Start command: `npx prisma db push && npm run start:prod`
   - Variáveis de ambiente configuradas automaticamente
   - Conexão com o banco de dados agenda-db

2. **Frontend**: Será configurado separadamente no Render

## Scripts de Deploy

- **`backend/scripts/deploy.sh`**: Script para preparar o backend para produção
  - Instala dependências
  - Gera o cliente Prisma
  - Faz o build da aplicação
  - Atualiza o schema no banco de dados

## Comandos Úteis

```bash
# Preparar para produção
cd backend && ./scripts/deploy.sh

# Iniciar servidor de produção
cd backend && npm run start:prod

# Verificar status do banco de dados
cd backend && npx prisma db pull
```

## Observações

- O banco de dados está configurado no plano gratuito
- A aplicação está configurada para usar JWT para autenticação
- O CORS está configurado para aceitar requisições do frontend
- O WhatsApp está configurado no modo mock para testes