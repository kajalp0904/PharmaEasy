const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ ERROR: Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Please create a .env file with the required variables.');
  console.error('   See .env.example for reference.\n');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:5500', // Live Server
  'http://127.0.0.1:3000',
  'http://192.168.1.61:3000', // Your network IP for http-server
  process.env.FRONTEND_URL // Production (e.g., Netlify)
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Body parser middleware
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`🌐 Request: ${req.method} ${req.url}`);
  next();
});

// Direct GET /api/batches route (workaround - defined early)
app.get("/api/batches", async (req, res) => {
  console.log("🔍 GET /api/batches called (direct route)");
  try {
    const { medicine } = req.query;
    let query = {};
    
    if (medicine) {
      if (!mongoose.Types.ObjectId.isValid(medicine)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid medicine ID format'
        });
      }
      query.medicine = medicine;
    }
    
    const Batch = mongoose.model('Batch');
    const batches = await Batch.find(query)
      .populate('medicine', 'name manufacturer price')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: batches.length,
      batches
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// MongoDB connection
const mongoUri = process.env.MONGODB_URI;

mongoose.connect(mongoUri)
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => console.log("❌ MongoDB connection error:", err));

// Test route
app.get("/", (req, res) => {
  res.json({ 
    message: "Pharmacy Management System API",
    status: "running",
    endpoints: [
      "/api/medicines - GET/POST",
      "/api/batches - GET/POST", 
      "/api/locations - GET",
      "/api/generate-bill - POST",
      "/api/oneclick-fix - POST"
    ]
  });
});

// Import routes SAFELY
let loadedRoutes = [];

try {
  const testRoutes = require("./routes/testRoutes");
  app.use("/api", testRoutes);
  loadedRoutes.push("testRoutes");
  console.log("✅ Test routes loaded");
} catch (err) {
  console.log("⚠️ Test routes skipped:", err.message);
}

// ========== ADD AUTH ROUTES ==========
try {
  const authRoutes = require("./routes/authRoutes");
  app.use("/api", authRoutes);
  loadedRoutes.push("authRoutes");
  console.log("✅ Auth routes loaded");
} catch (err) {
  console.log("❌ Auth routes FAILED:", err.message);
}
// =====================================

try {
  const locationRoutes = require("./routes/locationRoutes");
  app.use("/api", locationRoutes);
  loadedRoutes.push("locationRoutes");
  console.log("✅ Location routes loaded");
} catch (err) {
  console.log("⚠️ Location routes skipped:", err.message);
}

try {
  const medicineRoutes = require("./routes/medicineRoutes");
  app.use("/api", medicineRoutes);
  loadedRoutes.push("medicineRoutes");
  console.log("✅ Medicine routes loaded");
} catch (err) {
  console.log("❌ Medicine routes FAILED:", err.message);
}

try {
  const batchListRoutes = require("./routes/batchListRoutes");
  app.use("/api", batchListRoutes);
  loadedRoutes.push("batchListRoutes");
  console.log("✅ Batch list routes loaded");
} catch (err) {
  console.log("❌ Batch list routes FAILED:", err.message);
}

try {
  const batchRoutes = require("./routes/batchRoutes");
  app.use("/api", batchRoutes);
  loadedRoutes.push("batchRoutes");
  console.log("✅ Batch routes loaded");
  console.log("📋 Batch routes mounted at /api");
} catch (err) {
  console.log("❌ Batch routes FAILED:", err.message);
}

try {
  const billingRoutes = require("./routes/billingRoutes");
  app.use("/api", billingRoutes);
  loadedRoutes.push("billingRoutes");
  console.log("✅ Billing routes loaded");
} catch (err) {
  console.log("❌ Billing routes FAILED:", err.message);
}

// Auto-heal service (optional)
try {
  require('./services/autoHeal');
  console.log('✅ Auto-heal service started');
} catch (err) {
  console.log('⚠️ Auto-heal service skipped:', err.message);
}

// Startup check
mongoose.connection.once('open', async () => {
  console.log('📊 Startup check running...');
  
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📁 Collections: ${collections.map(c => c.name).join(', ')}`);
    
    if (collections.some(c => c.name === 'batches')) {
      const indexes = await db.collection('batches').indexes();
      const problemIndex = indexes.find(idx => 
        idx.name === 'location_1' && idx.unique === true
      );
      if (problemIndex) {
        console.log('⚠️  Found problematic unique index on location field');
        console.log('💡 Run POST /api/oneclick-fix to remove it');
      }
    }
    
  } catch (err) {
    console.log('Startup check error:', err.message);
  }
});

// Alert routes
try {
  const alertRoutes = require("./routes/alertRoutes");
  app.use("/api", alertRoutes);
  loadedRoutes.push("alertRoutes");
  console.log("✅ Alert routes loaded");
} catch (err) {
  console.log("❌ Alert routes FAILED:", err.message);
}

// Static file serving (after all API routes)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// SPA fallback - serve index.html for all non-API routes
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
  } else {
    next();
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  if (process.env.NODE_ENV === 'production') {
    res.status(err.status || 500).json({
      success: false,
      error: err.name || 'ServerError',
      message: err.message || 'Internal server error'
    });
  } else {
    res.status(err.status || 500).json({
      success: false,
      error: err.name || 'ServerError',
      message: err.message || 'Internal server error',
      stack: err.stack
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log(`📋 Loaded ${loadedRoutes.length} routes: ${loadedRoutes.join(', ')}`);
});