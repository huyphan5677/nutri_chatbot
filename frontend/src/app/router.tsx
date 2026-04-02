import { createBrowserRouter } from "react-router-dom";
import AuthGuard from "../features/auth/components/AuthGuard";
import { BlogPage } from "../features/blog/pages/BlogPage";
import ChatScreen from "../features/chat/components/ChatScreen";
import { CollectionDetailPage } from "../features/cooking/pages/CollectionDetailPage";
import { WhatsCookingPage } from "../features/cooking/pages/WhatsCookingPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import InventoryDashboard from "../features/inventory/components/InventoryDashboard";
import GroceryListDashboard from "../features/meal-planner/components/GroceryListDashboard";
import MealPlannerDashboard from "../features/meal-planner/components/MealPlannerDashboard";
import OnboardingScreen from "../features/profile/components/OnboardingScreen";
import { ProfilePage } from "../features/profile/pages/ProfilePage";
import { LogsPage } from "../features/system/pages/LogsPage";
import { HomePage } from "../pages/HomePage";
import MainLayout from "../shared/layouts/MainLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/cooking",
            element: <WhatsCookingPage />,
          },
          {
            path: "/collections/:id",
            element: <CollectionDetailPage />,
          },
          {
            path: "/blog",
            element: <BlogPage />,
          },
          {
            path: "/profile",
            element: <ProfilePage />,
          },
          {
            path: "/chat",
            element: <ChatScreen />,
          },
          {
            path: "/menus",
            element: <MealPlannerDashboard />,
          },
          {
            path: "/grocery",
            element: <GroceryListDashboard />,
          },
          {
            path: "/inventory",
            element: <InventoryDashboard />,
          },
          {
            path: "/onboarding",
            element: <OnboardingScreen />,
          },
          {
            path: "/logs",
            element: <LogsPage />,
          },
        ],
      },
    ],
  },
]);
