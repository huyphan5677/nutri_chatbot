import { Bot, Pause, Play, RefreshCw, Server, Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { systemMessages } from "../system.messages";
import { fetchLogs } from "../api/systemApi";

export const LogsPage = () => {
  const { locale } = useLocale();
  const text = systemMessages[locale].logs;
  const [logType, setLogType] = useState<"app" | "ai">("app");
  const [lineCount, setLineCount] = useState<number>(100);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const loadLogs = async (showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true);
    setError(null);
    try {
      const data = await fetchLogs(logType, lineCount);
      setLogs(data);
    } catch (err: any) {
      const message = err?.message;
      if (message === "LOGS_AUTH_REQUIRED") {
        setError(text.authRequired);
      } else if (message === "LOGS_FETCH_FAILED") {
        setError(text.fetchFailed);
      } else {
        setError(message || text.fetchFailed);
      }
    } finally {
      if (showLoadingState) setIsLoading(false);
    }
  };

  // Auto-refresh Hook
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAutoRefresh) {
      interval = setInterval(() => {
        loadLogs(false); // don't flash loading spinner
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isAutoRefresh, logType, lineCount]);

  // Initial load on type change
  useEffect(() => {
    loadLogs(true);
  }, [logType, lineCount]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop =
        logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Terminal className="w-8 h-8 text-[#FF5C5C]" />
              {text.title}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {text.subtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 w-full md:w-fit overflow-hidden">
            {/* Tab Toggle */}
            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg w-full sm:w-auto">
              <button
                onClick={() => setLogType("app")}
                className={`flex-1 sm:flex-initial flex justify-center items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  logType === "app"
                    ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Server className="w-4 h-4 shrink-0" /> {text.appTab}
              </button>
              <button
                onClick={() => setLogType("ai")}
                className={`flex-1 sm:flex-initial flex justify-center items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  logType === "ai"
                    ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Bot className="w-4 h-4 shrink-0" /> {text.aiTab}
              </button>
            </div>

            {/* Controls */}
            <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-slate-700 shrink-0"></div>

            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <select
                value={lineCount}
                onChange={(e) => setLineCount(Number(e.target.value))}
                className="flex-1 sm:flex-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg px-2 lg:px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-slate-700"
              >
                <option value={50}>{text.lineOptions[50]}</option>
                <option value={100}>{text.lineOptions[100]}</option>
                <option value={200}>{text.lineOptions[200]}</option>
                <option value={500}>{text.lineOptions[500]}</option>
                <option value={1000}>{text.lineOptions[1000]}</option>
              </select>

              <button
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isAutoRefresh
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 border border-transparent"
                }`}
              >
                {isAutoRefresh ? (
                  <Pause className="w-4 h-4 shrink-0" />
                ) : (
                  <Play className="w-4 h-4 shrink-0" />
                )}
                {text.autoRefresh}
              </button>

              <button
                onClick={() => loadLogs()}
                disabled={isLoading}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white p-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 shrink-0"
              >
                <RefreshCw
                  className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Log Viewer Pane */}
        <div className="bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-800 overflow-hidden flex flex-col h-[70vh]">
          <div className="bg-[#2d2d2d] px-4 py-3 flex items-center gap-2 border-b border-gray-700">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-gray-400 text-xs ml-2 font-mono">
              tail -n {lineCount} logs/
              {logType === "app" ? text.fileName.app : text.fileName.ai}
            </span>
          </div>

          <div
            ref={logsContainerRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-sm"
          >
            {error && (
              <div className="text-red-400 mb-4 bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                {text.serverErrorPrefix}: {error}
              </div>
            )}

            {!error && logs.length === 0 && !isLoading && (
              <div className="text-gray-500 italic">
                {text.emptyState}
              </div>
            )}

            {!error &&
              logs.map((line, index) => {
                // Syntax highlighting parsing logic
                let colorClass = "text-gray-300";
                if (line.includes(" ERROR "))
                  colorClass = "text-red-400 font-bold";
                else if (line.includes(" WARN "))
                  colorClass = "text-yellow-400";
                else if (line.includes(" INFO ")) colorClass = "text-blue-300";
                else if (line.includes(" DEBUG ")) colorClass = "text-gray-500";

                return (
                  <div
                    key={index}
                    className={`whitespace-pre-wrap ${colorClass} leading-relaxed hover:bg-white/5 px-2 -mx-2 rounded transition-colors break-words`}
                  >
                    {line}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
