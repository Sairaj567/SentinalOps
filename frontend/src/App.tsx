// =============================================================================
// SentinelOps - React App Entry Point
// =============================================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Pages
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Vulnerabilities from './pages/Vulnerabilities';
import Pipeline from './pages/Pipeline';
import Threats from './pages/Threats';
import Agents from './pages/Agents';
import Settings from './pages/Settings';
import Login from './pages/Login';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Styles
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/vulnerabilities" element={<Vulnerabilities />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/threats" element={<Threats />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            border: '1px solid #374151',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
