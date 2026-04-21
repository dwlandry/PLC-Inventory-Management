import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clientsApi, sitesApi } from '../api';
import { Building2, Plus, ChevronRight, MapPin, Loader, X, Check } from 'lucide-react';

function ClientModal({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name required'); return; }
    setSaving(true);
    try {
      const client = await clientsApi.create({ name, contact_name: contactName, contact_email: contactEmail, contact_phone: contactPhone, address });
      onSave(client);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">New Client</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input className="input-field" placeholder="Client name *" value={name} onChange={e => setName(e.target.value)} />
        <input className="input-field" placeholder="Contact name" value={contactName} onChange={e => setContactName(e.target.value)} />
        <input className="input-field" placeholder="Contact email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
        <input className="input-field" placeholder="Contact phone" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
        <input className="input-field" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving...' : 'Save Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => clientsApi.getAll().then(setClients).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <Loader className="animate-spin text-blue-600" size={28} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Clients</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="card p-8 text-center">
          <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No clients yet</p>
          <button onClick={() => setShowModal(true)} className="mt-3 btn-primary inline-flex items-center gap-2 text-sm">
            <Plus size={16} /> Add First Client
          </button>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {clients.map(client => (
            <Link key={client.id} to={`/clients/${client.id}`} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 size={20} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{client.name}</p>
                <p className="text-sm text-gray-500">{client.site_count || 0} site{client.site_count !== 1 ? 's' : ''}</p>
                {client.address && <p className="text-xs text-gray-400 truncate flex items-center gap-1"><MapPin size={10} /> {client.address}</p>}
              </div>
              <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <ClientModal
          onSave={(client) => { setClients(prev => [...prev, client]); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
