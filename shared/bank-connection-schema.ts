import { pgTable, serial, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const bankConnections = pgTable("bank_connections", {
  id: serial("id").primaryKey(),
  accountId: text("account_id").notNull(), // References our internal bank account
  provider: text("provider").notNull(), // 'wise', 'revolut', etc.
  providerAccountId: text("provider_account_id").notNull(), // External account ID
  accessToken: text("access_token").notNull(), // Encrypted API token
  refreshToken: text("refresh_token"), // For OAuth refresh
  tokenExpiresAt: timestamp("token_expires_at"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  syncSettings: jsonb("sync_settings").$type<{
    autoSync: boolean;
    syncFrequency: 'hourly' | 'daily' | 'weekly';
    importCategories: boolean;
    dateRange: number; // days to look back
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactionImports = pgTable("transaction_imports", {
  id: serial("id").primaryKey(),
  connectionId: serial("connection_id").references(() => bankConnections.id),
  externalTransactionId: text("external_transaction_id").notNull(),
  importedTransactionId: serial("imported_transaction_id"), // Reference to created transaction
  rawData: jsonb("raw_data").$type<any>(), // Original API response
  status: text("status").notNull().default("pending"), // 'pending', 'imported', 'skipped', 'error'
  errorMessage: text("error_message"),
  importedAt: timestamp("imported_at").defaultNow(),
});

export type BankConnection = typeof bankConnections.$inferSelect;
export type InsertBankConnection = typeof bankConnections.$inferInsert;
export type TransactionImport = typeof transactionImports.$inferSelect;
export type InsertTransactionImport = typeof transactionImports.$inferInsert;

export const insertBankConnectionSchema = createInsertSchema(bankConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionImportSchema = createInsertSchema(transactionImports).omit({
  id: true,
  importedAt: true,
});

// Bank provider configurations
export const SUPPORTED_PROVIDERS = {
  wise: {
    name: "Wise",
    authType: "api_key",
    baseUrl: "https://api.wise.com",
    requiredScopes: ["read"],
    documentation: "https://docs.wise.com/api-docs",
  },
  revolut: {
    name: "Revolut Business",
    authType: "oauth",
    baseUrl: "https://b2b.revolut.com/api/1.0",
    requiredScopes: ["READ"],
    documentation: "https://developer.revolut.com/docs/business-api",
  },
} as const;

export type SupportedProvider = keyof typeof SUPPORTED_PROVIDERS;