export const dashboardMessages = {
  en: {
    header: {
      greetingMorning: "🌅 Good morning",
      greetingAfternoon: "☀️ Good afternoon",
      greetingEvening: "🌙 Good evening",
      prompt: "How many delicious meals would you like to plan for this week?",
      cta: "Let's plan!",
      defaultChef: "Chef",
      planPrompt: (mealCount: number) =>
        `Create a ${mealCount}-day meal plan for me`,
    },
    page: {
      tagline: "The app that does your groceries and helps you cook ❤️",
      cardOneTitle: "Love at First Bite 💖",
      cardOneDescription:
        "Recipes so good, it's a match from the first bite.",
      cardOneButton: "Discover my recipes",
      cardOneAlt: "Love at first bite",
      cardTwoTitle: "Quick & Easy ⚡",
      cardTwoDescription:
        "Short on time? These recipes are ready in under 15 minutes.",
      cardTwoButton: "See collection",
      cardTwoAlt: "Quick and easy",
    },
  },
  vi: {
    header: {
      greetingMorning: "🌅 Chào buổi sáng",
      greetingAfternoon: "☀️ Chào buổi chiều",
      greetingEvening: "🌙 Chào buổi tối",
      prompt: "Tuần này bạn muốn lên kế hoạch cho bao nhiêu bữa ăn ngon?",
      cta: "Lên kế hoạch thôi!",
      defaultChef: "Đầu bếp",
      planPrompt: (mealCount: number) =>
        `Hãy tạo cho tôi thực đơn ${mealCount} ngày.`,
    },
    page: {
      tagline: "Ứng dụng giúp bạn đi chợ và nấu ăn dễ dàng hơn ❤️",
      cardOneTitle: "Yêu từ miếng đầu tiên 💖",
      cardOneDescription:
        "Những công thức ngon đến mức bạn sẽ thích ngay từ lần thử đầu tiên.",
      cardOneButton: "Khám phá công thức",
      cardOneAlt: "Yêu từ miếng đầu tiên",
      cardTwoTitle: "Nhanh & Dễ ⚡",
      cardTwoDescription:
        "Ít thời gian? Những công thức này sẵn sàng trong chưa đến 15 phút.",
      cardTwoButton: "Xem bộ sưu tập",
      cardTwoAlt: "Nhanh và dễ",
    },
  },
} as const;
