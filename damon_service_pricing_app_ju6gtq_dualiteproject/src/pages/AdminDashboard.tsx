import React, { useState, useEffect } from 'react';
import { backend } from '../lib/backend';
import { Category, Device, GlobalSettings, InquiryLog, User } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LogOut, Settings, Database, FileText, Plus, Trash2, Edit, Users, CheckSquare, Check, X } from 'lucide-react';

// --- SUB-COMPONENTS ---

const SettingsTab = ({ settings, onSave }: { settings: GlobalSettings, onSave: (s: GlobalSettings) => void }) => {
  const [formData, setFormData] = useState(settings);

  const handleChange = (field: keyof GlobalSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-6 border-b pb-2">تنظیمات و ضرایب جهانی</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input 
          label="ضریب تخفیف (Discount Multiplier)" 
          type="number" step="0.01" 
          value={formData.discountMultiplier} 
          onChange={e => handleChange('discountMultiplier', parseFloat(e.target.value))} 
        />
        <Input 
          label="نرخ حمل به ازای طول (Freight Rate €)" 
          type="number" 
          value={formData.freightRatePerLengthEUR} 
          onChange={e => handleChange('freightRatePerLengthEUR', parseFloat(e.target.value))} 
        />
        <Input 
          label="صورت کسر گمرک (Customs Numerator)" 
          type="number" 
          value={formData.customsNumerator} 
          onChange={e => handleChange('customsNumerator', parseFloat(e.target.value))} 
        />
        <Input 
          label="مخرج کسر گمرک (Customs Denominator)" 
          type="number" 
          value={formData.customsDenominator} 
          onChange={e => handleChange('customsDenominator', parseFloat(e.target.value))} 
        />
        <Input 
          label="نرخ گارانتی (Warranty Rate)" 
          type="number" step="0.01" 
          value={formData.warrantyRate} 
          onChange={e => handleChange('warrantyRate', parseFloat(e.target.value))} 
        />
        <Input 
          label="ضریب کمیسیون داخلی (Internal Commission)" 
          type="number" step="0.01" 
          value={formData.internalCommissionFactor} 
          onChange={e => handleChange('internalCommissionFactor', parseFloat(e.target.value))} 
        />
        <Input 
          label="ضریب هزینه شرکت (Company Cost)" 
          type="number" step="0.01" 
          value={formData.companyCostFactor} 
          onChange={e => handleChange('companyCostFactor', parseFloat(e.target.value))} 
        />
        <Input 
          label="ضریب سود (Profit Factor)" 
          type="number" step="0.01" 
          value={formData.profitFactor} 
          onChange={e => handleChange('profitFactor', parseFloat(e.target.value))} 
        />
      </div>
      <div className="mt-8 flex justify-end">
        <Button onClick={() => onSave(formData)}>ذخیره تنظیمات</Button>
      </div>
    </div>
  );
};

