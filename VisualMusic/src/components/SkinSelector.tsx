import { skins, useSkin } from "../skins/skins";
import type { SkinId } from "../skins/skins";

export default function SkinSelector() {
  const { skinId, setSkinId } = useSkin();

  return (
    <label className="skin-selector">
      <span>Skin</span>
      <select value={skinId} onChange={(event) => setSkinId(event.target.value as SkinId)}>
        {skins.map((skin) => (
          <option key={skin.id} value={skin.id}>
            {skin.name}
          </option>
        ))}
      </select>
    </label>
  );
}
