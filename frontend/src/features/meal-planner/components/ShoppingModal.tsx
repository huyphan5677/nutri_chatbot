import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { inventoryApi } from "@/features/inventory/api/inventoryApi";
import { useLocale } from "@/shared/i18n/LocaleContext";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  groceryApi,
  LotteBranch,
  ShoppingProductDTO,
  ShoppingResultDTO,
  ShoppingStrategy,
  WinmartStore,
} from "../api/groceryApi";
import { groceryMessages } from "../grocery.messages";

interface ShoppingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealPlanId: string;
  mealPlanName: string;
}

const STRATEGIES: {
  key: ShoppingStrategy;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
}[] = [
  {
    key: "lotte_priority",
    label: "Priority Lotte Mart",
    description:
      "First search in LotteMart, -> if not found, search in WinMart",
    icon: <Store className="h-5 w-5" />,
    color: "text-red-600",
    borderColor: "border-red-200 hover:border-red-400",
    bgColor: "bg-red-50",
  },
  {
    key: "winmart_priority",
    label: "Priority WinMart",
    description:
      "First search in WinMart, -> if not found, search in LotteMart",
    icon: <Store className="h-5 w-5" />,
    color: "text-green-600",
    borderColor: "border-green-200 hover:border-green-400",
    bgColor: "bg-green-50",
  },
  {
    key: "cost_optimized",
    label: "Cost Optimized",
    description:
      "Search both supermarkets and select the lowest price for each ingredient",
    icon: <DollarSign className="h-5 w-5" />,
    color: "text-blue-600",
    borderColor: "border-blue-200 hover:border-blue-400",
    bgColor: "bg-blue-50",
  },
];

type Step = "select_strategy" | "select_store" | "loading" | "results";

