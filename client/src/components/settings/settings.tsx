import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save, Settings as SettingsIcon, Copy, Check, TrendingUp, TrendingDown, ArrowUpDown, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BankConnectionModal } from "@/components/bank-connections";

interface BankAccount {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "investment";
  balance: number;
  color: string;
  currency: string;
}

interface AppSettings {
  generalCategories: string[];
  realEstateCategories: string[];
  deviceCategories: string[];
  generalIncomeCategories: string[];
  generalExpenseCategories: string[];
  generalTransferCategories: string[];
  realEstateIncomeCategories: string[];
  realEstateExpenseCategories: string[];
  deviceIncomeCategories: string[];
  deviceExpenseCategories: string[];
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
  // Legacy categories (for backward compatibility)
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
    "Real Estate",
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
  // New categorized categories
  generalIncomeCategories: [
    "Salary",
    "Freelance",
    "Investment Returns",
    "Bonus",
    "Side Hustle",
    "Gifts",
    "Refunds",
    "Other Income",
  ],
  generalExpenseCategories: [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Education",
    "Travel",
    "Insurance",
    "Device",
    "Real Estate",
    "Other Expenses",
  ],
  generalTransferCategories: [
    "Account Transfer",
    "Savings",
    "Investment",
    "Payment",
    "Emergency Fund",
    "Other Transfer",
  ],
  realEstateIncomeCategories: [
    "Rental Income",
    "Property Sale",
    "Security Deposit",
    "Late Fees",
    "Other Income",
  ],
  realEstateExpenseCategories: [
    "Mortgage/Rent",
    "Property Tax",
    "Insurance",
    "Maintenance",
    "Repairs",
    "Utilities",
    "HOA Fees",
    "Property Management",
    "Legal Fees",
    "Other Expenses",
  ],
  deviceIncomeCategories: [
    "Device Sale",
    "Trade-in Value",
    "Insurance Claim",
    "Warranty Refund",
    "Other Income",
  ],
  deviceExpenseCategories: [
    "Device Purchase",
    "Repair",
    "Upgrade",
    "Accessory",
    "Maintenance",
    "Insurance",
    "Software/Apps",
    "Warranty Extension",
    "Other Expenses",
  ],
  bankAccounts: [
    {
      id: "1",
      name: "Main Checking",
      type: "checking",
      balance: 0,
      color: "#3b82f6",
      currency: "USD",
    },
    {
      id: "2",
      name: "Savings Account",
      type: "savings",
      balance: 0,
      color: "#10b981",
      currency: "USD",
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
  const [newExpenseCategory, setNewExpenseCategory] = useState("");
  const [newTransferCategory, setNewTransferCategory] = useState("");
  const [activeTab, setActiveTab] = useState<keyof Pick<AppSettings, 'generalCategories' | 'realEstateCategories' | 'deviceCategories'>>("generalCategories");
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [copiedCommands, setCopiedCommands] = useState(false);
  const [showBankConnectionModal, setShowBankConnectionModal] = useState(false);
  const [selectedAccountForConnection, setSelectedAccountForConnection] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({
    name: "",
    type: "checking" as BankAccount["type"],
    balance: "",
    color: accountColors[0],
    currency: "USD",
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
    
    // Notify other components that settings have been updated
    window.dispatchEvent(new CustomEvent('accountsUpdated'));
    
    toast({ title: "Settings saved successfully" });
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
    // Protected categories that cannot be deleted
    const protectedCategories = ["Device", "Real Estate"];
    
    if (protectedCategories.includes(category)) {
      toast({
        title: "Cannot delete protected category",
        description: "This category is protected and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    
    setSettings(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].filter(c => c !== category)
    }));
  };

  // Helper functions to get categories by transaction type and module
  const getIncomeCategories = () => {
    if (activeTab === "generalCategories") return settings.generalIncomeCategories || [];
    if (activeTab === "realEstateCategories") return settings.realEstateIncomeCategories || [];
    if (activeTab === "deviceCategories") return settings.deviceIncomeCategories || [];
    return [];
  };

  const getExpenseCategories = () => {
    if (activeTab === "generalCategories") return settings.generalExpenseCategories || [];
    if (activeTab === "realEstateCategories") return settings.realEstateExpenseCategories || [];
    if (activeTab === "deviceCategories") return settings.deviceExpenseCategories || [];
    return [];
  };

  const getTransferCategories = () => {
    if (activeTab === "generalCategories") return settings.generalTransferCategories || [];
    return [];
  };

  // Functions to add categories by type
  const addIncomeCategory = () => {
    if (!newCategory.trim()) return;
    
    const currentCategories = getIncomeCategories();
    if (currentCategories.includes(newCategory.trim())) {
      toast({
        title: "Category already exists",
        description: "This income category is already in the list.",
        variant: "destructive",
      });
      return;
    }

    let categoryKey = "";
    if (activeTab === "generalCategories") categoryKey = "generalIncomeCategories";
    else if (activeTab === "realEstateCategories") categoryKey = "realEstateIncomeCategories";
    else if (activeTab === "deviceCategories") categoryKey = "deviceIncomeCategories";

    setSettings(prev => ({
      ...prev,
      [categoryKey]: [...(prev[categoryKey as keyof AppSettings] as string[]), newCategory.trim()]
    }));
    setNewCategory("");
  };

  const addExpenseCategory = () => {
    if (!newExpenseCategory.trim()) return;
    
    const currentCategories = getExpenseCategories();
    if (currentCategories.includes(newExpenseCategory.trim())) {
      toast({
        title: "Category already exists",
        description: "This expense category is already in the list.",
        variant: "destructive",
      });
      return;
    }

    let categoryKey = "";
    if (activeTab === "generalCategories") categoryKey = "generalExpenseCategories";
    else if (activeTab === "realEstateCategories") categoryKey = "realEstateExpenseCategories";
    else if (activeTab === "deviceCategories") categoryKey = "deviceExpenseCategories";

    setSettings(prev => ({
      ...prev,
      [categoryKey]: [...(prev[categoryKey as keyof AppSettings] as string[]), newExpenseCategory.trim()]
    }));
    setNewExpenseCategory("");
  };

  const addTransferCategory = () => {
    if (!newTransferCategory.trim() || activeTab !== "generalCategories") return;
    
    if (settings.generalTransferCategories.includes(newTransferCategory.trim())) {
      toast({
        title: "Category already exists",
        description: "This transfer category is already in the list.",
        variant: "destructive",
      });
      return;
    }

    setSettings(prev => ({
      ...prev,
      generalTransferCategories: [...prev.generalTransferCategories, newTransferCategory.trim()]
    }));
    setNewTransferCategory("");
  };

  // Functions to remove categories by type
  const removeIncomeCategory = (category: string) => {
    // Protected categories that cannot be deleted
    const protectedCategories = ["Device", "Real Estate"];
    
    if (protectedCategories.includes(category)) {
      toast({
        title: "Cannot delete protected category",
        description: "This category is protected and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    
    let categoryKey = "";
    if (activeTab === "generalCategories") categoryKey = "generalIncomeCategories";
    else if (activeTab === "realEstateCategories") categoryKey = "realEstateIncomeCategories";
    else if (activeTab === "deviceCategories") categoryKey = "deviceIncomeCategories";

    setSettings(prev => ({
      ...prev,
      [categoryKey]: (prev[categoryKey as keyof AppSettings] as string[]).filter(c => c !== category)
    }));
  };

  const removeExpenseCategory = (category: string) => {
    // Protected categories that cannot be deleted
    const protectedCategories = ["Device", "Real Estate"];
    
    if (protectedCategories.includes(category)) {
      toast({
        title: "Cannot delete protected category",
        description: "This category is protected and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    
    let categoryKey = "";
    if (activeTab === "generalCategories") categoryKey = "generalExpenseCategories";
    else if (activeTab === "realEstateCategories") categoryKey = "realEstateExpenseCategories";
    else if (activeTab === "deviceCategories") categoryKey = "deviceExpenseCategories";

    setSettings(prev => ({
      ...prev,
      [categoryKey]: (prev[categoryKey as keyof AppSettings] as string[]).filter(c => c !== category)
    }));
  };

  const removeTransferCategory = (category: string) => {
    // Protected categories that cannot be deleted
    const protectedCategories = ["Device", "Real Estate"];
    
    if (protectedCategories.includes(category)) {
      toast({
        title: "Cannot delete protected category",
        description: "This category is protected and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    
    setSettings(prev => ({
      ...prev,
      generalTransferCategories: prev.generalTransferCategories.filter(c => c !== category)
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
        currency: bank.currency,
      });
    } else {
      setEditingBank(null);
      setBankForm({
        name: "",
        type: "checking",
        balance: "",
        color: accountColors[0],
        currency: "USD",
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
      currency: bankForm.currency,
    };

    if (editingBank) {
      const updatedSettings = {
        ...settings,
        bankAccounts: settings.bankAccounts.map(acc => 
          acc.id === editingBank.id ? newAccount : acc
        ),
      };
      setSettings(updatedSettings);
      localStorage.setItem("appSettings", JSON.stringify(updatedSettings));
      toast({ title: "Bank account updated successfully" });
      
      // Notify other components that accounts have been updated
      window.dispatchEvent(new CustomEvent('accountsUpdated'));
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } else {
      setSettings(prev => ({
        ...prev,
        bankAccounts: [...prev.bankAccounts, newAccount],
      }));
      toast({ title: "Bank account created successfully" });
      
      // Save to localStorage immediately
      localStorage.setItem("appSettings", JSON.stringify({
        ...settings,
        bankAccounts: [...settings.bankAccounts, newAccount],
      }));
      
      // Notify other components that accounts have been updated
      window.dispatchEvent(new CustomEvent('accountsUpdated'));
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    }

    setShowBankModal(false);
    setEditingBank(null);
  };

  const deleteBankAccount = (id: string) => {
    const updatedSettings = {
      ...settings,
      bankAccounts: settings.bankAccounts.filter(acc => acc.id !== id),
    };
    setSettings(updatedSettings);
    localStorage.setItem("appSettings", JSON.stringify(updatedSettings));
    
    // Notify other components that accounts have been updated
    window.dispatchEvent(new CustomEvent('accountsUpdated'));
    window.dispatchEvent(new CustomEvent('settingsChanged'));
    
    toast({ title: "Bank account deleted successfully" });
  };

  const getCurrencySymbol = (code: string) => {
    return currencies.find(c => c.code === code)?.symbol || code;
  };

  const copyInstallationCommands = async () => {
    const commands = `# Installa Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installa PostgreSQL
sudo apt update && sudo apt install postgresql postgresql-contrib

# Clone e setup progetto
git clone [your-repo-url]
cd financial-manager
npm install

# Configura database
export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
npm run db:push

# Avvia applicazione
npm run dev # development
npm run build && npm start # production`;

    try {
      await navigator.clipboard.writeText(commands);
      setCopiedCommands(true);
      toast({ title: "Comandi copiati negli appunti!" });
      setTimeout(() => setCopiedCommands(false), 2000);
    } catch (err) {
      toast({ 
        title: "Errore nella copia", 
        description: "Non è stato possibile copiare i comandi negli appunti",
        variant: "destructive" 
      });
    }
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
        {/* Category Management */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Categories</CardTitle>
            <p className="text-sm text-gray-600">Manage categories for different modules and transaction types</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Module Tabs */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={activeTab === "generalCategories" ? "default" : "outline"}
                  onClick={() => setActiveTab("generalCategories")}
                  size="sm"
                >
                  General Finances
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
                  Device Management
                </Button>
              </div>

              {/* Transaction Type Sections */}
              <div className="space-y-6">
                {/* Income Categories */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-green-700 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Income Categories
                    </h4>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new income category..."
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addIncomeCategory()}
                    />
                    <Button onClick={addIncomeCategory} size="sm" className="bg-green-600 hover:bg-green-700">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getIncomeCategories().map((category) => (
                      <Badge key={category} className="bg-green-100 text-green-800 flex items-center gap-1">
                        {category}
                        <button
                          onClick={() => removeIncomeCategory(category)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    {getIncomeCategories().length} income categories
                  </p>
                </div>

                {/* Expense Categories */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-red-700 flex items-center">
                      <TrendingDown className="h-5 w-5 mr-2" />
                      Expense Categories
                    </h4>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new expense category..."
                      value={newExpenseCategory}
                      onChange={(e) => setNewExpenseCategory(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addExpenseCategory()}
                    />
                    <Button onClick={addExpenseCategory} size="sm" className="bg-red-600 hover:bg-red-700">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getExpenseCategories().map((category) => (
                      <Badge key={category} className="bg-red-100 text-red-800 flex items-center gap-1">
                        {category}
                        <button
                          onClick={() => removeExpenseCategory(category)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    {getExpenseCategories().length} expense categories
                  </p>
                </div>

                {/* Transfer Categories (only for General Finances) */}
                {activeTab === "generalCategories" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-blue-700 flex items-center">
                        <ArrowUpDown className="h-5 w-5 mr-2" />
                        Transfer Categories
                      </h4>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add new transfer category..."
                        value={newTransferCategory}
                        onChange={(e) => setNewTransferCategory(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addTransferCategory()}
                      />
                      <Button onClick={addTransferCategory} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getTransferCategories().map((category) => (
                        <Badge key={category} className="bg-blue-100 text-blue-800 flex items-center gap-1">
                          {category}
                          <button
                            onClick={() => removeTransferCategory(category)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">
                      {getTransferCategories().length} transfer categories
                    </p>
                  </div>
                )}
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
                        {getCurrencySymbol(account.currency)}{account.balance.toFixed(2)}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccountForConnection(account.id);
                          setShowBankConnectionModal(true);
                        }}
                        className="mt-2"
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Connect Bank
                      </Button>
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

        {/* Technology Stack Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Stack Tecnologico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Architettura dell'Applicazione</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-4">
                  Stack completo per configurare l'applicazione Financial Manager sulla tua VPS:
                </p>
                
                <div className="space-y-4">
                  {/* Frontend */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Frontend</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Framework:</strong> React 18 + TypeScript</div>
                      <div><strong>Build Tool:</strong> Vite</div>
                      <div><strong>UI Library:</strong> shadcn/ui + Radix UI</div>
                      <div><strong>Styling:</strong> Tailwind CSS + PostCSS</div>
                      <div><strong>State Management:</strong> TanStack Query (React Query)</div>
                      <div><strong>Routing:</strong> Wouter</div>
                      <div><strong>Forms:</strong> React Hook Form + Zod validation</div>
                      <div><strong>Icons:</strong> Lucide React + React Icons</div>
                    </div>
                  </div>

                  {/* Backend */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Backend</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Runtime:</strong> Node.js 20</div>
                      <div><strong>Framework:</strong> Express.js + TypeScript</div>
                      <div><strong>Database:</strong> PostgreSQL</div>
                      <div><strong>ORM:</strong> Drizzle ORM</div>
                      <div><strong>Session Store:</strong> connect-pg-simple</div>
                      <div><strong>Validation:</strong> Zod schemas</div>
                      <div><strong>Development:</strong> tsx per TypeScript execution</div>
                    </div>
                  </div>

                  {/* Database */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Database Schema</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Tabelle principali:</strong></div>
                      <div className="ml-4">
                        • general_transactions (transazioni generali)<br />
                        • properties (proprietà immobiliari)<br />
                        • real_estate_transactions (transazioni immobiliari)<br />
                        • devices (dispositivi e apparecchi)<br />
                        • device_transactions (spese dispositivi)
                      </div>
                      <div><strong>Gestione Sessioni:</strong> Tabella session per autenticazione PostgreSQL</div>
                    </div>
                  </div>

                  {/* Build & Deployment */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Build e Deploy</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Frontend Build:</strong> Vite build → assets statici</div>
                      <div><strong>Backend Build:</strong> ESBuild → bundle singolo</div>
                      <div><strong>Database Migrations:</strong> Drizzle Kit push</div>
                      <div><strong>Environment Variables:</strong> DATABASE_URL richiesta</div>
                    </div>
                  </div>

                  {/* Dependencies */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Dipendenze Principali</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Core:</strong> react, express, drizzle-orm, @neondatabase/serverless</div>
                      <div><strong>UI:</strong> @radix-ui/*, tailwindcss, lucide-react</div>
                      <div><strong>Utils:</strong> date-fns, zod, react-hook-form, @tanstack/react-query</div>
                      <div><strong>Dev Tools:</strong> typescript, vite, drizzle-kit, tsx</div>
                    </div>
                  </div>

                  {/* Server Requirements */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Requisiti VPS</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Sistema Operativo:</strong> Linux (Ubuntu 20.04+ raccomandato)</div>
                      <div><strong>Node.js:</strong> Versione 20 o superiore</div>
                      <div><strong>PostgreSQL:</strong> Versione 14+ con estensioni standard</div>
                      <div><strong>RAM:</strong> Minimo 2GB (4GB raccomandato)</div>
                      <div><strong>Storage:</strong> Minimo 10GB SSD</div>
                      <div><strong>Rete:</strong> Porta 5000 (configurabile)</div>
                    </div>
                  </div>

                  {/* Installation Commands */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-800">Comandi di Installazione</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyInstallationCommands}
                        className="flex items-center gap-2"
                      >
                        {copiedCommands ? (
                          <>
                            <Check className="h-4 w-4 text-green-600" />
                            Copiato!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copia Comandi
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-black text-green-400 p-3 rounded font-mono text-xs relative">
                      <div># Installa Node.js 20</div>
                      <div>curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -</div>
                      <div>sudo apt-get install -y nodejs</div>
                      <div></div>
                      <div># Installa PostgreSQL</div>
                      <div>sudo apt update && sudo apt install postgresql postgresql-contrib</div>
                      <div></div>
                      <div># Clone e setup progetto</div>
                      <div>git clone [your-repo-url]</div>
                      <div>cd financial-manager</div>
                      <div>npm install</div>
                      <div></div>
                      <div># Configura database</div>
                      <div>export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"</div>
                      <div>npm run db:push</div>
                      <div></div>
                      <div># Avvia applicazione</div>
                      <div>npm run dev # development</div>
                      <div>npm run build && npm start # production</div>
                    </div>
                  </div>

                  {/* Production Notes */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Note per Produzione</h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <div><strong>Proxy Inverso:</strong> Usa Nginx o Apache per servire l'applicazione</div>
                      <div><strong>SSL/TLS:</strong> Configura HTTPS con Let's Encrypt</div>
                      <div><strong>Process Manager:</strong> Usa PM2 per gestire il processo Node.js</div>
                      <div><strong>Backup Database:</strong> Configura backup automatici PostgreSQL</div>
                      <div><strong>Monitoraggio:</strong> Implementa logging e monitoring (Grafana, Prometheus)</div>
                      <div><strong>Sicurezza:</strong> Configura firewall (ufw), aggiorna regolarmente il sistema</div>
                    </div>
                  </div>

                  {/* Environment Variables */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Variabili d'Ambiente</h4>
                    <div className="bg-gray-100 p-3 rounded font-mono text-xs">
                      <div>DATABASE_URL=postgresql://user:password@localhost:5432/financial_db</div>
                      <div>NODE_ENV=production</div>
                      <div>PORT=5000</div>
                      <div>SESSION_SECRET=your-secure-session-secret</div>
                    </div>
                  </div>

                  {/* PM2 Configuration */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Configurazione PM2 (ecosystem.config.js)</h4>
                    <div className="bg-gray-100 p-3 rounded font-mono text-xs">
                      <div>module.exports = &#123;</div>
                      <div>&nbsp;&nbsp;apps: [&#123;</div>
                      <div>&nbsp;&nbsp;&nbsp;&nbsp;name: 'financial-manager',</div>
                      <div>&nbsp;&nbsp;&nbsp;&nbsp;script: './dist/server/index.js',</div>
                      <div>&nbsp;&nbsp;&nbsp;&nbsp;instances: 'max',</div>
                      <div>&nbsp;&nbsp;&nbsp;&nbsp;exec_mode: 'cluster',</div>
                      <div>&nbsp;&nbsp;&nbsp;&nbsp;env: &#123;</div>
                      <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;NODE_ENV: 'production',</div>
                      <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;PORT: 5000</div>
                      <div>&nbsp;&nbsp;&nbsp;&nbsp;&#125;</div>
                      <div>&nbsp;&nbsp;&#125;]</div>
                      <div>&#125;;</div>
                    </div>
                  </div>
                </div>
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
                <Label htmlFor="bank-currency">Currency</Label>
                <Select value={bankForm.currency} onValueChange={(value) => setBankForm({ ...bankForm, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bank-balance">Current Balance ({getCurrencySymbol(bankForm.currency)})</Label>
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

              {/* Bank Connection Option */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Bank Connection</Label>
                    <p className="text-sm text-muted-foreground">
                      Connect to your real bank account for automatic transaction import
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!bankForm.name.trim()) {
                        toast({
                          title: "Account Name Required",
                          description: "Please enter an account name first",
                          variant: "destructive",
                        });
                        return;
                      }
                      // Save the current bank account first if it's new
                      if (!editingBank) {
                        const tempAccount = {
                          id: `temp_${Date.now()}`,
                          name: bankForm.name,
                          type: bankForm.type,
                          balance: parseFloat(bankForm.balance) || 0,
                          color: bankForm.color,
                          currency: bankForm.currency,
                        };
                        setSelectedAccountForConnection(tempAccount.id);
                        // Store temp account for later use
                        localStorage.setItem('tempAccount', JSON.stringify(tempAccount));
                      } else {
                        setSelectedAccountForConnection(editingBank.id);
                      }
                      setShowBankConnectionModal(true);
                    }}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Connect Bank
                  </Button>
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

      {/* Bank Connection Modal */}
      <BankConnectionModal
        open={showBankConnectionModal}
        onClose={() => {
          setShowBankConnectionModal(false);
          setSelectedAccountForConnection(null);
          // Clean up temp account
          localStorage.removeItem('tempAccount');
        }}
        accountId={selectedAccountForConnection}
      />
    </div>
  );
}

// Hook to use settings throughout the app
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem("appSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error("Error parsing saved settings:", error);
      }
    }
  };

  useEffect(() => {
    loadSettings();
  }, [refreshKey]);

  // Listen for custom events to reload settings
  useEffect(() => {
    const handleAccountsUpdated = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    const handleSettingsChanged = () => {
      loadSettings();
    };
    
    window.addEventListener('accountsUpdated', handleAccountsUpdated);
    window.addEventListener('settingsChanged', handleSettingsChanged);
    
    return () => {
      window.removeEventListener('accountsUpdated', handleAccountsUpdated);
      window.removeEventListener('settingsChanged', handleSettingsChanged);
    };
  }, []);

  return settings;
}