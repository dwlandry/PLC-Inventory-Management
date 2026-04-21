import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Camera, X, Check, ChevronDown, Plus,
  Loader, AlertCircle, Server, Navigation
} from 'lucide-react';
import { clientsApi, sitesApi, systemsApi } from '../api';

const PLC_MANUFACTURERS = [
  'Allen-Bradley / Rockwell Automation',
  'Siemens',
  'Mitsubishi Electric',
  'Omron',
  'Schneider Electric / Modicon',
  'GE / Emerson',
  'Beckhoff',
  'Keyence',
  'AutomationDirect',
  'ABB',
  'Phoenix Contact',
  'Wago',
  'Other',
];

const WALK_STEPS = ['client', 'location', 'plc', 'done'];

function StepIndicator({ current }) {
  const steps = ['Client/Site', 'Location', 'PLC Info', 'Done'];
  return (
    <div className="flex items-center gap-1 mb-4">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className={`flex items-center gap-1.5 ${i <= WALK_STEPS.indexOf(current) ? 'text-blue-700' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              i < WALK_STEPS.indexOf(current)
                ? 'bg-blue-600 border-blue-600 text-white'
                : i === WALK_STEPS.indexOf(current)
                ? 'border-blue-600 text-blue-600'
                : 'border-gray-300'
            }`}>
              {i < WALK_STEPS.indexOf(current) ? <Check size={12} /> : i + 1}
            </div>
            <span className="hidden sm:block text-xs font-medium">{label}</span>
          </div>
          {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < WALK_STEPS.indexOf(current) ? 'bg-blue-500' : 'bg-gray-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function InitialWalk() {
  const navigate = useNavigate();
  const [step, setStep] = useState('client');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Client/Site state
  const [clients, setClients] = useState([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [clientMode, setClientMode] = useState('existing'); // 'existing' | 'new'
  const [siteMode, setSiteMode] = useState('existing'); // 'existing' | 'new'
  const [sites, setSites] = useState([]);

  // Location state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationDescription, setLocationDescription] = useState('');

  // PLC state
  const [plcName, setPlcName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [plcType, setPlcType] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);

  const fileInputRef = useRef(null);
  const [savedSystemId, setSavedSystemId] = useState(null);

  // Load clients when step 1 loads
  const loadClients = useCallback(async () => {
    if (clientsLoaded) return;
    try {
      const data = await clientsApi.getAll();
      setClients(data);
      setClientsLoaded(true);
    } catch {
      setClients([]);
      setClientsLoaded(true);
    }
  }, [clientsLoaded]);

  React.useEffect(() => {
    if (step === 'client') loadClients();
  }, [step, loadClients]);

  const handleClientChange = async (clientId) => {
    setSelectedClientId(clientId);
    setSelectedSiteId('');
    if (clientId) {
      try {
        const data = await sitesApi.getAll({ client_id: clientId });
        setSites(data);
      } catch {
        setSites([]);
      }
    } else {
      setSites([]);
    }
  };

  const getGPS = () => {
    if (!navigator.geolocation) {
      setError('GPS not available on this device');
      return;
    }
    setGpsLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      (err) => {
        setError(`GPS error: ${err.message}`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).slice(2),
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (id) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter(p => p.id !== id);
    });
  };

  const validateAndNext = async () => {
    setError('');

    if (step === 'client') {
      if (clientMode === 'new' && !newClientName.trim()) {
        setError('Client name is required'); return;
      }
      if (clientMode === 'existing' && !selectedClientId) {
        setError('Please select a client or create a new one'); return;
      }
      if (siteMode === 'new' && !newSiteName.trim()) {
        setError('Site name is required'); return;
      }
      if (siteMode === 'existing' && !selectedSiteId) {
        setError('Please select a site or create a new one'); return;
      }
      setStep('location');
    } else if (step === 'location') {
      setStep('plc');
    } else if (step === 'plc') {
      if (!plcName.trim()) { setError('System name is required'); return; }
      await saveSystem();
    }
  };

  const saveSystem = async () => {
    setSaving(true);
    setError('');
    try {
      let clientId = selectedClientId;
      let siteId = selectedSiteId;

      // Create client if needed
      if (clientMode === 'new') {
        const client = await clientsApi.create({ name: newClientName.trim() });
        clientId = client.id;
      }

      // Create site if needed
      if (siteMode === 'new') {
        const site = await sitesApi.create({
          client_id: clientId,
          name: newSiteName.trim(),
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
        });
        siteId = site.id;
      }

      // Create PLC system
      const system = await systemsApi.create({
        site_id: siteId,
        name: plcName.trim(),
        manufacturer,
        model,
        plc_type: plcType,
        location_description: locationDescription,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        notes,
        walk_status: 'initial',
      });

      // Upload photos
      for (const photo of photos) {
        const fd = new FormData();
        fd.append('photo', photo.file);
        fd.append('latitude', latitude || '');
        fd.append('longitude', longitude || '');
        try {
          await systemsApi.uploadPhoto(system.id, fd);
        } catch {}
        URL.revokeObjectURL(photo.preview);
      }

      setSavedSystemId(system.id);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    // Keep client/site, reset PLC fields for next system
    setPhotos(prev => {
      prev.forEach(p => URL.revokeObjectURL(p.preview));
      return [];
    });
    setPlcName('');
    setManufacturer('');
    setModel('');
    setPlcType('');
    setLocationDescription('');
    setNotes('');
    setLatitude('');
    setLongitude('');
    setSavedSystemId(null);
    setStep('location');
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-20">
      <div className="flex items-center gap-2">
        <Server size={20} className="text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Initial Walk</h1>
      </div>

      <StepIndicator current={step} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-red-700 text-sm">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Client & Site */}
      {step === 'client' && (
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-gray-800">Client & Site</h2>

          {/* Client selection */}
          <div>
            <label className="label-text">Client</label>
            <div className="flex gap-2 mb-2">
              <button
                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${clientMode === 'existing' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}
                onClick={() => setClientMode('existing')}
              >Existing</button>
              <button
                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${clientMode === 'new' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}
                onClick={() => setClientMode('new')}
              >New Client</button>
            </div>
            {clientMode === 'existing' ? (
              <div className="relative">
                <select
                  className="input-field pr-8 appearance-none"
                  value={selectedClientId}
                  onChange={e => handleClientChange(e.target.value)}
                >
                  <option value="">Select client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            ) : (
              <input
                className="input-field"
                placeholder="Client name (e.g. DASF)"
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
              />
            )}
          </div>

          {/* Site selection */}
          <div>
            <label className="label-text">Site</label>
            <div className="flex gap-2 mb-2">
              <button
                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${siteMode === 'existing' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}
                onClick={() => setSiteMode('existing')}
                disabled={clientMode === 'new'}
              >Existing</button>
              <button
                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${siteMode === 'new' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}
                onClick={() => setSiteMode('new')}
              >New Site</button>
            </div>
            {siteMode === 'existing' ? (
              <div className="relative">
                <select
                  className="input-field pr-8 appearance-none"
                  value={selectedSiteId}
                  onChange={e => setSelectedSiteId(e.target.value)}
                  disabled={clientMode === 'new'}
                >
                  <option value="">Select site...</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            ) : (
              <input
                className="input-field"
                placeholder="Site name (e.g. Main Plant)"
                value={newSiteName}
                onChange={e => setNewSiteName(e.target.value)}
              />
            )}
          </div>

          <button onClick={validateAndNext} className="btn-primary w-full">Continue</button>
        </div>
      )}

      {/* Step 2: Location */}
      {step === 'location' && (
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-gray-800">Location</h2>

          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            <p className="font-medium">Tap "Get GPS" to capture your current location</p>
            <p className="text-blue-600 text-xs mt-0.5">GPS coordinates will be saved with this PLC system</p>
          </div>

          <button
            onClick={getGPS}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {gpsLoading ? <Loader size={18} className="animate-spin" /> : <Navigation size={18} />}
            {gpsLoading ? 'Getting GPS...' : 'Get GPS Location'}
          </button>

          {latitude && longitude && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <MapPin size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-800">Location captured</p>
                <p className="text-green-600 font-mono text-xs mt-0.5">{latitude}, {longitude}</p>
              </div>
            </div>
          )}

          <div>
            <label className="label-text">Manual Lat/Long (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input-field"
                placeholder="Latitude"
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                type="number"
                step="0.000001"
              />
              <input
                className="input-field"
                placeholder="Longitude"
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                type="number"
                step="0.000001"
              />
            </div>
          </div>

          <div>
            <label className="label-text">Location Description</label>
            <input
              className="input-field"
              placeholder="e.g. Building A, Panel Room 2, North Wall"
              value={locationDescription}
              onChange={e => setLocationDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep('client')} className="btn-secondary flex-1">Back</button>
            <button onClick={validateAndNext} className="btn-primary flex-1">Continue</button>
          </div>
        </div>
      )}

      {/* Step 3: PLC Info */}
      {step === 'plc' && (
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-gray-800">PLC Information</h2>

          <div>
            <label className="label-text">System Name / Tag *</label>
            <input
              className="input-field"
              placeholder="e.g. PLC-01, Conveyor Control, Boiler #1"
              value={plcName}
              onChange={e => setPlcName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="label-text">Manufacturer</label>
            <div className="relative">
              <select
                className="input-field pr-8 appearance-none"
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
              >
                <option value="">Select manufacturer...</option>
                {PLC_MANUFACTURERS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Model / Series</label>
              <input
                className="input-field"
                placeholder="e.g. ControlLogix 5580"
                value={model}
                onChange={e => setModel(e.target.value)}
              />
            </div>
            <div>
              <label className="label-text">PLC Type</label>
              <div className="relative">
                <select
                  className="input-field pr-8 appearance-none"
                  value={plcType}
                  onChange={e => setPlcType(e.target.value)}
                >
                  <option value="">Type...</option>
                  <option>Compact</option>
                  <option>Modular</option>
                  <option>Micro/Nano</option>
                  <option>Safety PLC</option>
                  <option>PAC</option>
                  <option>SoftPLC</option>
                  <option>DCS</option>
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="label-text">Notes</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Any quick observations..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Photo capture */}
          <div>
            <label className="label-text">Photos</label>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Camera size={20} />
              Take Photo / Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoCapture}
              className="hidden"
            />
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {photos.map(photo => (
                  <div key={photo.id} className="relative">
                    <img
                      src={photo.preview}
                      alt="Preview"
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep('location')} className="btn-secondary flex-1" disabled={saving}>Back</button>
            <button onClick={validateAndNext} className="btn-primary flex-1" disabled={saving}>
              {saving ? (
                <span className="flex items-center justify-center gap-2"><Loader size={16} className="animate-spin" /> Saving...</span>
              ) : 'Save System'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div className="card p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check size={32} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">System Saved!</h2>
            <p className="text-gray-500 text-sm mt-1">{plcName} has been added to the inventory</p>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={resetForm} className="btn-primary flex items-center justify-center gap-2">
              <Plus size={16} />
              Log Next System
            </button>
            {savedSystemId && (
              <button
                onClick={() => navigate(`/systems/${savedSystemId}`)}
                className="btn-secondary"
              >
                View Details
              </button>
            )}
            <button onClick={() => navigate('/')} className="text-gray-500 text-sm hover:text-gray-700">
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
