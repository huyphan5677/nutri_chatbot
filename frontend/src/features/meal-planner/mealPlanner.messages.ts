import type { SupportedLocale } from "@/shared/i18n/locale";

const statusLabels: Record<SupportedLocale, Record<string, string>> = {
  en: {
    draft: "Draft",
    active: "Active",
    completed: "Completed",
    archived: "Archived",
    custom: "Custom",
  },
  vi: {
    draft: "Nháp",
    active: "Đang dùng",
    completed: "Hoàn tất",
    archived: "Lưu trữ",
    custom: "Tùy chỉnh",
  },
};

const mealTypeLabels: Record<SupportedLocale, Record<string, string>> = {
  en: {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
  },
  vi: {
    breakfast: "Bữa sáng",
    lunch: "Bữa trưa",
    dinner: "Bữa tối",
    snack: "Bữa phụ",
  },
};

const macroLabels: Record<SupportedLocale, Record<string, string>> = {
  en: {
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    fiber: "Fiber",
  },
  vi: {
    protein: "Đạm",
    carbs: "Tinh bột",
    fat: "Chất béo",
    fiber: "Chất xơ",
  },
};

export const mealPlannerMessages = {
  en: {
    page: {
      noMealPlan: "No active meal plan found. Chat with Corin to generate one!",
      loadFailed: "Failed to load meal plan.",
      updateFailed: "Failed to update menu.",
      deleteFailed: "Failed to delete menu.",
      loadSelectedFailed: "Failed to load selected menu.",
      unnamedMenu: "Unnamed menu",
      menuCount: (count: number) => `${count} menus`,
      menuNamePlaceholder: "Menu name",
      save: "Save",
      saving: "Saving...",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      deleting: "Deleting...",
      dateRange: (start: string, end: string) => `${start} to ${end}`,
      editMenuDetails: "Edit menu details",
      menuNameLabel: "Menu Name",
      menuNameInputPlaceholder: "Enter menu name",
      status: "Status",
      startDate: "Start date",
      endDate: "End date",
      customStatus: "Custom Status",
      customStatusPlaceholder: "Type custom status",
      totalDays: "Total days",
      totalMeals: "Total meals",
      mealTypesInMenu: "Meal types in this menu",
      viewDetailRecipe: "View detail recipe",
      deleteCurrentMenu: "Delete Current Menu",
      deleteCurrentDescription:
        "This action cannot be undone. All meals in this menu will be removed.",
      calendarFallback: "N/A",
      ingredientsCount: (count: number) => `${count} ingredients`,
    },
    detailModal: {
      prepTime: "Prep Time",
      cookTime: "Cook Time",
      serving: "Serving",
      description: "Description",
      macros: "Macros",
      dietaryTags: "Dietary Tags",
      ingredients: "Ingredients",
      instructions: "Instructions",
      minutes: (count: number) => `${count} minutes`,
      noIngredientData: "No ingredient data available.",
      noCookingInstructions: "No cooking instructions available.",
      notAvailable: "N/A",
    },
  },
  vi: {
    page: {
      noMealPlan:
        "Chưa có thực đơn nào đang hoạt động. Hãy chat với Corin để tạo thực đơn nhé!",
      loadFailed: "Không thể tải thực đơn.",
      updateFailed: "Không thể cập nhật thực đơn.",
      deleteFailed: "Không thể xóa thực đơn.",
      loadSelectedFailed: "Không thể tải thực đơn đã chọn.",
      unnamedMenu: "Thực đơn chưa đặt tên",
      menuCount: (count: number) => `${count} thực đơn`,
      menuNamePlaceholder: "Tên thực đơn",
      save: "Lưu",
      saving: "Đang lưu...",
      cancel: "Hủy",
      edit: "Chỉnh sửa",
      delete: "Xóa",
      deleting: "Đang xóa...",
      dateRange: (start: string, end: string) => `${start} đến ${end}`,
      editMenuDetails: "Chỉnh sửa thông tin thực đơn",
      menuNameLabel: "Tên thực đơn",
      menuNameInputPlaceholder: "Nhập tên thực đơn",
      status: "Trạng thái",
      startDate: "Ngày bắt đầu",
      endDate: "Ngày kết thúc",
      customStatus: "Trạng thái tùy chỉnh",
      customStatusPlaceholder: "Nhập trạng thái tùy chỉnh",
      totalDays: "Tổng số ngày",
      totalMeals: "Tổng số bữa",
      mealTypesInMenu: "Các loại bữa ăn trong thực đơn",
      viewDetailRecipe: "Xem chi tiết món ăn",
      deleteCurrentMenu: "Xóa thực đơn hiện tại",
      deleteCurrentDescription:
        "Hành động này không thể hoàn tác. Toàn bộ món ăn trong thực đơn này sẽ bị xóa.",
      calendarFallback: "Không có",
      ingredientsCount: (count: number) => `${count} nguyên liệu`,
    },
    detailModal: {
      prepTime: "Thời gian chuẩn bị",
      cookTime: "Thời gian nấu",
      serving: "Khẩu phần",
      description: "Mô tả",
      macros: "Dinh dưỡng",
      dietaryTags: "Nhãn dinh dưỡng",
      ingredients: "Nguyên liệu",
      instructions: "Cách làm",
      minutes: (count: number) => `${count} phút`,
      noIngredientData: "Chưa có dữ liệu nguyên liệu.",
      noCookingInstructions: "Chưa có hướng dẫn nấu ăn.",
      notAvailable: "Không có",
    },
  },
} as const;

export const MEAL_STATUS_OPTIONS = ["draft", "active", "completed", "archived"] as const;

export const getMealPlannerStatusLabel = (
  status: string | null | undefined,
  locale: SupportedLocale,
) => {
  if (!status) {
    return "";
  }

  const normalized = status.trim().toLowerCase();
  return statusLabels[locale][normalized] ?? status;
};

export const getMealTypeLabel = (
  mealType: string | null | undefined,
  locale: SupportedLocale,
) => {
  if (!mealType) {
    return "";
  }

  const normalized = mealType.trim().toLowerCase();
  if (normalized === "breakfast") return mealTypeLabels[locale].breakfast;
  if (normalized === "lunch") return mealTypeLabels[locale].lunch;
  if (normalized === "dinner") return mealTypeLabels[locale].dinner;
  if (normalized.includes("snack")) return mealTypeLabels[locale].snack;
  return mealType;
};

export const getMacroLabel = (
  macro: string,
  locale: SupportedLocale,
) => {
  const normalized = macro.trim().toLowerCase();
  return macroLabels[locale][normalized] ?? macro;
};
