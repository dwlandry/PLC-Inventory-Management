import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Server, Building2, MapPin,
  ClipboardList, Menu, X, ChevronRight, Zap
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/walk', icon: ClipboardList, label: 'Initial Walk', highlight: true },
  { path: '/systems', icon: Server, label: 'PLC Systems' },
  { path: '/clients', icon: Building2, label: 'Clients' },
];

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-blue-700 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden p-1 rounded-lg hover:bg-blue-600 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Link to="/" className="flex items-center gap-2 font-bold text-lg">
              <Zap size={20} className="text-yellow-300" />
              <span className="hidden sm:inline">PLC Inventory</span>
              <span className="sm:hidden">PLC Inv.</span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ path, icon: Icon, label, highlight }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(path)
                    ? 'bg-white text-blue-700'
                    : highlight
                    ? 'bg-yellow-400 text-blue-900 hover:bg-yellow-300'
                    : 'hover:bg-blue-600'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>

          {/* Quick action button on mobile */}
          <button
            onClick={() => navigate('/walk')}
            className="md:hidden flex items-center gap-1 bg-yellow-400 text-blue-900 px-3 py-1.5 rounded-lg text-sm font-bold"
          >
            <ClipboardList size={16} />
            Walk
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-blue-800 border-t border-blue-600">
            {navItems.map(({ path, icon: Icon, label, highlight }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive(path)
                    ? 'bg-white text-blue-700'
                    : highlight
                    ? 'bg-yellow-400 text-blue-900'
                    : 'hover:bg-blue-700'
                }`}
              >
                <Icon size={18} />
                {label}
                <ChevronRight size={16} className="ml-auto opacity-50" />
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 pb-8">
        {children}
      </main>

      {/* Bottom nav for mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-pb">
        <div className="grid grid-cols-4 h-16">
          {navItems.map(({ path, icon: Icon, label, highlight }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                isActive(path)
                  ? 'text-blue-700'
                  : highlight
                  ? 'text-yellow-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={22} className={highlight && !isActive(path) ? 'text-yellow-500' : ''} />
              <span className="text-[10px] leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
