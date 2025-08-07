import type { BankConnection, SupportedProvider } from "@shared/schema";

export interface TransactionData {
  id: string;
  amount: number;
  currency: string;
  description: string;
  date: Date;
  type: "debit" | "credit";
  category?: string;
  balance?: number;
  metadata: Record<string, any>;
}

export interface AuthCredentials {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface ProviderCapabilities {
  supportsRealTimeSync: boolean;
  supportsHistoricalData: boolean;
  maxHistoryDays: number;
  rateLimitPerHour: number;
}

export abstract class BaseBankProvider {
  protected provider: SupportedProvider;
  protected credentials: AuthCredentials;

  constructor(provider: SupportedProvider, credentials: AuthCredentials) {
    this.provider = provider;
    this.credentials = credentials;
  }

  abstract validateCredentials(): Promise<boolean>;
  abstract getAccountInfo(): Promise<{
    id: string;
    name: string;
    currency: string;
    balance: number;
    type: string;
  }>;
  abstract getTransactions(
    startDate: Date,
    endDate: Date,
    limit?: number
  ): Promise<TransactionData[]>;
  abstract getCapabilities(): ProviderCapabilities;
  
  // Optional: For OAuth providers
  refreshToken?(): Promise<{ accessToken: string; refreshToken?: string; expiresAt: Date }>;

  protected formatAmount(amount: number | string): number {
    return typeof amount === 'string' ? parseFloat(amount) : amount;
  }

  protected formatDate(date: string | Date): Date {
    return typeof date === 'string' ? new Date(date) : date;
  }

  protected normalizeTransactionType(type: string): "debit" | "credit" {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('debit') || lowerType.includes('out') || lowerType.includes('expense')) {
      return 'debit';
    }
    return 'credit';
  }
}