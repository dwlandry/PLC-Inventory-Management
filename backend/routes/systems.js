const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Normalize GPS coordinate: treat undefined/null/empty-string as NULL,
// but preserve valid values including 0.
const toCoord = (val) => (val === undefined || val === null || val === '') ? null : val;

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];

const ALLOWED_BACKUP_EXTS = [
  '.acd', '.ap', '.ap15', '.mer', '.rsp', '.rsd', '.gx3', '.gxw', '.zap15',
  '.zip', '.7z', '.gz', '.tar', '.pdf', '.txt', '.csv', '.bin', '.bak'
];

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/photos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const backupStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_PHOTO_TYPES.includes(file.mimetype) || ALLOWED_PHOTO_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for photos'));
    }
  }
});
const uploadBackup = multer({
  storage: backupStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_BACKUP_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed for program backups'));
    }
  }
});

// GET all systems (with optional filters)
router.get('/', (req, res) => {
  const { site_id, walk_status, search } = req.query;
  let query = `
    SELECT p.*, s.name as site_name, c.name as client_name,
           COUNT(DISTINCT ph.id) as photo_count,
           COUNT(DISTINCT b.id) as backup_count,
           COUNT(DISTINCT h.id) as hmi_count
    FROM plc_systems p
    JOIN sites s ON s.id = p.site_id
    JOIN clients c ON c.id = s.client_id
    LEFT JOIN photos ph ON ph.plc_system_id = p.id
    LEFT JOIN program_backups b ON b.plc_system_id = p.id
    LEFT JOIN hmis h ON h.plc_system_id = p.id
  `;
  const conditions = [];
  const params = [];

  if (site_id) { conditions.push('p.site_id = ?'); params.push(site_id); }
  if (walk_status) { conditions.push('p.walk_status = ?'); params.push(walk_status); }
  if (search) {
    conditions.push('(p.name LIKE ? OR p.manufacturer LIKE ? OR p.model LIKE ? OR p.location_description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' GROUP BY p.id ORDER BY c.name, s.name, p.name';

  res.json(db.prepare(query).all(...params));
});

// GET single system with full details
router.get('/:id', (req, res) => {
  const system = db.prepare(`
    SELECT p.*, s.name as site_name, s.id as site_id, c.name as client_name, c.id as client_id
    FROM plc_systems p
    JOIN sites s ON s.id = p.site_id
    JOIN clients c ON c.id = s.client_id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!system) return res.status(404).json({ error: 'System not found' });

  const photos = db.prepare('SELECT * FROM photos WHERE plc_system_id = ? ORDER BY created_at DESC').all(req.params.id);
  const hmis = db.prepare('SELECT * FROM hmis WHERE plc_system_id = ? ORDER BY created_at').all(req.params.id);
  const backups = db.prepare('SELECT * FROM program_backups WHERE plc_system_id = ? ORDER BY created_at DESC').all(req.params.id);

  // Parse JSON fields
  try { system.communication_protocols = JSON.parse(system.communication_protocols || '[]'); } catch { system.communication_protocols = []; }
  try { system.hardware_requirements = JSON.parse(system.hardware_requirements || '{}'); } catch { system.hardware_requirements = {}; }
  try { system.software_requirements = JSON.parse(system.software_requirements || '{}'); } catch { system.software_requirements = {}; }

  res.json({ ...system, photos, hmis, backups });
});

// POST create system (quick initial walk entry)
router.post('/', (req, res) => {
  const {
    site_id, name, manufacturer, model, plc_type, series, firmware_version,
    serial_number, location_description, latitude, longitude,
    ip_address, subnet_mask, gateway, communication_protocols,
    hardware_requirements, software_requirements, status, install_date,
    end_of_life_date, warranty_expiry, notes, walk_status
  } = req.body;

  if (!site_id || !name) return res.status(400).json({ error: 'site_id and name are required' });

  const site = db.prepare('SELECT id FROM sites WHERE id = ?').get(site_id);
  if (!site) return res.status(404).json({ error: 'Site not found' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO plc_systems (
      id, site_id, name, manufacturer, model, plc_type, series, firmware_version,
      serial_number, location_description, latitude, longitude,
      ip_address, subnet_mask, gateway, communication_protocols,
      hardware_requirements, software_requirements, status, install_date,
      end_of_life_date, warranty_expiry, notes, walk_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, site_id, name, manufacturer, model, plc_type, series, firmware_version,
    serial_number, location_description,
    toCoord(latitude), toCoord(longitude),
    ip_address, subnet_mask, gateway,
    JSON.stringify(communication_protocols || []),
    JSON.stringify(hardware_requirements || {}),
    JSON.stringify(software_requirements || {}),
    status || 'active', install_date, end_of_life_date, warranty_expiry, notes,
    walk_status || 'initial'
  );

  res.status(201).json(db.prepare('SELECT * FROM plc_systems WHERE id = ?').get(id));
});

// PUT update system
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM plc_systems WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'System not found' });

  const {
    name, manufacturer, model, plc_type, series, firmware_version,
    serial_number, location_description, latitude, longitude,
    ip_address, subnet_mask, gateway, communication_protocols,
    hardware_requirements, software_requirements, status, install_date,
    end_of_life_date, warranty_expiry, notes, walk_status
  } = req.body;

  db.prepare(`
    UPDATE plc_systems SET
      name=?, manufacturer=?, model=?, plc_type=?, series=?, firmware_version=?,
      serial_number=?, location_description=?, latitude=?, longitude=?,
      ip_address=?, subnet_mask=?, gateway=?, communication_protocols=?,
      hardware_requirements=?, software_requirements=?, status=?, install_date=?,
      end_of_life_date=?, warranty_expiry=?, notes=?, walk_status=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    name || existing.name, manufacturer, model, plc_type, series, firmware_version,
    serial_number, location_description,
    latitude !== undefined ? latitude : existing.latitude,
    longitude !== undefined ? longitude : existing.longitude,
    ip_address, subnet_mask, gateway,
    communication_protocols !== undefined ? JSON.stringify(communication_protocols) : existing.communication_protocols,
    hardware_requirements !== undefined ? JSON.stringify(hardware_requirements) : existing.hardware_requirements,
    software_requirements !== undefined ? JSON.stringify(software_requirements) : existing.software_requirements,
    status || existing.status, install_date, end_of_life_date, warranty_expiry, notes,
    walk_status || existing.walk_status,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM plc_systems WHERE id = ?').get(req.params.id));
});

// DELETE system
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM plc_systems WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'System not found' });
  db.prepare('DELETE FROM plc_systems WHERE id = ?').run(req.params.id);
  res.json({ message: 'System deleted' });
});

