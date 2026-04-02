import { Button } from "@/components/ui/Button";
import { ArrowLeft, Globe, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Collection,
  Recipe,
  getCollectionRecipes,
  getCollections,
} from "../api/recipesApi";
import { RecipeDetailModal } from "../components/RecipeDetailModal";

export const CollectionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [allCols, colRecipes] = await Promise.all([
          getCollections(),
          getCollectionRecipes(id),
        ]);
        const found = allCols.find((c) => c.id === id);
        if (found) setCollection(found);
        setRecipes(colRecipes);
      } catch (e) {
        console.error("Failed to load collection details", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFBF6] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF5C5C]" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-[#FFFBF6] flex flex-col items-center justify-center pt-20">
        <Globe className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Collection not found
        </h2>
        <Button
          onClick={() => navigate("/cooking")}
          className="bg-[#FF5C5C] hover:bg-[#ff4040]"
        >
          Back to Recipes
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF6]">
      <RecipeDetailModal
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        recipe={selectedRecipe}
      />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate("/cooking")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Collections
        </button>

        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 font-serif">
            {collection.name}
          </h1>
          <p className="text-gray-500">
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} saved
          </p>
        </div>

        {recipes.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="group cursor-pointer"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <div className="relative aspect-square mb-4">
                  <div className="absolute inset-0 rounded-full overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow border-4 border-white bg-gray-50">
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-300">
                      <span>No image</span>
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
                    <div className="absolute bottom-2 right-2 bg-white px-3 py-1.5 rounded-full text-xs font-bold text-gray-900 shadow-md flex items-center gap-1 z-10 pointer-events-none border border-gray-100">
                      ⏱️ {recipe.prep_time_minutes} mn
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 text-center group-hover:text-primary transition-colors leading-tight px-2">
                  {recipe.name}
                </h3>
                {recipe.type && (
                  <p className="text-center text-xs text-gray-500 mt-1">
                    {recipe.type}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              It's empty here!
            </h3>
            <p className="text-gray-500 mb-6">
              You haven't added any recipes to this collection yet.
            </p>
            <Button
              onClick={() => navigate("/cooking#discover-recipes")}
              className="bg-[#FF5C5C] hover:bg-[#ff4040] text-white rounded-full px-8"
            >
              Discover Recipes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
