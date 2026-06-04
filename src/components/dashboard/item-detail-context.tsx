import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type ItemDetailBase = {
  imageUrl?: string;
  playCount?: number;
  username: string;
  usernameLower: string;
};

export type ItemDetailSelection =
  | (ItemDetailBase & { artistName: string; kind: "artist" })
  | (ItemDetailBase & { albumName: string; artistName: string; kind: "album" })
  | (ItemDetailBase & { artistName: string; kind: "track"; trackName: string });

type ItemDetailContextValue = {
  closeItemDetail: () => void;
  openItemDetail: (selection: ItemDetailSelection) => void;
  selection: ItemDetailSelection | null;
};

const ItemDetailContext = createContext<ItemDetailContextValue | undefined>(undefined);

export const ItemDetailProvider = ({ children }: { children: ReactNode }) => {
  const [selection, setSelection] = useState<ItemDetailSelection | null>(null);

  const openItemDetail = useCallback((next: ItemDetailSelection) => {
    setSelection(next);
  }, []);

  const closeItemDetail = useCallback(() => {
    setSelection(null);
  }, []);

  useEffect(() => {
    if (!selection) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeItemDetail();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeItemDetail, selection]);

  return (
    <ItemDetailContext.Provider value={{ closeItemDetail, openItemDetail, selection }}>
      {children}
    </ItemDetailContext.Provider>
  );
};

export const useItemDetail = () => {
  const context = useContext(ItemDetailContext);

  if (!context) {
    throw new Error("Item detail context is missing.");
  }

  return context;
};

export const getItemDetailTitle = (selection: ItemDetailSelection) => {
  switch (selection.kind) {
    case "artist":
      return selection.artistName;
    case "album":
      return selection.albumName;
    case "track":
      return selection.trackName;
  }
};

export const toItemDetailFilter = (selection: ItemDetailSelection) => {
  switch (selection.kind) {
    case "artist":
      return { kind: "artist" as const, artistName: selection.artistName };
    case "album":
      return {
        kind: "album" as const,
        albumName: selection.albumName,
        artistName: selection.artistName,
      };
    case "track":
      return {
        kind: "track" as const,
        artistName: selection.artistName,
        trackName: selection.trackName,
      };
  }
};
