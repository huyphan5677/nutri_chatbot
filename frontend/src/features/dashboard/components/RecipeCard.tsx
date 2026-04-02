import { Button } from "@/components/ui/Button";
import { Clock, Flame, Repeat } from "lucide-react";
import React from "react";

interface Recipe {
  id: number;
  title: string;
  image_url?: string;
  prep_time_minutes: number;
  calories?: number;
  tags?: string[];
}

interface RecipeCardProps {
  recipe: Recipe;
  mealType: string;
  onSwap?: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  mealType,
  onSwap,
}) => {
  return (
    <div className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
      {/* Image */}
      <div className="relative h-32 overflow-hidden">
        <img
          src={recipe.image_url || "/hero-food.png"}
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-semibold text-gray-700">
          {mealType}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className="font-bold text-gray-900 leading-tight mb-2 line-clamp-1"
          title={recipe.title}
        >
          {recipe.title}
        </h3>

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {recipe.prep_time_minutes}m
          </div>
          {recipe.calories && (
            <div className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-500" />
              {recipe.calories} kcal
            </div>
          )}
        </div>

        {onSwap && (
          <Button
            variant="ghost"
            onClick={onSwap}
            className="w-full h-8 text-xs text-primary hover:bg-primary/5 hover:text-primary gap-1"
          >
            <Repeat className="w-3 h-3" /> Swap Meal
          </Button>
        )}
      </div>
    </div>
  );
};
