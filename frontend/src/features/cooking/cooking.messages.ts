import type { SupportedLocale } from "@/shared/i18n/locale";

const FILTER_TYPE_VALUES = [
  "Vegetarian",
  "Meat",
  "Poultry",
  "Seafood",
  "Breakfast",
  "Dessert",
] as const;

type FilterTypeValue = (typeof FILTER_TYPE_VALUES)[number];

const collectionNameLabels: Record<
  SupportedLocale,
  Record<string, string>
> = {
  en: {
    favorites: "Favorites",
    "try later": "Try later",
  },
  vi: {
    favorites: "Yêu thích",
    "try later": "Để thử sau",
  },
};

const collectionNameAliases = {
  favorites: ["favorites", "yêu thích"],
  tryLater: ["try later", "để thử sau"],
} as const;

const recipeTypeLabels: Record<SupportedLocale, Record<string, string>> = {
  en: {
    vegetarian: "Vegetarian",
    meat: "Meat",
    poultry: "Poultry",
    seafood: "Seafood",
    breakfast: "Breakfast",
    dessert: "Dessert",
  },
  vi: {
    vegetarian: "Ăn chay",
    meat: "Thịt",
    poultry: "Gia cầm",
    seafood: "Hải sản",
    breakfast: "Bữa sáng",
    dessert: "Tráng miệng",
  },
};

