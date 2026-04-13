import type { SupportedLocale } from "@/shared/i18n/locale";

const categoryDisplayMap: Record<SupportedLocale, Record<string, string>> = {
  en: {
    Other: "Other",
  },
  vi: {
    Other: "Khác",
  },
};

export const inventoryMessages = {
  en: {
    page: {
      title: "My Fridge",
      subtitle: "Manage your ingredients and track expiration dates.",
      addItems: "Add Items",
      emptyTitle: "Your fridge is empty!",
      emptyDescription:
        "Start adding ingredients to keep track of what you have and let Corin suggest meals based on your stock.",
      itemsCount: (count: number) => `${count} items`,
      expiresLabel: "Expires:",
    },
    actions: {
      renameCategory: "Rename category",
      editItem: "Edit item",
      removeItem: "Remove item",
      cancel: "Cancel",
      addItem: "Add Item",
      saveChanges: "Save Changes",
    },
    addModal: {
      title: "Add to Fridge",
      subtitle: "Track a new ingredient",
    },
    editModal: {
      title: "Edit Fridge Item",
      subtitle: "Update ingredient details",
    },
    form: {
      itemName: "Item Name *",
      category: "Category",
      quantity: "Quantity",
      expirationDate: "Expiration Date",
      optional: "(Optional)",
      itemNamePlaceholder: "e.g., Almond Milk",
      categoryPlaceholder: "Select or type...",
      quantityPlaceholder: "e.g. 500g, 1 box",
    },
  },
  vi: {
    page: {
      title: "Tủ lạnh của tôi",
      subtitle: "Quản lý nguyên liệu và theo dõi hạn sử dụng.",
      addItems: "Thêm món",
      emptyTitle: "Tủ lạnh của bạn đang trống!",
      emptyDescription:
        "Hãy thêm nguyên liệu để theo dõi những gì bạn đang có, và để Corin gợi ý bữa ăn phù hợp.",
      itemsCount: (count: number) => `${count} món`,
      expiresLabel: "Hết hạn:",
    },
    actions: {
      renameCategory: "Đổi tên danh mục",
      editItem: "Chỉnh sửa món",
      removeItem: "Xóa món",
      cancel: "Hủy",
      addItem: "Thêm món",
      saveChanges: "Lưu thay đổi",
    },
    addModal: {
      title: "Thêm vào tủ lạnh",
      subtitle: "Theo dõi nguyên liệu mới",
    },
    editModal: {
      title: "Chỉnh sửa món trong tủ lạnh",
      subtitle: "Cập nhật thông tin nguyên liệu",
    },
    form: {
      itemName: "Tên mặt hàng *",
      category: "Danh mục",
      quantity: "Số lượng",
      expirationDate: "Hạn sử dụng",
      optional: "(Tùy chọn)",
      itemNamePlaceholder: "ví dụ: sữa hạnh nhân",
      categoryPlaceholder: "Chọn hoặc nhập...",
      quantityPlaceholder: "ví dụ: 500g, 1 hộp",
    },
  },
} as const;

export const getInventoryCategoryLabel = (
  category: string | null | undefined,
  locale: SupportedLocale,
) => {
  if (!category) {
    return categoryDisplayMap[locale].Other;
  }

  return categoryDisplayMap[locale][category] ?? category;
};
