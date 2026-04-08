# MVP App de Controle de Cardápio, Treino e Aderência

## Visão do Produto
Este MVP ajuda usuários a seguirem dieta, treino e rotina diária de forma autônoma, utilizando dashboard interativo, checklists, insights automáticos, streaks e mensagens motivacionais. O suporte humano é opcional e planejado para futuras expansões.

## Stack Tecnológica
- **Frontend**: React + Vite + TailwindCSS + React Router + Axios + Context API
- **Backend**: Node.js + Express + Prisma + PostgreSQL + JWT
- **Versionamento**: Git

## Como Rodar

### Pré-requisitos
- Node.js (versão 18+)
- SQLite (incluído com Prisma)

### Backend
1. Navegue para a pasta `backend`:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Execute as migrações do Prisma:
   ```bash
   npx prisma migrate dev
   ```
4. Rode o servidor:
   ```bash
   npm run dev
   ```

### Frontend
1. Navegue para a pasta `frontend`:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Rode o aplicativo:
   ```bash
   npm run dev
   ```

### Acesso
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Estrutura do Projeto
- `frontend/`: Código do frontend React
- `backend/`: Código do backend Node.js/Express
- `prisma/`: Schema e migrações do banco de dados

## Funcionalidades Iniciais
- Autenticação (Login/Cadastro)
- Dashboard com kcal, refeições, treino, streak, checklist
- Logs de refeições e treinos
- Progresso e insights automáticos

## Próximos Passos
- Expansão mobile
- Suporte humano opcional
- Integrações adicionais