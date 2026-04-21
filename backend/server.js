const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (same-origin, curl, mobile apps, etc.)
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/clients', require('./routes/clients'));
app.use('/api/sites', require('./routes/sites'));
app.use('/api/systems', require('./routes/systems'));

// Dashboard stats endpoint
const db = require('./database');
app.get('/api/stats', (req, res) => {
  const stats = {
    clients: db.prepare('SELECT COUNT(*) as count FROM clients').get().count,
    sites: db.prepare('SELECT COUNT(*) as count FROM sites').get().count,
    systems: db.prepare('SELECT COUNT(*) as count FROM plc_systems').get().count,
    initial_walk: db.prepare("SELECT COUNT(*) as count FROM plc_systems WHERE walk_status = 'initial'").get().count,
    detailed: db.prepare("SELECT COUNT(*) as count FROM plc_systems WHERE walk_status = 'detailed'").get().count,
    photos: db.prepare('SELECT COUNT(*) as count FROM photos').get().count,
    backups: db.prepare('SELECT COUNT(*) as count FROM program_backups').get().count,
    manufacturers: db.prepare("SELECT manufacturer, COUNT(*) as count FROM plc_systems WHERE manufacturer IS NOT NULL AND manufacturer != '' GROUP BY manufacturer ORDER BY count DESC LIMIT 10").all(),
    recent_systems: db.prepare(`
      SELECT p.id, p.name, p.manufacturer, p.model, p.walk_status, p.updated_at,
             s.name as site_name, c.name as client_name
      FROM plc_systems p
      JOIN sites s ON s.id = p.site_id
      JOIN clients c ON c.id = s.client_id
      ORDER BY p.updated_at DESC LIMIT 5
    `).all()
  };
  res.json(stats);
});

// Serve React frontend in production
const frontendBuild = path.join(__dirname, '../frontend/build');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// Multer / file-upload error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size exceeded.' });
  }
  if (err && err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`PLC Inventory API running on http://localhost:${PORT}`);
});

module.exports = app;
