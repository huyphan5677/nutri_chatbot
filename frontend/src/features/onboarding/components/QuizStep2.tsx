import { useLocale } from "@/shared/i18n/LocaleContext";
import { ChevronDown, ChevronUp, Trash2, UserPlus } from "lucide-react";
import React from "react";
import { onboardingMessages } from "../onboarding.messages";

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

export const QuizStep2: React.FC<QuizStep2Props> = ({
  data,
  onChange,
  requiredFieldErrors = {},
}) => {
  const { locale } = useLocale();
  const text = onboardingMessages[locale].step2;
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
      <h2 className="text-2xl font-bold text-center dark:text-white">{text.title}</h2>
      <p className="text-gray-400 dark:text-gray-500 text-center text-sm -mt-2">
        {text.description}
      </p>

      {data.map((member, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-slate-800/60 dark:backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Card Header */}
          <button
            onClick={() => setExpandedIdx(expandedIdx === idx ? -1 : idx)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                ${idx === 0 ? "bg-primary/10 text-primary" : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400"}`}
              >
                {member.name ? member.name[0].toUpperCase() : idx + 1}
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {member.name || text.memberLabel(idx + 1)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {text.relationships.find((item) => item.id === member.relationship)
                    ?.label || text.noRelationshipSet}
                  {member.gender
                    ? ` · ${text.genders.find((item) => item.id === member.gender)?.label || member.gender}`
                    : ""}
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
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title={text.removeMember}
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
            <div className="border-t border-gray-100 dark:border-slate-700 p-4 space-y-4">
              {/* Name & Relationship */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {text.labels.name}<span className="text-[#FF5C5C]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={text.placeholders.memberName}
                    value={member.name}
                    onChange={(e) => updateMember(idx, "name", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 ${
                      idx === 0 && requiredFieldErrors.name
                        ? "border-red-400"
                        : "border-gray-200 dark:border-slate-700/80"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {text.labels.relationship}
                    <span className="text-[#FF5C5C]">*</span>
                  </label>
                  <select
                    value={member.relationship}
                    onChange={(e) =>
                      updateMember(idx, "relationship", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                      idx === 0 && requiredFieldErrors.relationship
                        ? "border-red-400"
                        : "border-gray-200 dark:border-slate-700/80"
                    }`}
                  >
                    <option value="">{text.placeholders.select}</option>
                    {text.relationships.map((relationship) => (
                      <option key={relationship.id} value={relationship.id}>
                        {relationship.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Gender & Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {text.labels.gender}<span className="text-[#FF5C5C]">*</span>
                  </label>
                  <div className="flex gap-1">
                    {text.genders.map((gender) => (
                      <button
                        key={gender.id}
                        onClick={() =>
                          updateMember(
                            idx,
                            "gender",
                            member.gender === gender.id ? "" : gender.id,
                          )
                        }
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all
                          ${
                            member.gender === gender.id
                              ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary"
                              : idx === 0 && requiredFieldErrors.gender
                                ? "border-red-400 text-red-500 hover:border-red-500"
                                : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                          }`}
                      >
                        {gender.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {text.labels.age}<span className="text-[#FF5C5C]">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder={text.placeholders.age}
                    value={member.age}
                    onChange={(e) => updateMember(idx, "age", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                      idx === 0 && requiredFieldErrors.age
                        ? "border-red-400"
                        : "border-gray-200 dark:border-slate-700/80"
                    }`}
                  />
                </div>
              </div>

              {/* Current Weight & Height */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {text.labels.currentWeight}
                    <span className="text-[#FF5C5C]">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder={text.placeholders.weight}
                    value={member.weight_kg}
                    onChange={(e) =>
                      updateMember(idx, "weight_kg", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                      idx === 0 && requiredFieldErrors.weight_kg
                        ? "border-red-400"
                        : "border-gray-200 dark:border-slate-700/80"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {text.labels.height}<span className="text-[#FF5C5C]">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder={text.placeholders.height}
                    value={member.height_cm}
                    onChange={(e) =>
                      updateMember(idx, "height_cm", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                      idx === 0 && requiredFieldErrors.height_cm
                        ? "border-red-400"
                        : "border-gray-200 dark:border-slate-700/80"
                    }`}
                  />
                </div>
              </div>

              {/* Goal */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {text.labels.primaryGoal}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {text.goals.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() =>
                        updateMember(
                          idx,
                          "primary_goal",
                          member.primary_goal === goal.id ? "" : goal.id,
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                        ${
                          member.primary_goal === goal.id
                            ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary"
                            : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                        }`}
                    >
                      {goal.label}
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
                            ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary"
                            : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                        }`}
                  >
                    {text.other}
                  </button>
                </div>
                {member.primary_goal === "other" && (
                  <input
                    type="text"
                    value={member.primary_goal_other}
                    onChange={(e) =>
                      updateMember(idx, "primary_goal_other", e.target.value)
                    }
                    placeholder={text.placeholders.goalOther}
                    className="mt-2 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                )}
              </div>

              {/* Favorite Dishes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {text.labels.favoriteDishes}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {text.favoriteDishes.map((dish) => (
                    <button
                      key={dish.id}
                      onClick={() => toggleFavoriteDish(idx, dish.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                        ${
                          member.favorite_dishes.includes(dish.id)
                            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                            : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                        }`}
                    >
                      {dish.label}
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
                    placeholder={text.placeholders.favoriteDishOther}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700/80 rounded-lg text-sm bg-white dark:bg-slate-900/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
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
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary transition-all shadow-sm"
                  >
                    {text.add}
                  </button>
                </div>
                {member.favorite_dishes.filter(
                  (dish) =>
                    !text.favoriteDishes.some((item) => item.id === dish),
                ).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {member.favorite_dishes
                      .filter(
                        (dish) =>
                          !text.favoriteDishes.some((item) => item.id === dish),
                      )
                      .map((dish) => (
                        <button
                          key={dish}
                          type="button"
                          onClick={() => toggleFavoriteDish(idx, dish)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        >
                          {dish} ×
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {text.labels.activityLevel}
                  <span className="text-[#FF5C5C]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {text.activityLevels.map((level) => (
                    <button
                      key={level.id}
                      onClick={() =>
                        updateMember(
                          idx,
                          "activity_level",
                          member.activity_level === level.id ? "" : level.id,
                        )
                      }
                      className={`px-2 py-2.5 rounded-lg border text-left transition-all
                        ${
                          member.activity_level === level.id
                            ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary"
                            : idx === 0 && requiredFieldErrors.activity_level
                              ? "border-red-400 text-red-500 hover:border-red-500"
                              : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                        }`}
                    >
                      <div className="text-xs font-semibold">{level.label}</div>
                      <div className="text-[11px] mt-0.5 opacity-80 dark:opacity-70 leading-snug">
                        {level.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {text.labels.allergies}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {text.allergies.map((allergy) => (
                    <button
                      key={allergy.id}
                      onClick={() => toggleAllergy(idx, allergy.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                        ${
                          member.allergies.includes(allergy.id)
                            ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 ring-1 ring-red-500/20"
                            : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                        }`}
                    >
                      {allergy.label}
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
                    placeholder={text.placeholders.allergyOther}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
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
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary transition-all shadow-sm"
                  >
                    {text.add}
                  </button>
                </div>
                {member.allergies.filter(
                  (allergy) =>
                    !text.allergies.some((item) => item.id === allergy),
                ).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {member.allergies
                      .filter(
                        (allergy) =>
                          !text.allergies.some((item) => item.id === allergy),
                      )
                      .map((alg) => (
                        <button
                          key={alg}
                          type="button"
                          onClick={() => toggleAllergy(idx, alg)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400"
                        >
                          {alg} ×
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Health Conditions */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {text.labels.healthConditions}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {text.conditions.map((condition) => (
                    <button
                      key={condition.id}
                      onClick={() => toggleCondition(idx, condition.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                        ${
                          member.health_conditions.includes(condition.id)
                            ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/20"
                            : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                        }`}
                    >
                      {condition.label}
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
                    placeholder={text.placeholders.conditionOther}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
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
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary transition-all shadow-sm"
                  >
                    {text.add}
                  </button>
                </div>
                {member.health_conditions.filter(
                  (condition) =>
                    !text.conditions.some((item) => item.id === condition),
                ).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {member.health_conditions
                      .filter(
                        (condition) =>
                          !text.conditions.some((item) => item.id === condition),
                      )
                      .map((cond) => (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => toggleCondition(idx, cond)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400"
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
        className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-slate-800/80 rounded-2xl text-gray-400 dark:text-slate-500 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-all flex items-center justify-center gap-2 text-sm font-bold bg-white/50 dark:bg-slate-900/40"
      >
        <UserPlus className="w-4 h-4" /> {text.addFamilyMember}
      </button>
    </div>
  );
};
