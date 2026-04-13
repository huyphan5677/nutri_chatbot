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
