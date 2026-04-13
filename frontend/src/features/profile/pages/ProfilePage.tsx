import { getApiUrl } from "@/shared/api/client";
import { profileMessages } from "@/features/profile/profile.messages";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { ArrowRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import HouseholdSetupPage from "../components/HouseholdSetupPage";
import { ProfileSidebar } from "../components/ProfileSidebar";

import ContactPreferencesPage from "../components/ContactPreferencesPage";
import DisplaySettingsPage from "../components/DisplaySettingsPage";
import MyAccountsPage from "../components/MyAccountsPage";
import PrivacySettingsPage from "../components/PrivacySettingsPage";
import RewardsPage from "../components/RewardsPage";
import ShoppingListHistoryPage from "../components/ShoppingListHistoryPage";

interface Collection {
  id: number;
  name: string;
  image_url: string | null;
  recipe_count: number;
}

export const ProfilePage = () => {
  const { locale } = useLocale();
  const text = profileMessages[locale].page;
  const [collections, setCollections] = useState<Collection[]>([]);
  const [userName, setUserName] = useState(text.accountTitle);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    setUserName((current) =>
      current === "My Account" || current === "Tài khoản của tôi"
        ? text.accountTitle
        : current,
    );
  }, [text.accountTitle]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("nutri_token");
      if (!token) return;

      try {
        const [userRes, colRes] = await Promise.all([
          fetch(`${getApiUrl()}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${getApiUrl()}/profile/collections`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          setUserName(userData.full_name);
        }
        if (colRes.ok) {
          setCollections(await colRes.json());
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-col md:flex-row flex-1 max-w-7xl mx-auto w-full">
        <ProfileSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userName={userName}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-12 overflow-y-auto bg-white rounded-t-3xl md:rounded-none -mt-4 md:mt-0 relative z-0 md:bg-transparent shadow-[0_-4px_20px_rgba(0,0,0,0.02)] md:shadow-none">
          {/* Tab 0: My Profile */}
          {activeTab === 0 && (
            <div className="flex flex-col gap-8 md:gap-12">
              {/* Collections Section */}
              <div>
                <div className="flex justify-between items-center mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">
                    {text.collections}
                  </h2>
                  <button className="text-xs md:text-sm font-medium text-gray-500 hover:text-primary flex items-center gap-1">
                    {text.seeAll} <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {collections.map((col) => (
                    <div
                      key={col.id}
                      className="bg-white border border-gray-100 rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col items-center hover:shadow-lg transition-shadow cursor-pointer aspect-square justify-center group overflow-hidden relative"
                    >
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 rounded-full mb-3 md:mb-4 flex items-center justify-center group-hover:bg-primary/5 transition-colors z-10">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full shadow-sm"></div>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-0.5 md:mb-1 text-sm md:text-base text-center truncate w-full z-10 px-2">
                        {col.name}
                      </h3>
                      <span className="text-[10px] md:text-xs text-gray-500 z-10">
                        {text.recipeCount(col.recipe_count)}
                      </span>
                    </div>
                  ))}
                  <div className="border border-dashed border-red-200 bg-red-50/30 rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col items-center justify-center hover:bg-red-50 transition-colors cursor-pointer aspect-square text-red-500">
                    <Plus className="w-6 h-6 md:w-8 md:h-8 mb-2" />
                    <span className="font-medium text-xs md:text-sm text-center">
                      {text.createCollection}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Recipes Section */}
              <div>
                <div className="flex justify-between items-center mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">
                    {text.myRecipes}
                  </h2>
                  <button className="text-xs md:text-sm font-medium text-gray-500 hover:text-primary flex items-center gap-1">
                    {text.seeAll} <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  <div className="border border-dashed border-red-200 bg-red-50/30 rounded-2xl md:rounded-[2rem] p-4 md:p-6 flex flex-col items-center justify-center hover:bg-red-50 transition-colors cursor-pointer aspect-square text-red-500">
                    <Plus className="w-6 h-6 md:w-8 md:h-8 mb-2 md:mb-4" />
                    <span className="font-bold text-xs md:text-sm">
                      {text.addRecipe}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Family & Kitchen Setup */}
          {activeTab === 1 && <HouseholdSetupPage />}

          {/* Tab 2: My Accounts */}
          {activeTab === 2 && <MyAccountsPage />}

          {/* Tab 3: Shopping Lists History */}
          {activeTab === 3 && <ShoppingListHistoryPage />}

          {/* Tab 4: Rewards */}
          {activeTab === 4 && <RewardsPage />}

          {/* Tab 5: Privacy Settings */}
          {activeTab === 5 && <PrivacySettingsPage />}

          {/* Tab 6: Display Settings */}
          {activeTab === 6 && <DisplaySettingsPage />}

          {/* Tab 7: Contact Preferences */}
          {activeTab === 7 && <ContactPreferencesPage />}
        </main>
      </div>
    </div>
  );
};