const DevicesTab = ({ devices, categories, onSave, onDelete }: { devices: Device[], categories: Category[], onSave: (d: Device) => void, onDelete: (id: string) => void }) => {
  const [editing, setEditing] = useState<Device | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      onSave(editing);
      setEditing(null);
    }
  };

  const startNew = () => {
    setEditing({
      id: '',
      modelName: '',
      categoryId: categories[0]?.id || '',
      isActive: true,
      factoryPriceEUR: 0,
      length: 0,
      weight: 0
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">مدیریت دستگاه‌ها</h2>
        <Button onClick={startNew} size="sm"><Plus size={16} className="ml-1" /> دستگاه جدید</Button>
      </div>

      {editing && (
        <div className="mb-8 p-4 bg-blue-50 rounded border border-blue-100">
          <h3 className="font-bold mb-4 text-blue-800">{editing.id ? 'ویرایش دستگاه' : 'دستگاه جدید'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="نام مدل" value={editing.modelName} onChange={e => setEditing({...editing, modelName: e.target.value})} required />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">دسته‌بندی</label>
              <select 
                className="w-full p-2 border rounded" 
                value={editing.categoryId} 
                onChange={e => setEditing({...editing, categoryId: e.target.value})}
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Input label="قیمت کارخانه (€)" type="number" value={editing.factoryPriceEUR} onChange={e => setEditing({...editing, factoryPriceEUR: parseFloat(e.target.value)})} required />
            <Input label="طول (m)" type="number" step="0.1" value={editing.length} onChange={e => setEditing({...editing, length: parseFloat(e.target.value)})} required />
            <Input label="وزن (kg)" type="number" value={editing.weight} onChange={e => setEditing({...editing, weight: parseFloat(e.target.value)})} required />
            <div className="flex items-center pt-6">
               <label className="flex items-center gap-2">
                 <input type="checkbox" checked={editing.isActive} onChange={e => setEditing({...editing, isActive: e.target.checked})} />
                 <span>فعال</span>
               </label>
            </div>
            <div className="col-span-full flex gap-2 justify-end mt-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>انصراف</Button>
              <Button type="submit">ذخیره</Button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3">مدل</th>
              <th className="p-3">دسته</th>
              <th className="p-3">قیمت کارخانه</th>
              <th className="p-3">ابعاد/وزن</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{d.modelName}</td>
                <td className="p-3">{categories.find(c => c.id === d.categoryId)?.name}</td>
                <td className="p-3">€{d.factoryPriceEUR.toLocaleString()}</td>
                <td className="p-3">{d.length}m / {d.weight}kg</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${d.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {d.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => setEditing(d)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                  <button onClick={() => { if(confirm('حذف شود؟')) onDelete(d.id) }} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const UsersTab = ({ users, onSave, onDelete }: { users: User[], onSave: (u: User) => void, onDelete: (id: string) => void }) => {
  const [editing, setEditing] = useState<User | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      onSave(editing);
      setEditing(null);
    }
  };

  const startNew = () => {
    setEditing({
      id: '',
      username: '',
      password: '',
      fullName: '',
      role: 'employee',
      isActive: true
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">مدیریت کاربران</h2>
        <Button onClick={startNew} size="sm"><Plus size={16} className="ml-1" /> کاربر جدید</Button>
      </div>

      {editing && (
        <div className="mb-8 p-4 bg-blue-50 rounded border border-blue-100">
          <h3 className="font-bold mb-4 text-blue-800">{editing.id ? 'ویرایش کاربر' : 'کاربر جدید'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="نام کاربری" value={editing.username} onChange={e => setEditing({...editing, username: e.target.value})} required />
            <Input label="رمز عبور" value={editing.password || ''} onChange={e => setEditing({...editing, password: e.target.value})} required={!editing.id} placeholder={editing.id ? 'بدون تغییر' : ''} />
            <Input label="نام کامل" value={editing.fullName} onChange={e => setEditing({...editing, fullName: e.target.value})} required />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">نقش</label>
              <select 
                className="w-full p-2 border rounded" 
                value={editing.role} 
                onChange={e => setEditing({...editing, role: e.target.value as any})}
              >
                <option value="employee">کارمند</option>
                <option value="admin">ادمین</option>
              </select>
            </div>
            <div className="flex items-center pt-6">
               <label className="flex items-center gap-2">
                 <input type="checkbox" checked={editing.isActive} onChange={e => setEditing({...editing, isActive: e.target.checked})} />
                 <span>فعال</span>
               </label>
            </div>
            <div className="col-span-full flex gap-2 justify-end mt-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>انصراف</Button>
              <Button type="submit">ذخیره</Button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3">نام کاربری</th>
              <th className="p-3">نام کامل</th>
              <th className="p-3">نقش</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{u.username}</td>
                <td className="p-3">{u.fullName}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                    {u.role === 'admin' ? 'ادمین' : 'کارمند'}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {u.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => setEditing(u)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                  <button onClick={() => { if(confirm('حذف شود؟')) onDelete(u.id) }} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RequestsTab = ({ logs, onUpdateStatus }: { logs: InquiryLog[], onUpdateStatus: (id: string, status: 'approved' | 'rejected') => void }) => {
  // Filter only pending or recently decided
  const pendingLogs = logs.filter(l => l.status === 'pending');
  const historyLogs = logs.filter(l => l.status !== 'pending').slice(0, 20); // Show last 20 history

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-400">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <CheckSquare className="text-yellow-600" />
          درخواست‌های در انتظار تایید ({pendingLogs.length})
        </h2>
        
        {pendingLogs.length === 0 ? (
          <p className="text-gray-500 text-sm">هیچ درخواست جدیدی وجود ندارد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-yellow-50 border-b border-yellow-100">
                <tr>
                  <th className="p-3">زمان</th>
                  <th className="p-3">کاربر</th>
                  <th className="p-3">مدل</th>
                  <th className="p-3">قیمت محاسبه شده</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {pendingLogs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="p-3" dir="ltr">{new Date(log.timestamp).toLocaleString('fa-IR')}</td>
                    <td className="p-3 font-medium">{log.userFullName}</td>
                    <td className="p-3">{log.modelNameSnapshot}</td>
                    <td className="p-3 font-bold text-gray-800">€{log.sellPriceEURSnapshot.toLocaleString()}</td>
                    <td className="p-3 flex justify-center gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 px-3" onClick={() => onUpdateStatus(log.id, 'approved')}>
                        <Check size={16} className="mr-1" /> تایید
                      </Button>
                      <Button size="sm" variant="danger" className="h-8 px-3" onClick={() => onUpdateStatus(log.id, 'rejected')}>
                        <X size={16} className="mr-1" /> رد
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4 text-gray-700">تاریخچه درخواست‌ها (۲۰ مورد اخیر)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3">زمان</th>
                <th className="p-3">کاربر</th>
                <th className="p-3">مدل</th>
                <th className="p-3">قیمت</th>
                <th className="p-3">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {historyLogs.map(log => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-3" dir="ltr">{new Date(log.timestamp).toLocaleString('fa-IR')}</td>
                  <td className="p-3">{log.userFullName}</td>
                  <td className="p-3">{log.modelNameSnapshot}</td>
                  <td className="p-3">€{log.sellPriceEURSnapshot.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium
                      ${log.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                    `}>
                      {log.status === 'approved' ? 'تایید شده' : 'رد شده'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- MAIN ADMIN PAGE ---

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'devices' | 'settings'>('requests');
  const [data, setData] = useState<{
    users: User[];
    categories: Category[];
    devices: Device[];
    settings: GlobalSettings | null;
    logs: InquiryLog[];
  }>({ users: [], categories: [], devices: [], settings: null, logs: [] });

  useEffect(() => {
    loadData();
    // Poll for new requests every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const d = await backend.getAdminData();
    setData(d);
  };

  const handleSaveSettings = async (newSettings: GlobalSettings) => {
    await backend.updateSettings(newSettings);
    loadData();
    alert('تنظیمات ذخیره شد');
  };

  const handleSaveDevice = async (device: Device) => {
    await backend.updateDevice(device);
    loadData();
  };

  const handleDeleteDevice = async (id: string) => {
    await backend.deleteDevice(id);
    loadData();
  };

  const handleSaveUser = async (u: User) => {
    await backend.saveUser(u);
    loadData();
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await backend.deleteUser(id);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    await backend.setRequestStatus(id, status);
    loadData();
  };

  if (!data.settings) return <div>Loading...</div>;

  const pendingCount = data.logs.filter(l => l.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Bar */}
      <header className="bg-gray-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-xs font-bold px-2 py-1 rounded">ADMIN</span>
            <h1 className="text-lg font-bold">پنل مدیریت دامون</h1>
          </div>
          <Button variant="ghost" className="text-white hover:bg-gray-800" onClick={logout}>
            <LogOut size={18} className="ml-2" /> خروج
          </Button>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full p-4 gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('requests')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-colors ${activeTab === 'requests' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}
            >
              <div className="flex items-center gap-3"><CheckSquare size={20} /> درخواست‌ها</div>
              {pendingCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}
            >
              <Users size={20} /> کاربران
            </button>
            <button 
              onClick={() => setActiveTab('devices')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'devices' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}
            >
              <Database size={20} /> دستگاه‌ها
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}
            >
              <Settings size={20} /> تنظیمات
            </button>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1">
          {activeTab === 'requests' && <RequestsTab logs={data.logs} onUpdateStatus={handleUpdateStatus} />}
          {activeTab === 'users' && <UsersTab users={data.users} onSave={handleSaveUser} onDelete={handleDeleteUser} />}
          {activeTab === 'devices' && <DevicesTab devices={data.devices} categories={data.categories} onSave={handleSaveDevice} onDelete={handleDeleteDevice} />}
          {activeTab === 'settings' && <SettingsTab settings={data.settings} onSave={handleSaveSettings} />}
        </main>
      </div>
    </div>
  );
};
