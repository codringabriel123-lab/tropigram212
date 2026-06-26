import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

export default function PageTransition({ children }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [stage, setStage] = useState("visible"); // 'visible' | 'fadeOut' | 'fadeIn'
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname === prevPathRef.current) return;
    prevPathRef.current = location.pathname;

    // Faza 1: fade out
    setStage("fadeOut");

    const t1 = setTimeout(() => {
      // Faza 2: schimbă conținutul și fade in
      setDisplayChildren(children);
      setStage("fadeIn");
    }, 150);

    const t2 = setTimeout(() => {
      setStage("visible");
    }, 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [location.pathname, children]);

  // Dacă e aceeași pagină, afișează direct
  useEffect(() => {
    setDisplayChildren(children);
  }, [children]);

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
