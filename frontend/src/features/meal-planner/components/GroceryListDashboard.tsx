import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  Pencil,
  ShoppingCart,
  Store,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  groceryApi,
  GroceryItemDTO,
  GroceryMenuGroupDTO,
  ShoppingOrderResponse,
} from "../api/groceryApi";
import ShoppingModal from "./ShoppingModal";

export default function GroceryListDashboard() {
  const [menuGroups, setMenuGroups] = useState<GroceryMenuGroupDTO[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(
    {},
  );
  const [shoppingOrders, setShoppingOrders] = useState<
    Record<string, ShoppingOrderResponse>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editItem, setEditItem] = useState<GroceryItemDTO | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [deleteTargetGroup, setDeleteTargetGroup] =
    useState<GroceryMenuGroupDTO | null>(null);
  const [shoppingTarget, setShoppingTarget] =
    useState<GroceryMenuGroupDTO | null>(null);
  const [isDeleteGroupSubmitting, setIsDeleteGroupSubmitting] = useState(false);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const data = await groceryApi.getGroceryByMenu();
        const menus = [...(data.menus || [])].sort((a, b) => {
          const aTime = Date.parse(a.end_date || a.start_date || "") || 0;
          const bTime = Date.parse(b.end_date || b.start_date || "") || 0;
          return bTime - aTime;
        });
        setMenuGroups(menus);
        // Only initialize expanded state for new keys, don't reset existing ones
        setExpandedMenus((prev) => {
          const next = { ...prev };
          menus.forEach((group) => {
            const key = group.meal_plan_id || group.meal_plan_name;
            if (next[key] === undefined) {
              next[key] = false;
            }
          });
          return next;
        });
      } catch (err) {
        console.error("Failed to load grocery list:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchList();
  }, []);

  useEffect(() => {
    if (!menuGroups.length) return;

    let isMounted = true;
    const fetchOrders = async () => {
      const orders: Record<string, ShoppingOrderResponse> = {};
      let hasProcessing = false;

      for (const group of menuGroups) {
        if (!group.meal_plan_id) continue;
        try {
          const order = await groceryApi.getLatestShoppingOrder(
            group.meal_plan_id,
          );
          if (order) {
            orders[group.meal_plan_id] = order;
            if (order.status === "processing") hasProcessing = true;
          }
        } catch (e) {
          // ignore
        }
      }
      if (isMounted) setShoppingOrders(orders);
      return hasProcessing;
    };

    fetchOrders();

    const interval = setInterval(async () => {
      const hasProcessing = await fetchOrders();
      if (!hasProcessing) {
        // Poll slower if nothing is processing, but kept at 5s for simplicity
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [menuGroups]);

  const toggleMenuGroup = (key: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleItem = async (id: string) => {
    let target: GroceryItemDTO | null = null;
    for (const group of menuGroups) {
      const found = group.items.find((item) => item.id === id);
      if (found) {
        target = found;
        break;
      }
    }
    if (!target) return;

    const nextPurchased = !target.is_purchased;

    // Optimistic update
    setMenuGroups((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === id ? { ...item, is_purchased: nextPurchased } : item,
        ),
      })),
    );

    try {
      await groceryApi.updateGroceryItem(id, { is_purchased: nextPurchased });
      window.dispatchEvent(new Event("groceryListUpdated"));
    } catch (err) {
      // Revert on failure
      setMenuGroups((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.id === id ? { ...item, is_purchased: !nextPurchased } : item,
          ),
        })),
      );
      console.error("Failed to toggle grocery item:", err);
    }
  };

  const handleOpenEdit = (e: React.MouseEvent, item: GroceryItemDTO) => {
    e.stopPropagation();
    setEditItem(item);
    setEditName(item.name);
    setEditCategory(item.category || "Other");
    setEditQuantity(item.quantity || "1");
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !editName.trim()) return;

    try {
      setIsSubmitting(true);
      const updated = await groceryApi.updateGroceryItem(editItem.id, {
        name: editName.trim(),
        category: editCategory,
        quantity: editQuantity.trim(),
      });
      setMenuGroups((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((i) => (i.id === updated.id ? updated : i)),
        })),
      );
      setIsEditModalOpen(false);
      setEditItem(null);
    } catch (err) {
      console.error("Failed to update grocery item:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await groceryApi.deleteGroceryItem(id);
      setMenuGroups((prev) =>
        prev
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.id !== id),
          }))
          .filter((group) => group.items.length > 0),
      );

      // Dispatch an event so Navbar can refresh its dot count immediately
      window.dispatchEvent(new Event("groceryListUpdated"));
    } catch (err) {
      console.error("Failed to delete grocery item:", err);
    }
  };

  const handleDeleteGroup = async (
    e: React.MouseEvent,
    group: GroceryMenuGroupDTO,
  ) => {
    e.stopPropagation();

    if (!group.meal_plan_id) return;

    setDeleteTargetGroup(group);
  };

  const handleConfirmDeleteGroup = async () => {
    if (!deleteTargetGroup?.meal_plan_id) return;

    try {
      setIsDeleteGroupSubmitting(true);
      await groceryApi.deleteGroceryByMenu(deleteTargetGroup.meal_plan_id);

      setMenuGroups((prev) =>
        prev.filter((g) => {
          const key = g.meal_plan_id || g.meal_plan_name;
          return (
            key !==
            (deleteTargetGroup.meal_plan_id || deleteTargetGroup.meal_plan_name)
          );
        }),
      );
      setExpandedMenus((prev) => {
        const next = { ...prev };
        delete next[
          deleteTargetGroup.meal_plan_id || deleteTargetGroup.meal_plan_name
        ];
        return next;
      });

      window.dispatchEvent(new Event("groceryListUpdated"));
      setDeleteTargetGroup(null);
    } catch (err) {
      console.error("Failed to delete grocery list group:", err);
    } finally {
      setIsDeleteGroupSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  const totalItems = menuGroups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-12 max-w-7xl mx-auto">
      <div className="mb-6 md:mb-8 border-b pb-4 md:pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-gray-900">
            Shopping List
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            Grouped by your saved menus
          </p>
        </div>
      </div>

      {totalItems === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 py-20">
          <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">
            Your shopping list is empty
          </h2>
          <p className="text-gray-500 mt-2">
            Generate a meal plan to automatically build your shopping list.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {menuGroups.map((group) => {
            const groupKey = group.meal_plan_id || group.meal_plan_name;
            const isExpanded = !!expandedMenus[groupKey];
            const orderStatus = group.meal_plan_id
              ? shoppingOrders[group.meal_plan_id]
              : null;
            const groupedItems = group.items.reduce(
              (acc, item) => {
                const category = item.category || "Other";
                if (!acc[category]) acc[category] = [];
                acc[category].push(item);
                return acc;
              },
              {} as Record<string, GroceryItemDTO[]>,
            );

            return (
              <div
                key={groupKey}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div
                  onClick={() => toggleMenuGroup(groupKey)}
                  className="w-full bg-gray-50 px-4 py-3 sm:px-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-y-3 gap-x-4 text-left cursor-pointer transition-colors hover:bg-gray-100/50"
                  aria-expanded={isExpanded}
                >
                  <div className="flex justify-between items-start w-full sm:w-auto">
                    <div>
                      <h2 className="font-semibold text-gray-900 text-sm">
                        {group.meal_plan_name}
                      </h2>
                      {group.start_date && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {group.start_date}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className={`sm:hidden h-5 w-5 text-gray-400 mt-0.5 transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`}
                    />
                  </div>
                  <div className="flex items-center gap-2 sm:ml-3 overflow-x-auto pb-1 sm:pb-0 invisible-scrollbar shrink-0">
                    {group.meal_plan_id && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShoppingTarget(group);
                          }}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 sm:px-2.5 sm:py-1 text-[11px] font-semibold transition-colors shrink-0 ${
                            orderStatus?.status === "processing"
                              ? "border-orange-200 bg-orange-50/60 text-orange-700"
                              : orderStatus?.status === "completed"
                                ? "border-green-200 bg-green-50/60 text-green-700 hover:bg-green-100"
                                : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/15"
                          }`}
                          title={
                            orderStatus?.status === "processing"
                              ? "Going shopping..."
                              : "Go Shopping"
                          }
                        >
                          {orderStatus?.status === "processing" ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                              Going shopping...
                            </>
                          ) : orderStatus?.status === "completed" ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" /> View Cart
                            </>
                          ) : (
                            <>
                              <Store className="h-3.5 w-3.5" /> Go Shopping
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteGroup(e, group)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/60 px-3 py-1.5 sm:px-2.5 sm:py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors shrink-0"
                          title="Delete this shopping list"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <span className="text-xs font-medium text-primary bg-white px-2.5 py-1.5 sm:py-1 rounded-full shadow-sm shrink-0">
                      {group.items.filter((i) => i.is_purchased).length} /{" "}
                      {group.items.length}
                    </span>
                    <ChevronDown
                      className={`hidden sm:block h-4 w-4 text-gray-500 transition-transform shrink-0 ${isExpanded ? "rotate-180" : "rotate-0"}`}
                    />
                  </div>
                </div>

                <div
                  className={`grid transition-all duration-300 ease-in-out overflow-hidden ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    {Object.entries(groupedItems)
                      .sort()
                      .map(([category, catItems]) => (
                        <div
                          key={`${groupKey}-${category}`}
                          className="border-t border-gray-100 first:border-t-0"
                        >
                          <div className="bg-primary/5 px-5 py-2 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900 uppercase tracking-wider text-xs">
                              {category}
                            </h3>
                            <span className="text-[11px] font-medium text-primary bg-white px-2 py-0.5 rounded-full shadow-sm">
                              {catItems.filter((i) => i.is_purchased).length} /{" "}
                              {catItems.length}
                            </span>
                          </div>

                          <ul className="divide-y divide-gray-100">
                            {catItems.map((item) => (
                              <li
                                key={item.id}
                                className={`px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${
                                  item.is_purchased ? "opacity-50" : ""
                                }`}
                                onClick={() => toggleItem(item.id)}
                              >
                                <div className="flex items-center gap-4 min-w-0">
                                  {item.is_purchased ? (
                                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                                  ) : (
                                    <Circle className="h-6 w-6 text-gray-300 shrink-0" />
                                  )}
                                  <span
                                    className={`text-gray-900 font-medium truncate ${
                                      item.is_purchased
                                        ? "line-through text-gray-400"
                                        : ""
                                    }`}
                                  >
                                    {item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full shrink-0 mr-2">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={(e) => handleOpenEdit(e, item)}
                                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                    title="Edit item"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDelete(e, item.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    title="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        className="max-w-md p-6"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Pencil className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Edit Item</h2>
              <p className="text-sm text-gray-500">
                Update shopping list details
              </p>
            </div>
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                >
                  <option value="Produce">Produce</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Meat">Meat</option>
                  <option value="Pantry">Pantry</option>
                  <option value="Frozen">Frozen</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="text"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !editName.trim()}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors text-sm flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Group Modal */}
      <Modal
        isOpen={!!deleteTargetGroup}
        onClose={() => !isDeleteGroupSubmitting && setDeleteTargetGroup(null)}
        className="max-w-md p-6"
      >
        <div className="flex flex-col">
          <div className="flex items-start gap-3 mb-4">
            <div className="mt-0.5 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Delete Shopping List
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                This will permanently remove all items in
                <span className="font-semibold text-gray-900">
                  {" "}
                  {deleteTargetGroup?.meal_plan_name}
                </span>
                .
              </p>
            </div>
          </div>

          <div className="mt-2 flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={isDeleteGroupSubmitting}
              onClick={() => setDeleteTargetGroup(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={isDeleteGroupSubmitting}
              onClick={handleConfirmDeleteGroup}
            >
              {isDeleteGroupSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete all"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Shopping Modal */}
      {shoppingTarget?.meal_plan_id && (
        <ShoppingModal
          isOpen={!!shoppingTarget}
          onClose={() => setShoppingTarget(null)}
          mealPlanId={shoppingTarget.meal_plan_id}
          mealPlanName={shoppingTarget.meal_plan_name}
        />
      )}
    </div>
  );
}
