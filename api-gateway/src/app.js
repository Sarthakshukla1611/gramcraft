const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

// Config & Swagger
const { setupSwagger } = require('./config/swagger');

// Routes
const authRoutes = require('./routes/auth');
const villageRoutes = require('./routes/villages');
const insightRoutes = require('./routes/insights');
const projectRoutes = require('./routes/projects');
const budgetRoutes = require('./routes/budget');
const changeRequestRoutes = require('./routes/changeRequests');
const gameRoutes = require('./routes/game');
const dataHubRoutes = require('./routes/dataHub');
const facilityRoutes = require('./routes/facilities');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/uploads');
const snapshotRoutes = require('./routes/snapshots');

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Permit maps, fonts, and inline styles
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS allow-list
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for local dev
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static uploads folder
const uploadDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// Swagger Documentation
setupSwagger(app);

// Health Check Endpoint
app.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/villages', villageRoutes);
app.use('/api', insightRoutes);
app.use('/api', snapshotRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/change-requests', changeRequestRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/import', dataHubRoutes);
app.use('/api', dataHubRoutes);
app.use('/api/data-hub', dataHubRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/uploads', uploadRoutes);

// Centralized 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[API Gateway Error]', err.stack || err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

module.exports = app;
