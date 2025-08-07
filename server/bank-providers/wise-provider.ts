import { BaseBankProvider, type TransactionData, type AuthCredentials, type ProviderCapabilities } from "./base-provider";

interface WiseAccount {
  id: number;
  name: string;
  currency: string;
  type: string;
  primary: boolean;
}

interface WiseTransaction {
  type: string;
  date: string;
  amount: {
    value: number;
    currency: string;
  };
  totalFees: {
    value: number;
    currency: string;
  };
  description: string;
  exchangeDetails?: {
    rate: number;
    fromAmount: {
      value: number;
      currency: string;
    };
    toAmount: {
      value: number;
      currency: string;
    };
  };
  runningBalance: {
    value: number;
    currency: string;
  };
  referenceNumber: string;
}

export class WiseProvider extends BaseBankProvider {
  private baseUrl = "https://api.wise.com";
  private testMode = process.env.NODE_ENV !== "production";

  constructor(credentials: AuthCredentials) {
    super("wise", credentials);
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/profiles`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Wise credential validation failed:', error);
      return false;
    }
  }

  async getAccountInfo(): Promise<{
    id: string;
    name: string;
    currency: string;
    balance: number;
    type: string;
  }> {
    try {
      // Get profile first
      const profileResponse = await fetch(`${this.baseUrl}/v1/profiles`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const profiles = await profileResponse.json();
      const profile = profiles.find((p: any) => p.type === 'personal') || profiles[0];
      
      // Get accounts
      const accountsResponse = await fetch(`${this.baseUrl}/v4/profiles/${profile.id}/balances?types=STANDARD`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!accountsResponse.ok) {
        throw new Error('Failed to fetch accounts');
      }
      
      const balances = await accountsResponse.json();
      const primaryBalance = balances.find((b: any) => b.currency === 'EUR') || balances[0];
      
      return {
        id: primaryBalance.id.toString(),
        name: `Wise ${primaryBalance.currency} Account`,
        currency: primaryBalance.currency,
        balance: primaryBalance.amount.value,
        type: 'checking',
      };
    } catch (error) {
      console.error('Failed to get Wise account info:', error);
      throw error;
    }
  }

  async getTransactions(
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<TransactionData[]> {
    try {
      // Get profile and balance ID first
      const profileResponse = await fetch(`${this.baseUrl}/v1/profiles`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      const profiles = await profileResponse.json();
      const profile = profiles.find((p: any) => p.type === 'personal') || profiles[0];
      
      const accountsResponse = await fetch(`${this.baseUrl}/v4/profiles/${profile.id}/balances?types=STANDARD`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      const balances = await accountsResponse.json();
      const primaryBalance = balances[0];
      
      // Get transactions
      const transactionsResponse = await fetch(
        `${this.baseUrl}/v1/profiles/${profile.id}/balance-statements/${primaryBalance.id}/statement.json?intervalStart=${startDate.toISOString()}&intervalEnd=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!transactionsResponse.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const statement = await transactionsResponse.json();
      
      return statement.transactions.slice(0, limit).map((tx: WiseTransaction) => ({
        id: tx.referenceNumber,
        amount: Math.abs(tx.amount.value),
        currency: tx.amount.currency,
        description: tx.description || 'Wise Transaction',
        date: this.formatDate(tx.date),
        type: tx.amount.value < 0 ? 'debit' : 'credit',
        category: this.categorizeTransaction(tx.description),
        balance: tx.runningBalance.value,
        metadata: {
          fees: tx.totalFees,
          exchangeDetails: tx.exchangeDetails,
          referenceNumber: tx.referenceNumber,
          type: tx.type,
        },
      }));
    } catch (error) {
      console.error('Failed to fetch Wise transactions:', error);
      throw error;
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsRealTimeSync: false,
      supportsHistoricalData: true,
      maxHistoryDays: 365 * 3, // 3 years
      rateLimitPerHour: 100,
    };
  }

  private categorizeTransaction(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('transfer') || desc.includes('money sent')) return 'Transfer';
    if (desc.includes('card payment') || desc.includes('pos')) return 'Shopping';
    if (desc.includes('atm') || desc.includes('cash')) return 'Cash Withdrawal';
    if (desc.includes('fee') || desc.includes('charge')) return 'Fees';
    if (desc.includes('exchange') || desc.includes('conversion')) return 'Currency Exchange';
    if (desc.includes('salary') || desc.includes('wage')) return 'Salary';
    if (desc.includes('refund')) return 'Refund';
    
    return 'Other';
  }
}