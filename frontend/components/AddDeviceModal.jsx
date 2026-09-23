"use client";
import { useState } from 'react';
import { api } from '@/lib/api';

export default function AddDeviceModal({ onClose, onAdded, editDevice }) {
  const isEdit = !!editDevice;
  const [form, setForm] = useState({
    name: editDevice?.name || '',
    host: editDevice?.host || '',
    port: editDevice?.port || 8728,
    username: editDevice?.username || 'admin',
    password: '',
    apiType: editDevice?.apiType || 'api',
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/api/devices/${editDevice.id}`, payload);
      } else {
        await api.post('/api/devices', form);
      }
      onAdded();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  const handleTest = async () => {
    setTestResult({ loading: true });
    try {
      // if edit, test existing id, else create temp? For new device we need to test via temporary call: save then test? Simpler: if new, do quick axios test via backend temp endpoint? We'll just require save first.
      // For new device, we will call a direct REST test via backend? We'll simulate by creating then testing.
      // Workaround: POST /api/devices with test flag not available, so we alert to save first.
      if (!isEdit) {
        setTestResult({ success: false, error: 'Simpan dulu, lalu Test dari daftar device' });
        return;
      }
      const res = await api.post(`/api/devices/${editDevice.id}/test`);
      setTestResult({ success: true, data: res.data });
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.error || err.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-xl w-full max-w-md border border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-800">
          <h2 className="font-bold text-white">{isEdit ? 'Edit Mikrotik' : 'Tambah Mikrotik'}</h2>
          <p className="text-xs text-gray-400 mt-1">{isEdit ? 'Update data koneksi' : 'Input data Mikrotik untuk monitoring realtime'}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400">Nama Mikrotik *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="POP AFNA Pusat" className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-400">Host / IP *</label>
              <input required value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.1" className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Port</label>
              <input value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} placeholder="8728" className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Username *</label>
            <input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Password {isEdit ? '(kosongkan jika tidak ganti)' : '*'} </label>
            <input type="password" required={!isEdit} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400">API Type</label>
            <select value={form.apiType} onChange={e => setForm({ ...form, apiType: e.target.value })} className="mt-1 w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none">
              <option value="api">RouterOS API (8728/8729) - Recommended</option>
              <option value="rest">REST API (80/443) - RouterOS 7+</option>
            </select>
            <p className="text-[11px] text-gray-600 mt-1">Pastikan /ip service api enabled di Mikrotik</p>
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg text-xs border ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : testResult.loading ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {testResult.loading ? 'Testing...' : testResult.success ? `✅ Koneksi sukses (${testResult.data?.method})` : `❌ ${testResult.error}`}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {isEdit && <button type="button" onClick={handleTest} className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-white">Test</button>}
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-white">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white disabled:opacity-50">
              {loading ? 'Menyimpan...' : isEdit ? 'Update' : 'Simpan & Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
