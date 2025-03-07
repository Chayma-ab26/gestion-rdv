require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const path = require('path');
const app = express();

app.use(express.json());
connectDB();

app.use('/api/auth', authRoutes);
app.use('/api', appointmentRoutes); // Préfixe /api pour appointmentRoutes

app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});