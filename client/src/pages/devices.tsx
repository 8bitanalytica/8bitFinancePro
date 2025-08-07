import DeviceFinances from "@/components/devices/device-finances";
import TopNavigation from "@/components/layout/top-navigation";

export default function DevicesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <DeviceFinances />
    </div>
  );
}