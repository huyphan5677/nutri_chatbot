import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getApiUrl } from "@/shared/api/client";
import { useLocale } from "@/shared/i18n/LocaleContext";
import {
  AlertTriangle,
  Clock,
  Edit3,
  Filter,
  Globe,
  Heart,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Collection,
  Recipe,
  addRecipeToCollection,
  deleteRecipe,
  getCollectionRecipes,
  getCollections,
  removeRecipeFromCollection,
  searchRecipes,
  updateRecipe,
  webSearchRecipe,
} from "../api/recipesApi";
import {
  cookingMessages,
  getCollectionDisplayName,
  getRecipeTypeDisplayName,
  isFavoritesCollection,
  isTryLaterCollection,
} from "../cooking.messages";
import { CreateCollectionModal } from "../components/CreateCollectionModal";
import { FilterModal } from "../components/FilterModal";
import { RecipeDetailModal } from "../components/RecipeDetailModal";

export const WhatsCookingPage = () => {
  const { locale } = useLocale();
  const messages = cookingMessages[locale];
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{ full_name: string } | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const recipesPerPage = 12;

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<{ type?: string; maxTime?: number }>(
    {},
  );

  const [collections, setCollections] = useState<Collection[]>([]);
  const [favoritesCollectionId, setFavoritesCollectionId] = useState<
    string | null
  >(null);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<Set<string>>(
    new Set(),
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [webSearchError, setWebSearchError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);
  const [isUpdatingRecipe, setIsUpdatingRecipe] = useState(false);
  const [deleteTargetRecipe, setDeleteTargetRecipe] = useState<Recipe | null>(
    null,
  );
  const [isDeletingRecipe, setIsDeletingRecipe] = useState(false);

  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editPrepTime, setEditPrepTime] = useState("");
  const [editCookTime, setEditCookTime] = useState("");
  const [editCalories, setEditCalories] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editInstructions, setEditInstructions] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("nutri_token");
      if (!token) return;
      try {
        const res = await fetch(`${getApiUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (e) {
        console.error(messages.listPage.loadUserError, e);
      }
    };
    fetchUser();
  }, [messages.listPage.loadUserError]);

  const fetchRecipes = async (
    searchQuery?: string,
    searchFilters?: typeof filters,
    page: number = currentPage,
  ) => {
    setIsLoading(true);
    setWebSearchError(null);
    try {
      const q = searchQuery !== undefined ? searchQuery : query;
      const f = searchFilters !== undefined ? searchFilters : filters;

      const data = await searchRecipes(
        q,
        f.type,
        f.maxTime,
        page,
        recipesPerPage,
      );
      setRecipes(data.recipes);
      setTotalRecipes(data.total || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRecipes("", {}, 1);
    fetchUserCollections();
  }, []);

  useEffect(() => {
    if (currentPage === 1) return;
    fetchRecipes(query, filters, currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchUserCollections = async () => {
    try {
      const cols = await getCollections();
      setCollections(cols);
      const favCol = cols.find((c) => isFavoritesCollection(c.name));
      if (favCol) {
        setFavoritesCollectionId(favCol.id);
        const favs = await getCollectionRecipes(favCol.id);
        setFavoriteRecipeIds(new Set(favs.map((r) => r.id)));
      }
    } catch (e) {
      console.error(messages.listPage.loadCollectionsError, e);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation(); // prevent modal opening
    if (!favoritesCollectionId) return;

    try {
      if (favoriteRecipeIds.has(recipeId)) {
        await removeRecipeFromCollection(favoritesCollectionId, recipeId);
        setFavoriteRecipeIds((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
      } else {
        await addRecipeToCollection(favoritesCollectionId, recipeId);
        setFavoriteRecipeIds((prev) => {
          const next = new Set(prev);
          next.add(recipeId);
          return next;
        });
      }
      // Re-fetch collections to update counts
      const cols = await getCollections();
      setCollections(cols);
    } catch (e) {
      console.error(messages.listPage.toggleFavoriteError, e);
    }
  };

  // Handle hash navigation scrolling
  useEffect(() => {
    if (location.hash === "#discover-recipes") {
      setTimeout(() => {
        const element = document.getElementById("discover-recipes");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [location.hash, recipes]);

  const scrollToResults = () => {
    setTimeout(() => {
      const el = document.getElementById("discover-recipes");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      fetchRecipes(query, filters, 1).then(scrollToResults);
    }
  };

  const handleApplyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
    fetchRecipes(query, newFilters, 1).then(scrollToResults);
  };

  const handleWebSearch = async () => {
    if (!query.trim()) return;
    setIsWebSearching(true);
    setWebSearchError(null);
    try {
      await webSearchRecipe(query);
      await fetchRecipes(query, filters, 1);
      scrollToResults();
    } catch (error: any) {
      setWebSearchError(error.message);
    } finally {
      setIsWebSearching(false);
    }
  };

  const openEditRecipe = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    setEditRecipe(recipe);
    setEditName(recipe.name || "");
    setEditType(recipe.type || "");
    setEditPrepTime(recipe.prep_time_minutes?.toString() || "");
    setEditCookTime(recipe.cook_time_minutes?.toString() || "");
    setEditCalories(recipe.total_calories?.toString() || "");
    setEditDescription(recipe.description || "");
    setEditInstructions(recipe.instructions || "");
  };

  const handleSaveRecipeEdit = async () => {
    if (!editRecipe || !editName.trim()) return;

    try {
      setIsUpdatingRecipe(true);
      const updated = await updateRecipe(editRecipe.id, {
        name: editName.trim(),
        type: editType.trim() || null,
        prep_time_minutes: editPrepTime.trim() ? Number(editPrepTime) : null,
        cook_time_minutes: editCookTime.trim() ? Number(editCookTime) : null,
        total_calories: editCalories.trim() ? Number(editCalories) : null,
        description: editDescription.trim() || null,
        instructions: editInstructions.trim() || null,
      });

      setRecipes((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      setSelectedRecipe((prev) =>
        prev && prev.id === updated.id ? updated : prev,
      );
      setEditRecipe(null);
    } catch (err: any) {
      setWebSearchError(err?.message || messages.listPage.updateRecipeError);
    } finally {
      setIsUpdatingRecipe(false);
    }
  };

  const requestDeleteRecipe = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    setDeleteTargetRecipe(recipe);
  };

  const handleConfirmDeleteRecipe = async () => {
    if (!deleteTargetRecipe) return;
    try {
      setIsDeletingRecipe(true);
      await deleteRecipe(deleteTargetRecipe.id);
      setRecipes((prev) => prev.filter((r) => r.id !== deleteTargetRecipe.id));
      setSelectedRecipe((prev) =>
        prev && prev.id === deleteTargetRecipe.id ? null : prev,
      );
      const nextTotal = Math.max(0, totalRecipes - 1);
      setTotalRecipes(nextTotal);
      const totalPagesAfterDelete = Math.max(
        1,
        Math.ceil(nextTotal / recipesPerPage),
      );
      const targetPage = Math.min(currentPage, totalPagesAfterDelete);
      setDeleteTargetRecipe(null);
      await fetchRecipes(query, filters, targetPage);
    } catch (err: any) {
      setWebSearchError(err?.message || messages.listPage.deleteRecipeError);
    } finally {
      setIsDeletingRecipe(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRecipes / recipesPerPage));

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
      />

      {/* Recipe Details Modal */}
      <RecipeDetailModal
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        recipe={selectedRecipe}
      />

      {/* Edit Recipe Modal */}
      <Modal
        isOpen={!!editRecipe}
        onClose={() => !isUpdatingRecipe && setEditRecipe(null)}
        className="max-w-2xl p-6"
      >
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">
            {messages.editModal.title}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={messages.editModal.namePlaceholder}
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50"
            />
            <input
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              placeholder={messages.editModal.typePlaceholder}
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50"
            />
            <input
              value={editPrepTime}
              onChange={(e) =>
                setEditPrepTime(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder={messages.editModal.prepTimePlaceholder}
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50"
            />
            <input
              value={editCookTime}
              onChange={(e) =>
                setEditCookTime(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder={messages.editModal.cookTimePlaceholder}
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50"
            />
            <input
              value={editCalories}
              onChange={(e) =>
                setEditCalories(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder={messages.editModal.caloriesPlaceholder}
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 sm:col-span-2"
            />
          </div>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder={messages.editModal.descriptionPlaceholder}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50"
          />
          <textarea
            value={editInstructions}
            onChange={(e) => setEditInstructions(e.target.value)}
            placeholder={messages.editModal.instructionsPlaceholder}
            rows={5}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50"
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={isUpdatingRecipe}
              onClick={() => setEditRecipe(null)}
            >
              {messages.editModal.cancel}
            </Button>
            <Button
              className="flex-1 bg-[#FF5C5C] hover:bg-[#ff4040] text-white"
              disabled={isUpdatingRecipe || !editName.trim()}
              onClick={handleSaveRecipeEdit}
            >
              {isUpdatingRecipe ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> {messages.editModal.save}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Recipe Modal */}
      <Modal
        isOpen={!!deleteTargetRecipe}
        onClose={() => !isDeletingRecipe && setDeleteTargetRecipe(null)}
        className="max-w-md p-6"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {messages.deleteModal.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {deleteTargetRecipe ? (
                  <span className="font-semibold text-gray-900">
                    {messages.deleteModal.description(deleteTargetRecipe.name)}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={isDeletingRecipe}
              onClick={() => setDeleteTargetRecipe(null)}
            >
              {messages.deleteModal.cancel}
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeletingRecipe}
              onClick={handleConfirmDeleteRecipe}
            >
              {isDeletingRecipe ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4" /> {messages.deleteModal.confirm}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Collection Modal */}
      <CreateCollectionModal
        isOpen={isCreateCollectionOpen}
        onClose={() => setIsCreateCollectionOpen(false)}
        onCreated={(newCol: Collection) => {
          setCollections((prev) => [...prev, newCol]);
          setIsCreateCollectionOpen(false);
        }}
      />

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative overflow-hidden bg-warm-50 dark:bg-slate-950 pb-12 pt-12 px-6 border-b border-gray-200 dark:border-slate-800 transition-colors duration-500"
      >
        {/* Interactive Spotlight Effect */}
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.4), transparent 40%)`,
          }}
        />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-orange-200/40 to-transparent rounded-full blur-[80px] -z-10 opacity-60 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 font-serif">
              {messages.listPage.title}
            </h1>
            <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
              {messages.listPage.subtitle}
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto mb-2 relative z-10">
            <div className="bg-white dark:bg-slate-900 rounded-full shadow-lg p-2 flex flex-wrap sm:flex-nowrap items-center border border-gray-100 dark:border-slate-800">
              {/* Label Badge */}
              <div className="px-6 py-3 bg-[#FF5C5C] text-white rounded-full font-bold flex items-center gap-2 mb-2 sm:mb-0">
                {messages.listPage.badge}
              </div>

              {/* Input */}
              <div className="flex-1 px-4 flex items-center gap-3 w-full sm:w-auto">
                <Search className="text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={messages.listPage.searchPlaceholder}
                  className="w-full outline-none text-gray-700 dark:text-slate-200 bg-transparent placeholder-gray-400 dark:placeholder:text-gray-500"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                {isLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>

              {/* Filters */}
              <button
                onClick={() => setIsFilterModalOpen(true)}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white flex items-center gap-2 border-l border-gray-100 dark:border-slate-800 relative"
              >
                {messages.listPage.filters} <Filter className="w-4 h-4" />
                {(filters.type || filters.maxTime) && (
                  <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            </div>
            {/* Web Search Button - always visible when there's a query */}
            {query.trim() && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={handleWebSearch}
                  disabled={isWebSearching}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-[#FF5C5C] to-[#ff8f5c] hover:from-[#ff4040] hover:to-[#ff7a40] shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isWebSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                  {isWebSearching
                    ? messages.listPage.searchingWeb
                    : messages.listPage.searchWebPrompt}
                </button>
              </div>
            )}
            {webSearchError && (
              <p className="text-red-500 text-sm mt-3 text-center">
                {webSearchError}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Collections Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {messages.listPage.collections}
            </h2>
            <button className="text-sm font-medium text-gray-500 hover:text-primary transition-colors">
              {messages.listPage.seeAll} →
            </button>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {collections.map((col) => {
              const Icon =
                isFavoritesCollection(col.name)
                  ? Heart
                  : isTryLaterCollection(col.name)
                    ? Clock
                    : Globe;
              return (
                <div
                  key={col.id}
                  onClick={() => navigate(`/collections/${col.id}`)}
                  className="min-w-[160px] bg-white dark:bg-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 border border-gray-100 dark:border-slate-800 hover:shadow-md transition-shadow cursor-pointer aspect-square"
                >
                  <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-300">
                    <Icon
                      className={`w-8 h-8 ${isFavoritesCollection(col.name) ? "text-red-500 fill-current" : ""}`}
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">
                      {getCollectionDisplayName(col.name, locale)}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {messages.shared.recipeCount(col.recipe_count)}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Create Collection */}
            <div
              onClick={() => setIsCreateCollectionOpen(true)}
              className="min-w-[160px] border border-dashed border-red-200 bg-red-50/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-red-50 transition-colors cursor-pointer aspect-square text-red-500"
            >
              <Plus className="w-8 h-8" />
              <span className="font-bold text-sm">
                {messages.listPage.createCollection}
              </span>
            </div>
          </div>
        </div>

        {/* Discover Section */}
        <div id="discover-recipes" className="scroll-mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {messages.listPage.discoverRecipes}
            </h2>
          </div>

          {recipes.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
                {recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="group cursor-pointer"
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <div className="relative aspect-square mb-4">
                      <div className="absolute inset-0 rounded-full overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow border-4 border-white dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                        <div className="absolute inset-0 bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-300 dark:text-gray-500">
                          <span>{messages.shared.noImage}</span>
                        </div>
                        {recipe.image_url && (
                          <img
                            src={recipe.image_url}
                            alt={recipe.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=500";
                            }}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        )}
                      </div>
                      {recipe.prep_time_minutes && (
                        <div className="absolute bottom-2 right-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-bold text-gray-900 dark:text-white shadow-md flex items-center gap-1 z-10 pointer-events-none border border-gray-100 dark:border-slate-700">
                          ⏱️ {recipe.prep_time_minutes}{" "}
                          {messages.shared.minuteUnit}
                        </div>
                      )}
                      <button
                        onClick={(e) => toggleFavorite(e, recipe.id)}
                        className="absolute top-2 right-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-3 rounded-full shadow-md hover:scale-110 transition-transform z-10 border border-gray-100 dark:border-slate-700 group-hover:bg-white dark:group-hover:bg-slate-700"
                      >
                        <Heart
                          className={`w-5 h-5 transition-colors duration-300 ${favoriteRecipeIds.has(recipe.id) ? "text-red-500 fill-current" : "text-blue-400"}`}
                        />
                      </button>

                      <div className="absolute left-2 right-2 bottom-2 z-10 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => openEditRecipe(e, recipe)}
                          className="inline-flex items-center gap-1 rounded-full bg-white/95 dark:bg-slate-800/95 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-200 border border-gray-100 dark:border-slate-700 shadow-sm hover:bg-white dark:hover:bg-slate-700"
                        >
                          <Edit3 className="w-3.5 h-3.5" />{" "}
                          {messages.listPage.edit}
                        </button>
                        <button
                          onClick={(e) => requestDeleteRecipe(e, recipe)}
                          className="inline-flex items-center gap-1 rounded-full bg-red-600/95 px-3 py-1.5 text-xs font-semibold text-white border border-red-600 shadow-sm hover:bg-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />{" "}
                          {messages.listPage.delete}
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-center group-hover:text-primary transition-colors leading-tight px-2">
                      {recipe.name}
                    </h3>
                    {recipe.type && (
                      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {getRecipeTypeDisplayName(recipe.type, locale)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  disabled={currentPage <= 1 || isLoading}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  {messages.listPage.previous}
                </Button>
                <span className="px-3 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl">
                  {messages.shared.pageIndicator(currentPage, totalPages)}
                </span>
                <Button
                  variant="secondary"
                  disabled={currentPage >= totalPages || isLoading}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  {messages.listPage.next}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <Globe className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {messages.listPage.noRecipesTitle}
              </h3>
              {query ? (
                <>
                  <p className="text-gray-500 mb-6 whitespace-pre-line">
                    {messages.listPage.noRecipesDescription(query)}
                  </p>
                  <Button
                    onClick={handleWebSearch}
                    disabled={isWebSearching}
                    className="bg-[#FF5C5C] hover:bg-[#ff4040] text-white rounded-full px-8 flex items-center gap-2 mx-auto"
                  >
                    {isWebSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {isWebSearching
                      ? messages.listPage.searchingWeb
                      : messages.listPage.searchTheWeb}
                  </Button>
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  {messages.listPage.noRecipesHint}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
