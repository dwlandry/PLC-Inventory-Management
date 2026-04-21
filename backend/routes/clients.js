const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

// GET all clients
router.get('/', (req, res) => {
  const clients = db.prepare(`
    SELECT c.*, COUNT(s.id) as site_count
    FROM clients c
    LEFT JOIN sites s ON s.client_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `).all();
  res.json(clients);
});

// GET single client with sites
router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const sites = db.prepare(`
    SELECT s.*, COUNT(p.id) as system_count
    FROM sites s
    LEFT JOIN plc_systems p ON p.site_id = s.id
    WHERE s.client_id = ?
    GROUP BY s.id
    ORDER BY s.name
  `).all(req.params.id);

  res.json({ ...client, sites });
});

// POST create client
router.post('/', (req, res) => {
  const { name, contact_name, contact_email, contact_phone, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO clients (id, name, contact_name, contact_email, contact_phone, address, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, contact_name, contact_email, contact_phone, address, notes);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  res.status(201).json(client);
});

// PUT update client
router.put('/:id', (req, res) => {
  const { name, contact_name, contact_email, contact_phone, address, notes } = req.body;
  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  db.prepare(`
    UPDATE clients SET name=?, contact_name=?, contact_email=?, contact_phone=?, address=?, notes=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(name || existing.name, contact_name, contact_email, contact_phone, address, notes, req.params.id);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  res.json(client);
});

// DELETE client
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ message: 'Client deleted' });
});

module.exports = router;
