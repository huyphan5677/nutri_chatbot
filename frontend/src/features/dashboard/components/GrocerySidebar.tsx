import { Button } from "@/components/ui/Button";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import React from "react";

interface GrocerySidebarProps {
  items: string[];
}

export const GrocerySidebar: React.FC<GrocerySidebarProps> = ({ items }) => {
  return (
    <div className="h-full bg-white border-l border-gray-100 p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-xl text-primary">
          <ShoppingCart className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">Grocery List</h2>
          <p className="text-xs text-gray-500">{items.length} items to buy</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {items.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            Your list is empty.
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className="mt-0.5 text-gray-300 group-hover:text-primary transition-colors">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-sm text-gray-700">{item}</span>
            </div>
          ))
        )}
      </div>

      <div className="pt-6 mt-6 border-t border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-500">
            Total Clean Price
          </span>
          <span className="font-bold text-gray-900">~$45.00</span>
        </div>
        <Button className="w-full shadow-lg shadow-primary/20">
          Checkout with Instacart
        </Button>
      </div>
    </div>
  );
};
