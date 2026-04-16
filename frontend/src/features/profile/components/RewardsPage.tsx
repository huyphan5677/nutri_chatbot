import { profileMessages } from "@/features/profile/profile.messages";
import { getApiUrl } from "@/shared/api/client";
import { useLocale } from "@/shared/i18n/LocaleContext";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Gift,
  Loader2,
  Star,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface AchievementDTO {
  id: string;
  points: string;
  unlocked: boolean;
}

interface RewardsDTO {
  currentPoints: number;
  nextTierPoints: number;
  tierName: string;
  progress: number;
  achievements: AchievementDTO[];
}

export default function RewardsPage() {
  const { locale } = useLocale();
  const text = profileMessages[locale].rewards;

  const [data, setData] = useState<RewardsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRewards = async () => {
      const token = localStorage.getItem("nutri_token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${getApiUrl()}/profile/rewards`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setData(await response.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRewards();
  }, []);

  const getAchievementDetails = (id: string) => {
    if (id === "pantryMaster") return text.achievements.pantryMaster;
    if (id === "consistentPlanner") return text.achievements.consistentPlanner;
    return { name: id, description: "" };
  };

  const currentPoints = data?.currentPoints || 0;
  const nextTierPoints = data?.nextTierPoints || 1000;
  const progress = data?.progress || 0;

  return (
    <div className="flex flex-col gap-8 md:gap-12 pt-4 relative">
      {loading && (
        <div className="absolute inset-0 z-50 bg-white/50 flex items-start pt-32 justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      )}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-50 mb-2">
          {text.title}
        </h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm md:text-base mb-8">
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
                  {data?.tierName || text.currentTierName}
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
              {text.earnMore(Math.max(0, nextTierPoints - currentPoints))}
            </p>
          </div>
        </div>

        {/* Badges & Achievements */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              {text.recentAchievements}
            </h3>
            <button className="text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-1">
              {text.viewAll} <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.achievements.map((achieve, i) => {
              const details = getAchievementDetails(achieve.id);
              return (
                <div
                  key={i}
                  className={`p-4 rounded-xl border ${achieve.unlocked ? "bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20" : "bg-gray-50 dark:bg-slate-800/40 border-gray-100 dark:border-slate-800 opacity-60"} transition-all`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${achieve.unlocked ? "bg-orange-500 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500"}`}
                    >
                      {achieve.unlocked ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Award className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${achieve.unlocked ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400" : "bg-gray-200 dark:bg-slate-700 text-gray-500"}`}
                    >
                      {achieve.points}
                    </span>
                  </div>
                  <h4
                    className={`font-bold mt-3 mb-1 ${achieve.unlocked ? "text-orange-900 dark:text-orange-100" : "text-gray-900 dark:text-slate-400"}`}
                  >
                    {details.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-slate-500 line-clamp-2">
                    {details.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Redeem Rewards Placeholder */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-400 mb-4">
            <Gift className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">
            {text.rewardsStoreTitle}
          </h3>
          <p className="text-gray-500 dark:text-slate-400 text-sm max-w-sm">
            {text.rewardsStoreDescription}
          </p>
        </div>
      </div>
    </div>
  );
}
