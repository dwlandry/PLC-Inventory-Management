const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

// GET all sites (optionally filter by client)
router.get('/', (req, res) => {
  const { client_id } = req.query;
  let query = `
    SELECT s.*, c.name as client_name, COUNT(p.id) as system_count
    FROM sites s
    JOIN clients c ON c.id = s.client_id
    LEFT JOIN plc_systems p ON p.site_id = s.id
  `;
  const params = [];
  if (client_id) {
    query += ' WHERE s.client_id = ?';
    params.push(client_id);
  }
  query += ' GROUP BY s.id ORDER BY c.name, s.name';
  res.json(db.prepare(query).all(...params));
});

// GET single site with systems
router.get('/:id', (req, res) => {
  const site = db.prepare(`
    SELECT s.*, c.name as client_name
    FROM sites s JOIN clients c ON c.id = s.client_id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });

  const systems = db.prepare(`
    SELECT p.*, COUNT(ph.id) as photo_count, COUNT(b.id) as backup_count
    FROM plc_systems p
    LEFT JOIN photos ph ON ph.plc_system_id = p.id
    LEFT JOIN program_backups b ON b.plc_system_id = p.id
    WHERE p.site_id = ?
    GROUP BY p.id
    ORDER BY p.name
  `).all(req.params.id);

  res.json({ ...site, systems });
});

// POST create site
router.post('/', (req, res) => {
  const { client_id, name, address, latitude, longitude, notes } = req.body;
  if (!client_id || !name) return res.status(400).json({ error: 'client_id and name are required' });

  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(client_id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO sites (id, client_id, name, address, latitude, longitude, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, client_id, name, address, latitude || null, longitude || null, notes);

  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(id);
  res.status(201).json(site);
});

// PUT update site
router.put('/:id', (req, res) => {
  const { name, address, latitude, longitude, notes } = req.body;
  const existing = db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Site not found' });

  db.prepare(`
    UPDATE sites SET name=?, address=?, latitude=?, longitude=?, notes=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(name || existing.name, address, latitude || null, longitude || null, notes, req.params.id);

  res.json(db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id));
});

// DELETE site
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Site not found' });

  db.prepare('DELETE FROM sites WHERE id = ?').run(req.params.id);
  res.json({ message: 'Site deleted' });
});

module.exports = router;