export const cookingMessages = {
  en: {
    shared: {
      noImage: "No image",
      noImageAvailable: "No image available",
      minuteUnit: "min",
      recipeCount: (count: number) => `${count} ${count === 1 ? "recipe" : "recipes"}`,
      pageIndicator: (currentPage: number, totalPages: number) =>
        `Page ${currentPage} / ${totalPages}`,
    },
    listPage: {
      title: "Let's cook",
      subtitle: "Find all our recipes here!",
      badge: "Recipes",
      searchPlaceholder: "Find a recipe",
      filters: "Filters",
      searchingWeb: "Searching the web...",
      searchTheWeb: "Search the web",
      searchWebPrompt: "Can't find it? Search the web",
      collections: "Collections",
      seeAll: "See all",
      createCollection: "Create a collection",
      discoverRecipes: "Discover our recipes",
      edit: "Edit",
      delete: "Delete",
      previous: "Prev",
      next: "Next",
      noRecipesTitle: "No recipes found locally",
      noRecipesDescription: (query: string) =>
        `We couldn't find "${query}" in our database.\nWould you like our AI to search the web for it?`,
      noRecipesHint: "Try adjusting your filters or search query.",
      updateRecipeError: "Failed to update recipe",
      deleteRecipeError: "Failed to delete recipe",
      loadUserError: "Failed to fetch user",
      loadCollectionsError: "Failed to load collections",
      toggleFavoriteError: "Failed to toggle favorite",
    },
    editModal: {
      title: "Edit recipe",
      namePlaceholder: "Recipe name",
      typePlaceholder: "Type",
      prepTimePlaceholder: "Prep time (min)",
      cookTimePlaceholder: "Cook time (min)",
      caloriesPlaceholder: "Calories",
      descriptionPlaceholder: "Description",
      instructionsPlaceholder: "Instructions",
      cancel: "Cancel",
      save: "Save",
    },
    deleteModal: {
      title: "Delete recipe",
      description: (recipeName: string) => `This will remove ${recipeName}.`,
      cancel: "Cancel",
      confirm: "Delete",
    },
    filterModal: {
      title: "Filters",
      type: "Type",
      maxTime: "Max Time (Minutes)",
      reset: "Reset",
      apply: "Apply Filters",
      typeOptions: FILTER_TYPE_VALUES.map((value) => ({
        value,
        label: recipeTypeLabels.en[value.toLowerCase()],
      })),
    },
    createCollection: {
      title: "New Collection",
      nameLabel: "Collection Name",
      placeholder: "e.g. Summer BBQs, Weekly Prep",
      submit: "Create Collection",
    },
    detailModal: {
      save: "Save",
      saveRecipeTo: "Save recipe to...",
      prepTime: "Prep Time",
      cookTime: "Cook Time",
      calories: "Calories",
      instructions: "Instructions",
      noInstructions: "No detailed instructions provided for this recipe.",
      foundViaWeb: "Found via web search",
      viewSource: "View Original Source →",
    },
    collectionMenu: {
      createNewCollection: "Create new collection",
    },
    collectionDetail: {
      notFound: "Collection not found",
      backToRecipes: "Back to Recipes",
      backToCollections: "Back to Collections",
      emptyTitle: "It's empty here!",
      emptyDescription:
        "You haven't added any recipes to this collection yet.",
      discoverRecipes: "Discover Recipes",
      loadError: "Failed to load collection details",
    },
  },
  vi: {
    shared: {
      noImage: "Chưa có ảnh",
      noImageAvailable: "Chưa có ảnh cho công thức này",
      minuteUnit: "phút",
      recipeCount: (count: number) => `${count} công thức`,
      pageIndicator: (currentPage: number, totalPages: number) =>
        `Trang ${currentPage} / ${totalPages}`,
    },
    listPage: {
      title: "Vào bếp thôi",
      subtitle: "Khám phá toàn bộ công thức của Nutri tại đây!",
      badge: "Công thức",
      searchPlaceholder: "Tìm món ăn hoặc công thức",
      filters: "Bộ lọc",
      searchingWeb: "Đang tìm trên web...",
      searchTheWeb: "Tìm trên web",
      searchWebPrompt: "Không thấy món bạn cần? Tìm trên web",
      collections: "Bộ sưu tập",
      seeAll: "Xem tất cả",
      createCollection: "Tạo bộ sưu tập",
      discoverRecipes: "Khám phá công thức",
      edit: "Chỉnh sửa",
      delete: "Xóa",
      previous: "Trước",
      next: "Sau",
      noRecipesTitle: "Chưa tìm thấy công thức trong hệ thống",
      noRecipesDescription: (query: string) =>
        `Nutri chưa tìm thấy "${query}" trong cơ sở dữ liệu.\nBạn có muốn để AI tìm món này trên web không?`,
      noRecipesHint: "Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm.",
      updateRecipeError: "Không thể cập nhật công thức",
      deleteRecipeError: "Không thể xóa công thức",
      loadUserError: "Không thể tải thông tin người dùng",
      loadCollectionsError: "Không thể tải bộ sưu tập",
      toggleFavoriteError: "Không thể cập nhật mục yêu thích",
    },
    editModal: {
      title: "Chỉnh sửa công thức",
      namePlaceholder: "Tên công thức",
      typePlaceholder: "Loại món",
      prepTimePlaceholder: "Thời gian chuẩn bị (phút)",
      cookTimePlaceholder: "Thời gian nấu (phút)",
      caloriesPlaceholder: "Calo",
      descriptionPlaceholder: "Mô tả",
      instructionsPlaceholder: "Cách làm",
      cancel: "Hủy",
      save: "Lưu",
    },
    deleteModal: {
      title: "Xóa công thức",
      description: (recipeName: string) =>
        `Công thức ${recipeName} sẽ bị xóa khỏi hệ thống.`,
      cancel: "Hủy",
      confirm: "Xóa",
    },
    filterModal: {
      title: "Bộ lọc",
      type: "Loại món",
      maxTime: "Thời gian tối đa (phút)",
      reset: "Đặt lại",
      apply: "Áp dụng bộ lọc",
      typeOptions: FILTER_TYPE_VALUES.map((value) => ({
        value,
        label: recipeTypeLabels.vi[value.toLowerCase()],
      })),
    },
    createCollection: {
      title: "Bộ sưu tập mới",
      nameLabel: "Tên bộ sưu tập",
      placeholder: "Ví dụ: Món cuối tuần, Bữa trưa nhanh",
      submit: "Tạo bộ sưu tập",
    },
    detailModal: {
      save: "Lưu",
      saveRecipeTo: "Lưu công thức vào...",
      prepTime: "Thời gian chuẩn bị",
      cookTime: "Thời gian nấu",
      calories: "Calo",
      instructions: "Cách làm",
      noInstructions: "Công thức này chưa có hướng dẫn chi tiết.",
      foundViaWeb: "Được tìm thấy từ web",
      viewSource: "Xem nguồn gốc →",
    },
    collectionMenu: {
      createNewCollection: "Tạo bộ sưu tập mới",
    },
    collectionDetail: {
      notFound: "Không tìm thấy bộ sưu tập",
      backToRecipes: "Quay lại công thức",
      backToCollections: "Quay lại bộ sưu tập",
      emptyTitle: "Bộ sưu tập này đang trống",
      emptyDescription: "Bạn chưa thêm công thức nào vào bộ sưu tập này.",
      discoverRecipes: "Khám phá công thức",
      loadError: "Không thể tải chi tiết bộ sưu tập",
    },
  },
} as const;

export const getCollectionDisplayName = (
  name: string,
  locale: SupportedLocale,
) => {
  if (isFavoritesCollection(name)) {
    return collectionNameLabels[locale].favorites;
  }

  if (isTryLaterCollection(name)) {
    return collectionNameLabels[locale]["try later"];
  }

  return name;
};

export const getRecipeTypeDisplayName = (
  type: string | null | undefined,
  locale: SupportedLocale,
) => {
  if (!type) {
    return "";
  }

  const normalizedType = type.trim().toLowerCase();
  return recipeTypeLabels[locale][normalizedType] ?? type;
};

export const isFavoritesCollection = (name: string) =>
  collectionNameAliases.favorites.some(
    (alias) => alias === name.trim().toLowerCase(),
  );

export const isTryLaterCollection = (name: string) =>
  collectionNameAliases.tryLater.some(
    (alias) => alias === name.trim().toLowerCase(),
  );
