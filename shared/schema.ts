import { pgTable, text, serial, integer, boolean, decimal, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// General Transactions Table
export const generalTransactions = pgTable("general_transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "income", "expense", or "transfer"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  date: timestamp("date").notNull(),
  fromAccountId: text("from_account_id"), // For transfers: source account
  toAccountId: text("to_account_id"), // For transfers: destination account, or regular transaction account
  // Real Estate specific fields
  propertyId: integer("property_id"), // When category is "Real Estate"
  realEstateSubcategory: text("real_estate_subcategory"), // Gas, Electricity, Taxes, etc.
  // Device specific fields  
  deviceId: integer("device_id"), // When category is "Device"
  // Receipt upload field
  receiptUrl: text("receipt_url"), // URL per la ricevuta caricata (PDF o JPEG)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Properties Table
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  type: text("type").notNull(), // "apartment", "house", "condo", etc.
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Property Projects Table
export const propertyProjects = pgTable("property_projects", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // active, completed, paused
  budget: decimal("budget", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Property Utility Blocks Table - for tracking utilities like gas, electricity, water, etc.
export const propertyUtilityBlocks = pgTable("property_utility_blocks", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id),
  name: text("name").notNull(), // e.g. "Gas", "Elettricità", "Acqua"
  description: text("description"),
  type: text("type").notNull(), // "gas", "electricity", "water", "internet", "heating", "other"
  provider: text("provider"), // e.g. "ENI", "Enel", "Fastweb"
  accountNumber: text("account_number"), // numero utenza
  monthlyBudget: decimal("monthly_budget", { precision: 10, scale: 2 }), // budget mensile previsto
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Real Estate Transactions Table
export const realEstateTransactions = pgTable("real_estate_transactions", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  projectId: integer("project_id").references(() => propertyProjects.id), // Optional project tracking
  utilityBlockId: integer("utility_block_id").references(() => propertyUtilityBlocks.id), // Optional utility block tracking
  type: text("type").notNull(), // "income" or "expense"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "rent", "maintenance", "repairs", "taxes", "insurance"
  date: timestamp("date").notNull(),
  receiptUrl: text("receipt_url"), // URL per la ricevuta caricata (PDF o JPEG)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Devices Table
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "laptop", "phone", "tablet", "desktop", "server", "appliance", "other"
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  serialNumber: text("serial_number"),
  purchaseDate: timestamp("purchase_date"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
  warrantyExpiry: timestamp("warranty_expiry"),
  status: text("status").notNull(), // "active", "maintenance", "retired", "lost", "broken"
  location: text("location"), // where the device is located
  assignedTo: text("assigned_to"), // who is using the device
  notes: text("notes"),
  receiptImage: text("receipt_image"), // Base64 encoded image or URL
  deviceImage: text("device_image"), // Base64 encoded image or URL
  alertDays: integer("alert_days").default(30), // Days before warranty expiry to alert
  isActive: boolean("is_active").default(true), // Track if device is still owned/active
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Device Transactions Table (for tracking device-related expenses)
export const deviceTransactions = pgTable("device_transactions", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  type: text("type").notNull(), // "expense" (repairs, upgrades, accessories)
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "repair", "upgrade", "accessory", "maintenance", "insurance"
  date: timestamp("date").notNull(),
  receiptUrl: text("receipt_url"), // URL per la ricevuta caricata (PDF o JPEG)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertGeneralTransactionSchema = createInsertSchema(generalTransactions).omit({
  id: true,
  createdAt: true,
}).extend({
  date: z.string().or(z.date()).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
  receiptUrl: z.string().optional().nullable(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyProjectSchema = createInsertSchema(propertyProjects).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.string().or(z.date()).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
  endDate: z.string().or(z.date()).optional().nullable().transform((val) => 
    val && typeof val === 'string' ? new Date(val) : val
  ),
});

export const insertPropertyUtilityBlockSchema = createInsertSchema(propertyUtilityBlocks).omit({
  id: true,
  createdAt: true,
});

export const insertRealEstateTransactionSchema = createInsertSchema(realEstateTransactions).omit({
  id: true,
  createdAt: true,
}).extend({
  date: z.string().or(z.date()).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
  receiptUrl: z.string().optional().nullable(),
  projectId: z.number().optional().nullable(),
  utilityBlockId: z.number().optional().nullable(),
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceTransactionSchema = createInsertSchema(deviceTransactions).omit({
  id: true,
  createdAt: true,
}).extend({
  date: z.string().or(z.date()).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
  receiptUrl: z.string().optional().nullable(),
});

// Types
export type GeneralTransaction = typeof generalTransactions.$inferSelect;
export type InsertGeneralTransaction = z.infer<typeof insertGeneralTransactionSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type PropertyProject = typeof propertyProjects.$inferSelect;
export type InsertPropertyProject = z.infer<typeof insertPropertyProjectSchema>;

export type PropertyUtilityBlock = typeof propertyUtilityBlocks.$inferSelect;
export type InsertPropertyUtilityBlock = z.infer<typeof insertPropertyUtilityBlockSchema>;

export type RealEstateTransaction = typeof realEstateTransactions.$inferSelect;
export type InsertRealEstateTransaction = z.infer<typeof insertRealEstateTransactionSchema>;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type DeviceTransaction = typeof deviceTransactions.$inferSelect;
export type InsertDeviceTransaction = z.infer<typeof insertDeviceTransactionSchema>;

// Recurring transactions table
export const recurringTransactions = pgTable("recurring_transactions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "income", "expense", or "transfer"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  accountId: text("account_id"),
  frequency: text("frequency").notNull(), // daily, weekly, monthly, quarterly, yearly
  intervalCount: integer("interval_count").default(1).notNull(), // every X frequency units
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // null means infinite
  nextDueDate: date("next_due_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastProcessedDate: timestamp("last_processed_date"),
  currentOccurrence: integer("current_occurrence").default(0).notNull(),
  module: text("module").default("general").notNull(), // general, real-estate, devices
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }),
  deviceId: integer("device_id").references(() => devices.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRecurringTransactionSchema = createInsertSchema(recurringTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentOccurrence: true,
  lastProcessedDate: true,
}).extend({
  startDate: z.string().or(z.date()).transform((val) => 
    typeof val === 'string' ? val : val.toISOString().split('T')[0]
  ),
  endDate: z.string().or(z.date()).transform((val) => 
    typeof val === 'string' ? val : val.toISOString().split('T')[0]
  ).optional(),
  nextDueDate: z.string().or(z.date()).transform((val) => 
    typeof val === 'string' ? val : val.toISOString().split('T')[0]
  ),
});

export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type InsertRecurringTransaction = z.infer<typeof insertRecurringTransactionSchema>;

// Export bank connection tables
export * from "./bank-connection-schema";
