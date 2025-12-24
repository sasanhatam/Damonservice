import React, { useState, useEffect } from 'react';
import { backend } from '../lib/backend';
import { Category, SafeDeviceDTO, RequestStatusDTO } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Search, Filter, DollarSign, LogOut, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [devices, setDevices] = useState<SafeDeviceDTO[]>([]);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Request State
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Record<string, RequestStatusDTO>>({}); // Map deviceId -> Request

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, selectedCategory]);

  const loadInitialData = async () => {
    const cats = await backend.getCategoriesSafe();
    setCategories(cats);
    handleSearch();
    refreshRequests();
  };

  const refreshRequests = async () => {
    if (!user) return;
    const userRequests = await backend.getUserRequests(user.id);
    const reqMap: Record<string, RequestStatusDTO> = {};
    userRequests.forEach(r => {
      // If multiple requests exist for same device, take the latest one
      if (!reqMap[r.deviceId] || reqMap[r.deviceId].timestamp < r.timestamp) {
        reqMap[r.deviceId] = r;
      }
    });
    setRequests(reqMap);
  };

  const handleSearch = async () => {
    const results = await backend.searchDevicesSafe(searchQuery, selectedCategory);
    setDevices(results);
  };

  const handleRequestPrice = async (deviceId: string) => {
    if (!user) return;
    setRequestingId(deviceId);
    try {
      await backend.requestPrice(user.id, deviceId);
      await refreshRequests();
    } catch (err) {
      console.error(err);
      alert('خطا در ثبت درخواست');
    } finally {
      setRequestingId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fa-IR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(val);
  };

  const renderActionArea = (device: SafeDeviceDTO) => {
    const req = requests[device.id];

    if (!req) {
      return (
        <Button 
          className="w-full flex items-center justify-center gap-2"
          onClick={() => handleRequestPrice(device.id)}
          disabled={requestingId === device.id}
        >
          {requestingId === device.id ? (
            <span className="animate-pulse">در حال ثبت...</span>
          ) : (
            <>
              <DollarSign size={18} />
              درخواست قیمت
            </>
          )}
        </Button>
      );
    }

    if (req.status === 'pending') {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-center justify-center gap-2 text-yellow-700">
          <Clock size={18} />
          <span className="text-sm font-medium">در انتظار تایید ادمین</span>
        </div>
      );
    }

    if (req.status === 'rejected') {
      return (
        <div className="flex flex-col gap-2">
           <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center justify-center gap-2 text-red-700">
            <XCircle size={18} />
            <span className="text-sm font-medium">درخواست رد شد</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-gray-500"
            onClick={() => handleRequestPrice(device.id)}
          >
            درخواست مجدد
          </Button>
        </div>
      );
    }

    if (req.status === 'approved' && req.sellPriceEUR !== null) {
      return (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm flex items-center gap-1">
              <CheckCircle size={14} className="text-green-600"/>
              قیمت نهایی:
            </span>
            <span className="text-xl font-bold text-green-700" dir="ltr">
              {formatCurrency(req.sellPriceEUR)}
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800">استعلام قیمت</h1>
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">کارمند</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={refreshRequests} title="بروزرسانی وضعیت‌ها">
              <RefreshCw size={16} />
            </Button>
            <span className="text-sm text-gray-600 hidden sm:block">کاربر: {user?.fullName}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="text-red-600 hover:bg-red-50">
              <LogOut size={18} className="ml-2" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filter Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
            <label className="text-sm font-medium text-gray-700 mb-1 block">جستجو مدل</label>
            <div className="relative">
              <input
                type="text"
                placeholder="نام مدل را وارد کنید..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
          </div>

          <div className="w-full md:w-1/4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">دسته‌بندی</label>
            <div className="relative">
              <select
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">همه دسته‌ها</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              موردی یافت نشد.
            </div>
          ) : (
            devices.map(device => (
              <div key={device.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {device.categoryName}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 mt-2">{device.modelName}</h3>
                    </div>
                  </div>
                </div>
                
                <div className="p-5 pt-0 mt-auto border-t border-gray-50">
                  <div className="mt-4">
                    {renderActionArea(device)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
