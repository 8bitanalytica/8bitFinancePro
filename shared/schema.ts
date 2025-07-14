import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// General Transactions Table
export const generalTransactions = pgTable("general_transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "income" or "expense"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  date: timestamp("date").notNull(),
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

// Real Estate Transactions Table
export const realEstateTransactions = pgTable("real_estate_transactions", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  type: text("type").notNull(), // "income" or "expense"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "rent", "maintenance", "repairs", "taxes", "insurance"
  date: timestamp("date").notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertGeneralTransactionSchema = createInsertSchema(generalTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

export const insertRealEstateTransactionSchema = createInsertSchema(realEstateTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceTransactionSchema = createInsertSchema(deviceTransactions).omit({
  id: true,
  createdAt: true,
});

// Types
export type GeneralTransaction = typeof generalTransactions.$inferSelect;
export type InsertGeneralTransaction = z.infer<typeof insertGeneralTransactionSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type RealEstateTransaction = typeof realEstateTransactions.$inferSelect;
export type InsertRealEstateTransaction = z.infer<typeof insertRealEstateTransactionSchema>;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type DeviceTransaction = typeof deviceTransactions.$inferSelect;
export type InsertDeviceTransaction = z.infer<typeof insertDeviceTransactionSchema>;
