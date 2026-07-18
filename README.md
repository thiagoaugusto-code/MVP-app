# MVP App - Complete Health & Fitness Platform

> Real-time collaborative health tracking with AI-powered nutritional insights, socket.io messaging, and intelligent notifications.

## ✨ Features

### Core Features
- 🔐 **Secure Admin Dashboard** - Protected via `.env` credentials
- 💬 **Real-time Chat** - Socket.io bidirectional messaging
- 🤖 **AI Predictions** - OpenAI-powered meal suggestions and health insights
- 📱 **Push Notifications** - In-app, email, and web push
- 📊 **User Profiles** - Student/Collaborator roles with specialization
- 🗓️ **Meal Calendar** - Track daily nutrition intake
- 🎯 **Progress Tracking** - Weight, body metrics, and streaks
- ✅ **Daily Checklist** - Customizable health checkpoints

### Real-time Capabilities
- 💭 Typing indicators
- 👥 Online/offline presence
- ✓✓ Read receipts
- 🔔 Instant notifications
- 📬 Message persistence

### AI Features
- 🧠 4 conversation modes (Coach, Preventive, Celebration, Welcoming)
- 📈 7-day context window (meals, workouts, streaks)
- 💾 Intelligent caching (1-hour TTL)
- 🔄 Automatic fallback on API failure
- ⏱️ Rate limiting (50k tokens/day per user)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- SQLite (built-in)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env: Set OPENAI_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

# Generate Prisma Client
npx prisma generate

# Sync database
npx prisma db push

# Start development server
npm run dev
# Server runs on http://localhost:3001
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
echo "VITE_API_URL=http://localhost:3001" > .env

# Start development server
npm run dev
# Frontend runs on http://localhost:5174
```

## 🧪 Testing

### Run All Tests
```bash
cd backend
npm test -- --runInBand
```


## 🔐 Security

### Authentication
- JWT tokens stored in browser localStorage
- Tokens sent in every request header
- Auto-refresh on token expiry


## 🔮 Future Features

- Video consultations
- Meal photo recognition
- Personalized workout plans
- Analytics dashboard
- Mobile app (React Native)
- Wearable integration


## 📄 License

MIT License

---

**Version:** 1.0.0 MVP  
**Status:** ✅ Production Ready  
**Last Updated:** April 9, 2026

5. Execute as migrações do Prisma:
   ```bash
   npx prisma migrate dev
   ```
6. Rode o servidor:
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