/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Users, 
  Database, 
  History, 
  Heart,
  Trash2
} from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

interface WorkflowLog {
  _id: string;
  workflowType: string;
  status: string;
  error?: string;
  createdAt: string;
}

const AdminPanel: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'health' | 'workflows'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowLog[]>([]);
  const [health, setHealth] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<string>('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workflows/logs');
      if (res.data.success) {
        setWorkflows(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load workflow logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/health');
      if (res.data.success) {
        setHealth(res.data.database);
      }
    } catch (err) {
      console.error('Failed to load health metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'users') fetchUsers();
    if (activeSubTab === 'workflows') fetchWorkflows();
    if (activeSubTab === 'health') fetchHealth();
  }, [activeSubTab]);

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to suspend this team member?')) return;
    try {
      const res = await api.delete(`/users/${id}`);
      if (res.data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    setBackupResult('');
    try {
      const res = await api.post('/admin/backup');
      if (res.data.success) {
        setBackupResult(`Export successfully written. Models exported: ${res.data.data.collectionsCount}`);
      }
    } catch (err) {
      console.error('Backup failed:', err);
      setBackupResult('Structure backup failed.');
    } finally {
      setBackingUp(false);
    }
  };

  const subTabs = [
    { id: 'users', name: 'Team Users', icon: Users },
    { id: 'health', name: 'System Health', icon: Heart },
    { id: 'workflows', name: 'Workflow Logs', icon: History },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* Sub Tabs Selection */}
      <div className="flex border-b border-slate-800 gap-6">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 pb-4 font-bold text-sm border-b-2 transition-all ${
                isActive 
                  ? 'border-indigo-500 text-indigo-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* User Tab list */}
          {activeSubTab === 'users' && (
            <div className="glass-panel overflow-hidden transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Created At</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-900/40 text-slate-200 transition-colors">
                        <td className="p-4 font-bold text-slate-200">{u.name}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-350">{u.email}</td>
                        <td className="p-4 capitalize">{u.role}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-xxs font-extrabold uppercase border ${
                            u.isVerified ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' : 'bg-amber-500/10 text-amber-450 border-amber-500/20'
                          }`}>
                            {u.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteUser(u._id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 hover:text-red-600 dark:hover:text-red-300 rounded-lg transition-colors"
                            title="Suspend User"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* System Health Tab */}
          {activeSubTab === 'health' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Probe Stats */}
              <div className="glass-panel p-6 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <h4 className="font-bold text-sm text-slate-200">Database Node Status</h4>
                  <span className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                    health?.status === 'UP' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {health?.status || 'UNKNOWN'}
                  </span>
                </div>
                <div className="space-y-3 text-xs pt-2">
                  <div className="flex justify-between text-slate-400 border-b border-slate-200 dark:border-slate-900/50 pb-2">
                    <span className="font-semibold">Mongoose ReadyState:</span> 
                    <span className="text-slate-200 font-bold">{health?.readyState === 1 ? 'Connected (1)' : 'Offline'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="font-semibold">Connection Host:</span> 
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold truncate max-w-[220px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800" title={health?.host}>
                      {health?.host || 'localhost'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Maintenance Actions */}
              <div className="glass-panel p-6 space-y-4">
                <h4 className="font-bold text-sm text-slate-200">Database Maintenance Operations</h4>
                <p className="text-xxs text-slate-400 leading-relaxed">Trigger standard structural database collections metadata backup snapshots.</p>
                <div className="pt-2">
                  <button
                    onClick={handleBackup}
                    disabled={backingUp}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Database className="h-4.5 w-4.5" />
                    {backingUp ? 'Exporting...' : 'Export Schema Metadata'}
                  </button>
                  {backupResult && (
                    <p className="text-xxs text-indigo-400 font-bold mt-4 bg-indigo-500/5 border border-indigo-500/10 p-2.5 rounded-xl animate-slide-up">
                      {backupResult}
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Workflows logs list */}
          {activeSubTab === 'workflows' && (
            <div className="glass-panel overflow-hidden transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Workflow Type</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Error Log</th>
                      <th className="p-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {workflows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 font-bold">No recent workflow log runs logged.</td>
                      </tr>
                    ) : (
                      workflows.map((wf) => (
                        <tr key={wf._id} className="hover:bg-slate-900/40 text-slate-200 transition-colors">
                          <td className="p-4 font-bold text-slate-200 capitalize">{wf.workflowType.replace(/_/g, ' ')}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              wf.status === 'completed' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' :
                              wf.status === 'failed' ? 'bg-rose-500/10 text-rose-455 border-rose-550/20' :
                              'bg-blue-500/10 text-blue-450 border-blue-500/20'
                            }`}>
                              {wf.status}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 font-mono text-[10px] truncate max-w-[220px]" title={wf.error}>{wf.error || 'None'}</td>
                          <td className="p-4 text-slate-400">{new Date(wf.createdAt).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default AdminPanel;
