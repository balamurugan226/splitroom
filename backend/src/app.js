'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/error');

// Routes
const authRoutes = require('./routes/auth');
const houseRoutes = require('./routes/houses');
const expenseRoutes = require('./routes/expenses');
const paymentRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/splitroom';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ---------------------------------------------------------------------------
// Body parsing — 10mb limit to support base64 images
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------------------------------------------------------------------------
// Health check (unauthenticated)
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SplitRoom API',
    version: '1.0.0',
  });
});

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);

// ---------------------------------------------------------------------------
// Protected routes — authenticateToken middleware applied to all
// ---------------------------------------------------------------------------
app.use('/api/houses', authenticateToken, houseRoutes);
app.use('/api/expenses', authenticateToken, expenseRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);

// ---------------------------------------------------------------------------
// 404 handler for unmatched routes
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ---------------------------------------------------------------------------
// Global error handler (must be last and have 4 params)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`SplitRoom API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
