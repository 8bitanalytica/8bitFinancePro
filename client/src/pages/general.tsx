import GeneralFinances from "@/components/general/general-finances";
import TopNavigation from "@/components/layout/top-navigation";

export default function GeneralPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <GeneralFinances />
    </div>
  );
}