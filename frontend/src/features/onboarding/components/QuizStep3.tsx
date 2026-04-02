import React from "react";

interface QuizStep3Props {
  data: string[];
  onChange: (appliances: string[]) => void;
}

const APPLIANCES = [
  { id: "oven", label: "Oven", icon: "🔥" },
  { id: "microwave", label: "Microwave", icon: "📡" },
  { id: "blender", label: "Blender", icon: "🌪️" },
  { id: "stove", label: "Stove", icon: "🍳" },
  { id: "air_fryer", label: "Air Fryer", icon: "🌀" },
  { id: "rice_cooker", label: "Rice Cooker", icon: "🍚" },
  { id: "pressure_cooker", label: "Pressure Cooker", icon: "♨️" },
  { id: "toaster", label: "Toaster", icon: "🍞" },
];

export const QuizStep3: React.FC<QuizStep3Props> = ({ data, onChange }) => {
  const toggle = (id: string) => {
    if (data.includes(id)) {
      onChange(data.filter((item) => item !== id));
    } else {
      onChange([...data, id]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-center">Kitchen Equipment</h2>
      <p className="text-gray-500 text-center text-sm -mt-3">
        Select what you have in your kitchen
      </p>
      <div className="grid grid-cols-2 gap-3">
        {APPLIANCES.map((app) => (
          <button
            key={app.id}
            onClick={() => toggle(app.id)}
            className={`p-5 rounded-2xl border transition-all flex flex-col items-center gap-2
                            ${
                              data.includes(app.id)
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
          >
            <span className="text-3xl">{app.icon}</span>
            <span className="font-medium text-sm">{app.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
