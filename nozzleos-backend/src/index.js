const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' }
});

// Trigger restart
app.use(cors());
app.use(express.json());

const userRoutes = require('./routes/user.routes');
const customerRoutes = require('./routes/customer.routes.js');
const paymentMethodRoutes = require('./routes/payment-method.routes.js');
const fuelRoutes = require('./routes/fuel.routes.js');
const dispenserRoutes = require('./routes/dispenser.routes.js');
const nozzleRoutes = require('./routes/nozzle.routes.js');

app.use('/users', userRoutes);
app.use('/customers', customerRoutes);
app.use('/payment-methods', paymentMethodRoutes);
app.use('/fuels', fuelRoutes);
app.use('/dispensers', dispenserRoutes);
app.use('/nozzles', nozzleRoutes);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});