import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type SkinId = "classic" | "cortex" | "night";

export interface Skin {
  id: SkinId;
  name: string;
  description: string;
}

export const skins: Skin[] = [
  {
    id: "classic",
    name: "Classic Light",
    description: "Neutral workspace with high contrast controls.",
  },
  {
    id: "cortex",
    name: "WinAmp Cortex",
    description: "Dark studio skin inspired by modular audio racks.",
  },
  {
    id: "night",
    name: "Night Export",
    description: "Low-glare skin for long rendering sessions.",
  },
];

interface SkinContextValue {
  skin: Skin;
  skinId: SkinId;
  setSkinId: (skinId: SkinId) => void;
}

const SkinContext = createContext<SkinContextValue | null>(null);

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skinId, setSkinId] = useState<SkinId>("cortex");
  const skin = useMemo(() => skins.find((item) => item.id === skinId) || skins[0], [skinId]);

  return (
    <SkinContext.Provider value={{ skin, skinId, setSkinId }}>
      <div className="skin-root" data-skin={skin.id}>
        {children}
      </div>
    </SkinContext.Provider>
  );
}

export function useSkin() {
  const value = useContext(SkinContext);
  if (!value) {
    throw new Error("useSkin must be used inside SkinProvider");
  }
  return value;
}
