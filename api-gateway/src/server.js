require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`[API Gateway] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`[API Gateway] Health check: http://localhost:${PORT}/health`);
      console.log(`[API Gateway] Swagger Docs:  http://localhost:${PORT}/docs`);
    });

    const shutdown = async () => {
      console.log('[API Gateway] Shutting down gracefully...');
      server.close(() => {
        console.log('[API Gateway] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[API Gateway] Server start failure:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
