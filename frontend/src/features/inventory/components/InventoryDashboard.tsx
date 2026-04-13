import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Calendar, Check, Loader2, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { inventoryApi, InventoryItemDTO } from "../api/inventoryApi";
import {
  getInventoryCategoryLabel,
  inventoryMessages,
} from "../inventory.messages";

export default function InventoryDashboard() {
  const { locale } = useLocale();
  const copy = inventoryMessages[locale];
  const [items, setItems] = useState<InventoryItemDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expirationDate, setExpirationDate] = useState("");

  // Edit Form State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItemDTO | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editExpirationDate, setEditExpirationDate] = useState("");

  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isRenamingLoading, setIsRenamingLoading] = useState(false);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const data = await inventoryApi.getCurrentInventory();
      setItems(data.items);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await inventoryApi.addInventoryItem({
        name: name.trim(),
        category,
        quantity: quantity.trim() || undefined,
        expiration_date: expirationDate || null,
      });

      setIsModalOpen(false);
      setName("");
      setCategory("");
      setQuantity("");
      setExpirationDate("");

      await fetchInventory();
    } catch (err) {
      console.error("Failed to add item:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (item: InventoryItemDTO) => {
    setEditItem(item);
    setEditName(item.name);
    setEditCategory(item.category || "Other");
    setEditQuantity(item.quantity || "1");
    // Format date for input type="date" if it exists
    if (item.expiration_date) {
      // API might return ISO string or YYYY-MM-DD
      const datePart = item.expiration_date.split("T")[0];
      setEditExpirationDate(datePart);
    } else {
      setEditExpirationDate("");
    }
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !editName.trim()) return;

    try {
      setIsSubmitting(true);
      const updated = await inventoryApi.updateInventoryItem(editItem.id, {
        name: editName.trim(),
        category: editCategory,
        quantity: editQuantity.trim() || undefined,
        expiration_date: editExpirationDate || null,
      });

      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setIsEditModalOpen(false);
      setEditItem(null);
    } catch (err) {
      console.error("Failed to update item:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await inventoryApi.deleteInventoryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const handleRenameConfirm = async (oldName: string) => {
    const trimmedNew = newCategoryName.trim();
    if (!trimmedNew || trimmedNew === oldName) {
      setRenamingCategory(null);
      return;
    }

    try {
      setIsRenamingLoading(true);
      await inventoryApi.renameCategory({
        old_name: oldName,
        new_name: trimmedNew,
      });
      await fetchInventory();
      setRenamingCategory(null);
    } catch (err) {
      console.error("Failed to rename category:", err);
    } finally {
      setIsRenamingLoading(false);
    }
  };

  // Group items
  const groupedItems = items.reduce(
    (acc, item) => {
      const cat = item.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, InventoryItemDTO[]>,
  );

  const allCategories = React.useMemo(() => {
    const defaults = ["Other"];
    const existing = Object.keys(groupedItems).filter(
      (cat) => cat && cat !== "Other",
    );
    return Array.from(new Set([...defaults, ...existing])).sort();
  }, [groupedItems]);

  const commonQuantities = [
    "1",
    "2",
    "100g",
    "200g",
    "1 pack",
    "1 bottle",
    "1 box",
    "1 piece",
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-gray-900 dark:text-white">
            {copy.page.title}
          </h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">
            {copy.page.subtitle}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#FF5C5C] text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-[#ff4040] transition-colors flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <Plus className="w-5 h-5" /> {copy.page.addItems}
        </button>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border text-center border-gray-100 dark:border-slate-800 rounded-2xl md:rounded-3xl p-8 md:p-16 flex flex-col items-center justify-center">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 dark:bg-slate-800 rounded-full flex flex-col items-center justify-center text-gray-300 dark:text-slate-700 mb-4 md:mb-6">
            <Package className="w-10 h-10 md:w-12 md:h-12" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">
            {copy.page.emptyTitle}
          </h2>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 max-w-sm mb-6 md:mb-8 px-4">
            {copy.page.emptyDescription}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(groupedItems).map(([cat, catItems]) => (
            <div
              key={cat}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col"
            >
              <div className="bg-primary/5 dark:bg-slate-800/80 px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center group/header">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {renamingCategory === cat ? (
                    <div className="flex items-center gap-1 w-full mr-2">
                       <input 
                         autoFocus
                         disabled={isRenamingLoading}
                         className="bg-white dark:bg-slate-800 border border-primary/30 dark:border-primary/50 rounded-lg px-3 py-1 text-sm w-full outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white"
                         value={newCategoryName}
                         onChange={e => setNewCategoryName(e.target.value)}
                         onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameConfirm(cat);
                            if (e.key === 'Escape') setRenamingCategory(null);
                         }}
                       />
                       <button 
                         disabled={isRenamingLoading}
                         onClick={() => handleRenameConfirm(cat)} 
                         className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                       >
                         {isRenamingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                       </button>
                       <button 
                         disabled={isRenamingLoading}
                         onClick={() => setRenamingCategory(null)} 
                         className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                       >
                         <X className="w-4 h-4" />
                       </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100 uppercase tracking-wider text-sm truncate">
                        {getInventoryCategoryLabel(cat, locale)}
                      </h3>
                      <button 
                        onClick={() => {
                          setRenamingCategory(cat);
                          setNewCategoryName(cat);
                        }}
                        className="opacity-0 group-hover/header:opacity-100 p-1.5 text-gray-400 hover:text-primary transition-all rounded-lg hover:bg-white/50 dark:hover:bg-slate-800"
                        title={copy.actions.renameCategory}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
                 {renamingCategory !== cat && (
                  <span className="text-xs font-medium text-primary dark:text-rose-400 bg-white dark:bg-slate-900 px-2 py-1 rounded-full shadow-sm shrink-0">
                    {copy.page.itemsCount(catItems.length)}
                  </span>
                )}
              </div>
              <ul className="divide-y divide-gray-100 flex-1">
                {catItems.map((item) => (
                  <li key={item.id} className="px-5 py-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col flex-1 min-w-0 mr-4">
                        <span className="text-gray-900 dark:text-white font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                          {item.name}
                        </span>
                        {item.expiration_date && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {copy.page.expiresLabel}{" "}
                            {new Date(
                              item.expiration_date,
                            ).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full mr-2">
                          {item.quantity}
                        </span>
                         <button
                           onClick={() => handleOpenEdit(item)}
                           className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-md transition-colors"
                           title={copy.actions.editItem}
                         >
                           <Pencil className="w-4 h-4" />
                         </button>
                         <button
                           onClick={() => handleDelete(item.id)}
                           className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-md transition-colors"
                           title={copy.actions.removeItem}
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-md p-6"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {copy.addModal.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{copy.addModal.subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {copy.form.itemName}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={copy.form.itemNamePlaceholder}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {copy.form.category}
                </label>
                <input
                  list="category-options"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={copy.form.categoryPlaceholder}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-900 dark:text-white"
                />
                <datalist id="category-options">
                  {allCategories.map((cat) => (
                    <option
                      key={cat}
                      value={cat}
                      label={getInventoryCategoryLabel(cat, locale)}
                    />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {copy.form.quantity}
                </label>
                <input
                  type="text"
                  list="quantity-options"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={copy.form.quantityPlaceholder}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-900 dark:text-white"
                />
                <datalist id="quantity-options">
                  {commonQuantities.map((q) => (
                    <option key={q} value={q} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {copy.form.expirationDate}{" "}
                <span className="text-gray-400 dark:text-gray-500 focus:outline-none font-normal">
                  {copy.form.optional}
                </span>
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-600 dark:text-gray-300"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors text-sm"
              >
                {copy.actions.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors text-sm flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  copy.actions.addItem
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        className="max-w-md p-6"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Pencil className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {copy.editModal.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{copy.editModal.subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {copy.form.itemName}
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {copy.form.category}
                </label>
                <input
                  list="edit-category-options"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder={copy.form.categoryPlaceholder}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-900 dark:text-white"
                />
                <datalist id="edit-category-options">
                  {allCategories.map((cat) => (
                    <option
                      key={cat}
                      value={cat}
                      label={getInventoryCategoryLabel(cat, locale)}
                    />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {copy.form.quantity}
                </label>
                <input
                  type="text"
                  list="edit-quantity-options"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  placeholder={copy.form.quantityPlaceholder}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-900 dark:text-white"
                />
                <datalist id="edit-quantity-options">
                  {commonQuantities.map((q) => (
                    <option key={q} value={q} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {copy.form.expirationDate}{" "}
                <span className="text-gray-400 dark:text-gray-500 focus:outline-none font-normal">
                  {copy.form.optional}
                </span>
              </label>
              <input
                type="date"
                value={editExpirationDate}
                onChange={(e) => setEditExpirationDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-600 dark:text-gray-300"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors text-sm"
              >
                {copy.actions.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !editName.trim()}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors text-sm flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  copy.actions.saveChanges
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
