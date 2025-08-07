import { apiRequest } from "./queryClient";
import type { 
  GeneralTransaction, 
  InsertGeneralTransaction,
  Property,
  InsertProperty,
  PropertyProject,
  InsertPropertyProject,
  RealEstateTransaction,
  InsertRealEstateTransaction,
  Device,
  InsertDevice,
  DeviceTransaction,
  InsertDeviceTransaction
} from "@shared/schema";

// General Transactions API
export const generalTransactionsApi = {
  getAll: async (): Promise<GeneralTransaction[]> => {
    const response = await apiRequest("GET", "/api/general-transactions");
    return response.json();
  },

  get: async (id: number): Promise<GeneralTransaction> => {
    const response = await apiRequest("GET", `/api/general-transactions/${id}`);
    return response.json();
  },

  create: async (data: InsertGeneralTransaction): Promise<GeneralTransaction> => {
    const response = await apiRequest("POST", "/api/general-transactions", data);
    return response.json();
  },

  update: async (id: number, data: Partial<InsertGeneralTransaction>): Promise<GeneralTransaction> => {
    const response = await apiRequest("PUT", `/api/general-transactions/${id}`, data);
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/general-transactions/${id}`);
  },
};

// Properties API
export const propertiesApi = {
  getAll: async (): Promise<Property[]> => {
    const response = await apiRequest("GET", "/api/properties");
    return response.json();
  },

  get: async (id: number): Promise<Property> => {
    const response = await apiRequest("GET", `/api/properties/${id}`);
    return response.json();
  },

  create: async (data: InsertProperty): Promise<Property> => {
    const response = await apiRequest("POST", "/api/properties", data);
    return response.json();
  },

  update: async (id: number, data: Partial<InsertProperty>): Promise<Property> => {
    const response = await apiRequest("PUT", `/api/properties/${id}`, data);
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/properties/${id}`);
  },
};

// Property Projects API
export const propertyProjectsApi = {
  getAll: async (propertyId?: number): Promise<PropertyProject[]> => {
    const url = propertyId 
      ? `/api/property-projects?propertyId=${propertyId}`
      : "/api/property-projects";
    const response = await apiRequest("GET", url);
    return response.json();
  },

  get: async (id: number): Promise<PropertyProject> => {
    const response = await apiRequest("GET", `/api/property-projects/${id}`);
    return response.json();
  },

  create: async (data: InsertPropertyProject): Promise<PropertyProject> => {
    const response = await apiRequest("POST", "/api/property-projects", data);
    return response.json();
  },

  update: async (id: number, data: Partial<InsertPropertyProject>): Promise<PropertyProject> => {
    const response = await apiRequest("PUT", `/api/property-projects/${id}`, data);
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/property-projects/${id}`);
  },
};

// Real Estate Transactions API
export const realEstateTransactionsApi = {
  getAll: async (propertyId?: number): Promise<RealEstateTransaction[]> => {
    const url = propertyId 
      ? `/api/real-estate-transactions?propertyId=${propertyId}`
      : "/api/real-estate-transactions";
    const response = await apiRequest("GET", url);
    return response.json();
  },

  get: async (id: number): Promise<RealEstateTransaction> => {
    const response = await apiRequest("GET", `/api/real-estate-transactions/${id}`);
    return response.json();
  },

  create: async (data: InsertRealEstateTransaction): Promise<RealEstateTransaction> => {
    const response = await apiRequest("POST", "/api/real-estate-transactions", data);
    return response.json();
  },

  update: async (id: number, data: Partial<InsertRealEstateTransaction>): Promise<RealEstateTransaction> => {
    const response = await apiRequest("PUT", `/api/real-estate-transactions/${id}`, data);
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/real-estate-transactions/${id}`);
  },
};

// Devices API
export const devicesApi = {
  getAll: async (): Promise<Device[]> => {
    const response = await apiRequest("GET", "/api/devices");
    return response.json();
  },

  get: async (id: number): Promise<Device> => {
    const response = await apiRequest("GET", `/api/devices/${id}`);
    return response.json();
  },

  create: async (data: InsertDevice): Promise<Device> => {
    const response = await apiRequest("POST", "/api/devices", data);
    return response.json();
  },

  update: async (id: number, data: Partial<InsertDevice>): Promise<Device> => {
    const response = await apiRequest("PUT", `/api/devices/${id}`, data);
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/devices/${id}`);
  },
};

// Device Transactions API
export const deviceTransactionsApi = {
  getAll: async (deviceId?: number): Promise<DeviceTransaction[]> => {
    const url = deviceId 
      ? `/api/device-transactions?deviceId=${deviceId}`
      : "/api/device-transactions";
    const response = await apiRequest("GET", url);
    return response.json();
  },

  get: async (id: number): Promise<DeviceTransaction> => {
    const response = await apiRequest("GET", `/api/device-transactions/${id}`);
    return response.json();
  },

  create: async (data: InsertDeviceTransaction): Promise<DeviceTransaction> => {
    const response = await apiRequest("POST", "/api/device-transactions", data);
    return response.json();
  },

  update: async (id: number, data: Partial<InsertDeviceTransaction>): Promise<DeviceTransaction> => {
    const response = await apiRequest("PUT", `/api/device-transactions/${id}`, data);
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/device-transactions/${id}`);
  },
};
