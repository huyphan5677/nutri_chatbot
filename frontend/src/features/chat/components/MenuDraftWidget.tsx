import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Flame,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { menuDraftApi } from "../api/menuDraftApi";
import { MealPlanDraft } from "../types/chat";
import {
  buildMenuSummary,
  DraftDay,
  DraftMeal,
  MenuDraftState,
  parseDraftPayload,
} from "../types/menuDraft";

const QUICK_SUGGESTIONS = [
  {
    label: "🎲 Ngẫu nhiên",
    prompt: "Một món ngẫu nhiên nhưng vẫn cân bằng dinh dưỡng",
  },
  { label: "🍲 Món Canh", prompt: "Một món canh thanh mát, ít dầu mỡ" },
  { label: "🥗 Món Chay", prompt: "Một món chay giàu protein thực vật" },
  { label: "🐟 Món Cá", prompt: "Một món cá healthy, tốt cho sức khỏe" },
  { label: "🥩 Ít Kcal", prompt: "Một món thay thế có lượng calo thấp hơn" },
];

const MEAL_TYPE_LABELS: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  breakfast: {
    label: "Bữa Sáng",
    icon: "🌅",
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  lunch: {
    label: "Bữa Trưa",
    icon: "🌤️",
    color: "text-sky-600 bg-sky-50 border-sky-200",
  },
  dinner: {
    label: "Bữa Tối",
    icon: "🌙",
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
  snack: {
    label: "Bữa Phụ",
    icon: "🍎",
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
};

function ShimmerLoader() {
  const [deciseconds, setDeciseconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDeciseconds((s) => s + 1);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-white p-5 shadow-sm">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-primary/5 to-transparent border-t-2 border-primary/50" />
      <div className="flex items-center gap-3 mb-4">
        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        <span className="text-sm font-semibold text-primary/80">
          Đang thiết kế món mới... {(deciseconds / 10).toFixed(1)}s
        </span>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-100 rounded-md w-3/4 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded-md w-1/2 animate-pulse" />
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-50">
          <div className="h-8 bg-gray-100 rounded-lg w-16 animate-pulse" />
          <div className="h-8 bg-gray-100 rounded-lg w-16 animate-pulse" />
          <div className="h-8 bg-gray-100 rounded-lg w-16 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function AIPromptPanel({
  title,
  onSubmit,
  onCancel,
  isLoading,
}: {
  title: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim() && !isLoading) return;
    onSubmit(text.trim());
  };

  return (
    <div className="relative overflow-hidden border border-primary/30 rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-white to-primary/[0.03] shadow-md animate-in fade-in slide-in-from-top-2 duration-300 z-10 my-2">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/40 via-primary to-primary/40"></div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-gray-800">{title}</span>
        </div>
        <button
          onClick={onCancel}
          className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative flex items-center">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Yêu cầu cụ thể (VD: Đổi thành món ít tinh bột hơn)..."
          disabled={isLoading}
          className="w-full text-sm py-3 pl-4 pr-12 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 disabled:opacity-60 transition-all shadow-sm placeholder:text-gray-400"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading}
          className="absolute right-2 p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:bg-gray-300 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {QUICK_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              setText(s.prompt);
              onSubmit(s.prompt);
            }}
            disabled={isLoading}
            className="text-[11px] sm:text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50 shadow-sm"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MealDetailPanel({ meal }: { meal: DraftMeal }) {
  return (
    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-gray-100 bg-gray-50/50 animate-in fade-in slide-in-from-top-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Ingredients */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            <ShoppingCart className="w-4 h-4 text-primary" /> Nguyên liệu
          </h4>
          <ul className="space-y-2">
            {(meal.ingredients || []).map((ing, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-gray-600"
              >
                <span className="text-primary mt-1">•</span>
                <span className="leading-relaxed">{ing}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            <ChefHat className="w-4 h-4 text-primary" /> Hướng dẫn
          </h4>
          {meal.instructions && meal.instructions.length > 0 ? (
            <ol className="space-y-3">
              {meal.instructions.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-sm text-gray-600"
                >
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-500 italic">
              Chưa có hướng dẫn chi tiết.
            </p>
          )}
        </div>
      </div>

      {meal.adjustment_tips && meal.adjustment_tips.length > 0 && (
        <div className="mt-5 p-3 sm:p-4 rounded-xl bg-amber-50/50 border border-amber-100">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
            <Info className="w-4 h-4" /> Mẹo điều chỉnh
          </h4>
          <ul className="space-y-1.5">
            {meal.adjustment_tips.map((tip, idx) => (
              <li
                key={idx}
                className="text-xs sm:text-sm text-amber-800 leading-relaxed"
              >
                • {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MealCard({
  meal,
  onSwap,
  onRemove,
  isSwapping,
  isSaved,
}: {
  meal: DraftMeal;
  onSwap: () => void;
  onRemove: () => void;
  isSwapping: boolean;
  isSaved: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (meal.isLoading) {
    return <ShimmerLoader />;
  }

  const typeInfo = MEAL_TYPE_LABELS[meal.meal_type] || {
    label: "Bữa ăn",
    icon: "🍽️",
    color: "text-gray-600 bg-gray-50 border-gray-200",
  };
  const totalTime =
    (meal.prep_time_minutes || 0) + (meal.cook_time_minutes || 0);

  return (
    <div
      className={`relative group bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? "border-primary/30 shadow-md" : "border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20"}`}
    >
      <div className="p-4 sm:p-5">
        {/* Header: Type & Badges */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${typeInfo.color}`}
            >
              <span>{typeInfo.icon}</span> {typeInfo.label}
            </span>
            {totalTime > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                <Clock className="w-3 h-3" /> {totalTime} phút
              </span>
            )}
            {meal.dietary_tags &&
              meal.dietary_tags.slice(0, 2).map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md"
                >
                  {tag}
                </span>
              ))}
          </div>

          {!isSaved && (
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                onClick={onSwap}
                disabled={isSwapping}
                title="Đổi món"
                className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors tooltip group relative"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onRemove}
                title="Xóa món"
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors tooltip group relative"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[17px] sm:text-[19px] font-bold text-gray-900 leading-tight mb-2 pr-10">
          {meal.name}
        </h3>

        {/* Rationale / Description */}
        <p
          className={`text-sm text-gray-500 mb-4 leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}
        >
          {meal.why ||
            meal.description ||
            "Một lựa chọn tuyệt vời cho thực đơn của bạn."}
        </p>

        {/* Macros */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex flex-col">
              <span className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <Flame className="w-3 h-3 text-orange-400" /> Kcal
              </span>
              <span className="text-[15px] font-bold text-gray-800">
                {meal.calories}
              </span>
            </div>
            <div className="h-7 w-[1px] bg-gray-100"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Protein
              </span>
              <span className="text-[15px] font-bold text-blue-600">
                {meal.protein_grams}g
              </span>
            </div>
            <div className="h-7 w-[1px] bg-gray-100"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Carbs
              </span>
              <span className="text-[15px] font-bold text-amber-600">
                {meal.carbs_grams}g
              </span>
            </div>
            <div className="h-7 w-[1px] bg-gray-100"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Fat
              </span>
              <span className="text-[15px] font-bold text-emerald-600">
                {meal.fat_grams}g
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors bg-primary/5 px-3 py-1.5 rounded-full"
          >
            {isExpanded ? (
              <>
                Thu gọn <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Chi tiết <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>

      {isExpanded && <MealDetailPanel meal={meal} />}
    </div>
  );
}

function DaySection({
  day,
  isSaved,
  onSwapMeal,
  onRemoveMeal,
  onAddMeal,
  activeSwapId,
  activeAddSlot,
  onOpenSwap,
  onCloseSwap,
  onOpenAdd,
  onCloseAdd,
  swapLoading,
  addLoading,
}: {
  day: DraftDay;
  isSaved: boolean;
  onSwapMeal: (
    dayNum: number,
    mealId: string,
    meal: DraftMeal,
    prompt: string,
  ) => void;
  onRemoveMeal: (dayNum: number, mealId: string) => void;
  onAddMeal: (dayNum: number, mealType: string, prompt: string) => void;
  activeSwapId: string | null;
  activeAddSlot: { day: number; meal_type: string } | null;
  onOpenSwap: (mealId: string) => void;
  onCloseSwap: () => void;
  onOpenAdd: (day: number, mealType: string) => void;
  onCloseAdd: () => void;
  swapLoading: boolean;
  addLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Group meals
  const mealsByType: Record<string, DraftMeal[]> = {};
  day.meals.forEach((m) => {
    if (!mealsByType[m.meal_type]) mealsByType[m.meal_type] = [];
    mealsByType[m.meal_type].push(m);
  });

  const typeOrder = ["breakfast", "lunch", "dinner", "snack"];
  const sortedTypes = Object.keys(mealsByType).sort(
    (a, b) => (typeOrder.indexOf(a) ?? 99) - (typeOrder.indexOf(b) ?? 99),
  );

  const totalCalories = day.meals.reduce(
    (sum, m) => sum + (m.calories || 0),
    0,
  );

  return (
    <div className="mb-6 last:mb-0">
      {/* Sticky-like Day Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#FF5A5F] text-white flex items-center justify-center font-bold text-[17px] shadow-sm">
            {day.day_number}
          </div>
          <div className="text-left">
            <h2 className="text-[17px] font-bold text-gray-800 tracking-tight leading-tight group-hover:text-primary transition-colors">
              {day.day_header || `Ngày ${day.day_number}`}
            </h2>
            <p className="text-[13px] text-gray-400 font-medium mt-0.5">
              {day.eat_date || "Kế hoạch linh hoạt"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full bg-orange-50 text-[#f97316]">
            <Flame className="w-3.5 h-3.5" /> {totalCalories} kcal
          </span>
          <div className="w-8 h-8 rounded-full bg-gray-50/80 border border-gray-100 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="pl-5 sm:pl-12 space-y-8 relative before:absolute before:left-[19px] sm:before:left-[47px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
          {sortedTypes.map((mealType) => {
            const meals = mealsByType[mealType];
            const info = MEAL_TYPE_LABELS[mealType] || { label: mealType };

            return (
              <div key={mealType} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[28px] sm:-left-[28px] top-2 w-3 h-3 rounded-full bg-white border-2 border-primary"></div>

                <div className="space-y-4">
                  {meals.map((meal) => (
                    <div key={meal.id} className="relative">
                      <MealCard
                        meal={meal}
                        onSwap={() => onOpenSwap(meal.id)}
                        onRemove={() => onRemoveMeal(day.day_number, meal.id)}
                        isSwapping={activeSwapId === meal.id && swapLoading}
                        isSaved={isSaved}
                      />

                      {/* Swap Input */}
                      {activeSwapId === meal.id && (
                        <div className="mt-2 ml-4">
                          <AIPromptPanel
                            title={`Đổi món: "${meal.name}"`}
                            onSubmit={(prompt) =>
                              onSwapMeal(day.day_number, meal.id, meal, prompt)
                            }
                            onCancel={onCloseSwap}
                            isLoading={swapLoading}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Meal Section */}
                  {!isSaved && (
                    <div className="mt-2">
                      {activeAddSlot?.day === day.day_number &&
                      activeAddSlot?.meal_type === mealType ? (
                        <AIPromptPanel
                          title={`Thêm món vào ${info.label}`}
                          onSubmit={(prompt) =>
                            onAddMeal(day.day_number, mealType, prompt)
                          }
                          onCancel={onCloseAdd}
                          isLoading={addLoading}
                        />
                      ) : (
                        <button
                          onClick={() => onOpenAdd(day.day_number, mealType)}
                          className="group flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-primary px-4 py-2 rounded-xl border border-dashed border-gray-300 hover:border-primary/50 hover:bg-primary/5 transition-all w-full justify-center sm:justify-start"
                        >
                          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          Thêm món khác vào {info.label}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MenuDraftWidget({
  draft,
  onSave,
  isSaved,
  mealPlanId,
  isSaving,
  onModify,
  onSyncDraft,
}: {
  draft: MealPlanDraft;
  onSave: (modifiedDraft?: MenuDraftState) => void;
  isSaved: boolean;
  mealPlanId?: string;
  isSaving?: boolean;
  onModify?: () => void;
  onSyncDraft?: (newState: MenuDraftState) => void;
}) {
  const navigate = useNavigate();

  const [menuState, setMenuState] = useState<MenuDraftState>(() =>
    parseDraftPayload(draft as Record<string, any>),
  );

  useEffect(() => {
    const isAnyLoading = menuState.days.some((d) =>
      d.meals.some((m) => m.isLoading),
    );
    if (!isAnyLoading && onSyncDraft) {
      onSyncDraft(menuState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuState]);

  const [activeSwapId, setActiveSwapId] = useState<string | null>(null);
  const [activeAddSlot, setActiveAddSlot] = useState<{
    day: number;
    meal_type: string;
  } | null>(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRemoveMeal = (dayNum: number, mealId: string) => {
    onModify?.();
    setMenuState((prev) => ({
      ...prev,
      is_modified: true,
      days: prev.days.map((d) =>
        d.day_number === dayNum
          ? { ...d, meals: d.meals.filter((m) => m.id !== mealId) }
          : d,
      ),
    }));
  };

  const handleSwapMeal = async (
    dayNum: number,
    mealId: string,
    originalMeal: DraftMeal,
    prompt: string,
  ) => {
    onModify?.();
    setSwapLoading(true);
    setMenuState((prev) => ({
      ...prev,
      is_modified: true,
      days: prev.days.map((d) =>
        d.day_number === dayNum
          ? {
              ...d,
              meals: d.meals.map((m) =>
                m.id === mealId ? { ...m, isLoading: true } : m,
              ),
            }
          : d,
      ),
    }));

    try {
      const response = await menuDraftApi.editDish({
        action: "swap",
        meal_type: originalMeal.meal_type,
        day_number: dayNum,
        custom_prompt: prompt,
        original_dish_name: originalMeal.name,
        current_menu_summary: buildMenuSummary(menuState),
      });

      if (response.status === "success" && response.meal) {
        const newMeal: DraftMeal = {
          ...response.meal,
          id: `draft-meal-swap-${Date.now()}`,
        } as DraftMeal;
        setMenuState((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.day_number === dayNum
              ? {
                  ...d,
                  meals: d.meals.map((m) => (m.id === mealId ? newMeal : m)),
                }
              : d,
          ),
        }));
        setActiveSwapId(null);
        showToast("success", `Đã tạo thành công "${response.meal.name}" ✨`);
      } else {
        throw new Error(response.error);
      }
    } catch (err: any) {
      setMenuState((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.day_number === dayNum
            ? {
                ...d,
                meals: d.meals.map((m) =>
                  m.id === mealId ? { ...m, isLoading: false } : m,
                ),
              }
            : d,
        ),
      }));
      showToast(
        "error",
        err.message ||
          "Thiết kế món thất bại, hệ thống đang quá tải. Thử lại nhé!",
      );
    } finally {
      setSwapLoading(false);
    }
  };

  const handleAddMeal = async (
    dayNum: number,
    mealType: string,
    prompt: string,
  ) => {
    onModify?.();
    setAddLoading(true);
    const placeholderId = `draft-meal-add-${Date.now()}`;

    setMenuState((prev) => ({
      ...prev,
      is_modified: true,
      days: prev.days.map((d) =>
        d.day_number === dayNum
          ? {
              ...d,
              meals: [
                ...d.meals,
                {
                  id: placeholderId,
                  name: "Đang thiết kế...",
                  meal_type: mealType,
                  calories: 0,
                  protein_grams: 0,
                  carbs_grams: 0,
                  fat_grams: 0,
                  ingredients: [],
                  isLoading: true,
                },
              ],
            }
          : d,
      ),
    }));

    try {
      const response = await menuDraftApi.editDish({
        action: "add",
        meal_type: mealType,
        day_number: dayNum,
        custom_prompt: prompt,
        current_menu_summary: buildMenuSummary(menuState),
      });

      if (response.status === "success" && response.meal) {
        const newMeal: DraftMeal = {
          ...response.meal,
          id: `draft-meal-added-${Date.now()}`,
        } as DraftMeal;
        setMenuState((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.day_number === dayNum
              ? {
                  ...d,
                  meals: d.meals.map((m) =>
                    m.id === placeholderId ? newMeal : m,
                  ),
                }
              : d,
          ),
        }));
        setActiveAddSlot(null);
        showToast("success", `Đã thêm món "${response.meal.name}" ✨`);
      } else {
        throw new Error(response.error);
      }
    } catch (err: any) {
      setMenuState((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.day_number === dayNum
            ? { ...d, meals: d.meals.filter((m) => m.id !== placeholderId) }
            : d,
        ),
      }));
      showToast("error", err.message || "Lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className={`w-full my-4 bg-gray-50/50 p-4 sm:p-6 rounded-3xl border shadow-sm relative font-sans transition-colors duration-500 ${isSaved ? "border-emerald-200/60 bg-emerald-50/10 shadow-emerald-500/5 ring-1 ring-emerald-100/50" : "border-gray-100"}`}>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[100] animate-in fade-in slide-in-from-bottom-8 duration-400 ease-out">
          <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 bg-white text-gray-800 text-sm max-w-sm w-full ring-1 ring-black/5">
            {toast.type === "success" ? (
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            ) : (
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
            )}
            <span className="leading-snug font-medium line-clamp-2">
              {toast.message}
            </span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-5 mb-6 ${isSaved ? "border-emerald-100/50" : "border-gray-200"}`}>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            ✨ {menuState.name || "Thực đơn đề xuất"}
            {isSaved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100 shadow-sm whitespace-nowrap ml-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 font-medium">
            {isSaved ? "Thực đơn này đã được lưu vào hệ thống. Bạn có thể xem danh sách đi chợ ngay bên dưới." : "Kế hoạch cho bữa ăn của bạn. Bạn có thể tự do thay đổi, thêm hoặc xóa món trước khi lưu."}
          </p>
        </div>

        {/* Sticky Action Button */}
        <div className="shrink-0 flex items-center">
          {isSaved ? (
            <button
              onClick={() => navigate("/grocery")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-bold px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg border border-emerald-500"
            >
              <ShoppingCart className="w-4 h-4" /> ĐI CHỢ NGAY
            </button>
          ) : (
            <button
              onClick={() => onSave(menuState)}
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-bold px-6 py-3 rounded-2xl bg-primary text-white hover:bg-primary/95 disabled:opacity-70 transition-all shadow-md hover:shadow-lg border border-primary/20 hover:-translate-y-0.5"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              {isSaving ? "Đang lưu..." : "LƯU THỰC ĐƠN"}
            </button>
          )}
        </div>
      </div>

      {/* Days List */}
      <div className="space-y-2">
        {menuState.days.map((day) => (
          <DaySection
            key={day.day_number}
            day={day}
            isSaved={isSaved}
            onSwapMeal={handleSwapMeal}
            onRemoveMeal={handleRemoveMeal}
            onAddMeal={handleAddMeal}
            activeSwapId={activeSwapId}
            activeAddSlot={activeAddSlot}
            onOpenSwap={(id) => {
              setActiveSwapId(id);
              setActiveAddSlot(null);
            }}
            onCloseSwap={() => setActiveSwapId(null)}
            onOpenAdd={(dayNum, mealType) => {
              setActiveAddSlot({ day: dayNum, meal_type: mealType });
              setActiveSwapId(null);
            }}
            onCloseAdd={() => setActiveAddSlot(null)}
            swapLoading={swapLoading}
            addLoading={addLoading}
          />
        ))}
      </div>

      {/* Bottom Save Action for long menus */}
      {!isSaved && menuState.days.length > 2 && (
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
          <button
            onClick={() => onSave(menuState)}
            disabled={isSaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-bold px-8 py-4 rounded-2xl bg-primary text-white hover:bg-primary/95 disabled:opacity-70 transition-all shadow-xl hover:shadow-2xl border border-primary/20 hover:-translate-y-1"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            {isSaving ? "Đang lưu..." : "LƯU LẠI THỰC ĐƠN NÀY"}
          </button>
        </div>
      )}
    </div>
  );
}
