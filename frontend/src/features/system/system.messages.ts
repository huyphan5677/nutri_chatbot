export const systemMessages = {
  en: {
    logs: {
      title: "System Logs",
      subtitle: "Real-time troubleshooting and monitoring",
      appTab: "App",
      aiTab: "AI Agents",
      autoRefresh: "Auto-refresh",
      authRequired: "Authentication required to view logs",
      fetchFailed: "Failed to fetch logs",
      serverErrorPrefix: "Error connecting to log server",
      emptyState: "No logs found for this context...",
      lineOptions: {
        50: "50 lines",
        100: "100 lines",
        200: "200 lines",
        500: "500 lines",
        1000: "1K lines",
      },
      fileName: {
        app: "nutri.log",
        ai: "ai_agent.log",
      },
    },
  },
  vi: {
    logs: {
      title: "Nhật ký hệ thống",
      subtitle: "Theo dõi và xử lý sự cố theo thời gian thực",
      appTab: "Ứng dụng",
      aiTab: "Tác nhân AI",
      autoRefresh: "Tự làm mới",
      authRequired: "Cần đăng nhập để xem nhật ký",
      fetchFailed: "Không thể tải nhật ký",
      serverErrorPrefix: "Lỗi kết nối máy chủ nhật ký",
      emptyState: "Không có nhật ký cho ngữ cảnh này...",
      lineOptions: {
        50: "50 dòng",
        100: "100 dòng",
        200: "200 dòng",
        500: "500 dòng",
        1000: "1K dòng",
      },
      fileName: {
        app: "nutri.log",
        ai: "ai_agent.log",
      },
    },
  },
} as const;
