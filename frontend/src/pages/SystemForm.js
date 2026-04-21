import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { systemsApi, sitesApi } from '../api';
import { Loader, X, Plus } from 'lucide-react';

const PROTOCOLS = [
  'EtherNet/IP', 'Modbus TCP', 'Modbus RTU', 'Profinet', 'Profibus',
  'DeviceNet', 'ControlNet', 'CANopen', 'BACnet', 'OPC UA', 'OPC DA',
  'HART', 'Foundation Fieldbus', 'CC-Link', 'AS-Interface', 'IO-Link', 'Other'
];

export default function SystemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [sites, setSites] = useState([]);
  const [customProtocol, setCustomProtocol] = useState('');

  const [form, setForm] = useState({
    site_id: searchParams.get('site_id') || '',
    name: '',
    manufacturer: '',
    model: '',
    plc_type: '',
    series: '',
    firmware_version: '',
    serial_number: '',
    location_description: '',
    latitude: '',
    longitude: '',
    ip_address: '',
    subnet_mask: '',
    gateway: '',
    communication_protocols: [],
    hardware_requirements: { cable_type: '', adapter: '', programmer_device: '', other: '' },
    software_requirements: { programming_software: '', version: '', os: '', license: '', other: '' },
    status: 'active',
    install_date: '',
    end_of_life_date: '',
    warranty_expiry: '',
    notes: '',
    walk_status: 'initial',
  });

  useEffect(() => {
    if (form.site_id) {
      sitesApi.getAll({ client_id: '' }).then(setSites);
    }
    if (isEdit) {
      systemsApi.getOne(id).then(data => {
        setForm({
          site_id: data.site_id || '',
          name: data.name || '',
          manufacturer: data.manufacturer || '',
          model: data.model || '',
          plc_type: data.plc_type || '',
          series: data.series || '',
          firmware_version: data.firmware_version || '',
          serial_number: data.serial_number || '',
          location_description: data.location_description || '',
          latitude: data.latitude || '',
          longitude: data.longitude || '',
          ip_address: data.ip_address || '',
          subnet_mask: data.subnet_mask || '',
          gateway: data.gateway || '',
          communication_protocols: data.communication_protocols || [],
          hardware_requirements: { cable_type: '', adapter: '', programmer_device: '', other: '', ...(data.hardware_requirements || {}) },
          software_requirements: { programming_software: '', version: '', os: '', license: '', other: '', ...(data.software_requirements || {}) },
          status: data.status || 'active',
          install_date: data.install_date || '',
          end_of_life_date: data.end_of_life_date || '',
          warranty_expiry: data.warranty_expiry || '',
          notes: data.notes || '',
          walk_status: data.walk_status || 'initial',
        });
        // Load sites for the client
        sitesApi.getOne(data.site_id).then(site => {
          sitesApi.getAll({ client_id: site.client_id }).then(setSites);
        }).catch(() => {});
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      sitesApi.getAll().then(setSites);
    }
  }, [id, isEdit]); // eslint-disable-line

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const setNested = (key, subKey) => (e) => setForm(p => ({ ...p, [key]: { ...p[key], [subKey]: e.target.value } }));

  const toggleProtocol = (protocol) => {
    setForm(p => ({
      ...p,
      communication_protocols: p.communication_protocols.includes(protocol)
        ? p.communication_protocols.filter(x => x !== protocol)
        : [...p.communication_protocols, protocol]
    }));
  };

  const addCustomProtocol = () => {
    if (!customProtocol.trim()) return;
    setForm(p => ({ ...p, communication_protocols: [...p.communication_protocols, customProtocol.trim()] }));
    setCustomProtocol('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.site_id) { setError('Site is required'); return; }
    if (!form.name.trim()) { setError('System name is required'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };
      if (isEdit) {
        await systemsApi.update(id, payload);
        navigate(`/systems/${id}`);
      } else {
        const system = await systemsApi.create(payload);
        navigate(`/systems/${system.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-40"><Loader className="animate-spin text-blue-600" size={28} /></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-20">
      <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit PLC System' : 'New PLC System'}</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Site */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-gray-800">Site Assignment</h2>
        <div>
          <label className="label-text">Site *</label>
          <select className="input-field" value={form.site_id} onChange={set('site_id')} required>
            <option value="">Select site...</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.client_name} — {s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Basic Info */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-gray-800">Basic Information</h2>
        <div>
          <label className="label-text">System Name / Tag *</label>
          <input className="input-field" placeholder="e.g. PLC-01, Conveyor Control" value={form.name} onChange={set('name')} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Manufacturer</label>
            <input className="input-field" placeholder="e.g. Allen-Bradley" value={form.manufacturer} onChange={set('manufacturer')} />
          </div>
          <div>
            <label className="label-text">Model</label>
            <input className="input-field" placeholder="e.g. ControlLogix 5580" value={form.model} onChange={set('model')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Series</label>
            <input className="input-field" placeholder="e.g. 5580" value={form.series} onChange={set('series')} />
          </div>
          <div>
            <label className="label-text">PLC Type</label>
            <select className="input-field" value={form.plc_type} onChange={set('plc_type')}>
              <option value="">Select type...</option>
              <option>Compact</option>
              <option>Modular</option>
              <option>Micro/Nano</option>
              <option>Safety PLC</option>
              <option>PAC</option>
              <option>SoftPLC</option>
              <option>DCS</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Firmware Version</label>
            <input className="input-field" placeholder="e.g. 32.011" value={form.firmware_version} onChange={set('firmware_version')} />
          </div>
          <div>
            <label className="label-text">Serial Number</label>
            <input className="input-field" placeholder="Serial #" value={form.serial_number} onChange={set('serial_number')} />
          </div>
        </div>
        <div>
          <label className="label-text">Walk Status</label>
          <select className="input-field" value={form.walk_status} onChange={set('walk_status')}>
            <option value="initial">Initial Walk (quick)</option>
            <option value="detailed">Detailed (fully documented)</option>
          </select>
        </div>
        <div>
          <label className="label-text">Status</label>
          <select className="input-field" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="decommissioned">Decommissioned</option>
            <option value="end_of_life">End of Life</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-gray-800">Location</h2>
        <div>
          <label className="label-text">Location Description</label>
          <input className="input-field" placeholder="e.g. Building A, Panel Room 2, North Wall" value={form.location_description} onChange={set('location_description')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Latitude</label>
            <input className="input-field" type="number" step="0.000001" placeholder="e.g. 33.749" value={form.latitude} onChange={set('latitude')} />
          </div>
          <div>
            <label className="label-text">Longitude</label>
            <input className="input-field" type="number" step="0.000001" placeholder="e.g. -84.388" value={form.longitude} onChange={set('longitude')} />
          </div>
        </div>
      </div>

      {/* Network */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-gray-800">Network / IP</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">IP Address</label>
            <input className="input-field font-mono" placeholder="192.168.1.100" value={form.ip_address} onChange={set('ip_address')} />
          </div>
          <div>
            <label className="label-text">Subnet Mask</label>
            <input className="input-field font-mono" placeholder="255.255.255.0" value={form.subnet_mask} onChange={set('subnet_mask')} />
          </div>
        </div>
        <div>
          <label className="label-text">Default Gateway</label>
          <input className="input-field font-mono" placeholder="192.168.1.1" value={form.gateway} onChange={set('gateway')} />
        </div>

        <div>
          <label className="label-text">Communication Protocols</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {PROTOCOLS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => toggleProtocol(p)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  form.communication_protocols.includes(p)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:border-blue-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              className="input-field flex-1"
              placeholder="Add custom protocol..."
              value={customProtocol}
              onChange={e => setCustomProtocol(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomProtocol())}
            />
            <button type="button" onClick={addCustomProtocol} className="btn-secondary px-3">
              <Plus size={16} />
            </button>
          </div>
          {form.communication_protocols.filter(p => !PROTOCOLS.includes(p)).map(p => (
            <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 mt-1 mr-1 rounded-full text-xs font-medium bg-blue-600 text-white">
              {p}
              <button type="button" onClick={() => toggleProtocol(p)}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Hardware Requirements */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-gray-800">Hardware Requirements (to connect)</h2>
        <div>
          <label className="label-text">Cable Type</label>
          <input className="input-field" placeholder="e.g. USB-to-Serial, Ethernet, 1784-U2DHP" value={form.hardware_requirements.cable_type} onChange={setNested('hardware_requirements', 'cable_type')} />
        </div>
        <div>
          <label className="label-text">Adapter / Converter</label>
          <input className="input-field" placeholder="e.g. 1747-UIC, 1784-PCMK" value={form.hardware_requirements.adapter} onChange={setNested('hardware_requirements', 'adapter')} />
        </div>
        <div>
          <label className="label-text">Programming Device</label>
          <input className="input-field" placeholder="e.g. Laptop, Handheld Programmer" value={form.hardware_requirements.programmer_device} onChange={setNested('hardware_requirements', 'programmer_device')} />
        </div>
        <div>
          <label className="label-text">Other Hardware</label>
          <input className="input-field" placeholder="Any other hardware needed" value={form.hardware_requirements.other} onChange={setNested('hardware_requirements', 'other')} />
        </div>
      </div>

      {/* Software Requirements */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-gray-800">Software Requirements</h2>
        <div>
          <label className="label-text">Programming Software</label>
          <input className="input-field" placeholder="e.g. Studio 5000, TIA Portal, GX Works3" value={form.software_requirements.programming_software} onChange={setNested('software_requirements', 'programming_software')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Software Version</label>
            <input className="input-field" placeholder="e.g. v32.01" value={form.software_requirements.version} onChange={setNested('software_requirements', 'version')} />
          </div>
          <div>
            <label className="label-text">OS Requirement</label>
            <input className="input-field" placeholder="e.g. Windows 10" value={form.software_requirements.os} onChange={setNested('software_requirements', 'os')} />
          </div>
        </div>
        <div>
          <label className="label-text">License Type</label>
          <input className="input-field" placeholder="e.g. Standalone, Concurrent, TechConnect" value={form.software_requirements.license} onChange={setNested('software_requirements', 'license')} />
        </div>
        <div>
          <label className="label-text">Other Software</label>
          <input className="input-field" placeholder="e.g. RSLinx Classic, Kepware" value={form.software_requirements.other} onChange={setNested('software_requirements', 'other')} />
        </div>
      </div>

      {/* Dates */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-gray-800">Lifecycle Dates</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Install Date</label>
            <input className="input-field" type="date" value={form.install_date} onChange={set('install_date')} />
          </div>
          <div>
            <label className="label-text">End of Life Date</label>
            <input className="input-field" type="date" value={form.end_of_life_date} onChange={set('end_of_life_date')} />
          </div>
        </div>
        <div>
          <label className="label-text">Warranty Expiry</label>
          <input className="input-field" type="date" value={form.warranty_expiry} onChange={set('warranty_expiry')} />
        </div>
      </div>

      {/* Notes */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-gray-800">Notes</h2>
        <textarea
          className="input-field resize-none"
          rows={4}
          placeholder="Additional notes, observations, upgrade recommendations..."
          value={form.notes}
          onChange={set('notes')}
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1" disabled={saving}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader size={16} className="animate-spin" /> Saving...
            </span>
          ) : isEdit ? 'Save Changes' : 'Create System'}
        </button>
      </div>
    </form>
  );
}
