import {
  PhysicalLayout,
  Keymap as KeymapMsg,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

import {
  LayoutZoom,
  PhysicalLayout as PhysicalLayoutComp,
} from "./PhysicalLayout";
import { HidUsageLabel } from "./HidUsageLabel";
import {
  hid_usage_get_labels,
  hid_usage_page_and_id_from_usage,
} from "../hid-usages";

type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;

export interface KeymapProps {
  layout: PhysicalLayout;
  keymap: KeymapMsg;
  behaviors: BehaviorMap;
  scale: LayoutZoom;
  selectedLayerIndex: number;
  selectedKeyPosition: number | undefined;
  onKeyPositionClicked: (keyPosition: number) => void;
}

export const Keymap = ({
  layout,
  keymap,
  behaviors,
  scale,
  selectedLayerIndex,
  selectedKeyPosition,
  onKeyPositionClicked,
}: KeymapProps) => {
  if (!keymap.layers[selectedLayerIndex]) {
    return <></>;
  }

  const positions = layout.keys.map((k, i) => {
    if (i >= keymap.layers[selectedLayerIndex].bindings.length) {
      return {
        id: `${keymap.layers[selectedLayerIndex].id}-${i}`,
        header: "Unknown",
        x: k.x / 100.0,
        y: k.y / 100.0,
        width: k.width / 100,
        height: k.height / 100.0,
        children: <span></span>,
      };
    }

    const binding = keymap.layers[selectedLayerIndex].bindings[i];
    const behavior = behaviors[binding.behaviorId];

    // Check for "implicit mods" in the high 8 bits of param1
    const hasModifiers = (binding.param1 & 0xFF000000) !== 0;

    let header = behavior?.displayName || "Unknown";
    let childUsage = binding.param1;

    // Mod-Tap: Show Tap Key (param2) in center, Mod (param1) in header
    if (behavior?.displayName === "Mod-Tap") {
      childUsage = binding.param2;
      const [p, i] = hid_usage_page_and_id_from_usage(binding.param1);
      const labels = hid_usage_get_labels(p, i);
      if (labels.short) {
        header = labels.short.replace(/^Keyboard /, "");
      }
    }

    // Layer-Tap: Show Tap Key (param2) in center, Layer (param1) in header
    if (behavior?.displayName === "Layer-Tap") {
      childUsage = binding.param2;
      header = `LT ${binding.param1}`;
    }

    return {
      id: `${keymap.layers[selectedLayerIndex].id}-${i}`,
      header,
      hasModifiers,
      x: k.x / 100.0,
      y: k.y / 100.0,
      width: k.width / 100,
      height: k.height / 100.0,
      r: (k.r || 0) / 100.0,
      rx: (k.rx || 0) / 100.0,
      ry: (k.ry || 0) / 100.0,
      children: (
        <HidUsageLabel
          hid_usage={childUsage}
        />
      ),
    };
  });

  return (
    <PhysicalLayoutComp
      positions={positions}
      oneU={48}
      hoverZoom={true}
      zoom={scale}
      selectedPosition={selectedKeyPosition}
      onPositionClicked={onKeyPositionClicked}
    />
  );
};
