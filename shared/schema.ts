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

// Types
export type GeneralTransaction = typeof generalTransactions.$inferSelect;
export type InsertGeneralTransaction = z.infer<typeof insertGeneralTransactionSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type RealEstateTransaction = typeof realEstateTransactions.$inferSelect;
export type InsertRealEstateTransaction = z.infer<typeof insertRealEstateTransactionSchema>;
