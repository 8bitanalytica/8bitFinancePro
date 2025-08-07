import RealEstateFinances from "@/components/real-estate/real-estate-finances";
import TopNavigation from "@/components/layout/top-navigation";

export default function RealEstatePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <RealEstateFinances />
    </div>
  );
}