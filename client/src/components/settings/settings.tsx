import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BankAccount {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "investment";
  balance: number;
  color: string;
}

interface AppSettings {
  currency: string;
  generalCategories: string[];
  realEstateCategories: string[];
  deviceCategories: string[];
  bankAccounts: BankAccount[];
}

const currencies = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
];

const defaultSettings: AppSettings = {
  currency: "USD",
  generalCategories: [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Education",
    "Travel",
    "Device",
    "Income",
    "Investment",
  ],
  realEstateCategories: [
    "Rent/Mortgage",
    "Property Tax",
    "Insurance",
    "Maintenance",
    "Utilities",
    "HOA Fees",
    "Repairs",
    "Improvements",
    "Property Management",
    "Rental Income",
  ],
  deviceCategories: [
    "Purchase",
    "Repair",
    "Upgrade",
    "Accessory",
    "Maintenance",
    "Insurance",
    "Software",
    "Warranty",
    "Replacement",
  ],
  bankAccounts: [
    {
      id: "1",
      name: "Main Checking",
      type: "checking",
      balance: 0,
      color: "#3b82f6",
    },
    {
      id: "2",
      name: "Savings Account",
      type: "savings",
      balance: 0,
      color: "#10b981",
    },
  ],
};

const accountTypes = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit", label: "Credit Card" },
  { value: "investment", label: "Investment" },
];

