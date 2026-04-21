import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { systemsApi } from '../api';
import { Server, Search, Filter, MapPin, Camera, HardDrive, Loader, ChevronRight, Plus } from 'lucide-react';

export default function SystemList() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [walkFilter, setWalkFilter] = useState(searchParams.get('walk') || '');

  const load = (q = search, w = walkFilter) => {
    setLoading(true);
    const params = {};
    if (q) params.search = q;
    if (w) params.walk_status = w;
    systemsApi.getAll(params).then(setSystems).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const handleSearch = (e) => {
    e.preventDefault();
    load(search, walkFilter);
  };

  const handleFilterChange = (val) => {
    setWalkFilter(val);
    load(search, val);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">PLC Systems</h1>
        <Link to="/walk" className="btn-primary text-sm flex items-center gap-2">
          <Plus size={16} /> Add System
        </Link>
      </div>

      {/* Search & filter */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by name, manufacturer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary px-3">
          <Search size={16} />
        </button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { val: '', label: 'All' },
          { val: 'initial', label: '🚶 Initial Walk' },
          { val: 'detailed', label: '✅ Detailed' },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => handleFilterChange(val)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              walkFilter === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="animate-spin text-blue-600" size={28} />
        </div>
      ) : systems.length === 0 ? (
        <div className="card p-8 text-center">
          <Server size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No systems found</p>
          <Link to="/walk" className="mt-3 btn-primary inline-flex items-center gap-2 text-sm">
            <Plus size={16} /> Add First System
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {systems.map(system => (
            <Link key={system.id} to={`/systems/${system.id}`} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Server size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900">{system.name}</p>
                  <span className={system.walk_status === 'initial' ? 'badge-initial' : 'badge-detailed'}>
                    {system.walk_status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[system.manufacturer, system.model].filter(Boolean).join(' — ')}
                </p>
                <p className="text-xs text-gray-400">
                  {system.client_name} › {system.site_name}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {system.ip_address && (
                    <span className="text-xs text-gray-500 font-mono">{system.ip_address}</span>
                  )}
                  {system.photo_count > 0 && (
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Camera size={11} /> {system.photo_count}</span>
                  )}
                  {system.backup_count > 0 && (
                    <span className="text-xs text-gray-400 flex items-center gap-1"><HardDrive size={11} /> {system.backup_count}</span>
                  )}
                  {(system.latitude && system.longitude) && (
                    <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={11} /> GPS</span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-center text-gray-400">{systems.length} system{systems.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
