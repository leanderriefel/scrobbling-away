import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type MarkovGraphContextValue = {
  closeMarkovGraph: () => void;
  isOpen: boolean;
  openMarkovGraph: () => void;
};

const MarkovGraphContext = createContext<MarkovGraphContextValue | undefined>(undefined);

export const MarkovGraphProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openMarkovGraph = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeMarkovGraph = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMarkovGraph();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMarkovGraph, isOpen]);

  return (
    <MarkovGraphContext.Provider value={{ closeMarkovGraph, isOpen, openMarkovGraph }}>
      {children}
    </MarkovGraphContext.Provider>
  );
};

export const useMarkovGraph = () => {
  const context = useContext(MarkovGraphContext);

  if (!context) {
    throw new Error("Markov graph context is missing.");
  }

  return context;
};
