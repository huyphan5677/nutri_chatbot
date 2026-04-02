import { ChevronDown, ChevronUp, Trash2, UserPlus } from "lucide-react";
import React from "react";

export interface FamilyMemberData {
  name: string;
  relationship: string;
  age: string;
  gender: string;
  weight_kg: string;
  height_cm: string;
  bmr: string;
  tdee: string;
  primary_goal: string;
  primary_goal_other: string;
  activity_level: string;
  favorite_dishes: string[];
  allergies: string[];
  health_conditions: string[];
}

interface QuizStep2Props {
  data: FamilyMemberData[];
  onChange: (data: FamilyMemberData[]) => void;
  requiredFieldErrors?: Partial<
    Record<
      | "name"
      | "relationship"
      | "gender"
      | "age"
      | "weight_kg"
      | "height_cm"
      | "activity_level",
      boolean
    >
  >;
}

const RELATIONSHIPS = ["Self", "Spouse", "Child", "Parent", "Other"];
const GOALS = [
  { id: "lose_weight", label: "Lose Weight" },
  { id: "gain_weight", label: "Gain Weight" },
  { id: "maintain", label: "Maintain" },
  { id: "build_muscle", label: "Build Muscle" },
  { id: "eat_healthier", label: "Eat Healthier" },
];
const ACTIVITY_LEVELS = [
  {
    id: "sedentary",
    label: "Sedentary",
    description: "Little or no exercise, desk job.",
  },
  {
    id: "light",
    label: "Light",
    description: "Light exercise 1-2 times per week.",
  },
  {
    id: "moderate",
    label: "Moderate",
    description: "Moderate exercise 3-4 times per week.",
  },
  {
    id: "active",
    label: "Very Active",
    description: "Very active exercise daily.",
  },
];
const ALLERGIES = [
  "Gluten",
  "Dairy",
  "Peanuts",
  "Shellfish",
  "Soy",
  "Eggs",
  "Tree Nuts",
  "Fish",
];
const FAVORITE_DISHES = [
  "Chicken",
  "Beef",
  "Fish",
  "Shrimp",
  "Egg",
  "Tofu",
  "Rice",
  "Pasta",
];
const CONDITIONS = [
  "Diabetes",
  "High Blood Pressure",
  "Heart Disease",
  "Cholesterol",
  "Gout",
];

const emptyMember = (): FamilyMemberData => ({
  name: "",
  relationship: "",
  age: "",
  gender: "",
  weight_kg: "",
  height_cm: "",
  bmr: "",
  tdee: "",
  primary_goal: "",
  primary_goal_other: "",
  activity_level: "",
  favorite_dishes: [],
  allergies: [],
  health_conditions: [],
});

const PRESET_GOAL_IDS = GOALS.map((g) => g.id);

