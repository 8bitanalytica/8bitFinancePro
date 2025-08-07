import Settings from "@/components/settings/settings";
import TopNavigation from "@/components/layout/top-navigation";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto p-6">
        <Settings />
      </div>
    </div>
  );
}