import { Button } from "@/components/ui/Button";
import { getApiUrl } from "@/shared/api/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "../components/DashboardHeader";

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ full_name: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("nutri_token");
      if (!token) return;
      try {
        const res = await fetch(`${getApiUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (e) {
        console.error("Failed to fetch user", e);
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFBF6]">
      {" "}
      {/* Warm beige background */}
      {/* Header Section */}
      <DashboardHeader userName={user?.full_name || "Chef"} />
      {/* Discovery / Marketing Section */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <p className="text-gray-500 font-medium">
            The app that does your groceries and helps you cook ❤️
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Discovery Card 1 */}
          <div className="bg-[#FFD1D1] rounded-[2.5rem] p-0 text-center relative overflow-hidden group hover:shadow-xl transition-all cursor-pointer h-96">
            <img
              src="/images/love-bite.png"
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
              alt="Love at first bite"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

            <div className="relative z-10 h-full flex flex-col justify-end pb-8 px-6">
              <h3 className="text-3xl font-bold text-white mb-2 font-serif drop-shadow-md">
                Love at First Bite 💖
              </h3>
              <p className="text-white/90 text-sm mb-6 max-w-[200px] mx-auto drop-shadow-sm">
                Recipes so good, it's a match from the first bite.
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={() => navigate("/cooking#discover-recipes")}
                  className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/40 rounded-full px-6 shadow-lg"
                >
                  Discover my recipes
                </Button>
              </div>
            </div>
          </div>

          {/* Discovery Card 2 */}
          <div className="bg-[#E0F2FE] rounded-[2.5rem] p-0 text-center relative overflow-hidden group hover:shadow-xl transition-all cursor-pointer h-96">
            <img
              src="/images/quick-easy.png"
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
              alt="Quick and Easy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

            <div className="relative z-10 h-full flex flex-col justify-end pb-8 px-6">
              <h3 className="text-3xl font-bold text-white mb-2 font-serif drop-shadow-md">
                Quick & Easy ⚡
              </h3>
              <p className="text-white/90 text-sm mb-6 max-w-[200px] mx-auto drop-shadow-sm">
                Short on time? These recipes are ready in under 15 minutes.
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={() => navigate("/cooking#discover-recipes")}
                  className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/40 rounded-full px-6 shadow-lg"
                >
                  See collection
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
