const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const environmentRoutes = require('./routes/environments');
const teamRoutes = require('./routes/teams');
const qaRoutes = require('./routes/qa');
const { startQaEscalationJob } = require('./jobs/qaEscalation');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Capture the raw body so Slack request-signature verification (HMAC over the
// exact bytes received) can happen in routes/qa.js — doesn't affect normal JSON parsing.
const captureRawBody = (req, res, buf) => {
  req.rawBody = buf;
};
app.use(express.json({ verify: captureRawBody }));
app.use(express.urlencoded({ extended: true, verify: captureRawBody }));

// Hacer io accesible en las rutas
app.set('io', io);

// Conectar a MongoDB
connectDB();

// WebSocket connection
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

// Rutas
app.use('/api', teamRoutes);
app.use('/api', environmentRoutes);
app.use('/api/qa', qaRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 API disponible en http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket disponible`);
  startQaEscalationJob();
});
