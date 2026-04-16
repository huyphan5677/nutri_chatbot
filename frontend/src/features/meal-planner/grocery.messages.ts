import type { SupportedLocale } from "@/shared/i18n/locale";

const categoryLabels: Record<SupportedLocale, Record<string, string>> = {
  en: {
    Produce: "Produce",
    Dairy: "Dairy",
    Meat: "Meat",
    Pantry: "Pantry",
    Frozen: "Frozen",
    Bakery: "Bakery",
    Other: "Other",
  },
  vi: {
    Produce: "Rau củ",
    Dairy: "Sữa",
    Meat: "Thịt",
    Pantry: "Đồ khô",
    Frozen: "Đông lạnh",
    Bakery: "Bánh mì & tiệm bánh",
    Other: "Khác",
  },
};

export const groceryMessages = {
  en: {
    page: {
      title: "Shopping List",
      subtitle: "Grouped by your saved menus",
      emptyTitle: "Your shopping list is empty",
      emptyDescription:
        "Generate a meal plan to automatically build your shopping list.",
    },
    actions: {
      goingShopping: "Going shopping...",
      goShopping: "Go Shopping",
      viewCart: "View Cart",
      deleteShoppingList: "Delete this shopping list",
      editItem: "Edit item",
      removeItem: "Remove item",
      cancel: "Cancel",
      saveChanges: "Save Changes",
      deleteAll: "Delete all",
    },
    editModal: {
      title: "Edit Item",
      description: "Update shopping list details",
      itemName: "Item Name *",
      category: "Category",
      quantity: "Quantity",
    },
    deleteModal: {
      title: "Delete Shopping List",
      description: (menuName: string) =>
        `This will permanently remove all items in ${menuName}.`,
    },
    shoppingModal: {
      title: "Go shopping",
      selectStrategy: "Select a shopping strategy that fits your needs:",
      strategies: {
        lotte_priority: {
          label: "Priority Lotte Mart",
          description: "First search in LotteMart, -> if not found, search in WinMart",
        },
        winmart_priority: {
          label: "Priority WinMart",
          description: "First search in WinMart, -> if not found, search in LotteMart",
        },
        cost_optimized: {
          label: "Cost Optimized",
          description: "Search both supermarkets and select the lowest price for each ingredient",
        },
      },
      changeStrategy: "Change strategy",
      strategyLabel: "Strategy:",
      lotteBranch: "Lotte Mart Branch",
      winmartProvince: "Province / City (WinMart)",
      selectProvince: "-- Select Province/City --",
      winmartStore: "WinMart Store",
      loadingStores: "Loading store list...",
      noStoresFound: "No stores found",
      searchProducts: "Search products",
      searchingProducts: "Searching for products...",
      searchingDescription: "Browsing through stores to find the best prices for you. This process may take 1-2 minutes. You can close this window, and the system will continue running in the background.",
      cancelSearch: "Cancel search",
      searchAgain: "Search again",
      totalEstimated: "Total Estimated",
      resultSummary: (foundCount: number, totalCount: number, savedCount: number, cost: number, notFoundCount: number) => {
        let text = `Found ${foundCount}/${totalCount} items, ${savedCount} saved from fridge`;
        if (cost > 0) {
          const costStr = new Intl.NumberFormat("vi-VN").format(cost);
          text += `, total ≈ ${costStr}₫`;
        }
        if (notFoundCount > 0) {
          text += ` (${notFoundCount} not found)`;
        }
        return text;
      },
      deductedFromFridge: "Deducted from fridge",
      itemsSaved: (count: number) => `${count} ITEMS SAVED`,
      inventory: "Inventory",
      need: "Need",
      alreadyHad: "Already Had",
      savedSuccess: "Successfully saved to your Fridge!",
      confirmAndSave: "Confirm & Save to Fridge",
      productsCount: (count: number) => `${count} products`,
      displayName: "Display name",
      quantity: "Quantity",
      cancel: "Cancel",
      save: "Save",
      forLabel: "For:",
      original: "Original",
      searchQuantity: "Search",
      saved: "Saved",
      buy: "Buy",
      keepRefrigerator: "Keep the refrigerator",
      useItAllUp: "Use it all up",
      perItem: "/ item",
      contact: "Contact",
      edit: "Edit",
      remove: "Remove",
      addCustom: {
        productName: "PRODUCT NAME *",
        productNamePlaceholder: "Enter product name...",
        price: "PRICE (VND)",
        buyQuantity: "BUY QUANTITY",
        neededForRecipe: "NEEDED FOR RECIPE",
        neededForRecipePlaceholder: "e.g. 50g, 2 pieces...",
        keepInFridge: "KEEP IN FRIDGE",
        keepInFridgePlaceholder: "e.g. 500g, 1 box...",
        addToCart: "Add to cart",
        addProduct: "ADD PRODUCT",
      },
      notFound: (count: number) => `Not Found (${count})`,
      errors: {
        noIngredients: "No ingredients found!",
        analyzeError: "There was an error analyzing the results.",
        serverError: "An error occurred on the server during the search.",
        cannotStart: "Cannot start search. Please try again.",
        saveInventoryFail: "Failed to save to inventory.",
      },
    },
  },
  vi: {
    page: {
      title: "Danh sách mua sắm",
      subtitle: "Được nhóm theo các thực đơn đã lưu",
      emptyTitle: "Danh sách mua sắm của bạn đang trống",
      emptyDescription:
        "Hãy tạo thực đơn để Nutri tự động xây dựng danh sách mua sắm.",
    },
    actions: {
      goingShopping: "Đang đi chợ...",
      goShopping: "Đi chợ",
      viewCart: "Xem giỏ hàng",
      deleteShoppingList: "Xóa danh sách mua sắm này",
      editItem: "Chỉnh sửa mục",
      removeItem: "Xóa mục",
      cancel: "Hủy",
      saveChanges: "Lưu thay đổi",
      deleteAll: "Xóa tất cả",
    },
    editModal: {
      title: "Chỉnh sửa mục",
      description: "Cập nhật thông tin trong danh sách mua sắm",
      itemName: "Tên mặt hàng *",
      category: "Danh mục",
      quantity: "Số lượng",
    },
    deleteModal: {
      title: "Xóa danh sách mua sắm",
      description: (menuName: string) =>
        `Thao tác này sẽ xóa vĩnh viễn toàn bộ mục trong ${menuName}.`,
    },
    shoppingModal: {
      title: "Đi mua sắm",
      selectStrategy: "Chọn chiến lược mua sắm phù hợp với nhu cầu của bạn:",
      strategies: {
        lotte_priority: {
          label: "Ưu tiên Lotte Mart",
          description: "Tìm kiếm ở LotteMart trước, -> nếu không có thì tìm ở WinMart",
        },
        winmart_priority: {
          label: "Ưu tiên WinMart",
          description: "Tìm kiếm ở WinMart trước, -> nếu không có thì tìm ở LotteMart",
        },
        cost_optimized: {
          label: "Tối ưu chi phí",
          description: "Tìm kiếm ở cả hai siêu thị và chọn giá rẻ nhất cho mỗi nguyên liệu",
        },
      },
      changeStrategy: "Đổi chiến lược",
      strategyLabel: "Chiến lược:",
      lotteBranch: "Chi nhánh Lotte Mart",
      winmartProvince: "Tỉnh / Thành phố (WinMart)",
      selectProvince: "-- Chọn Tỉnh/Thành phố --",
      winmartStore: "Cửa hàng WinMart",
      loadingStores: "Đang tải danh sách cửa hàng...",
      noStoresFound: "Không tìm thấy cửa hàng",
      searchProducts: "Tìm kiếm sản phẩm",
      searchingProducts: "Đang tìm kiếm sản phẩm...",
      searchingDescription: "Đang duyệt qua các cửa hàng để tìm giá tốt nhất cho bạn. Quá trình này có thể mất 1-2 phút. Bạn có thể đóng cửa sổ này, hệ thống sẽ tiếp tục chạy trong nền.",
      cancelSearch: "Hủy tìm kiếm",
      searchAgain: "Tìm kiếm lại",
      totalEstimated: "Tổng ước tính",
      resultSummary: (foundCount: number, totalCount: number, savedCount: number, cost: number, notFoundCount: number) => {
        let text = `Đã tìm thấy ${foundCount}/${totalCount} món, ${savedCount} món có sẵn ở tủ lạnh`;
        if (cost > 0) {
          const costStr = new Intl.NumberFormat("vi-VN").format(cost);
          text += `, tổng cộng ≈ ${costStr}đ`;
        }
        if (notFoundCount > 0) {
          text += ` (${notFoundCount} không tìm thấy)`;
        }
        return text;
      },
      deductedFromFridge: "Đã trừ từ tủ lạnh",
      itemsSaved: (count: number) => `ĐÃ TIẾT KIỆM ${count} MÓN`,
      inventory: "Tủ lạnh",
      need: "Cần",
      alreadyHad: "Đã có sẵn",
      savedSuccess: "Đã lưu thành công vào Tủ lạnh của bạn!",
      confirmAndSave: "Xác nhận & Lưu vào Tủ lạnh",
      productsCount: (count: number) => `${count} sản phẩm`,
      displayName: "Tên hiển thị",
      quantity: "Số lượng",
      cancel: "Hủy",
      save: "Lưu",
      forLabel: "Cho:",
      original: "Gốc",
      searchQuantity: "Tìm",
      saved: "Tiết kiệm",
      buy: "Mua",
      keepRefrigerator: "Lưu tủ lạnh",
      useItAllUp: "Dùng hết",
      perItem: "/ sản phẩm",
      contact: "Liên hệ",
      edit: "Sửa",
      remove: "Xóa",
      addCustom: {
        productName: "TÊN SẢN PHẨM *",
        productNamePlaceholder: "Nhập tên sản phẩm...",
        price: "GIÁ (VND)",
        buyQuantity: "SỐ LƯỢNG MUA",
        neededForRecipe: "LƯỢNG CẦN CHO CÔNG THỨC",
        neededForRecipePlaceholder: "vd: 50g, 2 miếng...",
        keepInFridge: "LƯU VÀO TỦ LẠNH",
        keepInFridgePlaceholder: "vd: 500g, 1 hộp...",
        addToCart: "Thêm vào giỏ",
        addProduct: "THÊM SẢN PHẨM",
      },
      notFound: (count: number) => `Không tìm thấy (${count})`,
      errors: {
        noIngredients: "Không tìm thấy nguyên liệu nào!",
        analyzeError: "Đã xảy ra lỗi khi phân tích kết quả.",
        serverError: "Đã xảy ra lỗi trên máy chủ trong quá trình tìm kiếm.",
        cannotStart: "Không thể bắt đầu tìm kiếm. Vui lòng thử lại.",
        saveInventoryFail: "Đã xảy ra lỗi khi lưu vào tủ lạnh.",
      },
    },
  },
} as const;

export const GROCERY_CATEGORY_OPTIONS = [
  "Produce",
  "Dairy",
  "Meat",
  "Pantry",
  "Frozen",
  "Bakery",
  "Other",
] as const;

export const getGroceryCategoryLabel = (
  category: string | null | undefined,
  locale: SupportedLocale,
) => {
  if (!category) {
    return categoryLabels[locale].Other;
  }

  return categoryLabels[locale][category] ?? category;
};