const accountColors = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1"
];

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [newCategory, setNewCategory] = useState("");
  const [activeTab, setActiveTab] = useState<keyof Pick<AppSettings, 'generalCategories' | 'realEstateCategories' | 'deviceCategories'>>("generalCategories");
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [bankForm, setBankForm] = useState({
    name: "",
    type: "checking" as BankAccount["type"],
    balance: "",
    color: accountColors[0],
  });
  const { toast } = useToast();

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("appSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error("Error parsing saved settings:", error);
      }
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem("appSettings", JSON.stringify(settings));
    toast({ title: "Settings saved successfully" });
  };

  const handleCurrencyChange = (currency: string) => {
    setSettings(prev => ({ ...prev, currency }));
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    
    if (settings[activeTab].includes(newCategory.trim())) {
      toast({
        title: "Category already exists",
        description: "This category is already in the list.",
        variant: "destructive",
      });
      return;
    }

    setSettings(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], newCategory.trim()]
    }));
    setNewCategory("");
  };

  const removeCategory = (category: string) => {
    setSettings(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].filter(c => c !== category)
    }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    toast({ title: "Settings reset to defaults" });
  };

  const openBankModal = (bank?: BankAccount) => {
    if (bank) {
      setEditingBank(bank);
      setBankForm({
        name: bank.name,
        type: bank.type,
        balance: bank.balance.toString(),
        color: bank.color,
      });
    } else {
      setEditingBank(null);
      setBankForm({
        name: "",
        type: "checking",
        balance: "",
        color: accountColors[0],
      });
    }
    setShowBankModal(true);
  };

  const saveBankAccount = () => {
    if (!bankForm.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the bank account.",
        variant: "destructive",
      });
      return;
    }

    const balance = parseFloat(bankForm.balance) || 0;
    const newAccount: BankAccount = {
      id: editingBank?.id || Date.now().toString(),
      name: bankForm.name.trim(),
      type: bankForm.type,
      balance,
      color: bankForm.color,
    };

    if (editingBank) {
      setSettings(prev => ({
        ...prev,
        bankAccounts: prev.bankAccounts.map(acc => 
          acc.id === editingBank.id ? newAccount : acc
        ),
      }));
      toast({ title: "Bank account updated successfully" });
    } else {
      setSettings(prev => ({
        ...prev,
        bankAccounts: [...prev.bankAccounts, newAccount],
      }));
      toast({ title: "Bank account created successfully" });
    }

    setShowBankModal(false);
    setEditingBank(null);
  };

  const deleteBankAccount = (id: string) => {
    setSettings(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter(acc => acc.id !== id),
    }));
    toast({ title: "Bank account deleted successfully" });
  };

  const getCurrencySymbol = (code: string) => {
    return currencies.find(c => c.code === code)?.symbol || code;
  };

  return (
    <div>
      {/* Header */}
      <div className="surface border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="text-sm text-gray-600 mt-1">Configure your application preferences</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
            <Button onClick={saveSettings} className="bg-primary hover:bg-blue-700">
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Currency Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="currency">Default Currency</Label>
                <Select value={settings.currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} - {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-600">
                Current currency: <span className="font-semibold">{getCurrencySymbol(settings.currency)} ({settings.currency})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Management */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
            <p className="text-sm text-gray-600">Manage categories for different modules</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Category Tabs */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={activeTab === "generalCategories" ? "default" : "outline"}
                  onClick={() => setActiveTab("generalCategories")}
                  size="sm"
                >
                  General
                </Button>
                <Button
                  variant={activeTab === "realEstateCategories" ? "default" : "outline"}
                  onClick={() => setActiveTab("realEstateCategories")}
                  size="sm"
                >
                  Real Estate
                </Button>
                <Button
                  variant={activeTab === "deviceCategories" ? "default" : "outline"}
                  onClick={() => setActiveTab("deviceCategories")}
                  size="sm"
                >
                  Devices
                </Button>
              </div>

              {/* Add New Category */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter new category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addCategory()}
                />
                <Button onClick={addCategory} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Category List */}
              <div className="space-y-2">
                <Label>
                  {activeTab === "generalCategories" && "General Finance Categories"}
                  {activeTab === "realEstateCategories" && "Real Estate Categories"}
                  {activeTab === "deviceCategories" && "Device Categories"}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {settings[activeTab].map((category) => (
                    <Badge key={category} variant="secondary" className="flex items-center gap-1">
                      {category}
                      <button
                        onClick={() => removeCategory(category)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  {settings[activeTab].length} categories
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Account Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Bank Account Management
              <Button onClick={() => openBankModal()} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settings.bankAccounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No bank accounts configured</p>
                  <Button onClick={() => openBankModal()} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Account
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {settings.bankAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="border rounded-lg p-4 space-y-2"
                      style={{ borderLeft: `4px solid ${account.color}` }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{account.name}</h3>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openBankModal(account)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBankAccount(account.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 capitalize">{account.type}</p>
                      <p className="text-lg font-semibold">
                        {getCurrencySymbol(settings.currency)}{account.balance.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Export/Import Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const dataStr = JSON.stringify(settings, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'financial-app-settings.json';
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          try {
                            const imported = JSON.parse(e.target?.result as string);
                            setSettings({ ...defaultSettings, ...imported });
                            toast({ title: "Settings imported successfully" });
                          } catch (error) {
                            toast({
                              title: "Import failed",
                              description: "Invalid settings file",
                              variant: "destructive",
                            });
                          }
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                >
                  Import Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Account Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingBank ? "Edit Bank Account" : "Add Bank Account"}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="bank-name">Account Name</Label>
                <Input
                  id="bank-name"
                  value={bankForm.name}
                  onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
                  placeholder="e.g., Main Checking"
                />
              </div>

              <div>
                <Label htmlFor="bank-type">Account Type</Label>
                <Select value={bankForm.type} onValueChange={(value: BankAccount["type"]) => setBankForm({ ...bankForm, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bank-balance">Current Balance ({getCurrencySymbol(settings.currency)})</Label>
                <Input
                  id="bank-balance"
                  type="number"
                  step="0.01"
                  value={bankForm.balance}
                  onChange={(e) => setBankForm({ ...bankForm, balance: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {accountColors.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${bankForm.color === color ? 'border-gray-800' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBankForm({ ...bankForm, color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBankModal(false);
                  setEditingBank(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveBankAccount}>
                {editingBank ? "Update" : "Add"} Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook to use settings throughout the app
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    const savedSettings = localStorage.getItem("appSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error("Error parsing saved settings:", error);
      }
    }
  }, []);

  return settings;
}