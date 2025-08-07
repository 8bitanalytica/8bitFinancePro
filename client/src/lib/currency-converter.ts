// Currency converter utility for handling transfers between different currencies
export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  date: string;
}

export interface ConversionResult {
  originalAmount: number;
  convertedAmount: number;
  exchangeRate: number;
  fromCurrency: string;
  toCurrency: string;
  date: string;
}

// Free API for currency exchange rates (no API key required)
const EXCHANGE_API_URL = 'https://api.exchangerate.host/latest';

/**
 * Fetches current exchange rate between two currencies
 */
export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  try {
    // If same currency, return 1
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const response = await fetch(`${EXCHANGE_API_URL}?base=${fromCurrency}&symbols=${toCurrency}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.rates || !data.rates[toCurrency]) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    return data.rates[toCurrency];
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    throw new Error('Unable to fetch current exchange rate. Please check your internet connection.');
  }
}

/**
 * Converts amount from one currency to another using current exchange rate
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<ConversionResult> {
  const exchangeRate = await getExchangeRate(fromCurrency, toCurrency);
  const convertedAmount = amount * exchangeRate;

  return {
    originalAmount: amount,
    convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
    exchangeRate,
    fromCurrency,
    toCurrency,
    date: new Date().toISOString(),
  };
}

/**
 * Formats currency conversion for display
 */
export function formatConversion(conversion: ConversionResult): string {
  const { originalAmount, convertedAmount, fromCurrency, toCurrency, exchangeRate } = conversion;
  
  return `${originalAmount} ${fromCurrency} = ${convertedAmount} ${toCurrency} (Rate: ${exchangeRate.toFixed(4)})`;
}

/**
 * Gets currency symbol for display
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$", AUD: "A$", 
    CHF: "CHF", CNY: "¥", INR: "₹", BRL: "R$"
  };
  return symbols[currencyCode] || currencyCode;
}