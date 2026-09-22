'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ShieldCheck, LogOut, Building2, Plus, 
  Trash2, Edit3, Layers, Lock, Mail, User, 
  AlertCircle, ArrowRight, CheckCircle2, X,
  Briefcase, Calendar, Clock, ExternalLink,
  Search, Users, FileText, AlertTriangle
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
  email?: string;
  role: 'admin' | 'supervisor' | 'pic';
}

interface TaskAssignee {
  user_id: string;
  profile?: Profile;
}

interface Task {
  id: string;
  department_id: string;
  title: string;
  description: string | null;
  legal_basis: string | null;
  drive_link: string | null;
  priority: 'rendah' | 'sedang' | 'tinggi' | 'urgent';
  nature: 'klerikal' | 'insidentil';
  period: 'bulanan' | 'triwulan' | 'semester' | 'tahunan' | null;
  deadline: string;
  status: 'belum_mulai' | 'dalam_proses' | 'review' | 'selesai' | 'overdue';
  created_at: string;
  department?: { name: string };
  assignees?: TaskAssignee[];
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'departments'>('tasks');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter Tasks
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterNature, setFilterNature] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal State Task Form
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({
    department_id: '',
    title: '',
    description: '',
    legal_basis: '',
    drive_link: '',
    priority: 'sedang' as 'rendah' | 'sedang' | 'tinggi' | 'urgent',
    nature: 'insidentil' as 'klerikal' | 'insidentil',
    period: '' as '' | 'bulanan' | 'triwulan' | 'semester' | 'tahunan',
    deadline: '',
    status: 'belum_mulai' as 'belum_mulai' | 'dalam_proses' | 'review' | 'selesai' | 'overdue',
    selectedPics: [] as string[],
  });

  // State Formulir Departemen
  const [unitName, setUnitName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
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
        fetchProfilesList();
        fetchTasks();
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
        fetchProfilesList();
        fetchTasks();
      } else {
        setProfile(null);
        setDepartments([]);
        setTasks([]);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*').order('created_at', { ascending: true });
    if (data) setDepartments(data);
  };

  const fetchProfilesList = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, role');
    if (data) setProfilesList(data);
  };

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        department:departments(name),
        assignees:task_assignees(
          user_id,
          profile:profiles(id, full_name)
        )
      `)
      .order('deadline', { ascending: true });

    if (!error && data) {
      setTasks(data as any);
    }
    setLoading(false);
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // HANDLER SIMPAN / EDIT PEKERJAAN
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !taskForm.department_id || !taskForm.deadline) {
      showNotification('error', 'Lengkapi Judul, Unit Kerja, dan Deadline pekerjaan!');
      return;
    }

    setActionLoading(true);

    try {
      const payload = {
        department_id: taskForm.department_id,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        legal_basis: taskForm.legal_basis.trim() || null,
        drive_link: taskForm.drive_link.trim() || null,
        priority: taskForm.priority,
        nature: taskForm.nature,
        period: taskForm.nature === 'klerikal' && taskForm.period ? taskForm.period : null,
        deadline: new Date(taskForm.deadline).toISOString(),
        status: taskForm.status,
      };

      let taskId = editingTaskId;

      if (editingTaskId) {
        // Update task
        const { error } = await supabase.from('tasks').update(payload).eq('id', editingTaskId);
        if (error) throw error;

        // Reset PICs
        await supabase.from('task_assignees').delete().eq('task_id', editingTaskId);
      } else {
        // Insert new task
        const { data, error } = await supabase.from('tasks').insert([payload]).select('id').single();
        if (error) throw error;
        taskId = data.id;
      }

      // Simpan Multi-PIC
      if (taskId && taskForm.selectedPics.length > 0) {
        const assigneeRows = taskForm.selectedPics.map((userId) => ({
          task_id: taskId,
          user_id: userId,
        }));
        const { error: picError } = await supabase.from('task_assignees').insert(assigneeRows);
        if (picError) throw picError;
      }

      showNotification('success', editingTaskId ? 'Pekerjaan berhasil diperbarui!' : 'Pekerjaan baru berhasil direkam!');
      setIsTaskModalOpen(false);
      resetTaskForm();
      fetchTasks();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menyimpan data pekerjaan.');
    } finally {
      setActionLoading(false);
    }
  };

  const resetTaskForm = () => {
    setEditingTaskId(null);
    setTaskForm({
      department_id: departments[0]?.id || '',
      title: '',
      description: '',
      legal_basis: '',
      drive_link: '',
      priority: 'sedang',
      nature: 'insidentil',
      period: '',
      deadline: '',
      status: 'belum_mulai',
      selectedPics: [],
    });
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    const existingPics = task.assignees?.map((a) => a.user_id) || [];
    setTaskForm({
      department_id: task.department_id,
      title: task.title,
      description: task.description || '',
      legal_basis: task.legal_basis || '',
      drive_link: task.drive_link || '',
      priority: task.priority,
      nature: task.nature,
      period: task.period || '',
      deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
      status: task.status,
      selectedPics: existingPics,
    });
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = async (id: string, title: string) => {
    if (!confirm(`Hapus pekerjaan "${title}"? Data yang sudah dihapus tidak dapat dipulihkan.`)) return;

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      showNotification('success', 'Pekerjaan berhasil dihapus.');
      fetchTasks();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menghapus pekerjaan.');
    }
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) throw error;
      showNotification('success', 'Status pekerjaan diperbarui!');
      fetchTasks();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal memperbarui status.');
    }
  };

  // HANDLER DEPARTEMEN
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    setActionLoading(true);

    try {
      if (editingDeptId) {
        const { error } = await supabase.from('departments').update({
          name: unitName.trim(),
          parent_id: parentId === '' ? null : parentId,
        }).eq('id', editingDeptId);
        if (error) throw error;
        showNotification('success', 'Unit kerja berhasil diperbarui!');
        setEditingDeptId(null);
      } else {
        const { error } = await supabase.from('departments').insert([{
          name: unitName.trim(),
          parent_id: parentId === '' ? null : parentId,
        }]);
        if (error) throw error;
        showNotification('success', 'Unit kerja berhasil ditambahkan!');
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

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!confirm(`Hapus unit "${name}"? Seluruh sub-unit di bawahnya akan ikut terhapus.`)) return;
    try {
      const { error } = await supabase.from('departments').delete().eq('id', id);
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
          options: { data: { full_name: authFullName } },
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

  // Helper Countdown Deadline
  const getDeadlineBadge = (deadlineStr: string, status: string) => {
    if (status === 'selesai') {
      return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full flex items-center gap-1"><CheckCircle2 size={13}/> Selesai</span>;
    }

    const now = new Date().getTime();
    const target = new Date(deadlineStr).getTime();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full flex items-center gap-1 animate-pulse"><AlertTriangle size={13}/> Terlambat {Math.abs(diffDays)} Hari</span>;
    } else if (diffDays <= 3) {
      return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1"><Clock size={13}/> H-{diffDays} Deadline</span>;
    } else {
      return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full flex items-center gap-1"><Calendar size={13}/> {diffDays} Hari Lagi</span>;
    }
  };

  // Helper Pohon Departemen
  const renderDepartmentTree = (pId: string | null = null, depth = 0) => {
    const children = departments.filter((d) => d.parent_id === pId);
    if (children.length === 0) return null;

    return (
      <div className={`space-y-2.5 ${depth > 0 ? 'ml-6 pl-4 border-l-2 border-slate-200' : ''}`}>
        {children.map((dept) => (
          <div key={dept.id} className="space-y-2.5">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs hover:border-indigo-200 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${depth === 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-sky-50 text-sky-600'}`}>
                  {depth === 0 ? <Building2 size={18} /> : <Layers size={16} />}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">{dept.name}</h4>
                  <span className="text-[11px] font-medium text-slate-400">
                    {depth === 0 ? 'Instansi Utama' : `Sub-Unit (Tingkat ${depth})`}
                  </span>
                </div>
              </div>

              {profile?.role === 'admin' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingDeptId(dept.id);
                      setUnitName(dept.name);
                      setParentId(dept.parent_id || '');
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
            {renderDepartmentTree(dept.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (t.legal_basis && t.legal_basis.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchDept = filterDept ? t.department_id === filterDept : true;
    const matchNature = filterNature ? t.nature === filterNature : true;
    const matchPriority = filterPriority ? t.priority === filterPriority : true;
    const matchStatus = filterStatus ? t.status === filterStatus : true;
    return matchSearch && matchDept && matchNature && matchPriority && matchStatus;
  });

  // TAMPILAN LOGIN JIKA BELUM OTENTIKASI
  if (!currentUser) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-12 flex-col justify-between text-white relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="font-bold text-xl">E-MONITORING</h1>
              <p className="text-xs text-indigo-300">Sistem Kendali Tugas & Deadline Instansi</p>
            </div>
          </div>
          <div className="my-auto py-12 max-w-lg">
            <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold mb-4 border border-indigo-400/20">
              Modul 3 • Master Pekerjaan & Deadline
            </span>
            <h2 className="text-4xl font-extrabold leading-tight mb-4">
              Monitoring pekerjaan klerikal & insidentil tanpa terlewat satu deadline pun.
            </h2>
            <p className="text-slate-400 text-sm">
              Rekam uraian pekerjaan, dasar hukum, tautan Google Drive, dan tugaskan multi-PIC secara transparan.
            </p>
          </div>
          <div className="text-xs text-slate-500">© Monitoring System • Enterprise Governance</div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{isLogin ? 'Masuk Dashboard' : 'Pendaftaran Akun'}</h3>
            <p className="text-sm text-slate-500 mb-6">Silakan masuk menggunakan akun kedinasan Anda.</p>

            {authMessage && (
              <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${authMessage.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{authMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    placeholder="Nama Pegawai"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="pegawai@instansi.go.id"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Kata Sandi</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition"
              >
                {authLoading ? 'Memproses...' : isLogin ? 'Masuk' : 'Daftar'}
              </button>
            </form>

            <button
              onClick={() => { setIsLogin(!isLogin); setAuthMessage(null); }}
              className="mt-6 text-sm text-indigo-600 hover:underline w-full text-center"
            >
              {isLogin ? 'Belum punya akun? Daftar PIC' : 'Sudah punya akun? Masuk'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TAMPILAN DASHBOARD UTAMA
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-base leading-tight">E-MONITORING</h1>
              <p className="text-[11px] text-slate-400 font-medium">Sistem Deadline Instansi Berjenjang</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'tasks' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              📋 Daftar Pekerjaan ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'departments' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🏢 Struktur Unit ({departments.length})
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">{profile?.full_name || currentUser.email}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full w-fit ml-auto">
                {profile?.role || 'pic'}
              </span>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="Keluar"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Notifikasi Toast */}
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

        {/* TAB 1: DAFTAR & CRUD PEKERJAAN (MODUL 3) */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Header Pekerjaan */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  Modul 3 Aktif
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-2">Daftar Pekerjaan & Batas Waktu</h2>
                <p className="text-sm text-slate-500">Monitor tugas klerikal & insidentil lengkap dengan dasar hukum dan link drive.</p>
              </div>

              <button
                onClick={() => {
                  resetTaskForm();
                  setIsTaskModalOpen(true);
                }}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm flex items-center gap-2 shadow-md shadow-indigo-600/20 transition self-start sm:self-auto"
              >
                <Plus size={16} />
                <span>Rekam Pekerjaan Baru</span>
              </button>
            </div>

            {/* Filter Bar Modern */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari konten / dasar hukum..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
              >
                <option value="">Semua Unit Kerja</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={filterNature}
                onChange={(e) => setFilterNature(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
              >
                <option value="">Semua Sifat</option>
                <option value="klerikal">Klerikal (Berkala)</option>
                <option value="insidentil">Insidentil</option>
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
              >
                <option value="">Semua Prioritas</option>
                <option value="urgent">Urgent</option>
                <option value="tinggi">Tinggi</option>
                <option value="sedang">Sedang</option>
                <option value="rendah">Rendah</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
              >
                <option value="">Semua Status</option>
                <option value="belum_mulai">Belum Mulai</option>
                <option value="dalam_proses">Dalam Proses</option>
                <option value="review">Review</option>
                <option value="selesai">Selesai</option>
              </select>
            </div>

            {/* List Tabel / Kartu Pekerjaan */}
            {loading ? (
              <div className="py-20 text-center text-slate-400 text-sm">Memuat data pekerjaan...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                <Briefcase size={40} className="mx-auto text-slate-300 mb-3" />
                <h4 className="font-semibold text-slate-700 text-sm">Belum Ada Pekerjaan yang Terdaftar</h4>
                <p className="text-xs text-slate-400 mt-1">Klik tombol "Rekam Pekerjaan Baru" di atas untuk menambahkan agenda kerja.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Badge Unit */}
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                            <Building2 size={12} /> {task.department?.name || 'Unit Belum Dipilih'}
                          </span>

                          {/* Badge Sifat */}
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            task.nature === 'klerikal' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {task.nature === 'klerikal' ? `Klerikal (${task.period || 'Berkala'})` : 'Insidentil'}
                          </span>

                          {/* Badge Prioritas */}
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            task.priority === 'urgent' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            task.priority === 'tinggi' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            task.priority === 'sedang' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {task.priority}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 pt-1">{task.title}</h3>
                        {task.description && <p className="text-xs text-slate-500 leading-relaxed">{task.description}</p>}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {getDeadlineBadge(task.deadline, task.status)}
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditTask(task)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                            title="Edit Pekerjaan"
                          >
                            <Edit3 size={16} />
                          </button>
                          {profile?.role === 'admin' && (
                            <button
                              onClick={() => handleDeleteTask(task.id, task.title)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                              title="Hapus Pekerjaan"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Baris Bawah: Dasar Hukum, Drive Link, PIC & Quick Status */}
                    <div className="pt-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div className="flex flex-wrap items-center gap-4">
                        {/* Dasar Hukum */}
                        {task.legal_basis && (
                          <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                            <FileText size={14} className="text-slate-400" />
                            <span>Dasar Hukum: <b>{task.legal_basis}</b></span>
                          </div>
                        )}

                        {/* Google Drive Link */}
                        {task.drive_link ? (
                          <a
                            href={task.drive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-semibold transition"
                          >
                            <ExternalLink size={14} />
                            <span>Buka Google Drive</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Belum ada link drive</span>
                        )}

                        {/* Daftar Multi-PIC */}
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Users size={14} className="text-slate-400" />
                          <span>PIC:</span>
                          {task.assignees && task.assignees.length > 0 ? (
                            <div className="flex items-center gap-1">
                              {task.assignees.map((a, i) => (
                                <span key={i} className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                                  {a.profile?.full_name || 'Pegawai'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada PIC</span>
                          )}
                        </div>
                      </div>

                      {/* Quick Status Selector */}
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-slate-400 font-medium">Status:</span>
                        <select
                          value={task.status}
                          onChange={(e) => handleQuickStatusChange(task.id, e.target.value as any)}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                        >
                          <option value="belum_mulai">Belum Mulai</option>
                          <option value="dalam_proses">Dalam Proses</option>
                          <option value="review">Review</option>
                          <option value="selesai">Selesai</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HIERARKI UNIT KERJA (MODUL 2) */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Master Struktur Organisasi</h2>
                <p className="text-sm text-slate-500">Kelola hierarki kantor pusat, sub-instansi, hingga sub-bagian.</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Total Unit:</span>
                <span className="text-lg font-bold text-slate-800 ml-2">{departments.length} Unit</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Tambah Unit */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs sticky top-24">
                  <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                    <Building2 size={18} className="text-indigo-600" />
                    <span>{editingDeptId ? 'Ubah Nama Unit' : 'Tambah Unit Kerja'}</span>
                  </h3>

                  <form onSubmit={handleSaveDepartment} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Nama Unit *</label>
                      <input
                        type="text"
                        required
                        value={unitName}
                        onChange={(e) => setUnitName(e.target.value)}
                        placeholder="Nama Unit / Sub-Instansi"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Unit Induk (Atasan)</label>
                      <select
                        value={parentId}
                        onChange={(e) => setParentId(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                      >
                        <option value="">-- Instansi Pusat (Tanpa Induk) --</option>
                        {departments.filter((d) => d.id !== editingDeptId).map((dept) => (
                          <option key={dept.id} value={dept.id}>↳ {dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={actionLoading || profile?.role !== 'admin'}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium rounded-xl text-sm transition"
                    >
                      {editingDeptId ? 'Simpan Perubahan' : 'Tambahkan Unit'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Bagan Pohon */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <h3 className="font-bold text-slate-800 text-base mb-4">Bagan Struktur Instansi</h3>
                  {departments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada unit kerja terdaftar.</p>
                  ) : (
                    <div className="space-y-4">{renderDepartmentTree(null, 0)}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL FORM REKAM / EDIT PEKERJAAN LENGKAP */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingTaskId ? 'Ubah Data Pekerjaan' : 'Rekam Pekerjaan Baru'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Lengkapi parameter deadline, dasar hukum, dan penugasan PIC.</p>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              {/* Unit Kerja Pelaksana */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Unit Kerja Pelaksana *</label>
                <select
                  required
                  value={taskForm.department_id}
                  onChange={(e) => setTaskForm({ ...taskForm, department_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="">-- Pilih Unit Kerja Terkait --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Judul Pekerjaan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Konten / Judul Pekerjaan *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Contoh: Penyusunan Laporan Akuntabilitas Kinerja (LAKIP)"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* Uraian Pekerjaan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Uraian / Deskripsi Tugas</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Uraikan detail pekerjaan yang harus dilaksanakan..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* Dasar Hukum & Link Drive */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Dasar Hukum / SK</label>
                  <input
                    type="text"
                    value={taskForm.legal_basis}
                    onChange={(e) => setTaskForm({ ...taskForm, legal_basis: e.target.value })}
                    placeholder="Contoh: Permenpan RB No. 88 / 2021"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Link Google Drive</label>
                  <input
                    type="url"
                    value={taskForm.drive_link}
                    onChange={(e) => setTaskForm({ ...taskForm, drive_link: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Sifat Pekerjaan & Periode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Sifat Pekerjaan</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="nature"
                        value="insidentil"
                        checked={taskForm.nature === 'insidentil'}
                        onChange={() => setTaskForm({ ...taskForm, nature: 'insidentil', period: '' })}
                      />
                      Insidentil
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="nature"
                        value="klerikal"
                        checked={taskForm.nature === 'klerikal'}
                        onChange={() => setTaskForm({ ...taskForm, nature: 'klerikal', period: 'bulanan' })}
                      />
                      Klerikal (Berkala)
                    </label>
                  </div>
                </div>

                {taskForm.nature === 'klerikal' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Periode Klerikal</label>
                    <select
                      value={taskForm.period}
                      onChange={(e) => setTaskForm({ ...taskForm, period: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="bulanan">Bulanan</option>
                      <option value="triwulan">Triwulan</option>
                      <option value="semester">Semester</option>
                      <option value="tahunan">Tahunan</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Prioritas & Deadline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Tingkat Prioritas</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="rendah">Rendah</option>
                    <option value="sedang">Sedang</option>
                    <option value="tinggi">Tinggi</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Batas Waktu (Deadline) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Multi-PIC Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                  Pilih Penanggung Jawab (Multi-PIC)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {profilesList.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Belum ada pegawai terdaftar.</span>
                  ) : (
                    profilesList.map((p) => {
                      const isChecked = taskForm.selectedPics.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition ${
                            isChecked ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold' : 'bg-white border-slate-100 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTaskForm({ ...taskForm, selectedPics: [...taskForm.selectedPics, p.id] });
                              } else {
                                setTaskForm({ ...taskForm, selectedPics: taskForm.selectedPics.filter((id) => id !== p.id) });
                              }
                            }}
                          />
                          <span>{p.full_name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Tombol Simpan Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl shadow-md shadow-indigo-600/20 transition"
                >
                  {actionLoading ? 'Menyimpan...' : editingTaskId ? 'Simpan Perubahan' : 'Rekam Pekerjaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
