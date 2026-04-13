import { profileMessages } from "@/features/profile/profile.messages";
import { useLocale } from "@/shared/i18n/LocaleContext";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Gift,
  Star,
  Zap,
} from "lucide-react";

export default function RewardsPage() {
  const { locale } = useLocale();
  const text = profileMessages[locale].rewards;
  const currentPoints = 1250;
  const nextTierPoints = 2000;
  const progress = (currentPoints / nextTierPoints) * 100;

  const achievements = [
    {
      name: text.achievements.pantryMaster.name,
      description: text.achievements.pantryMaster.description,
      points: "+50",
      unlocked: true,
    },
    {
      name: text.achievements.consistentPlanner.name,
      description: text.achievements.consistentPlanner.description,
      points: "+100",
      unlocked: true,
    },
    {
      name: text.achievements.recipeCreator.name,
      description: text.achievements.recipeCreator.description,
      points: "+20",
      unlocked: false,
    },
  ];

  return (
    <div className="flex flex-col gap-8 md:gap-12 max-w-4xl">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
          {text.title}
        </h2>
        <p className="text-gray-500 text-sm md:text-base mb-8">
          {text.subtitle}
        </p>

        {/* Top Tier Card */}
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-8 text-white mb-8 shadow-lg shadow-orange-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shrink-0">
                <Star className="w-10 h-10 text-white fill-white" />
              </div>
              <div>
                <h3 className="text-white/80 font-medium uppercase tracking-wider text-sm mb-1">
                  {text.currentTier}
                </h3>
                <h1 className="text-3xl md:text-4xl font-bold font-serif">
                  {text.currentTierName}
                </h1>
              </div>
            </div>

            <div className="text-center md:text-right">
              <h3 className="text-white/80 font-medium uppercase tracking-wider text-sm mb-1">
                {text.totalPoints}
              </h3>
              <div className="text-4xl md:text-5xl font-bold font-serif">
                {currentPoints.toLocaleString()}{" "}
                <span className="text-xl opacity-80">{text.pointsUnit}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 relative z-10">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span>{text.progressToGold(Number(progress.toFixed(0)))}</span>
              <span>
                {nextTierPoints.toLocaleString()} {text.pointsUnit}
              </span>
            </div>
            <div className="h-3 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-white/70 mt-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-current" />
              {text.earnMore(nextTierPoints - currentPoints)}
            </p>
          </div>
        </div>

        {/* Badges & Achievements */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              {text.recentAchievements}
            </h3>
            <button className="text-sm font-medium text-gray-500 hover:text-primary transition-colors flex items-center gap-1">
              {text.viewAll} <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {achievements.map((achieve, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border ${achieve.unlocked ? "bg-orange-50 border-orange-100" : "bg-gray-50 border-gray-100 opacity-60"} transition-all`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${achieve.unlocked ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-400"}`}
                  >
                    {achieve.unlocked ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Award className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${achieve.unlocked ? "bg-orange-100 text-orange-700" : "bg-gray-200 text-gray-500"}`}
                  >
                    {achieve.points}
                  </span>
                </div>
                <h4
                  className={`font-bold mt-3 mb-1 ${achieve.unlocked ? "text-orange-900" : "text-gray-900"}`}
                >
                  {achieve.name}
                </h4>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {achieve.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Redeem Rewards Placeholder */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4">
            <Gift className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {text.rewardsStoreTitle}
          </h3>
          <p className="text-gray-500 text-sm max-w-sm">
            {text.rewardsStoreDescription}
          </p>
        </div>
      </div>
    </div>
  );
}
