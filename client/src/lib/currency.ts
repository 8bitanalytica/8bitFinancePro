import { useAppSettings } from "@/components/settings/settings";

const currencies = {
  USD: { symbol: "$", position: "before" },
  EUR: { symbol: "€", position: "before" },
  GBP: { symbol: "£", position: "before" },
  JPY: { symbol: "¥", position: "before" },
  CAD: { symbol: "C$", position: "before" },
  AUD: { symbol: "A$", position: "before" },
  CHF: { symbol: "CHF", position: "after" },
  CNY: { symbol: "¥", position: "before" },
  INR: { symbol: "₹", position: "before" },
  BRL: { symbol: "R$", position: "before" },
};

export function formatCurrency(amount: number | string, currencyCode: string = "USD"): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const currency = currencies[currencyCode as keyof typeof currencies] || currencies.USD;
  
  if (currency.position === "before") {
    return `${currency.symbol}${numAmount.toFixed(2)}`;
  } else {
    return `${numAmount.toFixed(2)} ${currency.symbol}`;
  }
}

export function useCurrency() {
  const settings = useAppSettings();
  
  return {
    code: settings.currency,
    format: (amount: number | string) => formatCurrency(amount, settings.currency),
    symbol: currencies[settings.currency as keyof typeof currencies]?.symbol || "$",
  };
}