export const QuizStep2: React.FC<QuizStep2Props> = ({
  data,
  onChange,
  requiredFieldErrors = {},
}) => {
  const [expandedIdx, setExpandedIdx] = React.useState<number>(0);
  const [allergyOtherInput, setAllergyOtherInput] = React.useState<
    Record<number, string>
  >({});
  const [favoriteDishOtherInput, setFavoriteDishOtherInput] = React.useState<
    Record<number, string>
  >({});
  const [conditionOtherInput, setConditionOtherInput] = React.useState<
    Record<number, string>
  >({});

  const toKey = (value: string) => value.trim().toLowerCase();

  const addMember = () => {
    onChange([...data, emptyMember()]);
    setExpandedIdx(data.length);
  };

  const removeMember = (idx: number) => {
    if (data.length <= 1) return; // keep at least 1
    const updated = data.filter((_, i) => i !== idx);
    onChange(updated);
    if (expandedIdx >= updated.length) setExpandedIdx(updated.length - 1);
  };

  const updateMember = (
    idx: number,
    key: keyof FamilyMemberData,
    value: any,
  ) => {
    const updated = [...data];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange(updated);
  };

  const toggleAllergy = (idx: number, alg: string) => {
    const member = data[idx];
    const current = member.allergies;
    updateMember(
      idx,
      "allergies",
      current.includes(alg)
        ? current.filter((a) => a !== alg)
        : [...current, alg],
    );
  };

  const toggleFavoriteDish = (idx: number, dish: string) => {
    const member = data[idx];
    const current = member.favorite_dishes;
    updateMember(
      idx,
      "favorite_dishes",
      current.includes(dish)
        ? current.filter((d) => d !== dish)
        : [...current, dish],
    );
  };

  const toggleCondition = (idx: number, cond: string) => {
    const member = data[idx];
    const current = member.health_conditions;
    updateMember(
      idx,
      "health_conditions",
      current.includes(cond)
        ? current.filter((c) => c !== cond)
        : [...current, cond],
    );
  };

  const addCustomValue = (
    idx: number,
    key: "allergies" | "favorite_dishes" | "health_conditions",
    rawValue: string,
  ) => {
    const value = rawValue.trim();
    if (!value) return;

    const member = data[idx];
    const current = member[key] || [];
    const exists = current.some((item) => toKey(item) === toKey(value));
    if (exists) return;

    updateMember(idx, key, [...current, value]);
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-center">Family Members</h2>
      <p className="text-gray-400 text-center text-sm -mt-2">
        Member đầu tiên bắt buộc: Name, Relationship, Gender, Age, Current
        Weight, Height, Activity Level.
      </p>

      {data.map((member, idx) => (
        <div
          key={idx}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Card Header */}
          <button
            onClick={() => setExpandedIdx(expandedIdx === idx ? -1 : idx)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                ${idx === 0 ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"}`}
              >
                {member.name ? member.name[0].toUpperCase() : idx + 1}
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 text-sm">
                  {member.name || `Member ${idx + 1}`}
                </p>
                <p className="text-xs text-gray-400">
                  {member.relationship || "No relationship set"}
                  {member.gender ? ` · ${member.gender}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMember(idx);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove member"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {expandedIdx === idx ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </button>

          {/* Card Body (Expandable) */}
          {expandedIdx === idx && (
            <div className="border-t border-gray-100 p-4 space-y-4">
              {/* Name & Relationship */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Name<span className="text-[#FF5C5C]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John"
                    value={member.name}
                    onChange={(e) => updateMember(idx, "name", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent ${
                      idx === 0 && requiredFieldErrors.name
                        ? "border-red-400"
                        : "border-gray-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Relationship<span className="text-[#FF5C5C]">*</span>
                  </label>
                  <select
                    value={member.relationship}
                    onChange={(e) =>
                      updateMember(idx, "relationship", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                      idx === 0 && requiredFieldErrors.relationship
                        ? "border-red-400"
                        : "border-gray-200"
                    }`}
                  >
                    <option value="">Select...</option>
                    {RELATIONSHIPS.map((r) => (
                      <option key={r} value={r.toLowerCase()}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Gender & Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Gender<span className="text-[#FF5C5C]">*</span>
                  </label>
                  <div className="flex gap-1">
                    {["Male", "Female", "Other"].map((g) => (
                      <button
                        key={g}
                        onClick={() =>
                          updateMember(
                            idx,
                            "gender",
                            member.gender === g.toLowerCase()
                              ? ""
                              : g.toLowerCase(),
                          )
                        }
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all
                          ${
                            member.gender === g.toLowerCase()
                              ? "border-primary bg-primary/5 text-primary"
                              : idx === 0 && requiredFieldErrors.gender
                                ? "border-red-400 text-red-500 hover:border-red-500"
                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Age<span className="text-[#FF5C5C]">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 29"
                    value={member.age}
                    onChange={(e) => updateMember(idx, "age", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent ${
                      idx === 0 && requiredFieldErrors.age
                        ? "border-red-400"
                        : "border-gray-200"
                    }`}
                  />
                </div>
              </div>

              {/* Current Weight & Height */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Current Weight (kg)<span className="text-[#FF5C5C]">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 65"
                    value={member.weight_kg}
                    onChange={(e) =>
                      updateMember(idx, "weight_kg", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent ${
                      idx === 0 && requiredFieldErrors.weight_kg
                        ? "border-red-400"
                        : "border-gray-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Height (cm)<span className="text-[#FF5C5C]">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 170"
                    value={member.height_cm}
                    onChange={(e) =>
                      updateMember(idx, "height_cm", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent ${
                      idx === 0 && requiredFieldErrors.height_cm
                        ? "border-red-400"
                        : "border-gray-200"
                    }`}
                  />
                </div>
              </div>

              {/* Goal */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Primary Goal
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() =>
                        updateMember(
                          idx,
                          "primary_goal",
                          member.primary_goal === g.id ? "" : g.id,
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                        ${
                          member.primary_goal === g.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                    >
                      {g.label}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      updateMember(
                        idx,
                        "primary_goal",
                        member.primary_goal === "other" ? "" : "other",
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                        ${
                          member.primary_goal === "other"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                  >
                    Other
                  </button>
                </div>
                {member.primary_goal === "other" && (
                  <input
                    type="text"
                    value={member.primary_goal_other}
                    onChange={(e) =>
                      updateMember(idx, "primary_goal_other", e.target.value)
                    }
                    placeholder="Please specify the goal..."
                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                )}
              </div>

              {/* Favorite Dishes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Favorite Dishes
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FAVORITE_DISHES.map((dish) => (
                    <button
                      key={dish}
                      onClick={() => toggleFavoriteDish(idx, dish)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                        ${
                          member.favorite_dishes.includes(dish)
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                      {dish}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={favoriteDishOtherInput[idx] || ""}
                    onChange={(e) =>
                      setFavoriteDishOtherInput((prev) => ({
                        ...prev,
                        [idx]: e.target.value,
                      }))
                    }
                    placeholder="Other favorite dish..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addCustomValue(
                        idx,
                        "favorite_dishes",
                        favoriteDishOtherInput[idx] || "",
                      );
                      setFavoriteDishOtherInput((prev) => ({
                        ...prev,
                        [idx]: "",
                      }));
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-primary hover:text-primary"
                  >
                    Add
                  </button>
                </div>
                {member.favorite_dishes.filter(
                  (dish) => !FAVORITE_DISHES.includes(dish),
                ).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {member.favorite_dishes
                      .filter((dish) => !FAVORITE_DISHES.includes(dish))
                      .map((dish) => (
                        <button
                          key={dish}
                          type="button"
                          onClick={() => toggleFavoriteDish(idx, dish)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border bg-emerald-50 border-emerald-200 text-emerald-700"
                        >
                          {dish} ×
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Activity Level<span className="text-[#FF5C5C]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ACTIVITY_LEVELS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() =>
                        updateMember(
                          idx,
                          "activity_level",
                          member.activity_level === l.id ? "" : l.id,
                        )
                      }
                      className={`px-2 py-2.5 rounded-lg border text-left transition-all
                        ${
                          member.activity_level === l.id
                            ? "border-primary bg-primary/5 text-primary"
                            : idx === 0 && requiredFieldErrors.activity_level
                              ? "border-red-400 text-red-500 hover:border-red-500"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                    >
                      <div className="text-xs font-semibold">{l.label}</div>
                      <div className="text-[11px] mt-0.5 opacity-80 leading-snug">
                        {l.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Allergies
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALLERGIES.map((alg) => (
                    <button
                      key={alg}
                      onClick={() => toggleAllergy(idx, alg)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                        ${
                          member.allergies.includes(alg)
                            ? "bg-red-50 border-red-200 text-red-600"
                            : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                      {alg}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={allergyOtherInput[idx] || ""}
                    onChange={(e) =>
                      setAllergyOtherInput((prev) => ({
                        ...prev,
                        [idx]: e.target.value,
                      }))
                    }
                    placeholder="Other allergy..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addCustomValue(
                        idx,
                        "allergies",
                        allergyOtherInput[idx] || "",
                      );
                      setAllergyOtherInput((prev) => ({ ...prev, [idx]: "" }));
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-primary hover:text-primary"
                  >
                    Add
                  </button>
                </div>
                {member.allergies.filter((a) => !ALLERGIES.includes(a)).length >
                  0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {member.allergies
                      .filter((a) => !ALLERGIES.includes(a))
                      .map((alg) => (
                        <button
                          key={alg}
                          type="button"
                          onClick={() => toggleAllergy(idx, alg)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border bg-purple-50 border-purple-200 text-purple-700"
                        >
                          {alg} ×
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Health Conditions */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Health Conditions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITIONS.map((cond) => (
                    <button
                      key={cond}
                      onClick={() => toggleCondition(idx, cond)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                        ${
                          member.health_conditions.includes(cond)
                            ? "bg-orange-50 border-orange-200 text-orange-600"
                            : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={conditionOtherInput[idx] || ""}
                    onChange={(e) =>
                      setConditionOtherInput((prev) => ({
                        ...prev,
                        [idx]: e.target.value,
                      }))
                    }
                    placeholder="Other condition..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addCustomValue(
                        idx,
                        "health_conditions",
                        conditionOtherInput[idx] || "",
                      );
                      setConditionOtherInput((prev) => ({
                        ...prev,
                        [idx]: "",
                      }));
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-primary hover:text-primary"
                  >
                    Add
                  </button>
                </div>
                {member.health_conditions.filter((c) => !CONDITIONS.includes(c))
                  .length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {member.health_conditions
                      .filter((c) => !CONDITIONS.includes(c))
                      .map((cond) => (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => toggleCondition(idx, cond)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border bg-purple-50 border-purple-200 text-purple-700"
                        >
                          {cond} ×
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add Member Button */}
      <button
        onClick={addMember}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 text-sm font-medium"
      >
        <UserPlus className="w-4 h-4" /> Add Family Member
      </button>
    </div>
  );
};
