import { profileMessages } from "@/features/profile/profile.messages";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { getApiUrl } from "@/shared/api/client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  CreditCard,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ShoppingHistoryItem {
  id: string;
  date: string;
  items_count: number;
  cost: number;
  currency: string;
  status: string;
}

interface ShoppingHistoryData {
  total_trips: number;
  total_spent: number;
  avg_items: number;
  avg_cost: number;
  history: ShoppingHistoryItem[];
}

interface ShoppingProductDTO {
  product_name: string;
  ingredient_name: string;
  buy_quantity?: number;
  price?: number;
  source_mart?: string;
}

interface FridgeCoveredDTO {
  name: string;
  fridge_quantity?: string;
  required_quantity?: string;
}

interface ShoppingResultDTO {
  items: ShoppingProductDTO[];
  fridge_covered: FridgeCoveredDTO[];
  not_found?: string[];
  total_estimated_cost: number;
  strategy: string;
  summary: string;
}

export default function ShoppingListHistoryPage() {
  const { locale } = useLocale();
  const text = profileMessages[locale].shoppingHistory;

  const [data, setData] = useState<ShoppingHistoryData>({
    total_trips: 0,
    total_spent: 0,
    avg_items: 0,
    avg_cost: 0,
    history: [],
  });
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<ShoppingResultDTO | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem("nutri_token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${getApiUrl()}/grocery/shopping/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setData(await response.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatCurrency = (amount: number, currency: string = "VND") => {
    return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getStatusText = (status: string) => {
    if (status.toLowerCase() === "completed") return text.completed;
    return status.toUpperCase();
  };

  const handleViewDetails = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsLoading(true);
    try {
      const token = localStorage.getItem("nutri_token");
      const response = await fetch(`${getApiUrl()}/grocery/shopping/order/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOrderDetails(data.result_data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const generateSummaryText = (details: ShoppingResultDTO) => {
    if (!text.modal?.summaryText) return details.summary;
    const costStr = details.total_estimated_cost > 0 ? formatCurrency(details.total_estimated_cost) : "";
    return text.modal.summaryText(
      details.items?.length || 0,
      details.fridge_covered?.length || 0,
      costStr,
      details.not_found?.length || 0
    );
  };

  return (
    <div className="flex flex-col gap-8 md:gap-12 max-w-4xl relative">
      {/* Trip Details Modal */}
      <Modal isOpen={!!selectedOrderId} onClose={() => { setSelectedOrderId(null); setOrderDetails(null); }} className="max-w-2xl px-0 pb-0">
        <div className="bg-gradient-to-r from-primary/10 via-orange-50 to-rose-50 dark:from-primary/20 dark:via-slate-900 dark:to-slate-900 px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-50">{text.modal?.title || "Trip Details"}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{text.modal?.orderId || "Order #"}{selectedOrderId?.split('-')[0]}</p>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {detailsLoading ? (
            <div className="flex justify-center py-12">
               <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
          ) : orderDetails ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800 gap-4">
                 <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-50">{generateSummaryText(orderDetails)}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{text.modal?.strategy || "Strategy"}: <span className="font-medium text-gray-700 dark:text-slate-300">{text.modal?.strategyMap?.[orderDetails.strategy] || orderDetails.strategy}</span></p>
                 </div>
                 <div className="text-left sm:text-right">
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{text.modal?.totalCost || "Total Cost"}</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(orderDetails.total_estimated_cost)}</p>
                 </div>
              </div>

              {orderDetails.items && orderDetails.items.length > 0 && (
                <div>
                   <h4 className="font-bold text-gray-900 dark:text-slate-50 mb-3 flex items-center gap-2">
                     <ShoppingBag className="w-4 h-4 text-primary" /> {text.modal?.purchasedItems || "Purchased Items"} ({orderDetails.items.length})
                   </h4>
                   <div className="space-y-2">
                      {orderDetails.items.map((item, idx) => (
                         <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-gray-100/50 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors shadow-sm">
                            <div className="flex flex-col min-w-0 pr-4">
                               <p className="font-bold text-sm text-gray-800 dark:text-slate-100 truncate">{item.product_name}</p>
                               <div className="flex items-center gap-1.5 mt-0.5">
                                 <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">x{item.buy_quantity || 1}</span>
                                 <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                                 <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm">{item.source_mart}</span>
                               </div>
                            </div>
                            <p className="font-bold text-sm text-gray-900 dark:text-slate-50 shrink-0">{formatCurrency(item.price || 0)}</p>
                         </div>
                      ))}
                   </div>
                </div>
              )}

              {orderDetails.fridge_covered && orderDetails.fridge_covered.length > 0 && (
                <div>
                   <h4 className="font-bold text-gray-900 dark:text-slate-100 mt-6 mb-3 flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {text.modal?.usedFromFridge || "Used from Fridge"} ({orderDetails.fridge_covered.length})
                   </h4>
                   <div className="space-y-2">
                      {orderDetails.fridge_covered.map((item, idx) => (
                         <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                            <div>
                               <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-400">{item.name}</p>
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full shadow-sm border border-emerald-100/50 dark:border-emerald-500/20">
                               {text.modal?.deducted || "DEDUCTED"}
                            </span>
                         </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-slate-400 py-12">{text.modal?.noData || "No detailed data available for this trip."}</div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 flex justify-end rounded-b-2xl">
           <Button variant="secondary" onClick={() => { setSelectedOrderId(null); setOrderDetails(null); }}>{text.modal?.close || "Close"}</Button>
        </div>
      </Modal>


      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-50 mb-2">
          {text.title}
        </h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm md:text-base mb-8">
          {text.subtitle}
        </p>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: text.totalTrips, value: loading ? "-" : data.total_trips },
            { label: text.totalSpent, value: loading ? "-" : formatCurrency(data.total_spent) },
            { label: text.avgItems, value: loading ? "-" : data.avg_items },
            { label: text.avgCost, value: loading ? "-" : formatCurrency(data.avg_cost) },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-center backdrop-blur-sm">
              <h4 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                {stat.label}
              </h4>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* History List */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-slate-100">{text.recentTrips}</h3>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-800 min-h-[200px] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
              </div>
            ) : data.history.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-slate-400 font-medium">
                No past trips to display.
              </div>
            ) : (
              data.history.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => handleViewDetails(trip.id)}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer border-b border-gray-100 dark:border-slate-800 last:border-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-gray-900 dark:text-slate-50">
                            {trip.date 
                              ? new Date(trip.date).toLocaleDateString(
                                  locale === "vi" ? "vi-VN" : "en-US",
                                  { weekday: "long", month: "short", day: "numeric" },
                                )
                              : "Unknown Date"}
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              trip.status === "completed"
                                ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                                : trip.status === "processing"
                                ? "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400"
                            }`}
                          >
                            {getStatusText(trip.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                          <span className="flex items-center gap-1.5 font-medium">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            {text.itemsCount(trip.items_count)}
                          </span>
                          <span className="flex items-center gap-1.5 font-medium">
                            <CreditCard className="w-3.5 h-3.5" />
                            {formatCurrency(trip.cost, trip.currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                      <button 
                        className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary text-gray-700 dark:text-slate-300 font-bold rounded-lg transition-colors text-sm shadow-sm"
                      >
                        {text.viewDetails}
                      </button>
                      <button className="p-2 text-gray-400 group-hover:text-primary transition-colors bg-gray-50 dark:bg-slate-800 rounded-lg group-hover:bg-primary/5">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {data.history.length >= 10 && (
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 text-center">
              <button className="text-sm font-bold text-gray-500 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-1 mx-auto">
                {text.viewOlderTrips} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
