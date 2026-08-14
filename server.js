require('dotenv').config();
const path = require('path');
const express = require('express');
const connectDB = require('./db');
const authRoutes = require('./authRoutes');
const studentRoutes = require('./studentRoutes');

const app = express();
app.use(express.json());

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 KlemeSaaS Server running on port ${PORT}`));