export default function ShoppingModal({
  isOpen,
  onClose,
  mealPlanId,
  mealPlanName,
}: ShoppingModalProps) {
  const { locale } = useLocale();
  const t = groceryMessages[locale].shoppingModal;

  const [step, setStep] = useState<Step>("select_strategy");
  const [selectedStrategy, setSelectedStrategy] =
    useState<ShoppingStrategy | null>(null);
  const [result, setResult] = useState<ShoppingResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable cart state
  const [editableItems, setEditableItems] = useState<ShoppingProductDTO[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState<number>(1);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState("");
  const [customNeeded, setCustomNeeded] = useState("");
  const [customFridge, setCustomFridge] = useState("");
  const [isSavingInventory, setIsSavingInventory] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync editableItems when result changes
  useEffect(() => {
    if (result?.items) {
      setEditableItems(result.items);
    }
  }, [result]);

  // Lotte store selection
  const [lotteBranches, setLotteBranches] = useState<LotteBranch[]>([]);
  const [selectedLotteBranch, setSelectedLotteBranch] = useState("nsg");

  // WinMart store selection
  const [winmartProvinces, setWinmartProvinces] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [winmartStores, setWinmartStores] = useState<WinmartStore[]>([]);
  const [selectedWinmartStore, setSelectedWinmartStore] =
    useState<WinmartStore | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);

  // Saved search params (captured at search time, used for URL building)
  const [usedLotteBranch, setUsedLotteBranch] = useState("nsg");
  const [usedWinmartStoreCode, setUsedWinmartStoreCode] = useState("1535");
  const [usedWinmartStoreGroupCode, setUsedWinmartStoreGroupCode] =
    useState("1998");

  const [pollingOrderId, setPollingOrderId] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load store data when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("select_strategy");
      setSelectedStrategy(null);
      setResult(null);
      setError(null);
      setPollingOrderId(null);

      // Load store data
      groceryApi.getLotteBranches().then(setLotteBranches).catch(console.error);
      groceryApi
        .getWinmartProvinces()
        .then(setWinmartProvinces)
        .catch(console.error);

      const checkExisting = async () => {
        try {
          const latest = await groceryApi.getLatestShoppingOrder(mealPlanId);
          if (latest) {
            if (latest.status === "completed" && latest.result_data) {
              setResult(latest.result_data);
              setStep("results");
            } else if (latest.status === "processing") {
              setPollingOrderId(latest.order_id);
              setStep("loading");
            }
          }
        } catch (e) {
          console.error("Failed to check existing shopping order", e);
        }
      };

      checkExisting();
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [isOpen, mealPlanId]);

  // Load WinMart stores when province changes
  useEffect(() => {
    if (!selectedProvince) {
      setWinmartStores([]);
      setSelectedWinmartStore(null);
      return;
    }
    setLoadingStores(true);
    groceryApi
      .getWinmartStores(selectedProvince)
      .then((stores) => {
        setWinmartStores(stores);
        setSelectedWinmartStore(stores.length > 0 ? stores[0] : null);
      })
      .catch(console.error)
      .finally(() => setLoadingStores(false));
  }, [selectedProvince]);

  const handleSelectStrategy = (strategy: ShoppingStrategy) => {
    setSelectedStrategy(strategy);
    setStep("select_store");
  };

  const needsLotteStore =
    selectedStrategy === "lotte_priority" ||
    selectedStrategy === "cost_optimized";
  const needsWinmartStore =
    selectedStrategy === "winmart_priority" ||
    selectedStrategy === "cost_optimized";

  const canSearch = () => {
    if (needsLotteStore && !selectedLotteBranch) return false;
    if (needsWinmartStore && !selectedWinmartStore) return false;
    return true;
  };

  const handleSearch = async () => {
    if (!selectedStrategy || !canSearch()) return;

    setStep("loading");
    setError(null);
    setResult(null);

    // Capture store params used for this search
    const lotteBranch = selectedLotteBranch;
    const wmStoreCode = selectedWinmartStore?.storeCode || "1535";
    const wmStoreGroupCode = selectedWinmartStore?.storeGroupCode || "1998";
    setUsedLotteBranch(lotteBranch);
    setUsedWinmartStoreCode(wmStoreCode);
    setUsedWinmartStoreGroupCode(wmStoreGroupCode);

    try {
      const data = await groceryApi.startShopping({
        meal_plan_id: mealPlanId,
        strategy: selectedStrategy,
        lotte_branch_id: lotteBranch,
        winmart_store_code: wmStoreCode,
        winmart_store_group_code: wmStoreGroupCode,
      });
      if (data.status === "completed") {
        const fastResult = await groceryApi.getShoppingOrder(data.order_id);
        if (fastResult.result_data) {
          setResult(fastResult.result_data);
          setStep("results");
        } else {
          setError(t.errors.noIngredients);
          setStep("select_store");
        }
      } else {
        setPollingOrderId(data.order_id);
      }
    } catch (err: any) {
      const message = err?.response?.data?.detail || t.errors.cannotStart;
      setError(message);
      setStep("select_store");
    }
  };

  // Polling Effect
  useEffect(() => {
    if (step === "loading" && pollingOrderId) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await groceryApi.getShoppingOrder(pollingOrderId);
          if (res.status === "completed") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setPollingOrderId(null);
            if (res.result_data) {
              setResult(res.result_data);
              setStep("results");
            } else {
              setError(t.errors.analyzeError);
              setStep("select_store");
            }
          } else if (res.status === "failed") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setPollingOrderId(null);
            setError(res.result_data?.summary || t.errors.serverError);
            setStep("select_store");
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 5000);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [step, pollingOrderId]);

  const handleClose = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setStep("select_strategy");
    setSelectedStrategy(null);
    setResult(null);
    setEditableItems([]);
    setEditingIndex(null);
    setError(null);
    setPollingOrderId(null);
    setIsSuccess(false);
    onClose();
  };

  const handleBack = () => {
    if (step === "select_store" || step === "results" || step === "loading") {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setPollingOrderId(null);
      setStep("select_strategy");
      setSelectedStrategy(null);
      setResult(null);
    }
  };

  const formatPrice = (price?: number | null) => {
    if (price == null) return "None";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Build correct product URL based on mart type and saved search params
  const buildProductUrl = (product: ShoppingProductDTO) => {
    const raw = product.product_url || "";
    if (product.source_mart === "Lotte") {
      // Lotte needs branch code: /vi_{branch}/product/...
      if (raw.includes("/product/")) {
        return raw.replace("/product/", `/vi_${usedLotteBranch}/product/`);
      }
      return raw;
    }
    if (product.source_mart === "Winmart") {
      // WinMart needs store params appended
      const sep = raw.includes("?") ? "&" : "?";
      return `${raw}${sep}storeCode=${usedWinmartStoreCode}&storeGroupCode=${usedWinmartStoreGroupCode}`;
    }
    return raw;
  };

  const handleDeleteItem = (index: number) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleStartEdit = (index: number, item: ShoppingProductDTO) => {
    setEditingIndex(index);
    setEditName(item.ingredient_name || item.product_name);
    setEditQty(item.buy_quantity ?? 1);
  };

  const handleSaveEdit = (index: number) => {
    setEditableItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, ingredient_name: editName, buy_quantity: editQty }
          : item,
      ),
    );
    setEditingIndex(null);
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const newItem: ShoppingProductDTO = {
      ingredient_name: customName.trim(),
      product_name: customName.trim(),
      buy_quantity: customQty,
      price: customPrice ? parseInt(customPrice.replace(/\D/g, ""), 10) : 0,
      stock: 100,
      product_url: "",
      source_mart: "Other",
      description: "Custom product",
      required_quantity: customNeeded.trim() || undefined,
      fridge_quantity: customFridge.trim() || undefined,
    };
    setEditableItems((prev) => [...prev, newItem]);
    setIsAddingCustom(false);
    setCustomName("");
    setCustomQty(1);
    setCustomPrice("");
    setCustomNeeded("");
    setCustomFridge("");
  };

  const handleSaveToInventory = async () => {
    if (editableItems.length === 0) return;
    setIsSavingInventory(true);
    try {
      const payloadItems = [];
      for (const item of editableItems) {
        let finalQty = "";
        const reqStr = item.required_quantity || item.quantity;
        const pkgStr = item.package_size;
        const buyQty = item.buy_quantity ?? 1;

        let leftoverVal: number | null = null;
        let unit = "";

        if (pkgStr && reqStr) {
          const pkgMatch = pkgStr.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/);
          const reqMatch = reqStr.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/);
          if (
            pkgMatch &&
            reqMatch &&
            pkgMatch[2].toLowerCase() === reqMatch[2].toLowerCase()
          ) {
            const pkgVal = parseFloat(pkgMatch[1]);
            const reqVal = parseFloat(reqMatch[1]);
            unit = pkgMatch[2];
            leftoverVal = pkgVal * buyQty - reqVal;
          }
        }

        if (leftoverVal !== null) {
          if (leftoverVal <= 0) {
            continue; // Used everything or more for the recipe, nothing left for fridge
          }
          finalQty = `${Number(leftoverVal.toFixed(2))}${unit}`;
        } else if (item.fridge_quantity) {
          const isZero = /^0\s*[a-zA-Z]*$/.test(item.fridge_quantity.trim());
          if (isZero) continue;
          finalQty = item.fridge_quantity;
        } else {
          // Fallback if units mismatch or couldn't parse
          const unitStr = pkgStr || reqStr;
          if (unitStr) {
            const match = unitStr.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/);
            if (match) {
              finalQty = `${parseFloat(match[1]) * buyQty}${match[2]}`;
            } else {
              finalQty = buyQty > 1 ? `${unitStr} (×${buyQty})` : unitStr;
            }
          } else {
            finalQty = String(buyQty);
          }
        }

        payloadItems.push({
          name: item.ingredient_name || item.product_name,
          quantity: finalQty,
          category: item.ingredient_name ? "Produce" : "Other",
        });
      }

      if (payloadItems.length === 0) {
        setIsSuccess(true);
        setTimeout(() => handleClose(), 2000);
        return;
      }

      await inventoryApi.bulkAddInventory({ items: payloadItems });
      setIsSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(t.errors.saveInventoryFail);
    } finally {
      setIsSavingInventory(false);
    }
  };

  const getLeftoverDisplay = (product: ShoppingProductDTO) => {
    const reqStr = product.required_quantity || product.quantity;
    const pkgStr = product.package_size;
    const buyQty = product.buy_quantity ?? 1;
    if (!pkgStr || !reqStr) return null;

    const pkgMatch = pkgStr.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/);
    const reqMatch = reqStr.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/);

    if (
      pkgMatch &&
      reqMatch &&
      pkgMatch[2].toLowerCase() === reqMatch[2].toLowerCase()
    ) {
      const pkgVal = parseFloat(pkgMatch[1]);
      const reqVal = parseFloat(reqMatch[1]);
      const unit = pkgMatch[2];
      const leftover = pkgVal * buyQty - reqVal;
      if (leftover > 0)
        return `${t.keepRefrigerator}: +${Number(leftover.toFixed(2))}${unit}`;
      return t.useItAllUp;
    }

    if (product.fridge_quantity) {
      const isZero = /^0\s*[a-zA-Z]*$/.test(product.fridge_quantity.trim());
      if (isZero) return t.useItAllUp;
      return `${t.keepRefrigerator}: +${product.fridge_quantity}`;
    }

    return null;
  };

  // Group results by source mart
  const groupedResults = editableItems.reduce(
    (acc, item, idx) => {
      const key = item.source_mart || "Khác";
      if (!acc[key]) acc[key] = [];
      acc[key].push({ ...item, _originalIndex: idx });
      return acc;
    },
    {} as Record<string, (ShoppingProductDTO & { _originalIndex: number })[]>,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-2xl p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-orange-50 to-rose-50 dark:from-primary/20 dark:via-slate-800 dark:to-slate-800 px-6 py-4 border-b border-gray-100 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t.title}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {mealPlanName}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Select Strategy */}
        {step === "select_strategy" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t.selectStrategy}
            </p>
            {STRATEGIES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => handleSelectStrategy(s.key)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${s.borderColor} hover:shadow-md group`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 p-2 rounded-lg ${s.bgColor} dark:bg-slate-800 ${s.color} transition-colors`}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <div
                      className={`font-semibold text-gray-900 dark:text-white text-sm`}
                    >
                      {t.strategies[s.key]?.label || s.label}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t.strategies[s.key]?.description || s.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Select Store */}
        {step === "select_store" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
            >
              ← {t.changeStrategy}
            </button>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {t.strategyLabel}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {selectedStrategy && t.strategies[selectedStrategy]?.label}
                </span>
              </div>
            </div>

            {/* Lotte Branch Picker */}
            {needsLotteStore && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Store className="inline h-4 w-4 mr-1 text-red-500" />
                  {t.lotteBranch}
                </label>
                <div className="relative">
                  <select
                    value={selectedLotteBranch}
                    onChange={(e) => setSelectedLotteBranch(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/40 focus:border-red-400 transition-all text-sm appearance-none pr-10 text-gray-900 dark:text-white"
                  >
                    {lotteBranches.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* WinMart Store Picker */}
            {needsWinmartStore && (
              <div className="space-y-3">
                {/* Province picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1 text-green-500" />
                    {t.winmartProvince}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/40 focus:border-green-400 transition-all text-sm appearance-none pr-10 text-gray-900 dark:text-white"
                    >
                      <option value="" className="dark:bg-slate-800">
                        {t.selectProvince}
                      </option>
                      {winmartProvinces.map((p) => (
                        <option key={p} value={p} className="dark:bg-slate-800">
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Store picker (after province is selected) */}
                {selectedProvince && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Store className="inline h-4 w-4 mr-1 text-green-500" />
                      {t.winmartStore}
                    </label>
                    {loadingStores ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.loadingStores}
                      </div>
                    ) : winmartStores.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">
                        {t.noStoresFound}
                      </p>
                    ) : (
                      <div className="relative">
                        <select
                          value={selectedWinmartStore?.storeCode || ""}
                          onChange={(e) => {
                            const store = winmartStores.find(
                              (s) => s.storeCode === e.target.value,
                            );
                            setSelectedWinmartStore(store || null);
                          }}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/40 focus:border-green-400 transition-all text-sm appearance-none pr-10 text-gray-900 dark:text-white"
                        >
                          {winmartStores.map((s) => (
                            <option
                              key={s.storeCode}
                              value={s.storeCode}
                              className="dark:bg-slate-800"
                            >
                              {s.storeName} ({s.districtTitle})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSearch}
              disabled={!canSearch()}
              className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Search className="h-4 w-4" />
              {t.searchProducts}
            </button>
          </div>
        )}

        {/* Step 3: Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t.searchingProducts}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs mb-4">
              {t.searchingDescription}
            </p>
            <button
              onClick={handleBack}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              {t.cancelSearch}
            </button>
          </div>
        )}

        {/* Step 4: Results */}
        {step === "results" && result && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
            >
              ← {t.searchAgain}
            </button>

            {/* Summary Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-orange-50 border border-primary/10 dark:from-slate-800 dark:to-slate-800/80 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t.resultSummary(
                      result.items.length,
                      result.items.length +
                        result.fridge_covered.length +
                        result.not_found.length,
                      result.fridge_covered.length,
                      result.total_estimated_cost,
                      result.not_found.length,
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t.strategyLabel}{" "}
                    {t.strategies[result.strategy as ShoppingStrategy]?.label ||
                      result.strategy}
                  </p>
                </div>
                {result.total_estimated_cost > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t.totalEstimated}
                    </p>
                    <p className="text-lg font-bold text-primary dark:text-rose-400">
                      {formatPrice(result.total_estimated_cost)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Fridge covered items */}
            {result.fridge_covered && result.fridge_covered.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/10 shadow-sm transition-all hover:shadow-md">
                <div className="bg-emerald-50/80 dark:bg-emerald-900/20 px-4 py-2.5 border-b border-emerald-100/50 dark:border-emerald-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-tight">
                      {t.deductedFromFridge}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full shadow-sm border border-emerald-100/30 dark:border-emerald-900/40">
                    {t.itemsSaved(result.fridge_covered.length)}
                  </span>
                </div>
                <div className="p-1 space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                  {result.fridge_covered.map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/60 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-1 w-1 rounded-full bg-emerald-400" />
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-500">
                            {t.inventory}: {item.fridge_quantity}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-gray-400 line-through block">
                          {t.need}: {item.required_quantity}
                        </span>
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
                          {t.alreadyHad}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save to Fridge Section */}
            {isSuccess ? (
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 flex items-center gap-3 text-green-700 dark:text-green-400 mt-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">{t.savedSuccess}</span>
              </div>
            ) : (
              <div className="flex gap-3 mt-4 mb-2">
                <Button
                  onClick={handleSaveToInventory}
                  disabled={isSavingInventory || editableItems.length === 0}
                  className="flex-1 shadow-md py-6 text-base"
                >
                  {isSavingInventory ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <ShoppingCart className="h-5 w-5 mr-2" />
                  )}
                  {t.confirmAndSave}
                </Button>
              </div>
            )}

            {/* Product List grouped by source */}
            {groupedResults && (
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {Object.entries(groupedResults).map(([mart, products]) => (
                  <div
                    key={mart}
                    className="rounded-xl border border-gray-100 overflow-hidden dark:border-slate-700/50"
                  >
                    <div
                      className={`px-4 py-2 border-b border-gray-100 flex items-center gap-2 dark:border-slate-700/30 ${
                        mart === "Lotte"
                          ? "bg-red-50 dark:bg-red-900/20"
                          : "bg-green-50 dark:bg-green-900/20"
                      }`}
                    >
                      <Store
                        className={`h-4 w-4 ${mart === "Lotte" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        {mart === "Lotte" ? "Lotte Mart" : "WinMart"}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                        {t.productsCount(products.length)}
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-50 dark:divide-slate-700/30">
                      {products.map((product) => {
                        const idx = product._originalIndex;
                        const isEditing = editingIndex === idx;
                        const buyQty = product.buy_quantity ?? 1;
                        const unitPrice = product.price ?? 0;
                        const totalPrice = unitPrice * buyQty;
                        const neededQty =
                          product.required_quantity || product.quantity || "";

                        return (
                          <li
                            key={idx}
                            className="px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 group/item relative"
                          >
                            {isEditing ? (
                              <div className="flex flex-col gap-3 w-full">
                                <div className="flex items-center gap-3 w-full">
                                  <div className="flex-1">
                                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 block uppercase tracking-wider">
                                      {t.displayName}
                                    </label>
                                    <input
                                      className="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 flex-1 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all dark:bg-slate-800 dark:text-white"
                                      value={editName}
                                      onChange={(e) =>
                                        setEditName(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="w-20 shrink-0">
                                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 block uppercase tracking-wider">
                                      {t.quantity}
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      className="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-center dark:bg-slate-800 dark:text-white"
                                      value={editQty}
                                      onChange={(e) =>
                                        setEditQty(
                                          parseInt(e.target.value) || 1,
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="secondary"
                                    onClick={() => setEditingIndex(null)}
                                    className="h-8"
                                  >
                                    {t.cancel}
                                  </Button>
                                  <Button
                                    onClick={() => handleSaveEdit(idx)}
                                    className="h-8 text-xs px-3"
                                  >
                                    {t.save}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row gap-4 w-full">
                                {/* Left: Details */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
                                  <div className="flex items-start justify-between gap-3">
                                    <a
                                      href={buildProductUrl(product)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-primary transition-colors flex items-start gap-1.5 group/link flex-1 line-clamp-2 leading-snug tracking-tight"
                                    >
                                      {product.product_name}
                                      <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400 group-hover/link:text-primary transition-colors" />
                                    </a>
                                    {/* Mobile Total Price */}
                                    <div className="sm:hidden text-right shrink-0 mt-0.5">
                                      {product.price ? (
                                        <p className="text-[15px] font-bold text-primary">
                                          {formatPrice(totalPrice)}
                                        </p>
                                      ) : (
                                        <span className="text-sm font-bold text-gray-400">
                                          Contact
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className="inline-flex items-center text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 px-2 py-1.5 rounded-md max-w-full sm:max-w-[220px]"
                                      title={product.ingredient_name}
                                    >
                                      <span className="font-medium mr-1 text-gray-400 shrink-0">
                                        {t.forLabel}
                                      </span>
                                      <span className="truncate">
                                        {product.ingredient_name}
                                      </span>
                                    </span>

                                    {product.original_quantity && (
                                      <span
                                        className="text-[10px] px-2 py-1.5 rounded-md bg-gray-50 text-gray-400 font-medium shrink-0 line-through decoration-gray-300"
                                        title="Original recipe quantity"
                                      >
                                        {t.original}:{" "}
                                        {product.original_quantity}
                                      </span>
                                    )}

                                    {neededQty && (
                                      <span
                                        className={`text-xs px-2 py-1.5 rounded-md font-semibold shrink-0 ${
                                          product.fridge_deducted
                                            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shadow-sm"
                                            : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                        }`}
                                        title={
                                          product.fridge_deducted
                                            ? "Quantity after fridge deduction"
                                            : "Required quantity for the recipe"
                                        }
                                      >
                                        {product.fridge_deducted
                                          ? `${t.searchQuantity}: ${neededQty}`
                                          : `${t.need}: ${neededQty}`}
                                      </span>
                                    )}

                                    {product.fridge_deducted && (
                                      <span className="text-[10px] px-2 py-1.5 rounded-md bg-emerald-500/10 text-emerald-800 font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-500/10 shadow-sm">
                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                        {t.saved} {product.fridge_deducted}
                                      </span>
                                    )}
                                    <span
                                      className="text-xs px-2 py-1.5 rounded-md bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-semibold shrink-0 shadow-sm border border-orange-100/50 dark:border-orange-900/40"
                                      title="Number of products to buy from the supermarket"
                                    >
                                      {t.buy}: ×{buyQty}
                                    </span>
                                  </div>

                                  {getLeftoverDisplay(product) && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${getLeftoverDisplay(product)?.includes("+") ? "bg-green-500" : "bg-gray-300 dark:bg-slate-700"}`}
                                      />
                                      <p
                                        className={`text-xs font-medium ${getLeftoverDisplay(product)?.includes("+") ? "text-green-700 dark:text-green-500" : "text-gray-500 dark:text-gray-400"}`}
                                      >
                                        {getLeftoverDisplay(product)}
                                      </p>
                                    </div>
                                  )}

                                  {product.description && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 italic mt-0.5">
                                      {product.description}
                                    </p>
                                  )}
                                </div>

                                {/* Right: Price & Actions */}
                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start shrink-0 gap-3 border-t sm:border-0 border-gray-100 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                  {/* Desktop Price */}
                                  <div className="hidden sm:block text-right">
                                    {product.price ? (
                                      <>
                                        <p className="text-[15px] font-bold text-primary">
                                          {formatPrice(totalPrice)}
                                        </p>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-medium bg-gray-50 dark:bg-slate-700 inline-block px-1.5 py-0.5 rounded">
                                          {formatPrice(unitPrice)} {t.perItem}
                                        </p>
                                      </>
                                    ) : (
                                      <span className="text-sm font-bold text-gray-400">
                                        {t.contact}
                                      </span>
                                    )}
                                  </div>

                                  {/* Mobile Unit Price */}
                                  <div className="sm:hidden text-[11px] text-gray-500 font-medium bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                                    {product.price
                                      ? `${formatPrice(unitPrice)} ${t.perItem}`
                                      : ""}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1.5 sm:opacity-0 group-hover/item:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <button
                                      onClick={() =>
                                        handleStartEdit(idx, product)
                                      }
                                      className="px-2 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 rounded-md transition-colors flex items-center justify-center gap-1.5 text-xs font-medium border border-transparent hover:border-blue-100 dark:hover:border-blue-900/40"
                                      title="Edit item"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      <span className="sm:hidden">
                                        {t.edit}
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(idx)}
                                      className="px-2 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 rounded-md transition-colors flex items-center justify-center gap-1.5 text-xs font-medium border border-transparent hover:border-red-100 dark:hover:border-red-900/40"
                                      title="Remove item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span className="sm:hidden">
                                        {t.remove}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Add Custom Item */}
            {isAddingCustom ? (
              <div className="p-5 rounded-xl border border-primary/20 dark:border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-sm mt-4 mx-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1.5 block">
                      {t.addCustom.productName}
                    </label>
                    <input
                      className="w-full text-sm border-0 ring-1 ring-gray-200 dark:ring-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary shadow-sm outline-none transition-all dark:bg-slate-800 dark:text-white"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={t.addCustom.productNamePlaceholder}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1.5 block">
                      {t.addCustom.price}
                    </label>
                    <input
                      type="text"
                      className="w-full text-sm border-0 ring-1 ring-gray-200 dark:ring-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary shadow-sm outline-none transition-all dark:bg-slate-800 dark:text-white"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="e.g. 50000"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1.5 block">
                      {t.addCustom.buyQuantity}
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full text-sm border-0 ring-1 ring-gray-200 dark:ring-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary shadow-sm outline-none transition-all dark:bg-slate-800 dark:text-white"
                      value={customQty}
                      onChange={(e) =>
                        setCustomQty(parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1.5 block">
                      {t.addCustom.neededForRecipe}
                    </label>
                    <input
                      type="text"
                      className="w-full text-sm border-0 ring-1 ring-gray-200 dark:ring-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary shadow-sm outline-none transition-all dark:bg-slate-800 dark:text-white"
                      value={customNeeded}
                      onChange={(e) => setCustomNeeded(e.target.value)}
                      placeholder={t.addCustom.neededForRecipePlaceholder}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1.5 block">
                      {t.addCustom.keepInFridge}
                    </label>
                    <input
                      type="text"
                      className="w-full text-sm border-0 ring-1 ring-gray-200 dark:ring-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary shadow-sm outline-none transition-all dark:bg-slate-800 dark:text-white"
                      value={customFridge}
                      onChange={(e) => setCustomFridge(e.target.value)}
                      placeholder={t.addCustom.keepInFridgePlaceholder}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-3 border-t border-primary/10">
                  <Button
                    variant="ghost"
                    onClick={() => setIsAddingCustom(false)}
                    className="text-gray-500 hover:text-gray-700 text-xs px-3 py-1.5 h-auto"
                  >
                    {t.cancel}
                  </Button>
                  <Button
                    onClick={handleAddCustom}
                    disabled={!customName.trim()}
                    className="shadow-sm text-xs px-3 py-1.5 h-auto"
                  >
                    {t.addCustom.addToCart}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingCustom(true)}
                className="w-full py-3.5 mt-4 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-primary hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all flex items-center justify-center gap-2 group mx-1"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />{" "}
                {t.addCustom.addProduct}
              </button>
            )}

            {/* Not found items */}
            {result.not_found.length > 0 && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 mt-6 dark:bg-amber-900/10 dark:border-amber-900/30">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                    {t.notFound(result.not_found.length)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.not_found.map((name) => (
                    <span
                      key={name}
                      className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
