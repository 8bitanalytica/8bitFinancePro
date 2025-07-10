import { apiRequest } from "./queryClient";
import type { 
  GeneralTransaction, 
  InsertGeneralTransaction,
  Property,
  InsertProperty,
  RealEstateTransaction,
  InsertRealEstateTransaction
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
