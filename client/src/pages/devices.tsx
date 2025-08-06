import DeviceManagement from "@/components/devices/device-management";
import TopNavigation from "@/components/layout/top-navigation";

export default function DevicesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="p-6">
        <DeviceManagement />
      </div>
    </div>
  );
}