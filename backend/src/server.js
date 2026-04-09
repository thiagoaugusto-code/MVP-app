require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const mealRoutes = require('./routes/meals');
const workoutRoutes = require('./routes/workouts');
const progressRoutes = require('./routes/progress');
const collaboratorRoutes = require('./routes/collaborators');
const dailyChecksRoutes = require('./routes/daily-checks');
const chatRoutes = require('./routes/chat');
const socketService = require('./services/socketService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Socket.io
socketService.initialize(server);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/daily-checks', dailyChecksRoutes);
app.use('/api/chat', chatRoutes);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with Socket.io`);
});