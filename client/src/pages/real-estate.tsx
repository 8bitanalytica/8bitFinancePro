import RealEstateModule from "@/components/real-estate/real-estate-module";
import TopNavigation from "@/components/layout/top-navigation";

export default function RealEstatePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="p-6">
        <RealEstateModule />
      </div>
    </div>
  );
}