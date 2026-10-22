'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCcw, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [status, setStatus] = useState<any>({
    mongodb: { active: false, message: 'Loading...' },
    cloudinary: { active: false, message: 'Loading...' },
  });
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/status');
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
      } else {
        setStatus({
          mongodb: { active: false, message: 'Error checking status' },
          cloudinary: { active: false, message: 'Error checking status' },
        });
      }
    } catch (err) {
      console.error(err);
      setStatus({
        mongodb: { active: false, message: 'Network error' },
        cloudinary: { active: false, message: 'Network error' },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-100">Dashboard Overview</h1>
          <p className="text-gray-400 mt-2">
            Welcome to your admin portal. Here you can manage your MongoDB data and Cloudinary
            images.
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm font-medium text-gray-300 hover:text-emerald-400 hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCcw className="w-4 h-4" />
          )}
          Refresh Status
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* MongoDB Card */}
        <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">MongoDB Status</h2>
          <p className="text-sm text-gray-400 mb-4">
            Connect to your clusters and manage documents.
          </p>
          <div
            className={`flex items-center gap-2 text-sm w-fit px-3 py-1.5 rounded-lg font-medium border ${
              loading
                ? 'text-gray-400 bg-gray-800/50 border-gray-700/50'
                : status.mongodb.active
                  ? 'text-emerald-400 bg-emerald-950/50 border-emerald-900/50'
                  : 'text-red-400 bg-red-950/50 border-red-900/50'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : status.mongodb.active ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {status.mongodb.message}
          </div>
        </div>

        {/* Cloudinary Card */}
        <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">Cloudinary Status</h2>
          <p className="text-sm text-gray-400 mb-4">Upload and optimize images seamlessly.</p>
          <div
            className={`flex items-center gap-2 text-sm w-fit px-3 py-1.5 rounded-lg font-medium border ${
              loading
                ? 'text-gray-400 bg-gray-800/50 border-gray-700/50'
                : status.cloudinary.active
                  ? 'text-emerald-400 bg-emerald-950/50 border-emerald-900/50'
                  : 'text-red-400 bg-red-950/50 border-red-900/50'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : status.cloudinary.active ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {status.cloudinary.message}
          </div>
        </div>
      </div>
    </div>
  );
}
