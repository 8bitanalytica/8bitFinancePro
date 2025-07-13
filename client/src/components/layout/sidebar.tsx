import { cn } from "@/lib/utils";
import { ChartLine, Building, Download, Settings, Wallet, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type Module = "general" | "real-estate" | "devices";

interface SidebarProps {
  activeModule: Module;
  onModuleChange: (module: Module) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ activeModule, onModuleChange, isOpen, onToggle }: SidebarProps) {
  const modules = [
    {
      id: "general" as const,
      label: "General Finances",
      icon: ChartLine,
    },
    {
      id: "real-estate" as const,
      label: "Real Estate",
      icon: Building,
    },
    {
      id: "devices" as const,
      label: "Device Management",
      icon: Smartphone,
    },
  ];

  const tools = [
    {
      id: "export",
      label: "Export Data",
      icon: Download,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <aside className={cn(
      "w-64 surface shadow-lg border-r border-gray-200 fixed h-full z-50 transition-transform duration-300",
      "lg:relative lg:translate-x-0 lg:z-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary flex items-center">
          <Wallet className="mr-2" />
          Financial Manager
        </h1>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            MODULES
          </h3>
        </div>
        
        <ul className="space-y-2 px-4">
          {modules.map((module) => (
            <li key={module.id}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-sm font-medium transition-colors",
                  activeModule === module.id
                    ? "text-primary bg-blue-50 hover:bg-blue-100"
                    : "text-gray-600 hover:bg-gray-50"
                )}
                onClick={() => onModuleChange(module.id)}
              >
                <module.icon className="mr-3 h-4 w-4" />
                {module.label}
              </Button>
            </li>
          ))}
        </ul>
        
        <div className="px-4 mt-8 mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            TOOLS
          </h3>
        </div>
        
        <ul className="space-y-2 px-4">
          {tools.map((tool) => (
            <li key={tool.id}>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm font-medium text-gray-600 hover:bg-gray-50"
                onClick={() => {
                  // Handle tool actions
                  console.log(`${tool.id} clicked`);
                }}
              >
                <tool.icon className="mr-3 h-4 w-4" />
                {tool.label}
              </Button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
