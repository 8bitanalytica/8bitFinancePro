import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AppSettings {
  currency: string;
  generalCategories: string[];
  realEstateCategories: string[];
  deviceCategories: string[];
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
};

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [newCategory, setNewCategory] = useState("");
  const [activeTab, setActiveTab] = useState<keyof Pick<AppSettings, 'generalCategories' | 'realEstateCategories' | 'deviceCategories'>>("generalCategories");
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