import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { clientsApi, sitesApi } from '../api';
import { Building2, MapPin, Plus, ChevronRight, Server, Loader, Trash2, Edit2, X, Phone, Mail } from 'lucide-react';

function SiteModal({ clientId, onSave, onClose }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name required'); return; }
    setSaving(true);
    try {
      const site = await sitesApi.create({ client_id: clientId, name, address });
      onSave(site);
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
          <h3 className="font-semibold">New Site</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input className="input-field" placeholder="Site name *" value={name} onChange={e => setName(e.target.value)} />
        <input className="input-field" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Site'}</button>
        </div>
      </div>
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSiteModal, setShowSiteModal] = useState(false);

  const load = () => clientsApi.getOne(id).then(setClient).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete client "${client.name}"? This will delete all associated sites and PLC systems.`)) return;
    try {
      await clientsApi.delete(id);
      navigate('/clients');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-40"><Loader className="animate-spin text-blue-600" size={28} /></div>;
  if (!client) return <div className="card p-6 text-center text-gray-500">Client not found</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 size={24} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
            {client.address && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin size={13} /> {client.address}
              </p>
            )}
            {client.contact_name && <p className="text-sm text-gray-600 mt-1 font-medium">{client.contact_name}</p>}
            {client.contact_email && (
              <a href={`mailto:${client.contact_email}`} className="text-sm text-blue-600 flex items-center gap-1">
                <Mail size={13} /> {client.contact_email}
              </a>
            )}
            {client.contact_phone && (
              <a href={`tel:${client.contact_phone}`} className="text-sm text-blue-600 flex items-center gap-1">
                <Phone size={13} /> {client.contact_phone}
              </a>
            )}
          </div>
          <button onClick={handleDelete} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <Trash2 size={18} />
          </button>
        </div>
        {client.notes && <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">{client.notes}</p>}
      </div>

      {/* Sites */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Sites ({client.sites?.length || 0})</h2>
        <button onClick={() => setShowSiteModal(true)} className="btn-primary text-sm flex items-center gap-1">
          <Plus size={15} /> Add Site
        </button>
      </div>

      {client.sites?.length === 0 ? (
        <div className="card p-6 text-center">
          <MapPin size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No sites yet</p>
          <button onClick={() => setShowSiteModal(true)} className="mt-2 btn-primary text-sm inline-flex items-center gap-1">
            <Plus size={14} /> Add Site
          </button>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {client.sites.map(site => (
            <Link key={site.id} to={`/sites/${site.id}`} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{site.name}</p>
                <p className="text-xs text-gray-500">{site.system_count || 0} PLC system{site.system_count !== 1 ? 's' : ''}</p>
                {site.address && <p className="text-xs text-gray-400 truncate">{site.address}</p>}
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>
          ))}
        </div>
      )}

      {showSiteModal && (
        <SiteModal
          clientId={id}
          onSave={() => { load(); setShowSiteModal(false); }}
          onClose={() => setShowSiteModal(false)}
        />
      )}
    </div>
  );
}
