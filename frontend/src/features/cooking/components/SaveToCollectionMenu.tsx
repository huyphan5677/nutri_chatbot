import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  Collection,
  addRecipeToCollection,
  getCollectionRecipes,
  getCollections,
  removeRecipeFromCollection,
} from "../api/recipesApi";

interface SaveToCollectionMenuProps {
  recipeId: string;
  onClose: () => void;
  onCreateNew: () => void;
}

export const SaveToCollectionMenu = ({
  recipeId,
  onClose,
  onCreateNew,
}: SaveToCollectionMenuProps) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedCollectionIds, setSavedCollectionIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const fetchCols = async () => {
      try {
        const cols = await getCollections();
        setCollections(cols);

        // Check which collections contain this recipe
        // (Not perfectly optimal, but ok for a few collections)
        const savedSets = await Promise.all(
          cols.map(async (c) => {
            const recipes = await getCollectionRecipes(c.id);
            if (recipes.some((r) => r.id === recipeId)) {
              return c.id;
            }
            return null;
          })
        );
        const validIds = savedSets.filter((id): id is string => id !== null);
        setSavedCollectionIds(new Set(validIds));
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCols();
  }, [recipeId]);

  const toggleCollection = async (colId: string, isSaved: boolean) => {
    // Optimistic update
    const newSet = new Set(savedCollectionIds);
    if (isSaved) newSet.delete(colId);
    else newSet.add(colId);
    setSavedCollectionIds(newSet);

    try {
      if (isSaved) {
        await removeRecipeFromCollection(colId, recipeId);
      } else {
        await addRecipeToCollection(colId, recipeId);
      }
    } catch (e) {
      console.error(e);
      // Revert if failed
      if (isSaved) setSavedCollectionIds((prev) => new Set(prev).add(colId));
      else {
        const revert = new Set(savedCollectionIds);
        revert.delete(colId);
        setSavedCollectionIds(revert);
      }
    }
  };

  return (
    <div className="absolute bottom-12 right-0 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 className="font-bold text-gray-900 text-sm">Save recipe to...</h3>
      </div>
      {isLoading ? (
        <div className="p-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="max-h-60 overflow-y-auto p-2">
          {collections.map((col) => {
            const isSaved = savedCollectionIds.has(col.id);
            return (
              <label
                key={col.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                    type="checkbox"
                    className="appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-[#FF5C5C] checked:border-[#FF5C5C] transition-colors cursor-pointer"
                    checked={isSaved}
                    onChange={() => toggleCollection(col.id, isSaved)}
                  />
                  {isSaved && (
                    <svg
                      className="absolute w-3 h-3 text-white pointer-events-none"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 select-none">
                  {col.name}
                </span>
              </label>
            );
          })}
        </div>
      )}
      <div className="p-2 border-t border-gray-100 bg-gray-50">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCreateNew();
          }}
          className="w-full p-2 text-sm font-bold text-[#FF5C5C] hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <span>+ Create new collection</span>
        </button>
      </div>
    </div>
  );
};
