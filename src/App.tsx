import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { HomeOverviewPage } from "./pages/HomeOverviewPage";
import { FlowAnalysisPage } from "./pages/FlowAnalysisPage";
import { WaterQualityAnalysisPage } from "./pages/WaterQualityAnalysisPage";
import { ScenarioAnalysisPage } from "./pages/ScenarioAnalysisPage";
import { DataManagerPage } from "./pages/DataManagerPage";

const navItems = [
  { to: "/overview", label: "Overview" },
  { to: "/flow", label: "Flow analysis" },
  { to: "/water-quality", label: "Water quality" },
  { to: "/scenarios", label: "Scenario analysis" },
  { to: "/data", label: "Data manager" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-shrink-0 border-r border-slate-800 bg-slate-950/60 lg:block">
          <div className="flex h-16 items-center border-b border-slate-800 px-5">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Springfield STW
              </div>
              <div className="text-base font-semibold text-slate-50">
                Storm overflow dashboard
              </div>
            </div>
          </div>
          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/overview"}
                className={({ isActive }) =>
                  [
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Springfield STW
              </span>
            </div>
          </header>

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<HomeOverviewPage />} />
              <Route path="/flow" element={<FlowAnalysisPage />} />
              <Route path="/water-quality" element={<WaterQualityAnalysisPage />} />
              <Route path="/scenarios" element={<ScenarioAnalysisPage />} />
              <Route path="/data" element={<DataManagerPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

