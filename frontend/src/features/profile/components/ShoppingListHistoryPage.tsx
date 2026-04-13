import { profileMessages } from "@/features/profile/profile.messages";
import { useLocale } from "@/shared/i18n/LocaleContext";
import {
  ArrowRight,
  ChevronRight,
  CreditCard,
  Receipt,
  ShoppingBag,
} from "lucide-react";

export default function ShoppingListHistoryPage() {
  const { locale } = useLocale();
  const text = profileMessages[locale].shoppingHistory;

  // Mock data for display
  const history = [
    {
      id: 1,
      date: "2023-11-05",
      items: 24,
      cost: "$84.50",
      status: text.completed,
    },
    {
      id: 2,
      date: "2023-10-28",
      items: 15,
      cost: "$45.20",
      status: text.completed,
    },
    {
      id: 3,
      date: "2023-10-21",
      items: 32,
      cost: "$112.80",
      status: text.completed,
    },
  ];

  return (
    <div className="flex flex-col gap-8 md:gap-12 max-w-4xl">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
          {text.title}
        </h2>
        <p className="text-gray-500 text-sm md:text-base mb-8">
          {text.subtitle}
        </p>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              {text.totalTrips}
            </h4>
            <p className="text-2xl font-bold text-gray-900">42</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              {text.totalSpent}
            </h4>
            <p className="text-2xl font-bold text-gray-900">$1,420</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              {text.avgItems}
            </h4>
            <p className="text-2xl font-bold text-gray-900">22</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              {text.avgCost}
            </h4>
            <p className="text-2xl font-bold text-gray-900">$64</p>
          </div>
        </div>

        {/* History List */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">{text.recentTrips}</h3>
          </div>

          <div className="divide-y divide-gray-100">
            {history.map((trip) => (
              <div
                key={trip.id}
                className="p-6 hover:bg-gray-50 transition-colors group cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900">
                          {new Date(trip.date).toLocaleDateString(
                            locale === "vi" ? "vi-VN" : "en-US",
                            {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          },
                          )}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                          {trip.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          {text.itemsCount(trip.items)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5" />
                          {trip.cost}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <button className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 hover:border-primary hover:text-primary text-gray-700 font-medium rounded-lg transition-colors text-sm">
                      {text.viewDetails}
                    </button>
                    <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100 text-center">
            <button className="text-sm font-medium text-gray-500 hover:text-primary transition-colors flex items-center gap-1 mx-auto">
              {text.viewOlderTrips} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
