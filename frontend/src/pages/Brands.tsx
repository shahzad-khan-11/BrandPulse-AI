import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2, Building, Edit2 } from 'lucide-react';

interface Brand {
  _id: string;
  name: string;
  keywords: string[];
  city?: string;
  state?: string;
  region?: string;
  country?: string;
  language?: string;
}

interface City {
  city: string;
  state: string;
  region: string;
  tier: number;
}

const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'Malayalam'];

const Brands: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // New Brand form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [selectedCityName, setSelectedCityName] = useState('Delhi');
  const [selectedLanguage, setSelectedLanguage] = useState('Hindi');
  const [cities, setCities] = useState<City[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Edit Brand form state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editName, setEditName] = useState('');
  const [editKeywordsInput, setEditKeywordsInput] = useState('');
  const [editCity, setEditCity] = useState('Delhi');
  const [editLanguage, setEditLanguage] = useState('Hindi');

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res = await api.get('/brands');
      if (res.data.success) {
        setBrands(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load brands:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const res = await api.get('/mentions/cities');
      if (res.data.success) {
        setCities(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load cities:', err);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchCities();
  }, []);

  useEffect(() => {
    if (showAddForm || showEditForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddForm, showEditForm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !keywordsInput) return;
    setSubmitting(true);

    const keywords = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const matchedCity = cities.find(c => c.city === selectedCityName) || {
      city: 'Delhi',
      state: 'Delhi',
      region: 'North India',
    };

    try {
      const res = await api.post('/brands', {
        name,
        keywords,
        city: matchedCity.city,
        state: matchedCity.state,
        region: matchedCity.region,
        language: selectedLanguage,
      });
      if (res.data.success) {
        window.dispatchEvent(new CustomEvent('refetch-notifications'));
        setName('');
        setKeywordsInput('');
        setSelectedCityName('Delhi');
        setSelectedLanguage('Hindi');
        setShowAddForm(false);
        fetchBrands();
      }
    } catch (err) {
      console.error('Failed to create brand:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setEditName(brand.name);
    setEditKeywordsInput(brand.keywords.join(', '));
    setEditCity(brand.city || 'Delhi');
    setEditLanguage(brand.language || 'Hindi');
    setShowEditForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand || !editName || !editKeywordsInput) return;
    setSubmitting(true);

    const keywords = editKeywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const matchedCity = cities.find(c => c.city === editCity) || {
      city: 'Delhi',
      state: 'Delhi',
      region: 'North India',
    };

    try {
      const res = await api.put(`/brands/${editingBrand._id}`, {
        name: editName,
        keywords,
        city: matchedCity.city,
        state: matchedCity.state,
        region: matchedCity.region,
        language: editLanguage,
      });
      if (res.data.success) {
        window.dispatchEvent(new CustomEvent('refetch-notifications'));
        setShowEditForm(false);
        setEditingBrand(null);
        fetchBrands();
      }
    } catch (err) {
      console.error('Failed to update brand:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this brand and all associated mentions?')) return;
    try {
      const res = await api.delete(`/brands/${id}`);
      if (res.data.success) {
        window.dispatchEvent(new CustomEvent('refetch-notifications'));
        fetchBrands();
      }
    } catch (err) {
      console.error('Failed to delete brand:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-200">Brand Workspaces</h3>
          <p className="text-xs text-slate-400 mt-1">Configure keywords to track across web crawlers</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Add Brand
        </button>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel p-8">
          <Building className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4 animate-pulse" />
          <h4 className="font-bold text-sm text-slate-200">No Workspace Active</h4>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 max-w-sm">
            Please register your company target brand keywords to start automated sentiment index aggregates calculations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {brands.map((brand, idx) => (
            <div 
              key={brand._id}
              style={{ animationDelay: `${idx * 75}ms` }}
              className="glass-panel p-6 flex flex-col justify-between hover-lift transition-all duration-300 animate-scale-up shadow-lg group relative overflow-hidden bg-slate-900/40 border-slate-800/80"
            >
              <div className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
              <div>
                <h4 className="font-bold text-md text-slate-200">{brand.name}</h4>
                {brand.city && (
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase mt-1">
                    📍 {brand.city}, {brand.state} ({brand.region})
                  </div>
                )}
                <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  🗣️ Vernacular Language: <span className="text-indigo-400 font-black">{brand.language || 'Hindi'}</span>
                </div>
                <div className="mt-4 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tracked Keywords</span>
                  <div className="flex flex-wrap gap-1.5">
                    {brand.keywords.map((kw, i) => (
                      <span 
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 text-xxs font-bold"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-end gap-2">
                <button
                  onClick={() => handleStartEdit(brand)}
                  className="p-2 rounded-xl text-indigo-500 hover:bg-indigo-950/20 hover:text-indigo-400 transition-colors cursor-pointer"
                  title="Edit Workspace"
                >
                  <Edit2 className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => handleDelete(brand._id)}
                  className="p-2 rounded-xl text-red-500 hover:bg-red-950/20 hover:text-red-400 transition-colors cursor-pointer"
                  title="Delete Workspace"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal form */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl z-50 text-slate-800 dark:text-slate-100 backdrop-blur-xl animate-slide-up max-h-[90vh] overflow-y-auto overflow-x-hidden">
            
            <div className="text-center mb-6">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center mx-auto text-xl font-black border border-indigo-500/20 shadow-md">
                <Building className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="text-xl font-black mt-3 text-white">Create Brand Workspace</h3>
              <p className="text-xxs uppercase tracking-wider text-slate-500 font-bold mt-1">Configure Target Brand keywords</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Brand Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white outline-none placeholder-slate-500 transition-colors"
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Target Indian City</label>
                <select
                  value={selectedCityName}
                  onChange={(e) => setSelectedCityName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white outline-none cursor-pointer font-bold transition-colors"
                >
                  {cities.length === 0 ? (
                    <option value="Delhi">Delhi (Delhi - North India)</option>
                  ) : (
                    cities.map((c) => (
                      <option key={c.city} value={c.city} className="bg-slate-900 text-slate-100">
                        {c.city} ({c.state} - {c.region})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Target Tracking Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white outline-none cursor-pointer font-bold transition-colors"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang} className="bg-slate-900 text-slate-100">
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Keywords (Comma separated)</label>
                <input
                  type="text"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white outline-none placeholder-slate-500 transition-colors"
                  placeholder="e.g. acme, acme corp, #acme"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-350 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-550 text-white font-bold tracking-wider uppercase shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal form */}
      {showEditForm && editingBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => { setShowEditForm(false); setEditingBrand(null); }} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl z-50 text-slate-800 dark:text-slate-100 backdrop-blur-xl animate-slide-up max-h-[90vh] overflow-y-auto overflow-x-hidden">
            
            <div className="text-center mb-6">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center mx-auto text-xl font-black border border-indigo-500/20 shadow-md">
                <Edit2 className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="text-xl font-black mt-3 text-white">Edit Brand Workspace</h3>
              <p className="text-xxs uppercase tracking-wider text-slate-500 font-bold mt-1">Modify Target Brand configurations</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Brand Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white outline-none placeholder-slate-500 transition-colors"
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Target Indian City</label>
                <select
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white outline-none cursor-pointer font-bold transition-colors"
                >
                  {cities.length === 0 ? (
                    <option value="Delhi">Delhi (Delhi - North India)</option>
                  ) : (
                    cities.map((c) => (
                      <option key={c.city} value={c.city} className="bg-slate-900 text-slate-100">
                        {c.city} ({c.state} - {c.region})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Target Tracking Language</label>
                <select
                  value={editLanguage}
                  onChange={(e) => setEditLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white outline-none cursor-pointer font-bold transition-colors"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang} className="bg-slate-900 text-slate-100">
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Keywords (Comma separated)</label>
                <input
                  type="text"
                  value={editKeywordsInput}
                  onChange={(e) => setEditKeywordsInput(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white outline-none placeholder-slate-500 transition-colors"
                  placeholder="e.g. acme, acme corp, #acme"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowEditForm(false); setEditingBrand(null); }}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-350 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-550 text-white font-bold tracking-wider uppercase shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Brands;
