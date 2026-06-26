import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

export default function PageTransition({ children }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [stage, setStage] = useState("visible"); // 'visible' | 'fadeOut' | 'fadeIn'
  const prevPathRef = useRef(location.pathname);

  // Ținem mereu cea mai recentă versiune a copiilor, ca să nu prindem
  // o referință veche în setTimeout (closure stale) când se navighează rapid.
  const childrenRef = useRef(children);
  childrenRef.current = children;

  useEffect(() => {
    if (location.pathname === prevPathRef.current) {
      // Aceeași rută (ex: doar conținutul s-a actualizat) — afișăm direct,
      // fără să trecem prin fadeOut/fadeIn.
      setDisplayChildren(children);
      return;
    }
    prevPathRef.current = location.pathname;

    // Faza 1: fade out
    setStage("fadeOut");

    const t1 = setTimeout(() => {
      // Faza 2: schimbă conținutul și fade in
      setDisplayChildren(childrenRef.current);
      setStage("fadeIn");
    }, 150);

    const t2 = setTimeout(() => {
      setStage("visible");
    }, 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [location.pathname]);

  const styles = {
    visible: { opacity: 1, transform: "translateY(0)" },
    fadeOut: { opacity: 0, transform: "translateY(-6px)", transition: "opacity 0.15s ease, transform 0.15s ease" },
    fadeIn: { opacity: 0, transform: "translateY(8px)", animation: "pageSlideIn 0.2s ease forwards" },
  };

  return (
    <div style={{ ...styles[stage], willChange: "opacity, transform" }}>
      {displayChildren}
    </div>
  );
}
