import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/shared/i18n/LocaleContext";
import {
  AlertTriangle,
  Calendar,
  ChefHat,
  ChevronRight,
  Clock,
  Flame,
  Leaf,
  Loader2,
  Pencil,
  Soup,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  MealDTO,
  MealPlanResponse,
  MealPlanSummary,
  menuApi,
} from "../api/menuApi";
import {
  getMacroLabel,
  getMealPlannerStatusLabel,
  getMealTypeLabel,
  MEAL_STATUS_OPTIONS,
  mealPlannerMessages,
} from "../mealPlanner.messages";

export default function MealPlannerDashboard() {
  const { locale } = useLocale();
  const copy = mealPlannerMessages[locale];
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [menuPlans, setMenuPlans] = useState<MealPlanSummary[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editTotalDays, setEditTotalDays] = useState(1);
  const [editTotalMeals, setEditTotalMeals] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealDTO | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const plans = await menuApi.getMenus();
        setMenuPlans(plans);

        if (plans.length === 0) {
          setError(copy.page.noMealPlan);
          return;
        }

        const firstId = plans[0].id;
        setSelectedMenuId(firstId);
        const data = await menuApi.getMenuById(firstId);
        setMealPlan(data);
        setEditName(data.name || "");
        setEditStatus(data.status || "");
        setEditStartDate(data.start_date || "");
        setEditEndDate(data.end_date || "");
        const initialTotalDays = Math.max(
          1,
          Math.ceil(
            (new Date(data.end_date).getTime() -
              new Date(data.start_date).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        );
        setEditTotalDays(initialTotalDays);
        setEditTotalMeals(Math.max(1, data.meals.length));
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError(copy.page.noMealPlan);
        } else {
          setError(copy.page.loadFailed);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenu();
  }, [copy.page.loadFailed, copy.page.noMealPlan]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !mealPlan) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <UtensilsCrossed className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">{error}</h2>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditName(mealPlan.name || "");
    setEditStatus(mealPlan.status || "");
    setEditStartDate(mealPlan.start_date || "");
    setEditEndDate(mealPlan.end_date || "");
    const days = Math.max(
      1,
      Math.ceil(
        (new Date(mealPlan.end_date).getTime() -
          new Date(mealPlan.start_date).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1,
    );
    setEditTotalDays(days);
    setEditTotalMeals(Math.max(1, mealPlan.meals.length));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditName(mealPlan.name || "");
    setEditStatus(mealPlan.status || "");
    setEditStartDate(mealPlan.start_date || "");
    setEditEndDate(mealPlan.end_date || "");
    const days = Math.max(
      1,
      Math.ceil(
        (new Date(mealPlan.end_date).getTime() -
          new Date(mealPlan.start_date).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1,
    );
    setEditTotalDays(days);
    setEditTotalMeals(Math.max(1, mealPlan.meals.length));
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!mealPlan || !selectedMenuId) return;
    setIsSaving(true);
    setError("");
    try {
      const updated = await menuApi.updateMenuById(selectedMenuId, {
        name: editName.trim(),
        status: editStatus.trim(),
        start_date: editStartDate,
        end_date: editEndDate,
        total_days: editTotalDays,
        total_meals: editTotalMeals,
      });
      setMealPlan(updated);
      setMenuPlans((prev) =>
        prev.map((p) =>
          p.id === selectedMenuId
            ? {
                ...p,
                name: updated.name,
                status: updated.status,
                start_date: updated.start_date,
                end_date: updated.end_date,
              }
            : p,
        ),
      );
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || copy.page.updateFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCurrent = async () => {
    if (!selectedMenuId) return;

    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteCurrent = async () => {
    if (!selectedMenuId) return;

    setIsDeleting(true);
    setError("");
    try {
      await menuApi.deleteMenuById(selectedMenuId);

      const plans = await menuApi.getMenus();
      setMenuPlans(plans);

      if (plans.length === 0) {
        setMealPlan(null);
        setSelectedMenuId(null);
        setIsDeleteConfirmOpen(false);
        setError(copy.page.noMealPlan);
      } else {
        const nextId = plans[0].id;
        setSelectedMenuId(nextId);
        const data = await menuApi.getMenuById(nextId);
        setMealPlan(data);
        setEditName(data.name || "");
        setEditStatus(data.status || "");
        setEditStartDate(data.start_date || "");
        setEditEndDate(data.end_date || "");
        const days = Math.max(
          1,
          Math.ceil(
            (new Date(data.end_date).getTime() -
              new Date(data.start_date).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        );
        setEditTotalDays(days);
        setEditTotalMeals(Math.max(1, data.meals.length));
        setIsDeleteConfirmOpen(false);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || copy.page.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectMenu = async (menuId: string) => {
    if (menuId === selectedMenuId) return;
    try {
      setIsLoading(true);
      setSelectedMenuId(menuId);
      const data = await menuApi.getMenuById(menuId);
      setMealPlan(data);
      setEditName(data.name || "");
      setEditStatus(data.status || "");
      setEditStartDate(data.start_date || "");
      setEditEndDate(data.end_date || "");
      const days = Math.max(
        1,
        Math.ceil(
          (new Date(data.end_date).getTime() -
            new Date(data.start_date).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1,
      );
      setEditTotalDays(days);
      setEditTotalMeals(Math.max(1, data.meals.length));
      setIsEditing(false);
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.detail || copy.page.loadSelectedFailed);
    } finally {
      setIsLoading(false);
    }
  };

  // Group meals by date
  const groupedMeals = mealPlan.meals.reduce(
    (acc, meal) => {
      if (!acc[meal.eat_date]) acc[meal.eat_date] = [];
      acc[meal.eat_date].push(meal);
      return acc;
    },
    {} as Record<string, MealDTO[]>,
  );

  const dates = Object.keys(groupedMeals).sort();
  const totalMeals = mealPlan.meals.length;
  const totalDays = dates.length;
  const mealTypes = Array.from(new Set(mealPlan.meals.map((m) => m.meal_type)));

  const statusOptions: readonly string[] = MEAL_STATUS_OPTIONS;
  const normalizedStatus = (editStatus || "").trim().toLowerCase();
  const showCustomStatusInput =
    isEditing &&
    normalizedStatus.length > 0 &&
    !statusOptions.includes(normalizedStatus);

  const instructionSteps = selectedMeal?.recipe.instructions
    ? selectedMeal.recipe.instructions
        .split(/\n|\.\s+/)
        .map((step) => step.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="p-4 sm:p-6 lg:max-w-7xl lg:mx-auto">
      {menuPlans.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {menuPlans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handleSelectMenu(plan.id)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${selectedMenuId === plan.id ? "bg-primary text-white border-primary" : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-700 hover:border-primary/50"}`}
            >
              {plan.name || copy.page.unnamedMenu} ({plan.start_date})
            </button>
          ))}
        </div>
      )}

      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isEditing ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-3xl font-bold text-gray-900 capitalize border rounded-lg px-3 py-1 w-full sm:w-auto"
                placeholder={copy.page.menuNamePlaceholder}
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
                {mealPlan.name}
              </h1>
            )}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
              {copy.page.menuCount(menuPlans.length)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-3 py-2 text-sm rounded-lg bg-primary text-white disabled:opacity-60"
                >
                  {isSaving ? copy.page.saving : copy.page.save}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300"
                >
                  {copy.page.cancel}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleStartEdit}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 inline-flex items-center gap-1"
                >
                  <Pencil className="h-4 w-4" /> {copy.page.edit}
                </button>
                <button
                  onClick={handleDeleteCurrent}
                  disabled={isDeleting}
                  className="px-3 py-2 text-sm rounded-lg border border-red-300 text-red-600 inline-flex items-center gap-1 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? copy.page.deleting : copy.page.delete}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center text-sm text-gray-500 gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />{" "}
            {copy.page.dateRange(mealPlan.start_date, mealPlan.end_date)}
          </span>
          {isEditing ? (
            <input
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-primary/30 text-primary"
              placeholder={copy.page.status}
            />
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {getMealPlannerStatusLabel(mealPlan.status, locale)}
            </span>
          )}
        </div>

        {isEditing && (
          <div className="mt-5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {copy.page.editMenuDetails}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1.5">
                  {copy.page.menuNameLabel}
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder={copy.page.menuNameInputPlaceholder}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1.5">
                  {copy.page.status}
                </label>
                <select
                  value={
                    showCustomStatusInput
                      ? "custom"
                      : normalizedStatus || "draft"
                  }
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setEditStatus("");
                    } else {
                      setEditStatus(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {getMealPlannerStatusLabel(option, locale)}
                    </option>
                  ))}
                  <option value="custom">
                    {getMealPlannerStatusLabel("custom", locale)}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1.5">
                  {copy.page.startDate}
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setEditStartDate(nextStart);
                    if (nextStart && editTotalDays >= 1) {
                      const base = new Date(`${nextStart}T00:00:00`);
                      base.setDate(base.getDate() + editTotalDays - 1);
                      setEditEndDate(base.toISOString().slice(0, 10));
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1.5">
                  {copy.page.endDate}
                </label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => {
                    const nextEnd = e.target.value;
                    setEditEndDate(nextEnd);
                    if (editStartDate && nextEnd) {
                      const start = new Date(`${editStartDate}T00:00:00`);
                      const end = new Date(`${nextEnd}T00:00:00`);
                      const diff =
                        Math.floor(
                          (end.getTime() - start.getTime()) /
                            (1000 * 60 * 60 * 24),
                        ) + 1;
                      setEditTotalDays(Math.max(1, diff));
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {showCustomStatusInput && (
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1.5">
                    {copy.page.customStatus}
                  </label>
                  <input
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder={copy.page.customStatusPlaceholder}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1.5">
                  {copy.page.totalDays}
                </label>
                <input
                  type="number"
                  min={1}
                  value={editTotalDays}
                  onChange={(e) => {
                    const nextDays = Math.max(1, Number(e.target.value) || 1);
                    setEditTotalDays(nextDays);
                    if (editStartDate) {
                      const base = new Date(`${editStartDate}T00:00:00`);
                      base.setDate(base.getDate() + nextDays - 1);
                      setEditEndDate(base.toISOString().slice(0, 10));
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1.5">
                  {copy.page.totalMeals}
                </label>
                <input
                  type="number"
                  min={1}
                  value={editTotalMeals}
                  onChange={(e) =>
                    setEditTotalMeals(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  {copy.page.startDate}
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-0.5">
                  {editStartDate}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  {copy.page.endDate}
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-0.5">
                  {editEndDate}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  {copy.page.totalDays}
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-0.5">
                  {editTotalDays}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  {copy.page.totalMeals}
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-0.5">
                  {editTotalMeals}
                </div>
              </div>
            </div>

            {mealTypes.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
                  {copy.page.mealTypesInMenu}
                </div>
                <div className="flex flex-wrap gap-2">
                  {mealTypes.map((type) => (
                    <span
                      key={type}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-primary/20 bg-primary/5 text-primary"
                    >
                      {getMealTypeLabel(type, locale)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-10">
        {dates.map((date) => (
          <div key={date}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-4 border-b dark:border-slate-800 pb-2">
              {new Date(date).toLocaleDateString(
                locale === "vi" ? "vi-VN" : "en-US",
                {
                weekday: "long",
                month: "short",
                day: "numeric",
              },
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedMeals[date].map((meal) => (
                <button
                  key={meal.id}
                  type="button"
                  onClick={() => setSelectedMeal(meal)}
                  className="group text-left bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-3xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-lg dark:hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="text-[11px] font-bold tracking-[0.12em] text-primary uppercase bg-primary/10 dark:bg-primary/20 px-2.5 py-1 rounded-full">
                        {getMealTypeLabel(meal.meal_type, locale)}
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-slate-50 mb-3 leading-snug group-hover:text-primary dark:group-hover:text-primary transition-colors">
                      {meal.recipe.name}
                    </h4>
                    {meal.recipe.description && (
                      <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 mb-5 leading-relaxed">
                        {meal.recipe.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      {meal.recipe.prep_time_minutes && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-700/50 dark:text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-primary/70" />
                          {meal.recipe.prep_time_minutes}m
                        </span>
                      )}
                      {meal.recipe.total_calories && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 font-semibold">
                          <Flame className="h-3.5 w-3.5" />
                          {meal.recipe.total_calories} kcal
                        </span>
                      )}
                    </div>
                    <div className="mt-5 text-xs text-primary dark:text-primary/90 font-bold uppercase tracking-wider flex items-center gap-1">
                      {copy.page.viewDetailRecipe}
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => !isDeleting && setIsDeleteConfirmOpen(false)}
        className="max-w-md p-6"
      >
        <div className="flex flex-col">
          <div className="flex items-start gap-3 mb-4">
            <div className="mt-0.5 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {copy.page.deleteCurrentMenu}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {copy.page.deleteCurrentDescription}
              </p>
            </div>
          </div>

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm disabled:opacity-60"
            >
              {copy.page.cancel}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDeleteCurrent}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors text-sm inline-flex items-center justify-center disabled:opacity-60"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                copy.page.delete
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedMeal}
        onClose={() => setSelectedMeal(null)}
        className="max-w-4xl p-0"
      >
        {selectedMeal && (
          <div>
            <div className="px-6 sm:px-8 pt-8 pb-6 bg-gradient-to-br from-primary/10 via-rose-50 to-white border-b border-gray-100 dark:from-primary/20 dark:via-slate-800 dark:to-slate-800 dark:border-slate-700/50">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-white text-primary border border-primary/20 mb-3 dark:bg-slate-900 dark:border-primary/30">
                    {getMealTypeLabel(selectedMeal.meal_type, locale)}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight max-w-2xl dark:text-white">
                    {selectedMeal.recipe.name}
                  </h3>
                </div>
                {selectedMeal.recipe.total_calories ? (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-100 text-orange-700 text-sm font-semibold dark:bg-orange-900/30 dark:border-orange-900/40 dark:text-orange-400">
                    <Flame className="h-4 w-4" />
                    {selectedMeal.recipe.total_calories} kcal
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-white/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700/50">
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 dark:text-gray-400">
                    {copy.detailModal.prepTime}
                  </div>
                  <div className="font-semibold text-gray-900 flex items-center gap-2 dark:text-gray-200">
                    <Clock className="h-4 w-4 text-primary" />
                    {selectedMeal.recipe.prep_time_minutes
                      ? copy.detailModal.minutes(
                          selectedMeal.recipe.prep_time_minutes,
                        )
                      : copy.detailModal.notAvailable}
                  </div>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700/50">
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 dark:text-gray-400">
                    {copy.detailModal.cookTime}
                  </div>
                  <div className="font-semibold text-gray-900 flex items-center gap-2 dark:text-gray-200">
                    <ChefHat className="h-4 w-4 text-primary" />
                    {selectedMeal.recipe.cook_time_minutes
                      ? copy.detailModal.minutes(
                          selectedMeal.recipe.cook_time_minutes,
                        )
                      : copy.detailModal.notAvailable}
                  </div>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700/50">
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 dark:text-gray-400">
                    {copy.detailModal.serving}
                  </div>
                  <div className="font-semibold text-gray-900 flex items-center gap-2 dark:text-gray-200">
                    <Soup className="h-4 w-4 text-primary" />
                    {copy.page.ingredientsCount(
                      selectedMeal.recipe.ingredients?.length || 0,
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-8 py-6 space-y-6">
              {selectedMeal.recipe.description && (
                <section>
                  <h4 className="text-xs font-bold tracking-[0.12em] text-gray-500 uppercase mb-2 dark:text-slate-400">
                    {copy.detailModal.description}
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 dark:bg-slate-800/50 dark:border-slate-700/50 dark:text-slate-200">
                    {selectedMeal.recipe.description}
                  </p>
                </section>
              )}

              {selectedMeal.recipe.macros &&
              Object.keys(selectedMeal.recipe.macros).length > 0 ? (
                <section>
                  <h4 className="text-xs font-bold tracking-[0.12em] text-gray-500 uppercase mb-2 dark:text-slate-400">
                    {copy.detailModal.macros}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(selectedMeal.recipe.macros).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="rounded-xl bg-white border border-gray-100 px-3 py-3 dark:bg-slate-800 dark:border-slate-700/50"
                        >
                          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">
                            {getMacroLabel(key, locale)}
                          </div>
                          <div className="text-base font-semibold text-gray-900 mt-0.5 dark:text-slate-100">
                            {value}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </section>
              ) : null}

              {(selectedMeal.recipe.dietary_tags || []).length > 0 && (
                <section>
                  <h4 className="text-xs font-bold tracking-[0.12em] text-gray-500 uppercase mb-2 dark:text-slate-400">
                    {copy.detailModal.dietaryTags}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedMeal.recipe.dietary_tags || []).map((tag) => (
                      <div
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40"
                      >
                        <Leaf className="h-3.5 w-3.5" />
                        {tag}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h4 className="text-xs font-bold tracking-[0.12em] text-gray-500 uppercase mb-2 dark:text-slate-400">
                  {copy.detailModal.ingredients}
                </h4>
                {selectedMeal.recipe.ingredients &&
                selectedMeal.recipe.ingredients.length > 0 ? (
                  <div className="rounded-2xl border border-gray-100 overflow-hidden dark:border-slate-700/50">
                    {selectedMeal.recipe.ingredients.map(
                      (ingredient, index) => (
                        <div
                          key={`${ingredient.name}-${index}`}
                          className="px-4 py-3 border-b border-gray-100 last:border-b-0 flex items-start justify-between gap-3 bg-white dark:border-slate-700/30 dark:bg-slate-800/60"
                        >
                          <span className="text-sm text-gray-800 flex items-center gap-2 dark:text-gray-200">
                            <Soup className="h-4 w-4 text-primary/70" />
                            {ingredient.name}
                          </span>
                          {ingredient.quantity != null && (
                            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300">
                              {ingredient.quantity}g
                            </span>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {copy.detailModal.noIngredientData}
                  </p>
                )}
              </section>

              <section>
                <h4 className="text-xs font-bold tracking-[0.12em] text-gray-500 uppercase mb-2 dark:text-slate-400">
                  {copy.detailModal.instructions}
                </h4>
                {instructionSteps.length > 0 ? (
                  <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 space-y-2 dark:bg-slate-800/60 dark:border-slate-700/50">
                    {instructionSteps.map((step, index) => (
                      <div key={`${index}-${step}`} className="flex gap-3">
                        <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold dark:bg-primary/20">
                          {index + 1}
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed dark:text-gray-300">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : selectedMeal.recipe.instructions ? (
                  <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3 dark:bg-slate-800/50 dark:border-slate-700/50">
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed dark:text-gray-300">
                      {selectedMeal.recipe.instructions}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {copy.detailModal.noCookingInstructions}
                  </p>
                )}
              </section>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
