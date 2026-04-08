# MVP App - Sprint: Student Core Module

## 📋 Objetivo
Expandir o MVP com o módulo core mobile-first de controle de cardápio, treino e aderência, focado na autonomia do aluno.

## ✨ Funcionalidades Implementadas

### Frontend
- ✅ **Bottom Navigation** - Menu mobile-first com 5 abas principais (Dashboard, Dieta, Treino, Progresso, Perfil)
- ✅ **Dashboard** - Tela principal com:
  - Cards de estatísticas (kcal, refeições, treino, streak)
  - Checklist diário (refeições, treino, água, sono)
  - Insights motivacionais automáticos
  - Ações rápidas (adicionar refeição, registrar treino, foto)
  - Design mobile-first e responsivo
  
- ✅ **Dieta** - Página de controle alimentar:
  - Lista de refeições do dia com horários
  - Progresso de kcal consumidas
  - Checkboxes para marcar refeições concluídas
  - Botão para adicionar novas refeições

- ✅ **Treino** - Página de controle de exercícios:
  - Lista de exercícios com duração e intensidade
  - Resumo do tempo gasto
  - Visualização de intensidade (leve, moderado, alto)
  - Checkboxes para marcar exercícios concluídos

- ✅ **Progresso** - Página de evolução:
  - Gráfico de aderência semanal
  - Histórico de peso com timeline
  - Cards de metas (peso atual, peso perdido)
  - Visualização de tendências

- ✅ **Perfil** - Página de usuário:
  - Informações do usuário (nome, email)
  - Configurações (notificações, modo escuro, compartilhamento)
  - Metas personalizadas
  - Informações sobre o app
  - Botão de logout

### Componentes Reutilizáveis
- ✅ **StatCard** - Cards de estatísticas com ícone, valor e tendência
- ✅ **CheckItem** - Item de checklist com suporte a valores numéricos (água, sono)
- ✅ **BottomNavigation** - Navegação fixa na base com microinterações
- ✅ **Header** - Header limpo com branding mobile-first

### CSS Modules e Microinterações
- ✅ **CSS Modules** para cada página e componente
- ✅ Microinterações: animações de pulse, checkmark, scale em cliques
- ✅ Design mobile-first com media queries
- ✅ Safe area insets para devices com notch

### Backend
- ✅ **Prisma Schema** expandido com:
  - User: campos streak e avatar
  - MealLog: tipo de refeição, calorias detalhadas (proteína, carbos, gordura)
  - WorkoutLog: intensidade, lista de exercícios
  - DailyCheck: tipos específicos (water, sleep, meal, workout)
  - Insight: novo modelo para insights automáticos
  - Notification: novo modelo para notificações

- ✅ **Migrations** Prisma aplicadas com sucesso
- ✅ Banco SQLite com todas as tabelas criadas

### PWA Ready
- ✅ **manifest.json** com configuração PWA completa
- ✅ Meta tags para iOS e Android
- ✅ Suporte a safe area inset para devices com notch
- ✅ Service Worker configurado em index.html

## 🏗️ Arquitetura

### Estrutura de Pastas
```
frontend/src/
├── pages/
│   ├── Dashboard.jsx (+ .module.css)
│   ├── DietPlan.jsx (+ .module.css)
│   ├── Workout.jsx (+ .module.css)
│   ├── Progress.jsx (+ .module.css)
│   └── Profile.jsx (+ .module.css)
├── components/
│   ├── BottomNavigation.jsx (+ .module.css)
│   ├── Header.jsx (+ .module.css)
│   ├── StatCard.jsx (+ .module.css)
│   ├── CheckItem.jsx (+ .module.css)
│   └── ... (outros)
├── context/
│   └── AuthContext.jsx
├── services/
│   └── api.js
└── App.jsx

backend/
├── prisma/
│   ├── schema.prisma (expandido)
│   ├── migrations/ (nova migração)
│   └── dev.db
├── src/
│   ├── routes/
│   ├── middleware/
│   └── server.js
└── package.json
```

## 📱 Design Mobile-First
- **100% responsivo** para celulares (320px+)
- **Bottom navigation** fixa na base (padrão iOS/Android)
- **Cards clean** com sombras sutis
- **Dashboard escaneável** em poucos segundos
- **Pronto para expansão desktop** com media queries

## 🎨 Paleta de Cores
- Primary: `#3b82f6` (Azul)
- Dark: `#1e40af` (Azul escuro)
- Success: `#10b981` (Verde)
- Warning: `#f59e0b` (Amber)
- Error: `#ef4444` (Vermelho)
- Background: `#f9fafb` (Cinza claro)

## 📦 Dependências
- React 18.2.0
- Vite 5.0.0
- TailwindCSS 3.3.5
- React Router 6.20.0
- Axios 1.6.0
- Express 4.18.2
- Prisma 5.6.0
- PostgreSQL (atual: SQLite para dev)

## 🚀 Próximas Etapas
1. Integração de API real para refeições e treinos
2. Histórico persistido no banco de dados
3. Sincronização em tempo real
4. Notificações push
5. Análise de dados e relatórios
6. Suporte humano (futura camada opcional)
7. Expansão para web desktop

## 📝 Commits do Sprint
```
chore: initialize student core module
feat: mobile dashboard ui
feat: student daily checklist
feat: prisma student core schema
feat: profile and account pages
feat: pwa configuration
```

## ⚙️ Como Rodar

### Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Acesse: `http://localhost:5173`

---

**Desenvolvido com foco em autonomia, escalabilidade e experiência mobile-first.**