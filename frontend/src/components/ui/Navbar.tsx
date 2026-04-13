import { getApiUrl } from "@/shared/api/client";
import { navbarMessages } from "@/components/ui/navbar.messages";
import { useLocale } from "@/shared/i18n/LocaleContext";
import {
  Archive,
  Bell,
  CheckCircle2,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  ShoppingBag,
  Terminal,
  User,
  UtensilsCrossed,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const Navbar = () => {
  const { locale } = useLocale();
  const text = navbarMessages[locale];
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<{ full_name: string; email: string } | null>(
    null,
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadSessions, setUnreadSessions] = useState<
    { id: string; title: string }[]
  >([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [groceryCount, setGroceryCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [menuCount, setMenuCount] = useState(0);
  const [shoppingNotifications, setShoppingNotifications] = useState<
    { order_id: string; status: string; meal_plan_name: string }[]
  >([]);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const seenShoppingOrdersRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  // Fetch user context & unread count
  useEffect(() => {
    const token = localStorage.getItem("nutri_token");
    if (!token) return;

    const fetchUser = async () => {
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

    const fetchDashboardStatus = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/system/dashboard-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unread_count || 0);
          setUnreadSessions(data.unread_sessions || []);
          setGroceryCount(data.grocery_count || 0);
          setInventoryCount(data.inventory_count || 0);
          setMenuCount(data.menu_count || 0);

          // Shopping notifications - detect newly completed orders
          const notifications = data.shopping_notifications || [];
          if (initialLoadDoneRef.current) {
            for (const notif of notifications) {
              if (
                notif.status === "completed" &&
                !seenShoppingOrdersRef.current.has(notif.order_id)
              ) {
                window.dispatchEvent(
                  new CustomEvent("shoppingCompleted", {
                      detail: {
                        orderId: notif.order_id,
                        mealPlanName:
                          notif.meal_plan_name || text.notifications.menuFallback,
                      },
                    }),
                );
              }
            }
          }
          // Update seen set
          seenShoppingOrdersRef.current = new Set(
            notifications.map((n: { order_id: string }) => n.order_id),
          );
          setShoppingNotifications(notifications);
          initialLoadDoneRef.current = true;
        }
      } catch (e) {
        console.error("Failed to fetch dashboard status", e);
      }
    };

    fetchUser();
    fetchDashboardStatus();

    // Poll navbar counters every 5 seconds using a single request.
    const interval = setInterval(() => {
      fetchDashboardStatus();
    }, 5000);

    // Listen for internal events when a chat is read
    const handleChatRead = (e: Event) => {
      const customEvent = e as CustomEvent<{ sessionId: string }>;
      const sid = customEvent.detail.sessionId;
      setUnreadSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sid);
        setUnreadCount(filtered.length);
        return filtered;
      });
    };
    const handleGroceryListUpdated = () => {
      fetchDashboardStatus();
    };
    window.addEventListener("chatSessionRead", handleChatRead);
    window.addEventListener("groceryListUpdated", handleGroceryListUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("chatSessionRead", handleChatRead);
      window.removeEventListener(
        "groceryListUpdated",
        handleGroceryListUpdated,
      );
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideMobileMenu = mobileMenuRef.current?.contains(target);

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !isInsideMobileMenu &&
        !(target as Element).closest(".mobile-menu-btn")
      ) {
        setIsMobileMenuOpen(false);
      }
      // Do not close notifications if clicking inside the mobile menu dropdown
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target) &&
        !isInsideMobileMenu
      ) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("nutri_token");
    window.location.href = "/";
  };

  const getDesktopNavClass = (path: string) => {
    const active = location.pathname === path;
    const baseClass =
      "relative py-1 transition-colors text-sm whitespace-nowrap after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:w-full after:bg-[#FF5C5C] after:transition-transform after:duration-300";
    if (active) {
      return `${baseClass} text-[#FF5C5C] font-bold after:scale-x-100`;
    }
    return `${baseClass} text-gray-800 font-medium hover:text-[#FF5C5C] after:origin-bottom-right after:scale-x-0 hover:after:origin-bottom-left hover:after:scale-x-100`;
  };

  const getMobileNavClass = (path: string) => {
    return location.pathname === path
      ? "text-[#FF5C5C] font-bold"
      : "text-gray-800 font-medium hover:text-[#FF5C5C]";
  };

  return (
    <div className="h-16 bg-white border-b border-gray-50 flex items-center justify-between px-4 sm:px-6 relative z-50">
      {/* Left: Navigation & Mobile Toggle */}
      <div className="flex items-center gap-4 sm:gap-8">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-lg mobile-menu-btn"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6 lg:gap-8">
          <button
            onClick={() => navigate("/dashboard")}
            className={getDesktopNavClass("/dashboard")}
          >
            {text.nav.groceries}
          </button>
          <button
            onClick={() => navigate("/cooking")}
            className={getDesktopNavClass("/cooking")}
          >
            {text.nav.cooking}
          </button>
          <button
            onClick={() => navigate("/blog")}
            className={getDesktopNavClass("/blog")}
          >
            {text.nav.inspiration}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="absolute top-16 left-0 w-full min-h-[150px] bg-white border-b border-gray-100 shadow-lg lg:hidden flex flex-col p-4 gap-2 animate-in slide-in-from-top-2"
        >
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              navigate("/dashboard");
            }}
            className={`p-3 text-left rounded-lg hover:bg-gray-50 flex items-center gap-3 ${getMobileNavClass("/dashboard")}`}
          >
            <ShoppingBag
              className={`w-5 h-5 ${location.pathname === "/dashboard" ? "text-[#FF5C5C]" : "text-gray-500"}`}
            />{" "}
            {text.nav.groceries}
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              navigate("/cooking");
            }}
            className={`p-3 text-left rounded-lg hover:bg-gray-50 flex items-center gap-3 ${getMobileNavClass("/cooking")}`}
          >
            <Settings
              className={`w-5 h-5 ${location.pathname === "/cooking" ? "text-[#FF5C5C]" : "text-gray-500"}`}
            />{" "}
            {text.nav.cooking}
          </button>
          <div className="h-px bg-gray-100 my-2"></div>

          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              navigate("/chat");
            }}
            className={`p-3 text-left rounded-lg hover:bg-gray-50 flex items-center gap-3 relative ${getMobileNavClass("/chat")}`}
          >
            <div className="relative">
              <MessageCircle
                className={`w-5 h-5 ${location.pathname === "/chat" ? "text-[#FF5C5C]" : "text-gray-500"}`}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF5C5C] rounded-full border-2 border-white"></span>
              )}
            </div>
            {text.nav.chatAssistant}
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              navigate("/menus");
            }}
            className={`p-3 text-left rounded-lg hover:bg-gray-50 flex items-center gap-3 ${getMobileNavClass("/blog")}`}
          >
            <div className="relative">
              <UtensilsCrossed
                className={`w-5 h-5 ${location.pathname === "/menus" ? "text-[#FF5C5C]" : "text-gray-500"}`}
              />
              {menuCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-[#FF5C5C] text-white text-[8px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-white">
                  {menuCount}
                </span>
              )}
            </div>
            {text.nav.menus}
          </button>

          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              navigate("/inventory");
            }}
            className={`p-3 text-left rounded-lg hover:bg-gray-50 flex items-center gap-3 ${getMobileNavClass("/inventory")}`}
          >
            <div className="relative">
              <Archive
                className={`w-5 h-5 ${location.pathname === "/inventory" ? "text-[#FF5C5C]" : "text-gray-500"}`}
              />
              {inventoryCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-[#FF5C5C] text-white text-[8px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-white">
                  {inventoryCount}
                </span>
              )}
            </div>
            {text.nav.fridge}
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              navigate("/grocery");
            }}
            className={`p-3 text-left rounded-lg hover:bg-gray-50 flex items-center gap-3 ${getMobileNavClass("/grocery")}`}
          >
            <div className="relative">
              <ShoppingBag
                className={`w-5 h-5 ${location.pathname === "/grocery" ? "text-[#FF5C5C]" : "text-gray-500"}`}
              />
              {groceryCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-[#FF5C5C] text-white text-[8px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-white">
                  {groceryCount}
                </span>
              )}
            </div>
            {text.nav.shoppingList}
          </button>
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="w-full p-3 text-left rounded-lg hover:bg-gray-50 flex items-center justify-between text-gray-800 font-medium"
          >
            <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-500" /> {text.nav.notifications}
              </div>
              {unreadCount + shoppingNotifications.length > 0 && (
                <span className="bg-[#FF5C5C] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount + shoppingNotifications.length}
                </span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="bg-gray-50 rounded-lg mt-1 p-2 space-y-1 mx-2 mb-2">
                {/* Shopping Notifications */}
                {shoppingNotifications.map((notif) => (
                  <button
                    key={notif.order_id}
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      setIsMobileMenuOpen(false);
                      navigate("/grocery");
                      // Mark as read asynchronously
                      const token = localStorage.getItem("nutri_token");
                      fetch(
                        `${getApiUrl()}/grocery/shopping/notification/${notif.order_id}/read`,
                        {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                        },
                      ).catch(() => {});
                      setShoppingNotifications((prev) =>
                        prev.filter((n) => n.order_id !== notif.order_id),
                      );
                    }}
                    className="w-full text-left p-2 rounded-md hover:bg-white flex items-center gap-2"
                  >
                    <div className="relative flex-shrink-0">
                      {notif.status === "completed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#FF5C5C] rounded-full"></span>
                    </div>
                      <span className="text-xs font-medium text-gray-700 truncate">
                      {notif.status === "completed"
                        ? text.notifications.completedShopping
                        : text.notifications.shoppingFailed}{" "}
                      - {notif.meal_plan_name || text.notifications.menuFallback}
                    </span>
                  </button>
                ))}

                {/* Chat Notifications */}
                {unreadSessions.length > 0 ? (
                  unreadSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        setIsMobileMenuOpen(false);
                        navigate("/chat", { state: { sessionId: session.id } });
                        // Mark as read asynchronously
                        const token = localStorage.getItem("nutri_token");
                        fetch(`${getApiUrl()}/chat/${session.id}/read`, {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                        }).catch(() => {});
                        window.dispatchEvent(
                          new CustomEvent("chatSessionRead", {
                            detail: { sessionId: session.id },
                          }),
                        );
                      }}
                      className="w-full text-left p-2 rounded-md hover:bg-white flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF5C5C] flex-shrink-0"></div>
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {session.title}
                      </span>
                    </button>
                  ))
                ) : shoppingNotifications.length === 0 ? (
                  <div className="text-center text-xs text-gray-500 py-2">
                    {text.notifications.noNewNotifications}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Center: Logo */}
      <div
        className="absolute left-1/2 -translate-x-1/2 cursor-pointer"
        onClick={() => navigate("/dashboard")}
      >
        <span className="font-serif text-2xl sm:text-3xl font-bold text-[#FF5C5C]">
          Nutri.
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4 sm:gap-6">
        <button
          onClick={() => navigate("/chat")}
          className={`transition-colors relative hidden lg:block ${location.pathname === "/chat" ? "text-[#FF5C5C]" : "text-gray-600 hover:text-[#FF5C5C]"}`}
          title={text.nav.chatAssistant}
        >
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF5C5C] rounded-full border-2 border-white"></span>
          )}
        </button>

        <div className="h-6 w-px bg-gray-200 hidden lg:block"></div>

        <button
          onClick={() => navigate("/grocery")}
          className={`transition-colors relative hidden lg:block ${location.pathname === "/grocery" ? "text-[#FF5C5C]" : "text-gray-600 hover:text-[#FF5C5C]"}`}
          title={text.nav.shoppingList}
        >
          <ShoppingBag className="w-5 h-5" />
          {groceryCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[#FF5C5C] text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-white">
              {groceryCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-gray-200 hidden lg:block"></div>

        <button
          onClick={() => navigate("/menus")}
          className={`transition-colors relative hidden lg:block ${location.pathname === "/menus" ? "text-[#FF5C5C]" : "text-gray-600 hover:text-[#FF5C5C]"}`}
          title={text.nav.menus}
        >
          <UtensilsCrossed className="w-5 h-5" />
          {menuCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[#FF5C5C] text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-white">
              {menuCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-gray-200 hidden lg:block"></div>

        <button
          onClick={() => navigate("/inventory")}
          className={`transition-colors relative hidden lg:block ${location.pathname === "/inventory" ? "text-[#FF5C5C]" : "text-gray-600 hover:text-[#FF5C5C]"}`}
          title={text.nav.fridge}
        >
          <Archive className="w-5 h-5" />
          {inventoryCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[#FF5C5C] text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-white">
              {inventoryCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-gray-200 hidden lg:block"></div>

        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="text-gray-600 hover:text-primary transition-colors relative hidden lg:block"
            title={text.nav.notifications}
          >
            <Bell className="w-5 h-5" />
            {unreadCount + shoppingNotifications.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[#FF5C5C] text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-white">
                {unreadCount + shoppingNotifications.length}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] py-2 animate-in fade-in zoom-in-95 duration-200 border border-gray-100 hidden lg:block">
              <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {text.notifications.title}
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {/* Shopping Notifications */}
                {shoppingNotifications.map((notif) => (
                  <button
                    key={notif.order_id}
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate("/grocery");
                      // Mark as read asynchronously
                      const token = localStorage.getItem("nutri_token");
                      fetch(
                        `${getApiUrl()}/grocery/shopping/notification/${notif.order_id}/read`,
                        {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                        },
                      ).catch(() => {});
                      setShoppingNotifications((prev) =>
                        prev.filter((n) => n.order_id !== notif.order_id),
                      );
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 relative">
                      {notif.status === "completed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                      )}
                      {/* Unread dot */}
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#FF5C5C] rounded-full border border-white"></span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {notif.status === "completed"
                          ? text.notifications.completedShopping
                          : text.notifications.shoppingFailed}{" "}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {notif.meal_plan_name || text.notifications.menuFallback}
                      </p>
                    </div>
                  </button>
                ))}

                {/* Chat Notifications */}
                {unreadSessions.length > 0 ? (
                  unreadSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate("/chat", { state: { sessionId: session.id } });
                        // Mark as read asynchronously
                        const token = localStorage.getItem("nutri_token");
                        fetch(`${getApiUrl()}/chat/${session.id}/read`, {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                        }).catch(() => {});
                        window.dispatchEvent(
                          new CustomEvent("chatSessionRead", {
                            detail: { sessionId: session.id },
                          }),
                        );
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="mt-1 w-2 h-2 rounded-full bg-[#FF5C5C] flex-shrink-0"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {text.notifications.newMessageReady}
                        </p>
                      </div>
                    </button>
                  ))
                ) : shoppingNotifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">
                    {text.notifications.noNewNotifications}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 hidden lg:block"></div>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 text-[#FF5C5C] font-medium hover:opacity-80 transition-opacity p-2 sm:p-0"
          >
            <User className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-sm hidden sm:inline">
              {user?.full_name || text.account.adminFallback}
            </span>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] py-2 animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate("/profile");
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400" /> {text.account.accountSettings}
              </button>
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate("/logs");
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <Terminal className="w-4 h-4 text-gray-400" /> {text.account.systemLogs}
              </button>
              <div className="h-px bg-gray-100 my-1"></div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-[#FF5C5C] hover:bg-red-50 flex items-center gap-3 transition-colors"
              >
                <LogOut className="w-4 h-4" /> {text.account.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
