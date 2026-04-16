import { profileMessages } from "@/features/profile/profile.messages";
import { getApiUrl } from "@/shared/api/client";
import { useLocale } from "@/shared/i18n/LocaleContext";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Edit3,
  Globe,
  Heart,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HouseholdSetupPage from "../components/HouseholdSetupPage";
import { ProfileSidebar } from "../components/ProfileSidebar";

import ContactPreferencesPage from "../components/ContactPreferencesPage";
import DisplaySettingsPage from "../components/DisplaySettingsPage";
import MyAccountsPage from "../components/MyAccountsPage";
import PrivacySettingsPage from "../components/PrivacySettingsPage";
import RewardsPage from "../components/RewardsPage";
import ShoppingListHistoryPage from "../components/ShoppingListHistoryPage";

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
} from "../../cooking/api/recipesApi";

import {
  cookingMessages,
  getCollectionDisplayName,
  getRecipeTypeDisplayName,
  isFavoritesCollection,
  isTryLaterCollection,
} from "../../cooking/cooking.messages";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CreateCollectionModal } from "../../cooking/components/CreateCollectionModal";
import { RecipeDetailModal } from "../../cooking/components/RecipeDetailModal";

export const ProfilePage = () => {
  const { locale } = useLocale();
  const text = profileMessages[locale].page;
  const cookingText = cookingMessages[locale];
  const navigate = useNavigate();

  const [userName, setUserName] = useState(text.accountTitle);
  const [activeTab, setActiveTab] = useState(0);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favoritesCollectionId, setFavoritesCollectionId] = useState<
    string | null
  >(null);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<Set<string>>(
    new Set(),
  );

  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
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

  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);

  useEffect(() => {
    setUserName((current) =>
      current === "My Account" || current === "Tài khoản của tôi"
        ? text.accountTitle
        : current,
    );
  }, [text.accountTitle]);

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
          setUserName(data.full_name);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
    fetchUserCollections();
    fetchUserRecipes();
  }, []);

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
      console.error(e);
    }
  };

  const fetchUserRecipes = async () => {
    setIsLoadingRecipes(true);
    try {
      const data = await searchRecipes("", undefined, undefined, 1, 12);
      setRecipes(data.recipes);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
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
      fetchUserCollections();
    } catch (e) {
      console.error(e);
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
      console.error(err);
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
      setDeleteTargetRecipe(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsDeletingRecipe(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {cookingText.editModal.title}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={cookingText.editModal.namePlaceholder}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500"
            />
            <input
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              placeholder={cookingText.editModal.typePlaceholder}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500"
            />
            <input
              value={editPrepTime}
              onChange={(e) =>
                setEditPrepTime(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder={cookingText.editModal.prepTimePlaceholder}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500"
            />
            <input
              value={editCookTime}
              onChange={(e) =>
                setEditCookTime(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder={cookingText.editModal.cookTimePlaceholder}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500"
            />
            <input
              value={editCalories}
              onChange={(e) =>
                setEditCalories(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder={cookingText.editModal.caloriesPlaceholder}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500 sm:col-span-2"
            />
          </div>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder={cookingText.editModal.descriptionPlaceholder}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500"
          />
          <textarea
            value={editInstructions}
            onChange={(e) => setEditInstructions(e.target.value)}
            placeholder={cookingText.editModal.instructionsPlaceholder}
            rows={5}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500"
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={isUpdatingRecipe}
              onClick={() => setEditRecipe(null)}
            >
              {cookingText.editModal.cancel}
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
                  <Save className="w-4 h-4" /> {cookingText.editModal.save}
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
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {cookingText.deleteModal.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {deleteTargetRecipe ? (
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {cookingText.deleteModal.description(
                      deleteTargetRecipe.name,
                    )}
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
              {cookingText.deleteModal.cancel}
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
                  <Trash2 className="w-4 h-4" />{" "}
                  {cookingText.deleteModal.confirm}
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

      <div className="flex flex-col md:flex-row flex-1 max-w-7xl mx-auto w-full">
        <ProfileSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userName={userName}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-12 overflow-y-auto bg-white dark:bg-slate-950 rounded-t-3xl md:rounded-none -mt-4 md:mt-0 relative z-0 md:bg-transparent shadow-[0_-4px_20px_rgba(0,0,0,0.02)] md:shadow-none dark:shadow-none transition-colors duration-300">
          {/* Tab 0: My Profile */}
          {activeTab === 0 && (
            <div className="flex flex-col gap-8 md:gap-12 pt-4">
              {/* Collections Section */}
              <div>
                <div className="flex justify-between items-center mb-4 md:mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-50 mb-2">
                    {text.collections}
                  </h2>
                  <button
                    onClick={() => navigate("/cooking")}
                    className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-primary flex items-center gap-1"
                  >
                    {text.seeAll}{" "}
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {collections.map((col) => {
                    const Icon = isFavoritesCollection(col.name)
                      ? Heart
                      : isTryLaterCollection(col.name)
                        ? Clock
                        : Globe;
                    return (
                      <div
                        key={col.id}
                        onClick={() => navigate(`/collections/${col.id}`)}
                        className="bg-white dark:bg-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 border border-gray-100 dark:border-slate-800 hover:shadow-md transition-shadow cursor-pointer aspect-square"
                      >
                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-300">
                          <Icon
                            className={`w-8 h-8 ${isFavoritesCollection(col.name) ? "text-red-500 fill-current" : ""}`}
                          />
                        </div>
                        <div className="text-center w-full">
                          <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">
                            {getCollectionDisplayName(col.name, locale)}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {cookingText.shared.recipeCount(col.recipe_count)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div
                    onClick={() => setIsCreateCollectionOpen(true)}
                    className="border border-dashed border-red-200 bg-red-50/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-red-50 transition-colors cursor-pointer aspect-square text-red-500"
                  >
                    <Plus className="w-8 h-8" />
                    <span className="font-bold text-sm text-center">
                      {cookingText.listPage.createCollection}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Recipes Section */}
              <div>
                <div className="flex justify-between items-center mb-4 md:mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-50 mb-2">
                    {text.myRecipes}
                  </h2>
                  <button
                    onClick={() => navigate("/cooking")}
                    className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-primary flex items-center gap-1"
                  >
                    {text.seeAll}{" "}
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
                {isLoadingRecipes ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
                    {recipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="group cursor-pointer"
                        onClick={() => setSelectedRecipe(recipe)}
                      >
                        <div className="relative aspect-square mb-4">
                          <div className="absolute inset-0 rounded-full overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow border-4 border-white dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                            <div className="absolute inset-0 bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-300 dark:text-gray-600">
                              <span>{cookingText.shared.noImage}</span>
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
                              {cookingText.shared.minuteUnit}
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

                          <div className="absolute left-2 right-2 bottom-2 z-10 flex flex-col sm:flex-row items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => openEditRecipe(e, recipe)}
                              className="inline-flex items-center justify-center w-full gap-1 rounded-full bg-white/95 dark:bg-slate-800/95 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-200 border border-gray-100 dark:border-slate-700 shadow-sm hover:bg-white dark:hover:bg-slate-700"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">
                                {cookingText.listPage.edit}
                              </span>
                            </button>
                            <button
                              onClick={(e) => requestDeleteRecipe(e, recipe)}
                              className="inline-flex items-center justify-center w-full gap-1 rounded-full bg-red-600/95 px-3 py-1.5 text-xs font-semibold text-white border border-red-600 shadow-sm hover:bg-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">
                                {cookingText.listPage.delete}
                              </span>
                            </button>
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-center group-hover:text-primary transition-colors leading-tight px-2 line-clamp-2">
                          {recipe.name}
                        </h3>
                        {recipe.type && (
                          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {getRecipeTypeDisplayName(recipe.type, locale)}
                          </p>
                        )}
                      </div>
                    ))}

                    <div className="border border-dashed border-red-200 bg-red-50/30 rounded-[2rem] flex flex-col items-center justify-center hover:bg-red-50 transition-colors cursor-pointer aspect-square text-red-500">
                      <Plus className="w-8 h-8 mb-2 md:mb-4" />
                      <span className="font-bold text-xs md:text-sm">
                        {text.addRecipe}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 1: Family & Kitchen Setup */}
          {activeTab === 1 && <HouseholdSetupPage />}

          {/* Tab 2: My Accounts */}
          {activeTab === 2 && <MyAccountsPage />}

          {/* Tab 3: Shopping Lists History */}
          {activeTab === 3 && <ShoppingListHistoryPage />}

          {/* Tab 4: Rewards */}
          {activeTab === 4 && <RewardsPage />}

          {/* Tab 5: Privacy Settings */}
          {activeTab === 5 && <PrivacySettingsPage />}

          {/* Tab 6: Display Settings */}
          {activeTab === 6 && <DisplaySettingsPage />}

          {/* Tab 7: Contact Preferences */}
          {activeTab === 7 && <ContactPreferencesPage />}
        </main>
      </div>
    </div>
  );
};
