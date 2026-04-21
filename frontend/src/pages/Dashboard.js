import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { statsApi } from '../api';
import {
  Server, Building2, ClipboardList, Camera,
  HardDrive, AlertTriangle, CheckCircle, ArrowRight
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className={`card p-4 flex items-center gap-3 ${to ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      {to && <ArrowRight size={16} className="ml-auto text-gray-400" />}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsApi.get().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">PLC Inventory Overview</p>
        </div>
        <Link to="/walk" className="btn-primary flex items-center gap-2 text-sm">
          <ClipboardList size={16} />
          Start Walk
        </Link>
      </div>

      {/* Quick action banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 text-white">
        <p className="font-semibold">Ready for Initial Walk?</p>
        <p className="text-blue-100 text-sm mt-0.5">Quickly log PLC systems in the field with GPS & photos</p>
        <Link to="/walk" className="mt-3 inline-flex items-center gap-2 bg-white text-blue-700 text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
          <ClipboardList size={16} />
          Open Initial Walk Mode
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Building2} label="Clients" value={stats?.clients} color="bg-purple-500" to="/clients" />
        <StatCard icon={Server} label="PLC Systems" value={stats?.systems} color="bg-blue-500" to="/systems" />
        <StatCard icon={ClipboardList} label="Initial Walk" value={stats?.initial_walk} color="bg-yellow-500" />
        <StatCard icon={CheckCircle} label="Detailed" value={stats?.detailed} color="bg-green-500" />
        <StatCard icon={Camera} label="Photos" value={stats?.photos} color="bg-pink-500" />
        <StatCard icon={HardDrive} label="Backups" value={stats?.backups} color="bg-indigo-500" />
      </div>

      {/* Manufacturers breakdown */}
      {stats?.manufacturers?.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-gray-800 mb-3">PLC Manufacturers</h2>
          <div className="space-y-2">
            {stats.manufacturers.map(m => (
              <div key={m.manufacturer} className="flex items-center gap-2">
                <span className="text-sm text-gray-700 w-32 truncate">{m.manufacturer}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (m.count / (stats.systems || 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-6 text-right">{m.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent systems */}
      {stats?.recent_systems?.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Recent Activity</h2>
            <Link to="/systems" className="text-blue-600 text-sm hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recent_systems.map(s => (
              <Link key={s.id} to={`/systems/${s.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Server size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500 truncate">{s.client_name} — {s.site_name}</p>
                </div>
                <span className={s.walk_status === 'initial' ? 'badge-initial' : 'badge-detailed'}>
                  {s.walk_status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats?.systems === 0 && (
        <div className="card p-8 text-center">
          <Server size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No PLC systems yet</p>
          <p className="text-gray-400 text-sm mt-1">Start with an Initial Walk to log your first system</p>
          <Link to="/walk" className="mt-4 btn-primary inline-flex items-center gap-2">
            <ClipboardList size={16} />
            Start Initial Walk
          </Link>
        </div>
      )}
    </div>
  );
}
