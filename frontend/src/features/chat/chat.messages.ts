export const chatMessages = {
  en: {
    thinking: {
      process: (seconds: string) => `Thinking Process (${seconds}s)`,
      streaming: (seconds: string) => `Thinking... ${seconds}s`,
      runningTool: (toolName: string) => `Running ${toolName}`,
      toolNames: {
        get_user_profile: "Reading health profile...",
        predict_glucose_spike: "Analyzing glucose spike...",
        calculate_bmr: "Calculating BMR...",
        build_new_menu_plan: "Creating meal plan...",
        web_search_info: "Web search...",
        get_health_goals: "Getting health goals...",
        memory_retrieval: "Retrieving past preferences...",
        view_historical_diet_log: "Checking past history...",
        view_historical_diet_log_detail: "Fetching historical logs...",
      },
    },
    sidebar: {
      title: "Chat History",
      newChat: "New Chat",
      closeSidebar: "Close sidebar",
      openSidebar: "Open sidebar",
      renameChat: "Rename chat",
      deleteChat: "Delete chat",
      groups: {
        today: "Today",
        yesterday: "Yesterday",
        previous7Days: "Previous 7 Days",
        older: "Older",
      },
    },
    empty: {
      badge: "Corin Assistant",
      headingMain: "Plan meals faster,",
      headingAccent: "without menu guesswork.",
      description:
        "Pick a quick action below to start instantly, or type your own request. Corin can plan meals, estimate BMR, and track your nutrition goals.",
      primaryCta: "Build Weekly Plan",
      secondaryCta: "Review My Profile",
      chips: {
        meal: "Smart meal suggestions",
        bmr: "BMR and glucose insights",
        profile: "Profile-aware planning",
      },
      quickActionsTitle: "Quick Actions",
      cards: {
        mealTitle: "Meal Suggestions & Planning",
        mealSuggest: "Suggest a meal",
        meal2Day: "2-day Meal Plan",
        bmrTitle: "BMR & Blood Sugar",
        bmrCalc: "Calculate BMR",
        bmrPredict: "Predict Impact",
        profileTitle: "Profile",
        profileView: "View Profile",
        searchTitle: "Quick Search",
        searchGold: "Current Gold Price",
      },
      prompts: {
        weeklyPlan:
          "Create a 7-day family meal plan based on my current health profile and goals",
        reviewProfile:
          "Review my current health profile and suggest what to improve this week",
        suggestMeal:
          "Suggest a 500 kcal dinner for someone trying to lose weight",
        twoDayPlan:
          "Create a 2-day muscle-building meal plan that's easy to prepare",
        calculateBmr: "Calculate BMR based on standard formulas",
        predictImpact:
          "Predict the impact of a bowl of pho on blood sugar levels",
        viewProfile: "View my current health profile and goals",
        goldPrice: "What is the current price of gold today?",
      },
    },
    message: {
      systemTag: "System",
      savedMenu: "Saved Menu.",
      goToShopping: "Go to Shopping...",
      saveMenu: "Save Menu",
      askPlaceholder: "Ask Corin anything...",
    },
    toast: {
      notSynced: "Message is not synced yet. Please try again.",
      cannotSync: "Could not sync message. Please try again.",
      saveSuccess: "Saved menu successfully.",
      saveFailed: "Failed to save menu. Please try again.",
    },
    modal: {
      deleteTitle: "Delete Chat Session",
      deleteDescription:
        "Are you sure you want to delete this conversation? This action cannot be undone and you will lose all messages in this thread.",
      cancel: "Cancel",
      delete: "Delete",
    },
    dateLocale: "en-US",
  },
  vi: {
    thinking: {
      process: (seconds: string) => `Quá trình suy nghĩ (${seconds} giây)`,
      streaming: (seconds: string) => `Đang suy nghĩ... ${seconds} giây`,
      runningTool: (toolName: string) => `Đang chạy ${toolName}`,
      toolNames: {
        get_user_profile: "Đang đọc hồ sơ sức khỏe...",
        predict_glucose_spike: "Đang phân tích tăng đường huyết...",
        calculate_bmr: "Đang tính BMR...",
        build_new_menu_plan: "Đang tạo thực đơn...",
        web_search_info: "Đang tìm kiếm web...",
        get_health_goals: "Đang lấy mục tiêu sức khỏe...",
        memory_retrieval: "Đang truy xuất sở thích trước đây...",
        view_historical_diet_log: "Đang kiểm tra lịch sử ăn uống...",
        view_historical_diet_log_detail: "Đang tải nhật ký chi tiết...",
      },
    },
    sidebar: {
      title: "Lịch sử chat",
      newChat: "Đoạn chat mới",
      closeSidebar: "Đóng thanh bên",
      openSidebar: "Mở thanh bên",
      renameChat: "Đổi tên đoạn chat",
      deleteChat: "Xóa đoạn chat",
      groups: {
        today: "Hôm nay",
        yesterday: "Hôm qua",
        previous7Days: "7 ngày trước",
        older: "Cũ hơn",
      },
    },
    empty: {
      badge: "Trợ lý Corin",
      headingMain: "Lên thực đơn nhanh hơn,",
      headingAccent: "không cần đoán mò.",
      description:
        "Chọn thao tác nhanh bên dưới để bắt đầu ngay, hoặc nhập yêu cầu của bạn. Corin có thể lên thực đơn, ước tính BMR và theo dõi mục tiêu dinh dưỡng.",
      primaryCta: "Tạo thực đơn tuần",
      secondaryCta: "Xem hồ sơ của tôi",
      chips: {
        meal: "Gợi ý bữa ăn thông minh",
        bmr: "Phân tích BMR và đường huyết",
        profile: "Lập kế hoạch theo hồ sơ",
      },
      quickActionsTitle: "Tác vụ nhanh",
      cards: {
        mealTitle: "Gợi ý & lập thực đơn",
        mealSuggest: "Gợi ý món ăn",
        meal2Day: "Thực đơn 2 ngày",
        bmrTitle: "BMR & đường huyết",
        bmrCalc: "Tính BMR",
        bmrPredict: "Dự đoán tác động",
        profileTitle: "Hồ sơ",
        profileView: "Xem hồ sơ",
        searchTitle: "Tìm nhanh",
        searchGold: "Giá vàng hiện tại",
      },
      prompts: {
        weeklyPlan:
          "Tạo thực đơn gia đình 7 ngày dựa trên hồ sơ sức khỏe và mục tiêu hiện tại của tôi",
        reviewProfile:
          "Xem hồ sơ sức khỏe hiện tại của tôi và gợi ý những điểm cần cải thiện trong tuần này",
        suggestMeal:
          "Gợi ý một bữa tối 500 kcal cho người đang muốn giảm cân",
        twoDayPlan: "Tạo thực đơn tăng cơ 2 ngày, dễ chuẩn bị",
        calculateBmr: "Tính BMR dựa trên các công thức tiêu chuẩn",
        predictImpact:
          "Dự đoán tác động của một tô phở lên đường huyết",
        viewProfile: "Xem hồ sơ sức khỏe và mục tiêu hiện tại của tôi",
        goldPrice: "Giá vàng hiện tại hôm nay là bao nhiêu?",
      },
    },
    message: {
      systemTag: "Hệ thống",
      savedMenu: "Đã lưu thực đơn.",
      goToShopping: "Đến danh sách mua sắm...",
      saveMenu: "Lưu thực đơn",
      askPlaceholder: "Hỏi Corin bất cứ điều gì...",
    },
    toast: {
      notSynced: "Tin nhắn chưa đồng bộ xong. Vui lòng thử lại.",
      cannotSync: "Không thể đồng bộ tin nhắn. Vui lòng thử lại.",
      saveSuccess: "Lưu thực đơn thành công.",
      saveFailed: "Không thể lưu thực đơn. Vui lòng thử lại.",
    },
    modal: {
      deleteTitle: "Xóa đoạn chat",
      deleteDescription:
        "Bạn có chắc muốn xóa cuộc trò chuyện này không? Hành động này không thể hoàn tác và bạn sẽ mất toàn bộ tin nhắn trong đoạn chat này.",
      cancel: "Hủy",
      delete: "Xóa",
    },
    dateLocale: "vi-VN",
  },
} as const;
