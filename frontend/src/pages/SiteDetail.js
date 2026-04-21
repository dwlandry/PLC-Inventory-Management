import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { sitesApi } from '../api';
import { MapPin, Server, Plus, ChevronRight, Loader, Trash2 } from 'lucide-react';

export default function SiteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sitesApi.getOne(id).then(setSite).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete site "${site.name}"? All PLC systems will also be deleted.`)) return;
    try {
      await sitesApi.delete(id);
      navigate(`/clients/${site.client_id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-40"><Loader className="animate-spin text-blue-600" size={28} /></div>;
  if (!site) return <div className="card p-6 text-center text-gray-500">Site not found</div>;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 flex items-center gap-1">
        <Link to="/clients" className="hover:text-blue-600">Clients</Link>
        <ChevronRight size={14} />
        <Link to={`/clients/${site.client_id}`} className="hover:text-blue-600">{site.client_name}</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900">{site.name}</span>
      </div>

      {/* Site header */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <MapPin size={24} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{site.name}</h1>
            <p className="text-sm text-gray-500">{site.client_name}</p>
            {site.address && <p className="text-sm text-gray-600 mt-1">{site.address}</p>}
            {site.latitude && site.longitude && (
              <p className="text-xs text-gray-400 font-mono mt-1">
                📍 {site.latitude}, {site.longitude}
              </p>
            )}
            {site.notes && <p className="text-sm text-gray-600 mt-2">{site.notes}</p>}
          </div>
          <button onClick={handleDelete} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* PLC Systems */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">PLC Systems ({site.systems?.length || 0})</h2>
        <Link to="/walk" className="btn-primary text-sm flex items-center gap-1">
          <Plus size={15} /> Add System
        </Link>
      </div>

      {site.systems?.length === 0 ? (
        <div className="card p-6 text-center">
          <Server size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No PLC systems at this site yet</p>
          <Link to="/walk" className="mt-2 btn-primary text-sm inline-flex items-center gap-1">
            <Plus size={14} /> Start Initial Walk
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {site.systems.map(system => (
            <Link key={system.id} to={`/systems/${system.id}`} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Server size={18} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{system.name}</p>
                <p className="text-xs text-gray-500">
                  {[system.manufacturer, system.model].filter(Boolean).join(' ')}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={system.walk_status === 'initial' ? 'badge-initial' : 'badge-detailed'}>
                    {system.walk_status}
                  </span>
                  {system.photo_count > 0 && <span className="text-xs text-gray-400">📷 {system.photo_count}</span>}
                  {system.backup_count > 0 && <span className="text-xs text-gray-400">💾 {system.backup_count}</span>}
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
