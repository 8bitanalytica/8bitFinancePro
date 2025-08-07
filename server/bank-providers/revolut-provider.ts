import { BaseBankProvider, type TransactionData, type AuthCredentials, type ProviderCapabilities } from "./base-provider";

interface RevolutAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  state: string;
  public: boolean;
  created_at: string;
  updated_at: string;
}

interface RevolutTransaction {
  id: string;
  type: string;
  request_id: string;
  state: string;
  reason_code?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  description?: string;
  amount: number;
  currency: string;
  account_id: string;
  counterpart?: {
    id: string;
    account_id: string;
    account_type: string;
  };
  reference?: string;
  leg_id: string;
}

export class RevolutProvider extends BaseBankProvider {
  private baseUrl = "https://b2b.revolut.com/api/1.0";
  private testMode = process.env.NODE_ENV !== "production";

  constructor(credentials: AuthCredentials) {
    super("revolut", credentials);
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Revolut credential validation failed:', error);
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
      const response = await fetch(`${this.baseUrl}/accounts`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      
      const accounts: RevolutAccount[] = await response.json();
      const primaryAccount = accounts.find(acc => acc.currency === 'EUR') || accounts[0];
      
      return {
        id: primaryAccount.id,
        name: primaryAccount.name || `Revolut ${primaryAccount.currency} Account`,
        currency: primaryAccount.currency,
        balance: primaryAccount.balance,
        type: 'business',
      };
    } catch (error) {
      console.error('Failed to get Revolut account info:', error);
      throw error;
    }
  }

  async getTransactions(
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<TransactionData[]> {
    try {
      // First get the account ID
      const accountInfo = await this.getAccountInfo();
      
      const params = new URLSearchParams({
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        count: limit.toString(),
      });
      
      const response = await fetch(`${this.baseUrl}/accounts/${accountInfo.id}/transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const transactions: RevolutTransaction[] = await response.json();
      
      return transactions
        .filter(tx => tx.state === 'completed')
        .map(tx => ({
          id: tx.id,
          amount: Math.abs(tx.amount),
          currency: tx.currency,
          description: tx.description || tx.reference || 'Revolut Transaction',
          date: this.formatDate(tx.completed_at || tx.created_at),
          type: tx.amount < 0 ? 'debit' : 'credit',
          category: this.categorizeTransaction(tx.type, tx.description),
          metadata: {
            requestId: tx.request_id,
            type: tx.type,
            state: tx.state,
            reasonCode: tx.reason_code,
            counterpart: tx.counterpart,
            reference: tx.reference,
            legId: tx.leg_id,
          },
        }));
    } catch (error) {
      console.error('Failed to fetch Revolut transactions:', error);
      throw error;
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsRealTimeSync: true,
      supportsHistoricalData: true,
      maxHistoryDays: 365,
      rateLimitPerHour: 1000,
    };
  }

  async refreshToken(): Promise<{ accessToken: string; refreshToken?: string; expiresAt: Date }> {
    if (!this.credentials.refreshToken) {
      throw new Error('Refresh token not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.credentials.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    } catch (error) {
      console.error('Failed to refresh Revolut token:', error);
      throw error;
    }
  }

  private categorizeTransaction(type: string, description?: string): string {
    const typeMap: Record<string, string> = {
      'transfer': 'Transfer',
      'payment': 'Payment',
      'card_payment': 'Shopping',
      'card_refund': 'Refund',
      'atm': 'Cash Withdrawal',
      'fee': 'Fees',
      'exchange': 'Currency Exchange',
      'topup': 'Deposit',
    };

    if (typeMap[type]) {
      return typeMap[type];
    }

    if (description) {
      const desc = description.toLowerCase();
      if (desc.includes('salary') || desc.includes('wage')) return 'Salary';
      if (desc.includes('refund')) return 'Refund';
      if (desc.includes('subscription')) return 'Subscription';
    }

    return 'Other';
  }
}