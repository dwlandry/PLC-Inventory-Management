import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { systemsApi, getPhotoUrl } from '../api';
import {
  Server, MapPin, Camera, HardDrive, Edit2, Trash2, Plus,
  Download, X, Loader, ChevronRight, Wifi, Monitor, Check,
  AlertTriangle, Upload, Eye, ExternalLink
} from 'lucide-react';

function Section({ title, icon: Icon, children, action }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          {Icon && <Icon size={18} className="text-blue-600" />}
          {title}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function HmiModal({ systemId, hmi, onSave, onClose }) {
  const [form, setForm] = useState(hmi || { manufacturer: '', model: '', software: '', ip_address: '', connection_method: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (hmi?.id) {
        await systemsApi.updateHmi(systemId, hmi.id, form);
      } else {
        await systemsApi.createHmi(systemId, form);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  const f = (key) => ({ value: form[key] || '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{hmi ? 'Edit HMI' : 'Add HMI'}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <input className="input-field" placeholder="Manufacturer" {...f('manufacturer')} />
        <input className="input-field" placeholder="Model / Part Number" {...f('model')} />
        <input className="input-field" placeholder="Software (e.g. FactoryTalk View)" {...f('software')} />
        <input className="input-field" placeholder="IP Address" {...f('ip_address')} />
        <input className="input-field" placeholder="Connection Method (e.g. Ethernet, USB)" {...f('connection_method')} />
        <textarea className="input-field resize-none" rows={2} placeholder="Notes" {...f('notes')} />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function BackupModal({ systemId, onSave, onClose }) {
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState('');
  const [backupDate, setBackupDate] = useState(new Date().toISOString().slice(0, 10));
  const [software, setSoftware] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!file) { alert('Please select a file'); return; }
    setSaving(true);
    const fd = new FormData();
    fd.append('backup', file);
    fd.append('version', version);
    fd.append('backup_date', backupDate);
    fd.append('software_used', software);
    fd.append('notes', notes);
    try {
      await systemsApi.uploadBackup(systemId, fd);
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Upload Program Backup</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div>
          <label className="label-text">Program File *</label>
          <input type="file" className="input-field" onChange={e => setFile(e.target.files[0])} />
        </div>
        <input className="input-field" placeholder="Version (e.g. v2.1)" value={version} onChange={e => setVersion(e.target.value)} />
        <div>
          <label className="label-text">Backup Date</label>
          <input className="input-field" type="date" value={backupDate} onChange={e => setBackupDate(e.target.value)} />
        </div>
        <input className="input-field" placeholder="Software used (e.g. Studio 5000 v32)" value={software} onChange={e => setSoftware(e.target.value)} />
        <textarea className="input-field resize-none" rows={2} placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving || !file} className="btn-primary flex-1">
            {saving ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SystemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHmiModal, setShowHmiModal] = useState(false);
  const [editHmi, setEditHmi] = useState(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const photoInputRef = useRef(null);

  const load = () => systemsApi.getOne(id).then(setSystem).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${system.name}"? This cannot be undone.`)) return;
    try {
      await systemsApi.delete(id);
      navigate('/systems');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const fd = new FormData();
      fd.append('photo', file);
      try {
        await systemsApi.uploadPhoto(id, fd);
      } catch {}
    }
    load();
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Delete this photo?')) return;
    await systemsApi.deletePhoto(id, photoId);
    load();
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Delete this backup?')) return;
    await systemsApi.deleteBackup(id, backupId);
    load();
  };

  const handleDeleteHmi = async (hmiId) => {
    if (!window.confirm('Remove this HMI?')) return;
    await systemsApi.deleteHmi(id, hmiId);
    load();
  };

  const markDetailed = async () => {
    await systemsApi.update(id, { walk_status: 'detailed' });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-40"><Loader className="animate-spin text-blue-600" size={28} /></div>;
  if (!system) return <div className="card p-6 text-center text-gray-500">System not found</div>;

  const isEol = system.end_of_life_date && new Date(system.end_of_life_date) < new Date();
  const protocols = system.communication_protocols || [];
  const hw = system.hardware_requirements || {};
  const sw = system.software_requirements || {};

  return (
    <div className="space-y-4 pb-20">
      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
        <Link to="/clients" className="hover:text-blue-600">Clients</Link>
        <ChevronRight size={12} />
        <Link to={`/clients/${system.client_id}`} className="hover:text-blue-600">{system.client_name}</Link>
        <ChevronRight size={12} />
        <Link to={`/sites/${system.site_id}`} className="hover:text-blue-600">{system.site_name}</Link>
        <ChevronRight size={12} />
        <span className="text-gray-900">{system.name}</span>
      </div>

      {/* Header card */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isEol ? 'bg-red-100' : 'bg-blue-100'}`}>
            <Server size={24} className={isEol ? 'text-red-600' : 'text-blue-600'} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{system.name}</h1>
              <span className={system.walk_status === 'initial' ? 'badge-initial' : 'badge-detailed'}>
                {system.walk_status}
              </span>
              {isEol && <span className="badge-eol flex items-center gap-1"><AlertTriangle size={10} />EOL</span>}
            </div>
            {(system.manufacturer || system.model) && (
              <p className="text-sm text-gray-600 mt-0.5">
                {[system.manufacturer, system.model, system.series].filter(Boolean).join(' › ')}
              </p>
            )}
            {system.location_description && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin size={13} /> {system.location_description}
              </p>
            )}
            {system.latitude && system.longitude && (
              <a
                href={`https://maps.google.com/?q=${system.latitude},${system.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 font-mono flex items-center gap-1 mt-0.5 hover:underline"
              >
                📍 {system.latitude}, {system.longitude} <ExternalLink size={10} />
              </a>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Link to={`/systems/${id}/edit`} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
              <Edit2 size={18} />
            </Link>
            <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {system.notes && (
          <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">{system.notes}</p>
        )}

        {system.walk_status === 'initial' && (
          <button onClick={markDetailed} className="mt-3 w-full flex items-center justify-center gap-2 py-2 border-2 border-green-500 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors">
            <Check size={16} /> Mark as Fully Documented
          </button>
        )}
      </div>

      {/* System Details */}
      <Section title="System Details" icon={Server}>
        <InfoRow label="PLC Type" value={system.plc_type} />
        <InfoRow label="Firmware" value={system.firmware_version} />
        <InfoRow label="Serial Number" value={system.serial_number} mono />
        <InfoRow label="Status" value={system.status} />
        <InfoRow label="Install Date" value={system.install_date} />
        <InfoRow label="End of Life" value={system.end_of_life_date} />
        <InfoRow label="Warranty Expiry" value={system.warranty_expiry} />
        {!system.manufacturer && !system.model && !system.plc_type && (
          <p className="text-sm text-gray-400 text-center py-2">No details yet. <Link to={`/systems/${id}/edit`} className="text-blue-500 hover:underline">Edit to add details</Link></p>
        )}
      </Section>

      {/* Network */}
      <Section title="Network / Communications" icon={Wifi}>
        <InfoRow label="IP Address" value={system.ip_address} mono />
        <InfoRow label="Subnet Mask" value={system.subnet_mask} mono />
        <InfoRow label="Gateway" value={system.gateway} mono />
        {protocols.length > 0 && (
          <div className="py-1.5">
            <span className="text-xs text-gray-500 block mb-1">Protocols</span>
            <div className="flex flex-wrap gap-1.5">
              {protocols.map((p, i) => (
                <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{p}</span>
              ))}
            </div>
          </div>
        )}
        {!system.ip_address && protocols.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">No network info. <Link to={`/systems/${id}/edit`} className="text-blue-500 hover:underline">Edit to add</Link></p>
        )}
      </Section>

      {/* Hardware Requirements */}
      <Section title="Hardware Requirements" icon={Server}>
        {hw.cable_type && <InfoRow label="Cable Type" value={hw.cable_type} />}
        {hw.adapter && <InfoRow label="Adapter / Converter" value={hw.adapter} />}
        {hw.programmer_device && <InfoRow label="Programming Device" value={hw.programmer_device} />}
        {hw.other && <InfoRow label="Other" value={hw.other} />}
        {!hw.cable_type && !hw.adapter && !hw.programmer_device && (
          <p className="text-sm text-gray-400 text-center py-2">No hardware requirements. <Link to={`/systems/${id}/edit`} className="text-blue-500 hover:underline">Edit to add</Link></p>
        )}
      </Section>

      {/* Software Requirements */}
      <Section title="Software Requirements" icon={Monitor}>
        {sw.programming_software && <InfoRow label="Programming Software" value={sw.programming_software} />}
        {sw.version && <InfoRow label="Version" value={sw.version} />}
        {sw.os && <InfoRow label="OS Requirement" value={sw.os} />}
        {sw.license && <InfoRow label="License Type" value={sw.license} />}
        {sw.other && <InfoRow label="Other" value={sw.other} />}
        {!sw.programming_software && !sw.version && (
          <p className="text-sm text-gray-400 text-center py-2">No software requirements. <Link to={`/systems/${id}/edit`} className="text-blue-500 hover:underline">Edit to add</Link></p>
        )}
      </Section>

      {/* HMIs */}
      <Section
        title={`HMIs (${system.hmis?.length || 0})`}
        icon={Monitor}
        action={
          <button onClick={() => { setEditHmi(null); setShowHmiModal(true); }} className="text-blue-600 hover:text-blue-700 p-1">
            <Plus size={18} />
          </button>
        }
      >
        {system.hmis?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">No HMIs recorded</p>
        ) : (
          <div className="space-y-3">
            {system.hmis.map(hmi => (
              <div key={hmi.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{hmi.manufacturer} {hmi.model}</p>
                    {hmi.software && <p className="text-xs text-gray-600 mt-0.5">Software: {hmi.software}</p>}
                    {hmi.ip_address && <p className="text-xs text-gray-500 font-mono mt-0.5">{hmi.ip_address}</p>}
                    {hmi.connection_method && <p className="text-xs text-gray-500 mt-0.5">Connect via: {hmi.connection_method}</p>}
                    {hmi.notes && <p className="text-xs text-gray-400 mt-1">{hmi.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditHmi(hmi); setShowHmiModal(true); }} className="p-1 text-blue-400 hover:text-blue-600">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDeleteHmi(hmi.id)} className="p-1 text-red-400 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Photos */}
      <Section
        title={`Photos (${system.photos?.length || 0})`}
        icon={Camera}
        action={
          <button onClick={() => photoInputRef.current?.click()} className="text-blue-600 hover:text-blue-700 p-1">
            <Plus size={18} />
          </button>
        }
      >
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handlePhotoUpload}
          className="hidden"
        />
        {system.photos?.length === 0 ? (
          <div className="text-center py-4">
            <Camera size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No photos yet</p>
            <button onClick={() => photoInputRef.current?.click()} className="mt-2 btn-secondary text-sm inline-flex items-center gap-1">
              <Camera size={14} /> Add Photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {system.photos.map(photo => (
              <div key={photo.id} className="relative group">
                <img
                  src={getPhotoUrl(photo.filename)}
                  alt={photo.caption || 'PLC photo'}
                  className="w-full h-24 object-cover rounded-lg cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                />
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <button
              onClick={() => photoInputRef.current?.click()}
              className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        )}
      </Section>

      {/* Program Backups */}
      <Section
        title={`Program Backups (${system.backups?.length || 0})`}
        icon={HardDrive}
        action={
          <button onClick={() => setShowBackupModal(true)} className="text-blue-600 hover:text-blue-700 p-1">
            <Plus size={18} />
          </button>
        }
      >
        {system.backups?.length === 0 ? (
          <div className="text-center py-4">
            <HardDrive size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No backups uploaded</p>
            <button onClick={() => setShowBackupModal(true)} className="mt-2 btn-secondary text-sm inline-flex items-center gap-1">
              <Upload size={14} /> Upload Backup
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {system.backups.map(backup => (
              <div key={backup.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <HardDrive size={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{backup.original_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {backup.version && <span className="text-xs text-gray-500">v{backup.version}</span>}
                    {backup.backup_date && <span className="text-xs text-gray-500">{backup.backup_date}</span>}
                    {backup.software_used && <span className="text-xs text-gray-400">{backup.software_used}</span>}
                  </div>
                  {backup.notes && <p className="text-xs text-gray-400 mt-1">{backup.notes}</p>}
                </div>
                <div className="flex gap-1">
                  <a
                    href={systemsApi.downloadBackup(id, backup.id)}
                    download
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                    title="Download"
                  >
                    <Download size={16} />
                  </a>
                  <button onClick={() => handleDeleteBackup(backup.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Modals */}
      {showHmiModal && (
        <HmiModal
          systemId={id}
          hmi={editHmi}
          onSave={() => { setShowHmiModal(false); setEditHmi(null); load(); }}
          onClose={() => { setShowHmiModal(false); setEditHmi(null); }}
        />
      )}
      {showBackupModal && (
        <BackupModal
          systemId={id}
          onSave={() => { setShowBackupModal(false); load(); }}
          onClose={() => setShowBackupModal(false)}
        />
      )}

      {/* Photo lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <img
            src={getPhotoUrl(selectedPhoto.filename)}
            alt={selectedPhoto.caption || 'PLC photo'}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <button className="absolute top-4 right-4 text-white" onClick={() => setSelectedPhoto(null)}>
            <X size={28} />
          </button>
          {selectedPhoto.caption && (
            <p className="absolute bottom-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">{selectedPhoto.caption}</p>
          )}
        </div>
      )}
    </div>
  );
}
