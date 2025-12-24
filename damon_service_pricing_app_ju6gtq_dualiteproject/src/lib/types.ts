export type Role = 'admin' | 'employee';

export interface User {
  id: string;
  username: string;
  password?: string; // Simple storage for mock purposes
  fullName: string;
  role: Role;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Device {
  id: string;
  modelName: string;
  categoryId: string;
  isActive: boolean;
  // Sensitive fields (Only visible to Admin or Backend)
  factoryPriceEUR: number; // P
  length: number; // L
  weight: number; // W
}

export interface GlobalSettings {
  id: string;
  isActive: boolean;
  discountMultiplier: number; // D
  freightRatePerLengthEUR: number; // F
  customsNumerator: number; // CN
  customsDenominator: number; // CD
  warrantyRate: number; // WR
  internalCommissionFactor: number; // IC
  companyCostFactor: number; // CC
  profitFactor: number; // PF
  // Removed IRR settings as per request
}

export type InquiryStatus = 'pending' | 'approved' | 'rejected';

export interface InquiryLog {
  id: string;
  userId: string;
  userFullName: string;
  deviceId: string;
  categoryNameSnapshot: string;
  modelNameSnapshot: string;
  sellPriceEURSnapshot: number;
  timestamp: number;
  status: InquiryStatus;
  adminResponseTime?: number;
}

// DTOs for Frontend (Safe Responses)
export interface SafeDeviceDTO {
  id: string;
  modelName: string;
  categoryName: string;
  categoryId: string;
  // Price is NOT included in the list view
}

export interface RequestStatusDTO {
  requestId: string;
  deviceId: string;
  status: InquiryStatus;
  sellPriceEUR: number | null; // Null if pending or rejected
  timestamp: number;
}
