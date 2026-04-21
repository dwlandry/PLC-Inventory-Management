import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClientList from './pages/ClientList';
import ClientDetail from './pages/ClientDetail';
import SiteDetail from './pages/SiteDetail';
import SystemList from './pages/SystemList';
import SystemDetail from './pages/SystemDetail';
import SystemForm from './pages/SystemForm';
import InitialWalk from './pages/InitialWalk';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/walk" element={<InitialWalk />} />
          <Route path="/clients" element={<ClientList />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/sites/:id" element={<SiteDetail />} />
          <Route path="/systems" element={<SystemList />} />
          <Route path="/systems/new" element={<SystemForm />} />
          <Route path="/systems/:id" element={<SystemDetail />} />
          <Route path="/systems/:id/edit" element={<SystemForm />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
