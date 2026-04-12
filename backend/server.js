const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require('dotenv').config({ quiet: true });

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ ERROR: Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));

// CORS — allow any localhost port for local development
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'http://192.168.1.61:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('onrender.com') || origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Body parser
app.use(express.json());

// Direct GET /api/batches route (workaround - defined early)
app.get("/api/batches", async (req, res) => {
  try {
    const { medicine } = req.query;
    let query = {};
    if (medicine) {
      if (!mongoose.Types.ObjectId.isValid(medicine)) {
        return res.status(400).json({ success: false, error: 'Invalid medicine ID format' });
      }
      query.medicine = medicine;
    }
    const Batch = mongoose.model('Batch');
    const batches = await Batch.find(query)
      .populate('medicine', 'name manufacturer price')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: batches.length, batches });
  } catch (err) {
    console.error('❌ Error in GET /api/batches:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// API Health check route
app.get("/api", (req, res) => {
  res.json({ message: "Om Medical API", status: "running" });
});

// Load routes (silently — only log errors)
const routes = [
  { name: 'testRoutes',      path: './routes/testRoutes' },
  { name: 'authRoutes',      path: './routes/authRoutes' },
  { name: 'locationRoutes',  path: './routes/locationRoutes' },
  { name: 'medicineRoutes',  path: './routes/medicineRoutes' },
  { name: 'batchListRoutes', path: './routes/batchListRoutes' },
  { name: 'batchRoutes',     path: './routes/batchRoutes' },
  { name: 'billingRoutes',   path: './routes/billingRoutes' },
  { name: 'alertRoutes',     path: './routes/alertRoutes' },
];

routes.forEach(({ name, path: rPath }) => {
  try {
    const router = require(rPath);
    // Use the default export (the router) for mounting
    app.use("/api", typeof router === 'function' ? router : router.default || router);
  } catch (err) {
    console.error(`❌ Route failed to load [${name}]: ${err.message}`);
  }
});

// Auto-create admin account once DB is ready
mongoose.connection.once('open', async () => {
  try {
    const { ensureAdminExists } = require('./routes/authRoutes');
    if (ensureAdminExists) await ensureAdminExists();
  } catch (err) {
    console.error('❌ Admin seed error:', err.message);
  }
});

// Auto-heal service (optional)
try {
  require('./services/autoHeal');
} catch (err) {
  // Not critical — skip silently
}

// Startup check — only warn if there's a problematic index
mongoose.connection.once('open', async () => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    if (collections.some(c => c.name === 'batches')) {
      const indexes = await db.collection('batches').indexes();
      const problemIndex = indexes.find(idx => idx.name === 'location_1' && idx.unique === true);
      if (problemIndex) {
        console.warn('⚠️  Problematic unique index on batches.location — run POST /api/oneclick-fix to remove it');
      }
    }
  } catch (err) {
    console.error('❌ Startup check error:', err.message);
  }
});

// Static file serving - NO CACHING during development to fix sync issues
app.use(express.static(path.join(__dirname, '../frontend/public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
}));

app.get("/api/force-upload", async (req, res) => {
  const fs = require('fs');
  const csv = require('csv-parser');
  const path = require('path');
  const Medicine = mongoose.model('Medicine');
  const Batch = mongoose.model('Batch');
  const results = [];
  try {
    fs.createReadStream(path.join(__dirname, 'real-medicines.csv'))
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let added = 0;
        for (let row of results) {
          if (!row.medicine_name && !row.name) continue;
          let med = await Medicine.findOne({ name: row.medicine_name || row.name });
          if (!med) {
             med = new Medicine({
               name: row.medicine_name || row.name,
               manufacturer: row.manufacturer || 'Unknown',
               stockLimit: parseInt(row.stock_limit) || 20
             });
             await med.save();
             const batch = new Batch({
               medicine: med._id,
               quantity: parseInt(row.quantity) || parseInt(row.initial_stock) || 50,
               price: parseFloat(row.price) || 15.00,
               expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
             });
             await batch.save();
             med.totalStock += batch.quantity;
             await med.save();
             added++;
          }
        }
        res.json({ success: true, count: added, totalCsv: results.length });
      });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// SPA fallback
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
  } else {
    next();
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'ServerError',
    message: err.message || 'Internal server error'
  });
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});