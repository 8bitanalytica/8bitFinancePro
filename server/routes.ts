import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertGeneralTransactionSchema,
  insertPropertySchema,
  insertRealEstateTransactionSchema,
  insertDeviceSchema,
  insertDeviceTransactionSchema,
  insertBankConnectionSchema,
  insertTransactionImportSchema,
  insertRecurringTransactionSchema,
} from "@shared/schema";
import { ProviderFactory } from "./bank-providers/provider-factory";
import type { TransactionData } from "./bank-providers/base-provider";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // General Transactions Routes
  app.get("/api/general-transactions", async (req, res) => {
    try {
      const transactions = await storage.getGeneralTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch general transactions" });
    }
  });

  app.get("/api/general-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await storage.getGeneralTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  app.post("/api/general-transactions", async (req, res) => {
    try {
      const validatedData = insertGeneralTransactionSchema.parse(req.body);
      const transaction = await storage.createGeneralTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.put("/api/general-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertGeneralTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateGeneralTransaction(id, validatedData);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  app.delete("/api/general-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteGeneralTransaction(id);
      if (!success) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Properties Routes
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const property = await storage.getProperty(id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  app.put("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPropertySchema.partial().parse(req.body);
      const property = await storage.updateProperty(id, validatedData);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProperty(id);
      if (!success) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Real Estate Transactions Routes
  app.get("/api/real-estate-transactions", async (req, res) => {
    try {
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : undefined;
      let transactions;
      
      if (propertyId) {
        transactions = await storage.getRealEstateTransactionsByProperty(propertyId);
      } else {
        transactions = await storage.getRealEstateTransactions();
      }
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch real estate transactions" });
    }
  });

  app.get("/api/real-estate-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await storage.getRealEstateTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  app.post("/api/real-estate-transactions", async (req, res) => {
    try {
      const validatedData = insertRealEstateTransactionSchema.parse(req.body);
      const transaction = await storage.createRealEstateTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.put("/api/real-estate-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertRealEstateTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateRealEstateTransaction(id, validatedData);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  app.delete("/api/real-estate-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteRealEstateTransaction(id);
      if (!success) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Device Routes
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.get("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const device = await storage.getDevice(id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device" });
    }
  });

  app.post("/api/devices", async (req, res) => {
    try {
      const validatedData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(validatedData);
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create device" });
    }
  });

  app.put("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDeviceSchema.partial().parse(req.body);
      const device = await storage.updateDevice(id, validatedData);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update device" });
    }
  });

  app.delete("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDevice(id);
      if (!success) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  // Device Transactions Routes
  app.get("/api/device-transactions", async (req, res) => {
    try {
      const deviceId = req.query.deviceId ? parseInt(req.query.deviceId as string) : undefined;
      let transactions;
      
      if (deviceId) {
        transactions = await storage.getDeviceTransactionsByDevice(deviceId);
      } else {
        transactions = await storage.getDeviceTransactions();
      }
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device transactions" });
    }
  });

  app.get("/api/device-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await storage.getDeviceTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  app.post("/api/device-transactions", async (req, res) => {
    try {
      const validatedData = insertDeviceTransactionSchema.parse(req.body);
      const transaction = await storage.createDeviceTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.put("/api/device-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDeviceTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateDeviceTransaction(id, validatedData);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  app.delete("/api/device-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDeviceTransaction(id);
      if (!success) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Bank Connections Routes
  app.get("/api/bank-connections", async (req, res) => {
    try {
      const connections = await storage.getBankConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bank connections" });
    }
  });

  app.get("/api/bank-connections/account/:accountId", async (req, res) => {
    try {
      const accountId = req.params.accountId;
      const connections = await storage.getBankConnectionsByAccount(accountId);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bank connections" });
    }
  });

  app.post("/api/bank-connections", async (req, res) => {
    try {
      const validatedData = insertBankConnectionSchema.parse(req.body);
      
      // Test connection before saving
      const provider = ProviderFactory.createProvider(
        validatedData.provider as any,
        { 
          apiKey: validatedData.accessToken,
          accessToken: validatedData.accessToken,
          refreshToken: validatedData.refreshToken || undefined
        }
      );
      
      const isValid = await provider.validateCredentials();
      if (!isValid) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      
      const connection = await storage.createBankConnection(validatedData);
      res.status(201).json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bank connection" });
    }
  });

  app.put("/api/bank-connections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertBankConnectionSchema.partial().parse(req.body);
      const connection = await storage.updateBankConnection(id, validatedData);
      if (!connection) {
        return res.status(404).json({ message: "Bank connection not found" });
      }
      res.json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update bank connection" });
    }
  });

  app.delete("/api/bank-connections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBankConnection(id);
      if (!success) {
        return res.status(404).json({ message: "Bank connection not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete bank connection" });
    }
  });

  // Bank Data Import Routes
  app.post("/api/bank-connections/:id/sync", async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      const { startDate, endDate, limit = 100 } = req.body;
      
      const connection = await storage.getBankConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "Bank connection not found" });
      }
      
      if (!connection.isActive) {
        return res.status(400).json({ message: "Bank connection is inactive" });
      }
      
      const provider = ProviderFactory.createProvider(
        connection.provider as any,
        {
          apiKey: connection.accessToken,
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken || undefined
        }
      );
      
      const transactions = await provider.getTransactions(
        new Date(startDate),
        new Date(endDate),
        limit
      );
      
      const importedTransactions = [];
      
      for (const tx of transactions) {
        // Check if transaction already imported
        const existingImports = await storage.getTransactionImportsByConnection(connectionId);
        const alreadyImported = existingImports.some(
          imp => imp.externalTransactionId === tx.id
        );
        
        if (!alreadyImported) {
          // Create import record
          const importRecord = await storage.createTransactionImport({
            connectionId,
            externalTransactionId: tx.id,
            rawData: tx,
            status: "pending"
          });
          
          // Convert to internal transaction format
          const internalTransaction = {
            type: tx.type === 'credit' ? 'income' : 'expense',
            amount: tx.amount.toString(),
            description: `${tx.description} (imported from ${connection.provider})`,
            category: tx.category || 'Imported',
            date: tx.date,
            fromAccountId: tx.type === 'debit' ? connection.accountId : null,
            toAccountId: tx.type === 'credit' ? connection.accountId : null,
          };
          
          // Create the actual transaction
          const createdTransaction = await storage.createGeneralTransaction(internalTransaction);
          
          // Update import record with transaction ID
          await storage.updateTransactionImport(importRecord.id, {
            importedTransactionId: createdTransaction.id,
            status: "imported"
          });
          
          importedTransactions.push({
            importRecord,
            transaction: createdTransaction,
            originalData: tx
          });
        }
      }
      
      // Update last sync time
      await storage.updateBankConnection(connectionId, {
        lastSyncAt: new Date()
      });
      
      res.json({
        message: `Successfully imported ${importedTransactions.length} transactions`,
        imported: importedTransactions.length,
        total: transactions.length,
        transactions: importedTransactions
      });
      
    } catch (error) {
      console.error('Bank sync error:', error);
      res.status(500).json({ 
        message: "Failed to sync bank data", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/bank-connections/:id/test", async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      const connection = await storage.getBankConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "Bank connection not found" });
      }
      
      const provider = ProviderFactory.createProvider(
        connection.provider as any,
        {
          apiKey: connection.accessToken,
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken || undefined
        }
      );
      
      const isValid = await provider.validateCredentials();
      const accountInfo = isValid ? await provider.getAccountInfo() : null;
      const capabilities = provider.getCapabilities();
      
      res.json({
        isValid,
        accountInfo,
        capabilities,
        provider: connection.provider
      });
      
    } catch (error) {
      console.error('Bank test error:', error);
      res.status(500).json({ 
        message: "Failed to test bank connection",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/supported-providers", async (req, res) => {
    try {
      const providers = ProviderFactory.getSupportedProviders().map(provider => ({
        id: provider,
        ...ProviderFactory.getProviderInfo(provider)
      }));
      
      res.json(providers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supported providers" });
    }
  });

  // Test credentials route for bank connections
  app.post("/api/bank-connections/test-credentials", async (req, res) => {
    try {
      const { provider, accessToken, refreshToken } = req.body;
      
      const bankProvider = ProviderFactory.createProvider(
        provider,
        {
          apiKey: accessToken,
          accessToken: accessToken,
          refreshToken: refreshToken
        }
      );
      
      const isValid = await bankProvider.validateCredentials();
      const accountInfo = isValid ? await bankProvider.getAccountInfo() : null;
      const capabilities = bankProvider.getCapabilities();
      
      res.json({
        isValid,
        accountInfo,
        capabilities,
        provider
      });
      
    } catch (error) {
      console.error('Credential test error:', error);
      res.status(500).json({ 
        message: "Failed to test credentials",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Recurring Transactions Routes
  app.get("/api/recurring-transactions", async (req, res) => {
    try {
      const { module } = req.query;
      
      if (module && typeof module === 'string') {
        const transactions = await storage.getRecurringTransactionsByModule(module);
        res.json(transactions);
      } else {
        const transactions = await storage.getRecurringTransactions();
        res.json(transactions);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recurring transactions" });
    }
  });

  app.get("/api/recurring-transactions/due", async (req, res) => {
    try {
      const dueTransactions = await storage.getDueRecurringTransactions();
      res.json(dueTransactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch due recurring transactions" });
    }
  });

  app.get("/api/recurring-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await storage.getRecurringTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Recurring transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recurring transaction" });
    }
  });

  app.post("/api/recurring-transactions", async (req, res) => {
    try {
      const validatedTransaction = insertRecurringTransactionSchema.parse(req.body);
      const transaction = await storage.createRecurringTransaction(validatedTransaction);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create recurring transaction" });
    }
  });

  app.put("/api/recurring-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const transaction = await storage.updateRecurringTransaction(id, updates);
      
      if (!transaction) {
        return res.status(404).json({ message: "Recurring transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to update recurring transaction" });
    }
  });

  app.delete("/api/recurring-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteRecurringTransaction(id);
      
      if (!success) {
        return res.status(404).json({ message: "Recurring transaction not found" });
      }
      
      res.json({ message: "Recurring transaction deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete recurring transaction" });
    }
  });

  app.post("/api/recurring-transactions/:id/process", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.processRecurringTransaction(id);
      
      if (!success) {
        return res.status(404).json({ message: "Failed to process recurring transaction" });
      }
      
      res.json({ message: "Recurring transaction processed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process recurring transaction" });
    }
  });

  // Process all due recurring transactions
  app.post("/api/recurring-transactions/process-due", async (req, res) => {
    try {
      const dueTransactions = await storage.getDueRecurringTransactions();
      const results = [];
      
      for (const transaction of dueTransactions) {
        const success = await storage.processRecurringTransaction(transaction.id);
        results.push({
          id: transaction.id,
          name: transaction.name,
          success
        });
      }
      
      res.json({ 
        processed: results.filter(r => r.success).length,
        total: results.length,
        results 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process due recurring transactions" });
    }
  });

  // Receipt upload endpoint
  app.post('/api/receipts/upload', async (req, res) => {
    try {
      // Generate a unique upload URL for receipts
      const receiptId = `receipt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const uploadURL = `https://storage.googleapis.com/receipts/${receiptId}`;
      
      res.json({ uploadURL });
    } catch (error) {
      console.error('Error generating receipt upload URL:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
