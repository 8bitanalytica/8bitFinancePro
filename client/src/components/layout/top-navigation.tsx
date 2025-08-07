import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Building2, 
  Laptop, 
  Settings, 
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSettings } from "@/components/settings/settings";

const navigation = [
  { name: "General", href: "/", icon: Home },
  { name: "Real Estate", href: "/real-estate", icon: Building2 },
  { name: "Devices", href: "/devices", icon: Laptop },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function TopNavigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const settings = useAppSettings();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center h-16">
          {/* Logo/Title */}
          <div className={cn(
            "flex items-center",
            settings.logoPosition === "left" && "order-1",
            settings.logoPosition === "center" && "order-2 flex-1 justify-center",
            settings.logoPosition === "right" && "order-3 ml-auto"
          )}>
            {settings.appLogo && (
              <img 
                src={settings.appLogo} 
                alt="App Logo" 
                className="h-8 w-8 object-cover rounded mr-3"
              />
            )}
            <h1 className="text-xl font-bold text-gray-900">{settings.appName}</h1>
          </div>

          {/* Desktop Navigation */}
          <div className={cn(
            "hidden sm:flex sm:space-x-8",
            settings.menuPosition === "left" && "order-1 mr-8",
            settings.menuPosition === "center" && "order-2 flex-1 justify-center",
            settings.menuPosition === "right" && "order-3 ml-auto"
          )}>
              {navigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors",
                      isActive
                        ? "border-blue-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-2 text-base font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-4 border-blue-500"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}