// POST upload photo
router.post('/:id/photos', (req, res, next) => {
  const system = db.prepare('SELECT id FROM plc_systems WHERE id = ?').get(req.params.id);
  if (!system) return res.status(404).json({ error: 'System not found' });
  next();
}, uploadPhoto.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { caption, latitude, longitude, taken_at } = req.body;
  const photoId = uuidv4();
  try {
    db.prepare(`
      INSERT INTO photos (id, plc_system_id, filename, original_name, caption, latitude, longitude, taken_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(photoId, req.params.id, req.file.filename, req.file.originalname, caption,
      toCoord(latitude), toCoord(longitude), taken_at || null);
  } catch (err) {
    console.error('Failed to save photo record:', err);
    return res.status(500).json({ error: 'Failed to save photo record to database' });
  }
  res.status(201).json(db.prepare('SELECT * FROM photos WHERE id = ?').get(photoId));
});

// DELETE photo
router.delete('/:id/photos/:photoId', (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ? AND plc_system_id = ?').get(req.params.photoId, req.params.id);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const filePath = path.join(__dirname, '../uploads/photos', photo.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.photoId);
  res.json({ message: 'Photo deleted' });
});

// POST upload program backup
router.post('/:id/backups', (req, res, next) => {
  const system = db.prepare('SELECT id FROM plc_systems WHERE id = ?').get(req.params.id);
  if (!system) return res.status(404).json({ error: 'System not found' });
  next();
}, uploadBackup.single('backup'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { version, backup_date, software_used, notes } = req.body;
  const backupId = uuidv4();
  try {
    db.prepare(`
      INSERT INTO program_backups (id, plc_system_id, filename, original_name, version, backup_date, software_used, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(backupId, req.params.id, req.file.filename, req.file.originalname, version, backup_date, software_used, notes);
  } catch (err) {
    console.error('Failed to save backup record:', err);
    return res.status(500).json({ error: 'Failed to save backup record to database' });
  }
  res.status(201).json(db.prepare('SELECT * FROM program_backups WHERE id = ?').get(backupId));
});

// GET download backup
router.get('/:id/backups/:backupId/download', (req, res) => {
  const backup = db.prepare('SELECT * FROM program_backups WHERE id = ? AND plc_system_id = ?').get(req.params.backupId, req.params.id);
  if (!backup) return res.status(404).json({ error: 'Backup not found' });

  const filePath = path.join(__dirname, '../uploads/backups', backup.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });
  res.download(filePath, backup.original_name);
});

