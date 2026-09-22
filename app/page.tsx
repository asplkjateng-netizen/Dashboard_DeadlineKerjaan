'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ShieldCheck, LogOut, Building2, Plus, 
  Trash2, Edit3, ChevronRight, Layers,
  Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2, X
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'supervisor' | 'pic';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // State Formulir Tambah/Edit Unit
  const [unitName, setUnitName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State Login / Register
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user) {
        fetchProfile(user.id);
        fetchDepartments();
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        fetchProfile(user.id);
        fetchDepartments();
      } else {
        setProfile(null);
        setDepartments([]);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
  };

  const fetchDepartments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setDepartments(data);
    }
    setLoading(false);
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    setActionLoading(true);

    try {
      if (editingId) {
        // Edit unit
        const { error } = await supabase
          .from('departments')
          .update({
            name: unitName.trim(),
            parent_id: parentId === '' ? null : parentId,
          })
          .eq('id', editingId);

        if (error) throw error;
        showNotification('success', 'Unit kerja berhasil diperbarui!');
        setEditingId(null);
      } else {
        // Tambah unit baru
        const { error } = await supabase
          .from('departments')
          .insert([
            {
              name: unitName.trim(),
              parent_id: parentId === '' ? null : parentId,
            }
          ]);

        if (error) throw error;
        showNotification('success', 'Unit kerja / sub-unit baru berhasil ditambahkan!');
      }

      setUnitName('');
      setParentId('');
      fetchDepartments();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menyimpan unit kerja.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEdit = (dept: Department) => {
    setEditingId(dept.id);
    setUnitName(dept.name);
    setParentId(dept.parent_id || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setUnitName('');
    setParentId('');
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!confirm(`Hapus unit "${name}"? Semua sub-unit di bawahnya juga akan ikut terhapus secara otomatis.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showNotification('success', `Unit "${name}" berhasil dihapus.`);
      fetchDepartments();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menghapus unit kerja.');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: { full_name: authFullName },
          },
        });
        if (error) throw error;
        setAuthMessage({ type: 'success', text: 'Pendaftaran berhasil! Silakan masuk.' });
        setIsLogin(true);
      }
    } catch (err: any) {
      setAuthMessage({ type: 'error', text: err.message || 'Otentikasi gagal.' });
    } finally {
      setAuthLoading(false);
    }
  };

  // Helper untuk menampilkan struktur pohon bertingkat
  const renderDepartmentTree = (parentId: string | null = null, depth = 0) => {
    const children = departments.filter((d) => d.parent_id === parentId);

    if (children.length === 0) return null;

    return (
      <div className={`space-y-2.5 ${depth > 0 ? 'ml-6 pl-4 border-l-2 border-slate-200' : ''}`}>
        {children.map((dept) => (
          <div key={dept.id} className="space-y-2.5">
            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs hover:border-indigo-200 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${depth === 0 ? 'bg-indigo-50 text-indigo-600' : depth === 1 ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {depth === 0 ? <Building2 size={18} /> : <Layers size={16} />}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">{dept.name}</h4>
                  <span className="text-[11px] font-medium text-slate-400">
                    {depth === 0 ? 'Instansi Induk / Utama' : `Sub-Instansi (Tingkat ${depth})`}
                  </span>
                </div>
              </div>

              {profile?.role === 'admin' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEdit(dept)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition"
                    title="Ubah Nama Unit"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus Unit"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Render anak di bawahnya secara rekursif */}
            {renderDepartmentTree(dept.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  // TAMPILAN JIKA BELUM LOGIN
  if (!currentUser) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-12 flex-col justify-between text-white relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">E-MONITORING</h1>
              <p className="text-xs text-indigo-300 font-medium">Sistem Kendali Tugas & Deadline Instansi</p>
            </div>
          </div>
          <div className="relative z-10 my-auto py-12 max-w-lg">
            <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold mb-4 border border-indigo-400/20">
              Modul 2 • Struktur Organisasi
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
              Monitoring pekerjaan berjenjang dengan pembagian unit yang akuntabel.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Mendukung instansi pusat, sub-instansi, hingga sub-sub bagian tanpa batasan kedalaman hirarki.
            </p>
          </div>
          <div className="relative z-10 text-xs text-slate-500">© Monitoring System • Enterprise Governance</div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {isLogin ? 'Selamat Datang Kembali' : 'Pendaftaran Pegawai'}
              </h3>
              <p className="text-sm text-slate-500">Masukkan akun Anda untuk mengelola monitoring instansi.</p>
            </div>

            {authMessage && (
              <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${authMessage.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{authMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      value={authFullName}
                      onChange={(e) => setAuthFullName(e.target.value)}
                      placeholder="Nama & Gelar"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Email Kedinasan</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="pegawai@instansi.go.id"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
              >
                {authLoading ? 'Memproses...' : <span>{isLogin ? 'Masuk Dashboard' : 'Daftarkan Akun'}</span>}
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => { setIsLogin(!isLogin); setAuthMessage(null); }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
              >
                {isLogin ? 'Belum punya akun? Daftar sebagai PIC baru' : 'Sudah punya akun? Masuk sekarang'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TAMPILAN DASHBOARD SETELAH LOGIN (MODUL 2: HIERARKI UNIT KERJA)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Topbar Navigasi */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-base leading-tight">E-MONITORING</h1>
              <p className="text-[11px] text-slate-400 font-medium">Monitoring Deadline Instansi Berjenjang</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">{profile?.full_name || currentUser.email}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full w-fit ml-auto">
                Role: {profile?.role || 'pic'}
              </span>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="Keluar Sesi"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Banner Notifikasi */}
        {notification && (
          <div className={`mb-6 p-4 rounded-xl flex items-center justify-between shadow-xs ${notification.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'}`}>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{notification.text}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab Menu Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              Modul 2 Aktif
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
              Master Struktur Instansi & Sub-Instansi
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola pohon hierarki penugasan dari unit kantor pusat hingga sub-bagian teknis.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Total Unit Terdaftar</span>
            <div className="text-2xl font-black text-slate-800">{departments.length} Unit</div>
          </div>
        </div>

        {/* Grid Dua Kolom: Form Input (Kiri) & Tampilan Pohon (Kanan) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Kolom Kiri: Formulir Tambah / Edit */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-600" />
                  <span>{editingId ? 'Ubah Nama Unit Kerja' : 'Tambah Unit Kerja Baru'}</span>
                </h3>
                {editingId && (
                  <button onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-600">
                    Batal
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveDepartment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Nama Unit / Sub-Instansi *
                  </label>
                  <input
                    type="text"
                    required
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="Contoh: Subbag Keuangan & Perencanaan"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Unit Induk (Atasan Langsung)
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  >
                    <option value="">-- Jadikan Sebagai Instansi Pusat (Tanpa Induk) --</option>
                    {departments
                      .filter((d) => d.id !== editingId) // Jangan sampai unit menjadi anak dari dirinya sendiri
                      .map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          ↳ Di bawah: {dept.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Kosongkan jika unit ini adalah kantor pusat atau kedinasan tertinggi.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || profile?.role !== 'admin'}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition"
                >
                  <Plus size={16} />
                  <span>{editingId ? 'Simpan Perubahan' : 'Tambahkan ke Struktur'}</span>
                </button>

                {profile?.role !== 'admin' && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg text-center border border-amber-200">
                    Hanya user dengan role <b>Admin</b> yang berwenang menambah atau menghapus unit.
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Kolom Kanan: Tampilan Hirarki Visual (Pohon Bertingkat) */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs min-h-[400px]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Bagan Struktur Instansi</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Hierarki otomatis bercabang sesuai relasi induk & sub-unit.</p>
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center text-slate-400 text-sm">Memuat bagan struktur...</div>
              ) : departments.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                  <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
                  <h4 className="font-semibold text-slate-700 text-sm">Belum Ada Unit Kerja</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Gunakan formulir di sebelah kiri untuk membuat Instansi Utama pertama Anda.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {renderDepartmentTree(null, 0)}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
