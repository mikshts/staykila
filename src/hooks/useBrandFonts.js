// src/hooks/useBrandFonts.js
import { useEffect } from "react";

export function useBrandFonts() {
  useEffect(() => {
    if (document.getElementById("staykila-fonts")) return;
    const link = document.createElement("link");
    link.id = "staykila-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);
}
