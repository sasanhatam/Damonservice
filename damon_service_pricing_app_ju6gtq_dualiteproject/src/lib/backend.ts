import { Device, GlobalSettings, InquiryLog, User, Category, SafeDeviceDTO, RequestStatusDTO } from './types';

// --- MOCK DATABASE SEED ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_SETTINGS: GlobalSettings = {
  id: 'settings-v1',
  isActive: true,
  discountMultiplier: 0.38,
  freightRatePerLengthEUR: 1000,
  customsNumerator: 350000,
  customsDenominator: 150000,
  warrantyRate: 0.05,
  internalCommissionFactor: 0.95,
  companyCostFactor: 0.97,
  profitFactor: 0.65,
};

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'VRF Systems', isActive: true },
  { id: 'cat-2', name: 'Chillers', isActive: true },
  { id: 'cat-3', name: 'Air Handling Units (AHU)', isActive: true },
];

const INITIAL_DEVICES: Device[] = [
  { id: 'dev-1', modelName: 'VRF-Outdoor-20HP', categoryId: 'cat-1', isActive: true, factoryPriceEUR: 15000, length: 2.5, weight: 400 },
  { id: 'dev-2', modelName: 'VRF-Indoor-Cassette', categoryId: 'cat-1', isActive: true, factoryPriceEUR: 800, length: 0.8, weight: 30 },
  { id: 'dev-3', modelName: 'Screw-Chiller-100T', categoryId: 'cat-2', isActive: true, factoryPriceEUR: 45000, length: 4.0, weight: 2500 },
  { id: 'dev-4', modelName: 'Scroll-Chiller-Mini', categoryId: 'cat-2', isActive: true, factoryPriceEUR: 12000, length: 1.5, weight: 600 },
  { id: 'dev-5', modelName: 'AHU-Industrial-5000', categoryId: 'cat-3', isActive: true, factoryPriceEUR: 8000, length: 3.0, weight: 900 },
  { id: 'dev-6', modelName: 'AHU-Hygienic-2000', categoryId: 'cat-3', isActive: true, factoryPriceEUR: 11000, length: 2.2, weight: 750 },
];

const INITIAL_USERS: User[] = [
  { id: 'admin-1', username: 'admin', password: 'admin', fullName: 'مدیر سیستم', role: 'admin', isActive: true },
  { id: 'emp-1', username: 'ali', password: '123', fullName: 'علی محمدی', role: 'employee', isActive: true },
  { id: 'emp-2', username: 'sara', password: '123', fullName: 'سارا رضایی', role: 'employee', isActive: true },
];

// --- LOCAL STORAGE WRAPPER ---

const loadData = <T>(key: string, initial: T): T => {
  const stored = localStorage.getItem(`damon_app_v2_${key}`);
  return stored ? JSON.parse(stored) : initial;
};

const saveData = (key: string, data: any) => {
  localStorage.setItem(`damon_app_v2_${key}`, JSON.stringify(data));
};

// --- BACKEND SERVICE CLASS ---

class MockBackendService {
  private users: User[];
  private categories: Category[];
  private devices: Device[];
  private settings: GlobalSettings;
  private logs: InquiryLog[];

  constructor() {
    this.users = loadData('users', INITIAL_USERS);
    this.categories = loadData('categories', INITIAL_CATEGORIES);
    this.devices = loadData('devices', INITIAL_DEVICES);
    this.settings = loadData('settings', INITIAL_SETTINGS);
    this.logs = loadData('logs', []);
  }

  private saveAll() {
    saveData('users', this.users);
    saveData('categories', this.categories);
    saveData('devices', this.devices);
    saveData('settings', this.settings);
    saveData('logs', this.logs);
  }

  // --- AUTH ---
  async login(username: string, password?: string): Promise<User | null> {
    const user = this.users.find(u => 
      u.username.toLowerCase() === username.toLowerCase() && 
      u.isActive
    );
    
    if (!user) return null;
    
    // Simple password check
    if (user.password && user.password !== password) {
      return null;
    }

    return user;
  }

  // --- CORE LOGIC ---
  private calculatePriceInternal(device: Device): number {
    const S = this.settings;
    const P = device.factoryPriceEUR;
    const L = device.length;
    const W = device.weight;

    const factoryPayment = P * S.discountMultiplier;
    const freight = L * S.freightRatePerLengthEUR;
    const customs = W * (S.customsNumerator / S.customsDenominator);
    const warrantyReserve = factoryPayment * S.warrantyRate;
    const costPrice = factoryPayment + freight + customs + warrantyReserve;
    const afterInternalCommission = costPrice / S.internalCommissionFactor;
    const afterCompanyCosts = afterInternalCommission / S.companyCostFactor;
    const sellPriceEUR = afterCompanyCosts / S.profitFactor;

    return Math.ceil(sellPriceEUR);
  }

