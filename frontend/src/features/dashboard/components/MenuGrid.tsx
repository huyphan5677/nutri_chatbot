import React from "react";
import { RecipeCard } from "./RecipeCard";

interface MenuGridProps {
  menu: any[]; // Using any for speed, should use proper type
  onSwap: (day: string, type: string) => void;
}

export const MenuGrid: React.FC<MenuGridProps> = ({ menu, onSwap }) => {
  // Group by Day
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <div className="space-y-8">
      {days.map((day) => {
        const dayMeals = menu.filter((m) => m.day === day);
        if (dayMeals.length === 0) return null;

        return (
          <div key={day} className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600">
                {day.substring(0, 2)}
              </span>
              {day}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dayMeals.map((slot: any) => (
                <RecipeCard
                  key={slot.id || Math.random()}
                  recipe={slot.recipe}
                  mealType={slot.type}
                  onSwap={() => onSwap(day, slot.type)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
