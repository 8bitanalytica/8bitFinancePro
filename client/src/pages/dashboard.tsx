import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import GeneralFinances from "@/components/general/general-finances";
import RealEstateModule from "@/components/real-estate/real-estate-module";
import DeviceManagement from "@/components/devices/device-management";
import Settings from "@/components/settings/settings";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

type Module = "general" | "real-estate" | "devices" | "settings";

export default function Dashboard() {
  const [activeModule, setActiveModule] = useState<Module>("general");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />
      
      <main className="flex-1 lg:ml-0">
        {isMobile && (
          <header className="lg:hidden surface border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="text-gray-600 hover:text-primary"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold text-primary">Financial Manager</h1>
              <div className="w-6"></div>
            </div>
          </header>
        )}

        {activeModule === "general" && <GeneralFinances />}
        {activeModule === "real-estate" && <RealEstateModule />}
        {activeModule === "devices" && <DeviceManagement />}
        {activeModule === "settings" && <Settings />}
      </main>

      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