  // --- EMPLOYEE API ---

  async getCategoriesSafe(): Promise<Category[]> {
    return this.categories.filter(c => c.isActive);
  }

  async searchDevicesSafe(query: string, categoryId?: string): Promise<SafeDeviceDTO[]> {
    let result = this.devices.filter(d => d.isActive);

    if (categoryId && categoryId !== 'all') {
      result = result.filter(d => d.categoryId === categoryId);
    }

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(d => d.modelName.toLowerCase().includes(q));
    }

    return result.map(d => ({
      id: d.id,
      modelName: d.modelName,
      categoryId: d.categoryId,
      categoryName: this.categories.find(c => c.id === d.categoryId)?.name || 'Unknown',
    }));
  }

  // NEW: Request Price (Creates pending log)
  async requestPrice(userId: string, deviceId: string): Promise<RequestStatusDTO> {
    const device = this.devices.find(d => d.id === deviceId);
    const user = this.users.find(u => u.id === userId);
    
    if (!device || !user) throw new Error("Device or User not found");

    // Check if there is already a pending request for this device by this user
    const existingPending = this.logs.find(l => 
      l.userId === userId && 
      l.deviceId === deviceId && 
      l.status === 'pending'
    );

    if (existingPending) {
       return {
         requestId: existingPending.id,
         deviceId: existingPending.deviceId,
         status: existingPending.status,
         sellPriceEUR: null,
         timestamp: existingPending.timestamp
       };
    }

    const priceEUR = this.calculatePriceInternal(device);
    
    const log: InquiryLog = {
      id: generateId(),
      userId: user.id,
      userFullName: user.fullName,
      deviceId: device.id,
      categoryNameSnapshot: this.categories.find(c => c.id === device.categoryId)?.name || 'Unknown',
      modelNameSnapshot: device.modelName,
      sellPriceEURSnapshot: priceEUR,
      timestamp: Date.now(),
      status: 'pending' // Default status
    };
    
    this.logs.unshift(log);
    this.saveAll();

    return {
      requestId: log.id,
      deviceId: log.deviceId,
      status: 'pending',
      sellPriceEUR: null, // Hidden
      timestamp: log.timestamp
    };
  }

  // NEW: Get all requests for current user (to show status)
  async getUserRequests(userId: string): Promise<RequestStatusDTO[]> {
    const userLogs = this.logs.filter(l => l.userId === userId);
    
    return userLogs.map(log => ({
      requestId: log.id,
      deviceId: log.deviceId,
      status: log.status,
      // Only show price if approved
      sellPriceEUR: log.status === 'approved' ? log.sellPriceEURSnapshot : null,
      timestamp: log.timestamp
    }));
  }

  // --- ADMIN API ---

  async getAdminData() {
    return {
      users: this.users,
      categories: this.categories,
      devices: this.devices,
      settings: this.settings,
      logs: this.logs,
    };
  }

  async updateSettings(newSettings: GlobalSettings) {
    this.settings = newSettings;
    this.saveAll();
  }

  async updateDevice(device: Device) {
    const idx = this.devices.findIndex(d => d.id === device.id);
    if (idx >= 0) {
      this.devices[idx] = device;
    } else {
      this.devices.push({ ...device, id: generateId() });
    }
    this.saveAll();
  }

  async deleteDevice(id: string) {
    this.devices = this.devices.filter(d => d.id !== id);
    this.saveAll();
  }

  // User Management
  async saveUser(user: User) {
    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.users[idx] = user;
    } else {
      this.users.push({ ...user, id: generateId() });
    }
    this.saveAll();
  }

  async deleteUser(id: string) {
    // Prevent deleting the last admin
    const userToDelete = this.users.find(u => u.id === id);
    if (userToDelete?.role === 'admin') {
       const adminCount = this.users.filter(u => u.role === 'admin').length;
       if (adminCount <= 1) throw new Error("Cannot delete the last admin");
    }
    this.users = this.users.filter(u => u.id !== id);
    this.saveAll();
  }

  // Approval Workflow
  async setRequestStatus(logId: string, status: 'approved' | 'rejected') {
    const log = this.logs.find(l => l.id === logId);
    if (log) {
      log.status = status;
      log.adminResponseTime = Date.now();
      this.saveAll();
    }
  }
}

export const backend = new MockBackendService();