// DELETE backup
router.delete('/:id/backups/:backupId', (req, res) => {
  const backup = db.prepare('SELECT * FROM program_backups WHERE id = ? AND plc_system_id = ?').get(req.params.backupId, req.params.id);
  if (!backup) return res.status(404).json({ error: 'Backup not found' });

  const filePath = path.join(__dirname, '../uploads/backups', backup.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM program_backups WHERE id = ?').run(req.params.backupId);
  res.json({ message: 'Backup deleted' });
});

// POST add HMI to system
router.post('/:id/hmis', (req, res) => {
  const system = db.prepare('SELECT id FROM plc_systems WHERE id = ?').get(req.params.id);
  if (!system) return res.status(404).json({ error: 'System not found' });

  const { manufacturer, model, software, ip_address, connection_method, notes } = req.body;
  const hmiId = uuidv4();
  db.prepare(`
    INSERT INTO hmis (id, plc_system_id, manufacturer, model, software, ip_address, connection_method, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(hmiId, req.params.id, manufacturer, model, software, ip_address, connection_method, notes);
  res.status(201).json(db.prepare('SELECT * FROM hmis WHERE id = ?').get(hmiId));
});

// PUT update HMI
router.put('/:id/hmis/:hmiId', (req, res) => {
  const { manufacturer, model, software, ip_address, connection_method, notes } = req.body;
  const hmi = db.prepare('SELECT * FROM hmis WHERE id = ? AND plc_system_id = ?').get(req.params.hmiId, req.params.id);
  if (!hmi) return res.status(404).json({ error: 'HMI not found' });

  db.prepare(`
    UPDATE hmis SET manufacturer=?, model=?, software=?, ip_address=?, connection_method=?, notes=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(manufacturer, model, software, ip_address, connection_method, notes, req.params.hmiId);
  res.json(db.prepare('SELECT * FROM hmis WHERE id = ?').get(req.params.hmiId));
});

// DELETE HMI
router.delete('/:id/hmis/:hmiId', (req, res) => {
  const hmi = db.prepare('SELECT * FROM hmis WHERE id = ? AND plc_system_id = ?').get(req.params.hmiId, req.params.id);
  if (!hmi) return res.status(404).json({ error: 'HMI not found' });
  db.prepare('DELETE FROM hmis WHERE id = ?').run(req.params.hmiId);
  res.json({ message: 'HMI deleted' });
});

module.exports = router;
