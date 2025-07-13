import { 
  GeneralTransaction, 
  InsertGeneralTransaction,
  Property,
  InsertProperty,
  RealEstateTransaction,
  InsertRealEstateTransaction,
  Device,
  InsertDevice,
  DeviceTransaction,
  InsertDeviceTransaction
} from "@shared/schema";

export interface IStorage {
  // General Transactions
  getGeneralTransactions(): Promise<GeneralTransaction[]>;
  getGeneralTransaction(id: number): Promise<GeneralTransaction | undefined>;
  createGeneralTransaction(transaction: InsertGeneralTransaction): Promise<GeneralTransaction>;
  updateGeneralTransaction(id: number, transaction: Partial<InsertGeneralTransaction>): Promise<GeneralTransaction | undefined>;
  deleteGeneralTransaction(id: number): Promise<boolean>;
  
  // Properties
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<boolean>;
  
  // Real Estate Transactions
  getRealEstateTransactions(): Promise<RealEstateTransaction[]>;
  getRealEstateTransactionsByProperty(propertyId: number): Promise<RealEstateTransaction[]>;
  getRealEstateTransaction(id: number): Promise<RealEstateTransaction | undefined>;
  createRealEstateTransaction(transaction: InsertRealEstateTransaction): Promise<RealEstateTransaction>;
  updateRealEstateTransaction(id: number, transaction: Partial<InsertRealEstateTransaction>): Promise<RealEstateTransaction | undefined>;
  deleteRealEstateTransaction(id: number): Promise<boolean>;
  
  // Devices
  getDevices(): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<boolean>;
  
