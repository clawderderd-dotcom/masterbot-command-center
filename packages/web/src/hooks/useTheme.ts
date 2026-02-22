import * as React from "react";

export type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  const dark = theme === "dark" || (theme === "system" && systemDark);
  const light = theme === "light";

  root.classList.toggle("dark", dark);
  root.classList.toggle("light", light);
}

export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>(() => {
    const v = localStorage.getItem("mcc.theme") as Theme | null;
    return v ?? "system";
  });

  React.useEffect(() => {
    localStorage.setItem("mcc.theme", theme);
    applyTheme(theme);
  }, [theme]);

  React.useEffect(() => {
    const m = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!m) return;
    const onChange = () => applyTheme(theme);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, [theme]);

  return { theme, setTheme };
}
