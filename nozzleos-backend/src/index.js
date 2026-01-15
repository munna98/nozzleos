const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');
const { authenticate, authorize } = require('./middleware/auth.middleware');
const authService = require('./services/auth.service');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' }
});

// Trigger restart
app.use(cors());
app.use(express.json());

// Auth routes (public)
const authRoutes = require('./routes/auth.routes');
app.use('/auth', authRoutes);

// Protected routes

const userRoutes = require('./routes/user.routes');
const customerRoutes = require('./routes/customer.routes.js');
const paymentMethodRoutes = require('./routes/payment-method.routes.js');
const fuelRoutes = require('./routes/fuel.routes.js');
const dispenserRoutes = require('./routes/dispenser.routes.js');
const nozzleRoutes = require('./routes/nozzle.routes.js');

// Apply authentication to all routes except /auth
app.use(authenticate);

// Apply authorization to sensitive routes

app.use('/users', authorize('Admin', 'Manager'), userRoutes);
app.use('/customers', authorize('Admin', 'Manager'), customerRoutes);
app.use('/payment-methods', authorize('Admin', 'Manager'), paymentMethodRoutes);
app.use('/fuels', authorize('Admin', 'Manager'), fuelRoutes);
app.use('/dispensers', authorize('Admin', 'Manager'), dispenserRoutes);
app.use('/nozzles', authorize('Admin', 'Manager'), nozzleRoutes);

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const user = authService.verifyAccessToken(token);
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.user.username} connected:`, socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});