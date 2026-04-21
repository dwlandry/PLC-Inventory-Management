const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, 'plc_inventory.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      address TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      latitude REAL,
      longitude REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS plc_systems (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      name TEXT NOT NULL,
      manufacturer TEXT,
      model TEXT,
      plc_type TEXT,
      series TEXT,
      firmware_version TEXT,
      serial_number TEXT,
      location_description TEXT,
      latitude REAL,
      longitude REAL,
      ip_address TEXT,
      subnet_mask TEXT,
      gateway TEXT,
      communication_protocols TEXT DEFAULT '[]',
      hardware_requirements TEXT DEFAULT '{}',
      software_requirements TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active',
      install_date TEXT,
      end_of_life_date TEXT,
      warranty_expiry TEXT,
      notes TEXT,
      walk_status TEXT DEFAULT 'initial',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hmis (
      id TEXT PRIMARY KEY,
      plc_system_id TEXT NOT NULL,
      manufacturer TEXT,
      model TEXT,
      software TEXT,
      ip_address TEXT,
      connection_method TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plc_system_id) REFERENCES plc_systems(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      plc_system_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      caption TEXT,
      latitude REAL,
      longitude REAL,
      taken_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plc_system_id) REFERENCES plc_systems(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS program_backups (
      id TEXT PRIMARY KEY,
      plc_system_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      version TEXT,
      backup_date TEXT,
      software_used TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plc_system_id) REFERENCES plc_systems(id) ON DELETE CASCADE
    );
  `);
}

initializeDatabase();

module.exports = db;