  // Device Transactions
  getDeviceTransactions(): Promise<DeviceTransaction[]>;
  getDeviceTransactionsByDevice(deviceId: number): Promise<DeviceTransaction[]>;
  getDeviceTransaction(id: number): Promise<DeviceTransaction | undefined>;
  createDeviceTransaction(transaction: InsertDeviceTransaction): Promise<DeviceTransaction>;
  updateDeviceTransaction(id: number, transaction: Partial<InsertDeviceTransaction>): Promise<DeviceTransaction | undefined>;
  deleteDeviceTransaction(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private generalTransactions: Map<number, GeneralTransaction>;
  private properties: Map<number, Property>;
  private realEstateTransactions: Map<number, RealEstateTransaction>;
  private devices: Map<number, Device>;
  private deviceTransactions: Map<number, DeviceTransaction>;
  private currentGeneralTransactionId: number;
  private currentPropertyId: number;
  private currentRealEstateTransactionId: number;
  private currentDeviceId: number;
  private currentDeviceTransactionId: number;

  constructor() {
    this.generalTransactions = new Map();
    this.properties = new Map();
    this.realEstateTransactions = new Map();
    this.devices = new Map();
    this.deviceTransactions = new Map();
    this.currentGeneralTransactionId = 1;
    this.currentPropertyId = 1;
    this.currentRealEstateTransactionId = 1;
    this.currentDeviceId = 1;
    this.currentDeviceTransactionId = 1;
  }

  // General Transactions
  async getGeneralTransactions(): Promise<GeneralTransaction[]> {
    return Array.from(this.generalTransactions.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getGeneralTransaction(id: number): Promise<GeneralTransaction | undefined> {
    return this.generalTransactions.get(id);
  }

  async createGeneralTransaction(insertTransaction: InsertGeneralTransaction): Promise<GeneralTransaction> {
    const id = this.currentGeneralTransactionId++;
    const transaction: GeneralTransaction = {
      ...insertTransaction,
      id,
      createdAt: new Date(),
    };
    this.generalTransactions.set(id, transaction);
    return transaction;
  }

  async updateGeneralTransaction(id: number, updates: Partial<InsertGeneralTransaction>): Promise<GeneralTransaction | undefined> {
    const existing = this.generalTransactions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.generalTransactions.set(id, updated);
    return updated;
  }

  async deleteGeneralTransaction(id: number): Promise<boolean> {
    return this.generalTransactions.delete(id);
  }

  // Properties
  async getProperties(): Promise<Property[]> {
    return Array.from(this.properties.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getProperty(id: number): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = this.currentPropertyId++;
    const property: Property = {
      ...insertProperty,
      id,
      createdAt: new Date(),
    };
    this.properties.set(id, property);
    return property;
  }

  async updateProperty(id: number, updates: Partial<InsertProperty>): Promise<Property | undefined> {
    const existing = this.properties.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.properties.set(id, updated);
    return updated;
  }

  async deleteProperty(id: number): Promise<boolean> {
    // Also delete associated real estate transactions
    const transactions = Array.from(this.realEstateTransactions.values())
      .filter(t => t.propertyId === id);
    
    transactions.forEach(t => this.realEstateTransactions.delete(t.id));
    
    return this.properties.delete(id);
  }

  // Real Estate Transactions
  async getRealEstateTransactions(): Promise<RealEstateTransaction[]> {
    return Array.from(this.realEstateTransactions.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getRealEstateTransactionsByProperty(propertyId: number): Promise<RealEstateTransaction[]> {
    return Array.from(this.realEstateTransactions.values())
      .filter(t => t.propertyId === propertyId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getRealEstateTransaction(id: number): Promise<RealEstateTransaction | undefined> {
    return this.realEstateTransactions.get(id);
  }

  async createRealEstateTransaction(insertTransaction: InsertRealEstateTransaction): Promise<RealEstateTransaction> {
    const id = this.currentRealEstateTransactionId++;
    const transaction: RealEstateTransaction = {
      ...insertTransaction,
      id,
      createdAt: new Date(),
    };
    this.realEstateTransactions.set(id, transaction);
    return transaction;
  }

  async updateRealEstateTransaction(id: number, updates: Partial<InsertRealEstateTransaction>): Promise<RealEstateTransaction | undefined> {
    const existing = this.realEstateTransactions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.realEstateTransactions.set(id, updated);
    return updated;
  }

  async deleteRealEstateTransaction(id: number): Promise<boolean> {
    return this.realEstateTransactions.delete(id);
  }

  // Devices
  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getDevice(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = this.currentDeviceId++;
    const device: Device = {
      ...insertDevice,
      id,
      createdAt: new Date(),
    };
    this.devices.set(id, device);
    return device;
  }

  async updateDevice(id: number, updates: Partial<InsertDevice>): Promise<Device | undefined> {
    const existing = this.devices.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.devices.set(id, updated);
    return updated;
  }

  async deleteDevice(id: number): Promise<boolean> {
    // Also delete associated device transactions
    const transactions = Array.from(this.deviceTransactions.values())
      .filter(t => t.deviceId === id);
    
    transactions.forEach(t => this.deviceTransactions.delete(t.id));
    
    return this.devices.delete(id);
  }

  // Device Transactions
  async getDeviceTransactions(): Promise<DeviceTransaction[]> {
    return Array.from(this.deviceTransactions.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getDeviceTransactionsByDevice(deviceId: number): Promise<DeviceTransaction[]> {
    return Array.from(this.deviceTransactions.values())
      .filter(t => t.deviceId === deviceId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getDeviceTransaction(id: number): Promise<DeviceTransaction | undefined> {
    return this.deviceTransactions.get(id);
  }

  async createDeviceTransaction(insertTransaction: InsertDeviceTransaction): Promise<DeviceTransaction> {
    const id = this.currentDeviceTransactionId++;
    const transaction: DeviceTransaction = {
      ...insertTransaction,
      id,
      createdAt: new Date(),
    };
    this.deviceTransactions.set(id, transaction);
    return transaction;
  }

  async updateDeviceTransaction(id: number, updates: Partial<InsertDeviceTransaction>): Promise<DeviceTransaction | undefined> {
    const existing = this.deviceTransactions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.deviceTransactions.set(id, updated);
    return updated;
  }

  async deleteDeviceTransaction(id: number): Promise<boolean> {
    return this.deviceTransactions.delete(id);
  }
}

export const storage = new MemStorage();
