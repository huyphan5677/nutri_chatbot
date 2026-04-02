import { Button } from "@/components/ui/Button";
import { Minus, Plus, Sparkles } from "lucide-react";
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  userName: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
}) => {
  const [mealCount, setMealCount] = useState(2);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleIncrement = () => setMealCount((prev) => Math.min(prev + 1, 21));
  const handleDecrement = () => setMealCount((prev) => Math.max(prev - 1, 1));

  const handleStart = () => {
    navigate("/chat", {
      state: { initialPrompt: `Create a ${mealCount}-day meal plan for me` },
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "🌅 Good morning";
    if (hour < 18) return "☀️ Good afternoon";
    return "🌙 Good evening";
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative overflow-hidden bg-[#F2ECE4] pb-20 pt-16 px-6 text-center border-b border-[#E8DFC] transition-colors duration-500"
    >
      {/* Interactive Spotlight Effect */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.4), transparent 40%)`,
        }}
      />

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-orange-200/40 to-transparent rounded-full blur-[100px] -z-10 opacity-60 pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* <div className="flex justify-center mb-8">
          <Button
            variant="secondary"
            className="bg-orange-100/50 backdrop-blur-md text-orange-800 hover:bg-white gap-2 rounded-full shadow-sm shadow-orange-100/50 border border-orange-200/50 px-6 py-2 h-auto text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <Store className="w-4 h-4 text-[#D96C4A]" /> Add your local grocer
          </Button>
        </div> */}

        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-5 tracking-tight font-serif drop-shadow-sm">
          {getGreeting()},{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 drop-shadow-sm">
            {userName}
          </span>
          !
        </h1>

        <p className="text-gray-700 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-sm">
          How many delicious meals would you like to plan for this week?
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {/* Premium Counter */}
          <div className="bg-white p-2 rounded-full flex items-center shadow-xl shadow-orange-900/5 border border-orange-100/80 relative overflow-hidden group hover:border-orange-200 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-50/30 to-red-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <button
              onClick={handleDecrement}
              className="w-14 h-14 flex items-center justify-center text-orange-600 hover:bg-orange-50 hover:text-orange-700 rounded-full transition-all active:scale-90 z-10"
            >
              <Minus className="w-6 h-6 stroke-[2.5]" />
            </button>

            <div className="w-20 text-center font-serif text-4xl font-bold text-gray-800 z-10 select-none tracking-tight">
              {mealCount}
            </div>

            <button
              onClick={handleIncrement}
              className="w-14 h-14 flex items-center justify-center text-orange-600 hover:bg-orange-50 hover:text-orange-700 rounded-full transition-all active:scale-90 z-10"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          <Button
            onClick={handleStart}
            className="h-16 px-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xl font-bold shadow-xl shadow-orange-500/25 transition-all hover:shadow-orange-500/40 hover:-translate-y-1 flex items-center gap-3 border border-orange-400/20"
          >
            Let's plan!
            <Sparkles className="w-5 h-5 text-orange-100 animate-pulse" />
          </Button>
        </div>
      </div>
    </div>
  );
};
