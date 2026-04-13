import { useLocale } from "@/shared/i18n/LocaleContext";
import { X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { cookingMessages } from "../cooking.messages";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: { type?: string; maxTime?: number }) => void;
  currentFilters: { type?: string; maxTime?: number };
}

const TIMES = [15, 30, 45, 60, 120];

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentFilters,
}) => {
  const { locale } = useLocale();
  const messages = cookingMessages[locale].filterModal;
  const [selectedType, setSelectedType] = useState<string | undefined>(
    currentFilters.type,
  );
  const [selectedTime, setSelectedTime] = useState<number | undefined>(
    currentFilters.maxTime,
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedType(currentFilters.type);
    setSelectedTime(currentFilters.maxTime);
  }, [currentFilters.maxTime, currentFilters.type, isOpen]);

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
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-xl relative animate-in fade-in slide-in-from-bottom-4 duration-200 border border-gray-100 dark:border-slate-800">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 font-serif">
          {messages.title}
        </h2>

        {/* Diet Type */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">
            {messages.type}
          </h3>
          <div className="flex flex-wrap gap-2">
            {messages.typeOptions.map((type) => (
              <button
                key={type.value}
                onClick={() =>
                  setSelectedType(
                    type.value === selectedType ? undefined : type.value,
                  )
                }
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border
                                    ${
                                      selectedType === type.value
                                        ? "bg-[#FF5C5C] text-white border-[#FF5C5C]"
                                        : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-[#FF5C5C] hover:text-[#FF5C5C]"
                                    }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Max Prep Time */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">
            {messages.maxTime}
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
                                        : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-[#FF5C5C] hover:text-[#FF5C5C]"
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
            className="flex-1 py-3 text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            {messages.reset}
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 bg-[#FF5C5C] text-white font-bold rounded-full hover:bg-[#ff4040] shadow-md shadow-red-500/20 transition-all"
          >
            {messages.apply}
          </button>
        </div>
      </div>
    </div>
  );
};
