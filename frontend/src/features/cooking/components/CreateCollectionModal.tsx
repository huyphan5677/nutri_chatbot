import { Button } from "@/components/ui/Button";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Loader2, Plus, X } from "lucide-react";
import React, { useState } from "react";
import { Collection, createCollection } from "../api/recipesApi";
import { cookingMessages } from "../cooking.messages";

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (collection: Collection) => void;
}

export const CreateCollectionModal = ({
  isOpen,
  onClose,
  onCreated,
}: CreateCollectionModalProps) => {
  const { locale } = useLocale();
  const messages = cookingMessages[locale].createCollection;
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const col = await createCollection(name.trim());
      onCreated(col);
      setName("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
            <Plus className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold font-serif text-gray-900">
            {messages.title}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {messages.nameLabel}
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={messages.placeholder}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-gray-900"
            />
          </div>

          <Button
            type="submit"
            disabled={!name.trim() || isLoading}
            className="w-full py-4 bg-[#FF5C5C] hover:bg-[#ff4040] text-white rounded-2xl font-bold mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              messages.submit
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};
