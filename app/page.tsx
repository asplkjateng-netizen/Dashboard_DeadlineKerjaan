'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, LogIn, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Cek apakah user sudah login sebelumnya
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Berhasil login! Mengalihkan...' });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Pendaftaran berhasil! Silakan masuk.' });
        setIsLogin(true);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan saat memproses.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  // Tampilan jika user SUDAH login
  if (currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Sesi Terhubung!</h2>
          <p className="text-sm text-slate-500 mb-6">{currentUser.email}</p>
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-left text-sm text-slate-600 mb-6">
            <span className="font-semibold text-slate-800">Status Modul 1:</span> Selesai dan Aktif. Koneksi Supabase & Auth berjalan sempurna.
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium rounded-xl transition duration-200"
          >
            Keluar Sesi (Logout)
          </button>
        </div>
      </div>
    );
  }

  // Tampilan Form Login / Registrasi
  return (
    <div className="flex min-h-screen">
      {/* Kolom Kiri: Branding Modern */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">E-MONITORING</h1>
            <p className="text-xs text-indigo-300 font-medium">Sistem Kendali Tugas & Deadline Instansi</p>
          </div>
        </div>
        <div className="relative z-10 my-auto py-12 max-w-lg">
          <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold mb-4 border border-indigo-400/20">
            Aman • Terstruktur • Akuntabel
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Monitoring pekerjaan klerikal & insidentil tanpa terlewat satu deadline pun.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Terhubung berjenjang dari instansi pusat, sub-instansi, unit kerja, hingga pembagian tugas multi-PIC dengan dasar hukum dan bukti dukung Google Drive.
          </p>
        </div>
        <div className="relative z-10 text-xs text-slate-500">
          © Monitoring System • Enterprise Governance
        </div>
      </div>

      {/* Kolom Kanan: Formulir Otentikasi */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              {isLogin ? 'Selamat Datang Kembali' : 'Pendaftaran Pegawai'}
            </h3>
            <p className="text-sm text-slate-500">
              {isLogin 
                ? 'Masukkan kredensial Anda untuk mengakses dashboard instansi.' 
                : 'Lengkapi formulir untuk membuat akun monitoring kerja baru.'}
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${
              message.type === 'error' 
                ? 'bg-rose-50 border border-rose-200 text-rose-700' 
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Nama Lengkap & Gelar
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Budi Santoso, S.T."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Alamat Email Kedinasan
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pegawai@instansi.go.id"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition duration-200"
            >
              {loading ? (
                'Memproses...'
              ) : (
                <>
                  <span>{isLogin ? 'Masuk Dashboard' : 'Daftarkan Akun'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage(null);
              }}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
            >
              {isLogin 
                ? 'Belum punya akun? Daftar sebagai PIC baru' 
                : 'Sudah punya akun? Kembali ke halaman login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
