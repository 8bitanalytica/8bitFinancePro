import { 
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
  InsertDeviceTransaction,
  BankConnection,
  InsertBankConnection,
  TransactionImport,
  InsertTransactionImport,
  generalTransactions,
  properties,
  propertyProjects,
  realEstateTransactions,
  devices,
  deviceTransactions,
  bankConnections,
  transactionImports,
  recurringTransactions,
  type RecurringTransaction,
  type InsertRecurringTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
  
  // Property Projects
  getPropertyProjects(propertyId?: number): Promise<PropertyProject[]>;
  getPropertyProject(id: number): Promise<PropertyProject | undefined>;
  createPropertyProject(project: InsertPropertyProject): Promise<PropertyProject>;
  updatePropertyProject(id: number, project: Partial<InsertPropertyProject>): Promise<PropertyProject | undefined>;
  deletePropertyProject(id: number): Promise<boolean>;
  
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
  
  // Bank Connections
  getBankConnections(): Promise<BankConnection[]>;
  getBankConnectionsByAccount(accountId: string): Promise<BankConnection[]>;
  getBankConnection(id: number): Promise<BankConnection | undefined>;
  createBankConnection(connection: InsertBankConnection): Promise<BankConnection>;
  updateBankConnection(id: number, connection: Partial<InsertBankConnection>): Promise<BankConnection | undefined>;
  deleteBankConnection(id: number): Promise<boolean>;
  
  // Transaction Imports
  getTransactionImports(): Promise<TransactionImport[]>;
  getTransactionImportsByConnection(connectionId: number): Promise<TransactionImport[]>;
  createTransactionImport(importRecord: InsertTransactionImport): Promise<TransactionImport>;
  updateTransactionImport(id: number, importRecord: Partial<InsertTransactionImport>): Promise<TransactionImport | undefined>;
  
  // Recurring Transactions
  getRecurringTransactions(): Promise<RecurringTransaction[]>;
  getRecurringTransactionsByModule(module: string): Promise<RecurringTransaction[]>;
  getRecurringTransaction(id: number): Promise<RecurringTransaction | undefined>;
  getDueRecurringTransactions(): Promise<RecurringTransaction[]>;
  createRecurringTransaction(transaction: InsertRecurringTransaction): Promise<RecurringTransaction>;
  updateRecurringTransaction(id: number, transaction: Partial<InsertRecurringTransaction>): Promise<RecurringTransaction | undefined>;
  deleteRecurringTransaction(id: number): Promise<boolean>;
  processRecurringTransaction(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private generalTransactions: Map<number, GeneralTransaction>;
  private properties: Map<number, Property>;
  private propertyProjects: Map<number, PropertyProject>;
  private realEstateTransactions: Map<number, RealEstateTransaction>;
  private devices: Map<number, Device>;
  private deviceTransactions: Map<number, DeviceTransaction>;
  private bankConnections: Map<number, BankConnection>;
  private transactionImports: Map<number, TransactionImport>;
  private recurringTransactions: Map<number, RecurringTransaction>;
  private currentGeneralTransactionId: number;
  private currentPropertyId: number;
  private currentPropertyProjectId: number;
  private currentRealEstateTransactionId: number;
  private currentDeviceId: number;
  private currentDeviceTransactionId: number;
  private currentBankConnectionId: number;
  private currentTransactionImportId: number;
  private currentRecurringTransactionId: number;

  constructor() {
    this.generalTransactions = new Map();
    this.properties = new Map();
    this.propertyProjects = new Map();
    this.realEstateTransactions = new Map();
    this.devices = new Map();
    this.deviceTransactions = new Map();
    this.bankConnections = new Map();
    this.transactionImports = new Map();
    this.recurringTransactions = new Map();
    this.currentGeneralTransactionId = 1;
    this.currentPropertyId = 1;
    this.currentPropertyProjectId = 1;
    this.currentRealEstateTransactionId = 1;
    this.currentDeviceId = 1;
    this.currentDeviceTransactionId = 1;
    this.currentBankConnectionId = 1;
    this.currentTransactionImportId = 1;
    this.currentRecurringTransactionId = 1;
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
    
    // Also delete associated property projects
    const projects = Array.from(this.propertyProjects.values())
      .filter(p => p.propertyId === id);
    
    projects.forEach(p => this.propertyProjects.delete(p.id));
    
    return this.properties.delete(id);
  }

  // Property Projects
  async getPropertyProjects(propertyId?: number): Promise<PropertyProject[]> {
    const projects = Array.from(this.propertyProjects.values());
    return propertyId ? projects.filter(p => p.propertyId === propertyId) : projects;
  }

  async getPropertyProject(id: number): Promise<PropertyProject | undefined> {
    return this.propertyProjects.get(id);
  }

  async createPropertyProject(insertProject: InsertPropertyProject): Promise<PropertyProject> {
    const id = this.currentPropertyProjectId++;
    const project: PropertyProject = {
      ...insertProject,
      id,
      createdAt: new Date(),
    };
    this.propertyProjects.set(id, project);
    return project;
  }

  async updatePropertyProject(id: number, updates: Partial<InsertPropertyProject>): Promise<PropertyProject | undefined> {
    const existing = this.propertyProjects.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.propertyProjects.set(id, updated);
    return updated;
  }

  async deletePropertyProject(id: number): Promise<boolean> {
    // Also delete associated real estate transactions with this project
    const transactions = Array.from(this.realEstateTransactions.values())
      .filter(t => t.projectId === id);
    
    transactions.forEach(t => {
      const updated = { ...t, projectId: null };
      this.realEstateTransactions.set(t.id, updated);
    });
    
    return this.propertyProjects.delete(id);
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

  // Bank Connections
  async getBankConnections(): Promise<BankConnection[]> {
    return Array.from(this.bankConnections.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getBankConnectionsByAccount(accountId: string): Promise<BankConnection[]> {
    return Array.from(this.bankConnections.values())
      .filter(c => c.accountId === accountId);
  }

  async getBankConnection(id: number): Promise<BankConnection | undefined> {
    return this.bankConnections.get(id);
  }

  async createBankConnection(insertConnection: InsertBankConnection): Promise<BankConnection> {
    const id = this.currentBankConnectionId++;
    const connection: BankConnection = {
      ...insertConnection,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.bankConnections.set(id, connection);
    return connection;
  }

  async updateBankConnection(id: number, updates: Partial<InsertBankConnection>): Promise<BankConnection | undefined> {
    const existing = this.bankConnections.get(id);
    if (!existing) return undefined;
    
    const updated = { 
      ...existing, 
      ...updates,
      updatedAt: new Date()
    };
    this.bankConnections.set(id, updated);
    return updated;
  }

  async deleteBankConnection(id: number): Promise<boolean> {
    return this.bankConnections.delete(id);
  }

  // Transaction Imports
  async getTransactionImports(): Promise<TransactionImport[]> {
    return Array.from(this.transactionImports.values()).sort((a, b) => 
      new Date(b.importedAt!).getTime() - new Date(a.importedAt!).getTime()
    );
  }

  async getTransactionImportsByConnection(connectionId: number): Promise<TransactionImport[]> {
    return Array.from(this.transactionImports.values())
      .filter(i => i.connectionId === connectionId);
  }

  async createTransactionImport(insertImport: InsertTransactionImport): Promise<TransactionImport> {
    const id = this.currentTransactionImportId++;
    const importRecord: TransactionImport = {
      ...insertImport,
      id,
      importedAt: new Date(),
    };
    this.transactionImports.set(id, importRecord);
    return importRecord;
  }

  async updateTransactionImport(id: number, updates: Partial<InsertTransactionImport>): Promise<TransactionImport | undefined> {
    const existing = this.transactionImports.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.transactionImports.set(id, updated);
    return updated;
  }

  // Recurring Transactions
  async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    return Array.from(this.recurringTransactions.values()).sort((a, b) => 
      new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
    );
  }

  async getRecurringTransactionsByModule(module: string): Promise<RecurringTransaction[]> {
    return Array.from(this.recurringTransactions.values())
      .filter(rt => rt.module === module)
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  }

  async getRecurringTransaction(id: number): Promise<RecurringTransaction | undefined> {
    return this.recurringTransactions.get(id);
  }

  async getDueRecurringTransactions(): Promise<RecurringTransaction[]> {
    const today = new Date();
    return Array.from(this.recurringTransactions.values())
      .filter(rt => rt.isActive && new Date(rt.nextDueDate) <= today);
  }

  async createRecurringTransaction(insertTransaction: InsertRecurringTransaction): Promise<RecurringTransaction> {
    const id = this.currentRecurringTransactionId++;
    const transaction: RecurringTransaction = {
      ...insertTransaction,
      id,
      currentOccurrence: 0,
      lastProcessedDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.recurringTransactions.set(id, transaction);
    return transaction;
  }

  async updateRecurringTransaction(id: number, updates: Partial<InsertRecurringTransaction>): Promise<RecurringTransaction | undefined> {
    const existing = this.recurringTransactions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.recurringTransactions.set(id, updated);
    return updated;
  }

  async deleteRecurringTransaction(id: number): Promise<boolean> {
    return this.recurringTransactions.delete(id);
  }

  async processRecurringTransaction(id: number): Promise<boolean> {
    const recurring = this.recurringTransactions.get(id);
    if (!recurring || !recurring.isActive) return false;

    try {
      // Create the actual transaction based on module
      switch (recurring.module) {
        case 'general':
          await this.createGeneralTransaction({
            type: recurring.type,
            amount: parseFloat(recurring.amount),
            description: `${recurring.description} (Recurring)`,
            category: recurring.category,
            date: new Date(),
            fromAccountId: recurring.type === 'expense' ? recurring.accountId : null,
            toAccountId: recurring.type === 'income' ? recurring.accountId : null,
          });
          break;
        case 'real-estate':
          if (recurring.propertyId) {
            await this.createRealEstateTransaction({
              propertyId: recurring.propertyId,
              type: recurring.type,
              amount: parseFloat(recurring.amount),
              description: `${recurring.description} (Recurring)`,
              category: recurring.category,
              date: new Date(),
            });
          }
          break;
        case 'devices':
          if (recurring.deviceId) {
            await this.createDeviceTransaction({
              deviceId: recurring.deviceId,
              type: recurring.type,
              amount: parseFloat(recurring.amount),
              description: `${recurring.description} (Recurring)`,
              category: recurring.category,
              date: new Date(),
            });
          }
          break;
      }

      // Calculate next due date
      const nextDate = this.calculateNextDueDate(recurring);
      const currentOccurrence = recurring.currentOccurrence + 1;

      // Check if recurring should be deactivated
      const shouldDeactivate = recurring.totalOccurrences && 
        currentOccurrence >= recurring.totalOccurrences;

      // Update recurring transaction
      await this.updateRecurringTransaction(id, {
        nextDueDate: nextDate.toISOString().split('T')[0],
        currentOccurrence,
        isActive: !shouldDeactivate,
      } as any);

      return true;
    } catch (error) {
      console.error('Error processing recurring transaction:', error);
      return false;
    }
  }

  private calculateNextDueDate(recurring: RecurringTransaction): Date {
    const currentDate = new Date(recurring.nextDueDate);
    const interval = recurring.intervalCount || 1;

    switch (recurring.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (interval * 7));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + interval);
        break;
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + (interval * 3));
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + interval);
        break;
    }

    return currentDate;
  }
}

export class DatabaseStorage implements IStorage {
  // General Transactions
  async getGeneralTransactions(): Promise<GeneralTransaction[]> {
    return await db.select().from(generalTransactions).orderBy(generalTransactions.date);
  }

  async getGeneralTransaction(id: number): Promise<GeneralTransaction | undefined> {
    const [result] = await db.select().from(generalTransactions).where(eq(generalTransactions.id, id));
    return result;
  }

  async createGeneralTransaction(transaction: InsertGeneralTransaction): Promise<GeneralTransaction> {
    const [result] = await db.insert(generalTransactions).values(transaction).returning();
    return result;
  }

  async updateGeneralTransaction(id: number, transaction: Partial<InsertGeneralTransaction>): Promise<GeneralTransaction | undefined> {
    const [result] = await db.update(generalTransactions).set(transaction).where(eq(generalTransactions.id, id)).returning();
    return result;
  }

  async deleteGeneralTransaction(id: number): Promise<boolean> {
    const result = await db.delete(generalTransactions).where(eq(generalTransactions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Properties
  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties).orderBy(properties.name);
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [result] = await db.select().from(properties).where(eq(properties.id, id));
    return result;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [result] = await db.insert(properties).values(property).returning();
    return result;
  }

  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const [result] = await db.update(properties).set(property).where(eq(properties.id, id)).returning();
    return result;
  }

  async deleteProperty(id: number): Promise<boolean> {
    const result = await db.delete(properties).where(eq(properties.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Property Projects
  async getPropertyProjects(propertyId?: number): Promise<PropertyProject[]> {
    if (propertyId) {
      return await db.select().from(propertyProjects).where(eq(propertyProjects.propertyId, propertyId));
    }
    return await db.select().from(propertyProjects).orderBy(propertyProjects.createdAt);
  }

  async getPropertyProject(id: number): Promise<PropertyProject | undefined> {
    const [result] = await db.select().from(propertyProjects).where(eq(propertyProjects.id, id));
    return result;
  }

  async createPropertyProject(project: InsertPropertyProject): Promise<PropertyProject> {
    const [result] = await db.insert(propertyProjects).values(project).returning();
    return result;
  }

  async updatePropertyProject(id: number, project: Partial<InsertPropertyProject>): Promise<PropertyProject | undefined> {
    const [result] = await db.update(propertyProjects).set(project).where(eq(propertyProjects.id, id)).returning();
    return result;
  }

  async deletePropertyProject(id: number): Promise<boolean> {
    const result = await db.delete(propertyProjects).where(eq(propertyProjects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Real Estate Transactions
  async getRealEstateTransactions(): Promise<RealEstateTransaction[]> {
    return await db.select().from(realEstateTransactions).orderBy(realEstateTransactions.date);
  }

  async getRealEstateTransactionsByProperty(propertyId: number): Promise<RealEstateTransaction[]> {
    return await db.select().from(realEstateTransactions).where(eq(realEstateTransactions.propertyId, propertyId)).orderBy(realEstateTransactions.date);
  }

  async getRealEstateTransaction(id: number): Promise<RealEstateTransaction | undefined> {
    const [result] = await db.select().from(realEstateTransactions).where(eq(realEstateTransactions.id, id));
    return result;
  }

  async createRealEstateTransaction(transaction: InsertRealEstateTransaction): Promise<RealEstateTransaction> {
    const [result] = await db.insert(realEstateTransactions).values(transaction).returning();
    return result;
  }

  async updateRealEstateTransaction(id: number, transaction: Partial<InsertRealEstateTransaction>): Promise<RealEstateTransaction | undefined> {
    const [result] = await db.update(realEstateTransactions).set(transaction).where(eq(realEstateTransactions.id, id)).returning();
    return result;
  }

  async deleteRealEstateTransaction(id: number): Promise<boolean> {
    const result = await db.delete(realEstateTransactions).where(eq(realEstateTransactions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Devices
  async getDevices(): Promise<Device[]> {
    return await db.select().from(devices).orderBy(devices.name);
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const [result] = await db.select().from(devices).where(eq(devices.id, id));
    return result;
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const [result] = await db.insert(devices).values(device).returning();
    return result;
  }

  async updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device | undefined> {
    const [result] = await db.update(devices).set(device).where(eq(devices.id, id)).returning();
    return result;
  }

  async deleteDevice(id: number): Promise<boolean> {
    const result = await db.delete(devices).where(eq(devices.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Device Transactions
  async getDeviceTransactions(): Promise<DeviceTransaction[]> {
    return await db.select().from(deviceTransactions).orderBy(deviceTransactions.date);
  }

  async getDeviceTransactionsByDevice(deviceId: number): Promise<DeviceTransaction[]> {
    return await db.select().from(deviceTransactions).where(eq(deviceTransactions.deviceId, deviceId)).orderBy(deviceTransactions.date);
  }

  async getDeviceTransaction(id: number): Promise<DeviceTransaction | undefined> {
    const [result] = await db.select().from(deviceTransactions).where(eq(deviceTransactions.id, id));
    return result;
  }

  async createDeviceTransaction(transaction: InsertDeviceTransaction): Promise<DeviceTransaction> {
    const [result] = await db.insert(deviceTransactions).values(transaction).returning();
    return result;
  }

  async updateDeviceTransaction(id: number, transaction: Partial<InsertDeviceTransaction>): Promise<DeviceTransaction | undefined> {
    const [result] = await db.update(deviceTransactions).set(transaction).where(eq(deviceTransactions.id, id)).returning();
    return result;
  }

  async deleteDeviceTransaction(id: number): Promise<boolean> {
    const result = await db.delete(deviceTransactions).where(eq(deviceTransactions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Bank Connections
  async getBankConnections(): Promise<BankConnection[]> {
    return await db.select().from(bankConnections).orderBy(bankConnections.createdAt);
  }

  async getBankConnectionsByAccount(accountId: string): Promise<BankConnection[]> {
    return await db.select().from(bankConnections).where(eq(bankConnections.accountId, accountId));
  }

  async getBankConnection(id: number): Promise<BankConnection | undefined> {
    const [result] = await db.select().from(bankConnections).where(eq(bankConnections.id, id));
    return result;
  }

  async createBankConnection(connection: InsertBankConnection): Promise<BankConnection> {
    const [result] = await db.insert(bankConnections).values(connection).returning();
    return result;
  }

  async updateBankConnection(id: number, connection: Partial<InsertBankConnection>): Promise<BankConnection | undefined> {
    const [result] = await db.update(bankConnections).set(connection).where(eq(bankConnections.id, id)).returning();
    return result;
  }

  async deleteBankConnection(id: number): Promise<boolean> {
    const result = await db.delete(bankConnections).where(eq(bankConnections.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Transaction Imports
  async getTransactionImports(): Promise<TransactionImport[]> {
    return await db.select().from(transactionImports).orderBy(transactionImports.importedAt);
  }

  async getTransactionImportsByConnection(connectionId: number): Promise<TransactionImport[]> {
    return await db.select().from(transactionImports).where(eq(transactionImports.connectionId, connectionId));
  }

  async createTransactionImport(importRecord: InsertTransactionImport): Promise<TransactionImport> {
    const [result] = await db.insert(transactionImports).values(importRecord).returning();
    return result;
  }

  async updateTransactionImport(id: number, importRecord: Partial<InsertTransactionImport>): Promise<TransactionImport | undefined> {
    const [result] = await db.update(transactionImports).set(importRecord).where(eq(transactionImports.id, id)).returning();
    return result;
  }

  // Recurring Transactions
  async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    return await db.select().from(recurringTransactions).orderBy(recurringTransactions.createdAt);
  }

  async getRecurringTransactionsByModule(module: string): Promise<RecurringTransaction[]> {
    return await db.select().from(recurringTransactions).where(eq(recurringTransactions.module, module));
  }

  async getRecurringTransaction(id: number): Promise<RecurringTransaction | undefined> {
    const [result] = await db.select().from(recurringTransactions).where(eq(recurringTransactions.id, id));
    return result;
  }

  async getDueRecurringTransactions(): Promise<RecurringTransaction[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return await db.select().from(recurringTransactions).where(
      eq(recurringTransactions.isActive, true)
    );
  }

  async createRecurringTransaction(transaction: InsertRecurringTransaction): Promise<RecurringTransaction> {
    const [result] = await db.insert(recurringTransactions).values(transaction).returning();
    return result;
  }

  async updateRecurringTransaction(id: number, transaction: Partial<InsertRecurringTransaction>): Promise<RecurringTransaction | undefined> {
    const [result] = await db.update(recurringTransactions).set(transaction).where(eq(recurringTransactions.id, id)).returning();
    return result;
  }

  async deleteRecurringTransaction(id: number): Promise<boolean> {
    const result = await db.delete(recurringTransactions).where(eq(recurringTransactions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async processRecurringTransaction(id: number): Promise<boolean> {
    try {
      const recurring = await this.getRecurringTransaction(id);
      if (!recurring || !recurring.isActive) return false;

      // Create appropriate transaction based on module
      switch (recurring.module) {
        case 'general':
          await this.createGeneralTransaction({
            type: recurring.type,
            amount: parseFloat(recurring.amount),
            description: `${recurring.description} (Recurring)`,
            category: recurring.category,
            toAccountId: recurring.accountId || '',
            date: new Date(),
          });
          break;
        case 'real-estate':
          if (recurring.propertyId) {
            await this.createRealEstateTransaction({
              propertyId: recurring.propertyId,
              type: recurring.type,
              amount: parseFloat(recurring.amount),
              description: `${recurring.description} (Recurring)`,
              category: recurring.category,
              date: new Date(),
            });
          }
          break;
        case 'devices':
          if (recurring.deviceId) {
            await this.createDeviceTransaction({
              deviceId: recurring.deviceId,
              type: recurring.type,
              amount: parseFloat(recurring.amount),
              description: `${recurring.description} (Recurring)`,
              category: recurring.category,
              date: new Date(),
            });
          }
          break;
      }

      // Calculate next due date
      const nextDate = this.calculateNextDueDate(recurring);
      const currentOccurrence = recurring.currentOccurrence + 1;

      // Check if recurring should be deactivated
      const shouldDeactivate = recurring.totalOccurrences && 
        currentOccurrence >= recurring.totalOccurrences;

      // Update recurring transaction
      await this.updateRecurringTransaction(id, {
        nextDueDate: nextDate.toISOString().split('T')[0],
        currentOccurrence,
        isActive: !shouldDeactivate,
      } as any);

      return true;
    } catch (error) {
      console.error('Error processing recurring transaction:', error);
      return false;
    }
  }

  private calculateNextDueDate(recurring: RecurringTransaction): Date {
    const currentDate = new Date(recurring.nextDueDate);
    const interval = recurring.intervalCount || 1;

    switch (recurring.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (interval * 7));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + interval);
        break;
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + (interval * 3));
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + interval);
        break;
    }

    return currentDate;
  }
}

export const storage = new DatabaseStorage();
