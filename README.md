# Agenda

Projeto com:
- `backend`: NestJS + Prisma (PostgreSQL)
- `frontend`: Quasar + Vue 3

## Requisitos

- Node `22` (use `nvm use`)
- npm

## Setup inicial

```bash
cd /home/roberto/projetos/agenda
nvm use
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run db:setup
```

Se você não tiver PostgreSQL local, pode subir com Docker:

```bash
docker run --name agenda-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=agenda -p 5432:5432 -d postgres:16
```

### Frontend

```bash
cd ../frontend
npm install
```

## Rodar em desenvolvimento

### Opção 1: tudo pela raiz

```bash
cd /home/roberto/projetos/agenda
npm run dev
```

### Opção 2: separado

```bash
cd /home/roberto/projetos/agenda/backend
npm run start:dev
```

```bash
cd /home/roberto/projetos/agenda/frontend
npm run dev
```

Backend: `http://localhost:3000`  
Frontend: URL exibida pelo Quasar (normalmente `http://localhost:9000`)

## Deploy grátis (Render + Vercel + Neon)

### 1. Banco PostgreSQL (Neon)

1. Crie conta em Neon e um projeto novo.
2. Copie a connection string PostgreSQL.
3. Use essa string no `DATABASE_URL` do backend.

### 2. Backend no Render

1. Suba este projeto no GitHub.
2. No Render, crie `Blueprint` apontando para o repositório.
3. O arquivo [render.yaml](/home/roberto/projetos/agenda/render.yaml) já cria o serviço backend.
4. Configure os env vars obrigatórios no Render:
   - `DATABASE_URL` (Neon)
   - `JWT_SECRET` (forte)
   - `CORS_ORIGIN` (URL do frontend em produção)
   - `FRONTEND_URL` (URL do frontend em produção)
5. Opcional (recuperação de senha por e-mail real):
   - `EMAIL_FROM`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASS`, `EMAIL_SMTP_SECURE`

### 3. Frontend no Vercel

1. Importe o repositório no Vercel com `Root Directory = frontend`.
2. O arquivo [vercel.json](/home/roberto/projetos/agenda/frontend/vercel.json) já define build/output.
3. Configure env vars no Vercel:
   - `VITE_API_URL=https://SEU-BACKEND.onrender.com`
   - `VITE_RECAPTCHA_SITE_KEY` (se usar CAPTCHA)
4. Faça deploy.

### 4. Ajuste final de cookie/CORS

No backend (Render):
- `AUTH_COOKIE_SECURE=true`
- `CORS_ORIGIN=https://SEU-FRONTEND.vercel.app`
- `FRONTEND_URL=https://SEU-FRONTEND.vercel.app`

## Segurança de autenticação

- O login agora usa cookie `httpOnly` (`agenda_auth`) no backend.
- O frontend não salva mais token no `localStorage`.
- Para funcionar em ambiente local, configure no backend:
```bash
CORS_ORIGIN=http://localhost:9000
AUTH_COOKIE_NAME=agenda_auth
AUTH_COOKIE_MAX_AGE_MS=604800000
```
- Em produção, use um `JWT_SECRET` forte e ative cookie seguro:
```bash
AUTH_COOKIE_SECURE=true
```

## Lembretes por WhatsApp (compromissos e lembretes)

O sistema envia lembretes automáticos de compromissos e lembretes próximos para o WhatsApp do usuário.

1. Usuário deve ter:
- telefone em formato internacional (ex: `+5581999999999`)
- opt-in ativado em `Menu -> WhatsApp`

2. Backend (`backend/.env`):
```bash
WHATSAPP_PROVIDER=mock
WHATSAPP_APPOINTMENT_LEAD_MINUTES=30
WHATSAPP_REMINDER_LEAD_MINUTES=30
WHATSAPP_SCAN_INTERVAL_MS=60000
```

- `mock`: não envia mensagem real, apenas simula no log do backend.
- `meta`: usa API oficial da Meta (Cloud API). Nesse caso configurar também:
```bash
WHATSAPP_META_TOKEN=...
WHATSAPP_META_PHONE_NUMBER_ID=...
WHATSAPP_META_API_VERSION=v20.0
```

## Testes

```bash
cd /home/roberto/projetos/agenda/backend
npm test
npm run test:e2e
```

Ou pela raiz:

```bash
cd /home/roberto/projetos/agenda
npm run test
npm run test:e2e
```

## Login demo

- Email: `demo@agenda.local`
- Senha: `123456`

## Cadastro público e recuperação de senha

- A tela inicial permite:
  - `Login`
  - `Cadastro` (novo usuário)
- Regra de perfil no cadastro público:
  - primeiro usuário do sistema vira `ADMIN`
  - próximos usuários viram `USER`

### Recuperar senha por e-mail (esqueci minha senha)

Fluxo:
1. No login, clique em `Esqueci minha senha`.
2. Informe seu e-mail.
3. O backend gera um token e envia (ou registra no log) um link:
   - `http://localhost:9000/#/reset-password?token=...`
4. Abra a tela de reset e informe token + nova senha.

Configuração (`backend/.env`):
```bash
FRONTEND_URL=http://localhost:9000
EMAIL_WEBHOOK_URL=
EMAIL_FROM=
EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=
EMAIL_SMTP_SECURE=false
```

- Prioridade de envio:
  1. SMTP (`EMAIL_SMTP_*` + `EMAIL_FROM`)
  2. Webhook (`EMAIL_WEBHOOK_URL`)
  3. fallback: log do backend com link de reset
- Endpoints:
  - `POST /auth/forgot-password`
  - `POST /auth/reset-password`

## CAPTCHA no login (opcional)

Para habilitar o "quadradinho anti-robô" (Google reCAPTCHA v2 checkbox):

1. Backend (`backend/.env`):
```bash
RECAPTCHA_SECRET_KEY=seu_secret_key
```
2. Frontend (`frontend/.env`):
```bash
VITE_RECAPTCHA_SITE_KEY=sua_site_key
```

Se essas variáveis não forem configuradas, o login continua funcionando sem CAPTCHA.

## Auditoria e histórico

- O backend registra operações relevantes em `AuditLog`:
  - login/logout
  - cadastro e alteração de usuário/status/senha
  - criação, alteração e exclusão de lembretes/compromissos
- Em operações de alteração, o histórico registra:
  - quais campos mudaram (`changedFields`)
  - valor anterior (`before`)
  - valor novo (`after`)
- Endpoint do histórico do usuário logado: `GET /audit/me`
- Limpeza do próprio histórico: `DELETE /audit/me`
- Limpeza de um registro específico do próprio histórico: `DELETE /audit/me/:id`
- No frontend, o histórico fica no menu principal em `Histórico`.
