const mongoose = require('mongoose');

let mongodInstance = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gramcraft';
  
  try {
    // Attempt connecting to specified MONGODB_URI with a 2-second timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] Connected to MongoDB at ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Database] Could not connect to ${uri}. Falling back to embedded MongoMemoryServer for development/testing...`);
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        const memUri = mongodInstance.getUri();
        await mongoose.connect(memUri);
        console.log(`[Database] Connected to embedded MongoMemoryServer at ${memUri}`);
      } catch (memErr) {
        console.error('[Database] Failed to start MongoMemoryServer fallback:', memErr);
        throw err;
      }
    } else {
      console.error('[Database] Production connection failed:', err);
      throw err;
    }
  }

  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
}

module.exports = { connectDB, disconnectDB };
