import { X } from "lucide-react";
import React, { useState } from "react";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: { type?: string; maxTime?: number }) => void;
  currentFilters: { type?: string; maxTime?: number };
}

const TYPES = [
  "Vegetarian",
  "Meat",
  "Poultry",
  "Seafood",
  "Breakfast",
  "Dessert",
];
const TIMES = [15, 30, 45, 60, 120];

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentFilters,
}) => {
  const [selectedType, setSelectedType] = useState<string | undefined>(
    currentFilters.type,
  );
  const [selectedTime, setSelectedTime] = useState<number | undefined>(
    currentFilters.maxTime,
  );

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({ type: selectedType, maxTime: selectedTime });
    onClose();
  };

  const handleReset = () => {
    setSelectedType(undefined);
    setSelectedTime(undefined);
    onApply({ type: undefined, maxTime: undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl relative animate-in fade-in slide-in-from-bottom-4 duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-8 font-serif">
          Filters
        </h2>

        {/* Diet Type */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
            Type
          </h3>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((type) => (
              <button
                key={type}
                onClick={() =>
                  setSelectedType(type === selectedType ? undefined : type)
                }
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border
                                    ${
                                      selectedType === type
                                        ? "bg-[#FF5C5C] text-white border-[#FF5C5C]"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-[#FF5C5C] hover:text-[#FF5C5C]"
                                    }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Max Prep Time */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
            Max Time (Minutes)
          </h3>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((time) => (
              <button
                key={time}
                onClick={() =>
                  setSelectedTime(time === selectedTime ? undefined : time)
                }
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border
                                    ${
                                      selectedTime === time
                                        ? "bg-[#FF5C5C] text-white border-[#FF5C5C]"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-[#FF5C5C] hover:text-[#FF5C5C]"
                                    }`}
              >
                ≤ {time}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleReset}
            className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-full transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 bg-[#FF5C5C] text-white font-bold rounded-full hover:bg-[#ff4040] shadow-md shadow-red-500/20 transition-all"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
