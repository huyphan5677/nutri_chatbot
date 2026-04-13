import { useLocale } from "@/shared/i18n/LocaleContext";
import { Bookmark, Clock, Flame, Globe, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Recipe } from "../api/recipesApi";
import {
  cookingMessages,
  getRecipeTypeDisplayName,
} from "../cooking.messages";
import { CreateCollectionModal } from "./CreateCollectionModal";
import { SaveToCollectionMenu } from "./SaveToCollectionMenu";

interface RecipeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  isOpen,
  onClose,
  recipe,
}) => {
  const { locale } = useLocale();
  const sharedMessages = cookingMessages[locale].shared;
  const messages = cookingMessages[locale].detailModal;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Close menus when closing modal or switching recipes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsCreateOpen(false);
  }, [recipe, isOpen]);

  if (!isOpen || !recipe) return null;

  return (
    <>
      <CreateCollectionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => setIsCreateOpen(false)}
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/80 backdrop-blur text-gray-700 hover:text-black hover:bg-white p-2 rounded-full transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Image */}
          <div className="h-64 bg-gray-100 relative w-full overflow-hidden rounded-t-3xl">
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1000";
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                <Flame className="w-12 h-12 opacity-50" />
                <span>{sharedMessages.noImageAvailable}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-8">
            {recipe.type && (
              <span className="inline-block px-3 py-1 bg-red-100 text-[#FF5C5C] text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                {getRecipeTypeDisplayName(recipe.type, locale)}
              </span>
            )}

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-3xl font-bold text-gray-900 font-serif leading-tight">
                {recipe.name}
              </h2>

              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-bold text-gray-700"
                >
                  <Bookmark className="w-4 h-4" />
                  {messages.save}
                </button>

                {isMenuOpen && (
                  <SaveToCollectionMenu
                    recipeId={recipe.id}
                    onClose={() => setIsMenuOpen(false)}
                    onCreateNew={() => {
                      setIsMenuOpen(false);
                      setIsCreateOpen(true);
                    }}
                  />
                )}
              </div>
            </div>

            {recipe.description && (
              <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                {recipe.description}
              </p>
            )}

            {/* Meta Stats */}
            <div className="flex flex-wrap gap-4 mb-8">
              {recipe.prep_time_minutes && (
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">
                      {messages.prepTime}
                    </p>
                    <p className="font-bold text-gray-900">
                      {recipe.prep_time_minutes} {sharedMessages.minuteUnit}
                    </p>
                  </div>
                </div>
              )}
              {recipe.cook_time_minutes && (
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl">
                  <Flame className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">
                      {messages.cookTime}
                    </p>
                    <p className="font-bold text-gray-900">
                      {recipe.cook_time_minutes} {sharedMessages.minuteUnit}
                    </p>
                  </div>
                </div>
              )}
              {recipe.total_calories && (
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl">
                  <div className="text-xl">🔥</div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">
                      {messages.calories}
                    </p>
                    <p className="font-bold text-gray-900">
                      {recipe.total_calories} kcal
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            {recipe.instructions ? (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  {messages.instructions}
                </h3>
                <div className="bg-[#FFFBF6] p-6 rounded-3xl border border-orange-100">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {recipe.instructions}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-8 p-6 bg-gray-50 rounded-3xl text-center text-gray-500">
                {messages.noInstructions}
              </div>
            )}

            {/* Source Line */}
            {recipe.source_url && (
              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Globe className="w-4 h-4" />
                  <span>{messages.foundViaWeb}</span>
                </div>
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#FF5C5C] font-bold text-sm hover:underline"
                >
                  {messages.viewSource}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
