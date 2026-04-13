import { useLocale } from "@/shared/i18n/LocaleContext";
import { ExternalLink } from "lucide-react";
import { blogMessages } from "../blog.messages";

export const BlogPage = () => {
  const { locale } = useLocale();
  const copy = blogMessages[locale];

  return (
    <div className="min-h-screen bg-background flex flex-col pt-16 lg:pt-0">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-warm-50 dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-24 text-center relative z-10">
          <span className="inline-block px-4 py-2 bg-orange-100/50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-400 text-sm font-bold uppercase tracking-widest rounded-full mb-6 relative border border-orange-200/50 dark:border-orange-500/20">
            {copy.hero.badge}
            <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full animate-ping" />
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white mb-6 font-serif">
            {copy.hero.titleLeading}{" "}
            <span className="text-[#D96C4A] dark:text-orange-400">{copy.hero.titleAccent}</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed font-medium">
            {copy.hero.description}
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 dark:opacity-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-10 translate-x-1/3 translate-y-1/3 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 dark:opacity-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      </div>

      {/* Blog Grid */}
      <div className="flex-1 max-w-7xl mx-auto px-6 py-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
          {copy.blogs.map((blog, index) => (
            <div
              key={blog.id}
              className="group bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-slate-700 hover:border-red-100 dark:hover:border-red-900/40 flex flex-col animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="h-64 overflow-hidden relative">
                <img
                  src={blog.image}
                  alt={blog.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Tags */}
                <div className="absolute top-4 left-4 flex gap-2">
                  {blog.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-xs font-bold text-gray-700 dark:text-gray-200 rounded-full shadow-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-8 flex flex-col flex-1">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 font-serif group-hover:text-[#FF5C5C] transition-colors line-clamp-1">
                  {blog.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8 flex-1 line-clamp-3">
                  {blog.description}
                </p>

                <a
                  href={blog.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto flex items-center justify-center gap-2 w-full py-4 bg-warm-50 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-slate-600 text-[#FF5C5C] dark:text-red-400 font-bold rounded-2xl transition-colors border border-red-100 dark:border-red-900/30"
                >
                  {copy.cta.visitBlog}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
