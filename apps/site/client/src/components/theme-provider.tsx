import { createContext, useContext, useEffect, type ReactNode } from "react";

interface ThemeContextType {
  theme: "light";
}

const ThemeContext = createContext<ThemeContextType>({ theme: "light" });

/**
 * The site follows the RWA-ID product surface, which is light. There is no
 * toggle: the dashboard and the claim page are light, and flipping themes
 * between marketing and product is the jolt this replaced.
 *
 * The `dark` class is actively removed because it was previously pinned in
 * index.html and persisted to localStorage, so returning visitors still carry it.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("rwa-id-theme");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "light" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
