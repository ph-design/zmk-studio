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
    // Gather multi-layer data for this key position
    const layerBindings = keymap.layers.map((layer, layerIndex) => {
      const binding = layer.bindings[i];
      if (!binding) return { layerIndex, name: layer.name, behavior: "Unknown", param: "" };
      
      const behavior = behaviors[binding.behaviorId];
      return {
        layerIndex,
        layerName: layer.name || `Layer ${layerIndex}`,
        behaviorDisplayName: behavior?.displayName || "Unknown",
        binding
      };
    });

    if (i >= keymap.layers[selectedLayerIndex].bindings.length) {
      return {
        id: `${keymap.layers[selectedLayerIndex].id}-${i}`,
        header: "Unknown",
        x: k.x / 100.0,
        y: k.y / 100.0,
        width: k.width / 100,
        height: k.height / 100.0,
        children: <span></span>,
        layerBindings
      };
    }

    let header: string | undefined =
      behaviors[keymap.layers[selectedLayerIndex].bindings[i].behaviorId]
        ?.displayName || "Unknown";

    // Hide header if it's "Unknown" or "&trans" (often mapped to "Transparent" or similar)
    const hiddenHeaders = ["Unknown", "&trans", "Trans", "Transparent", "&none", "None"];
    if (hiddenHeaders.includes(header)) {
      header = undefined;
    }

    return {
      id: `${keymap.layers[selectedLayerIndex].id}-${i}`,
      header,
      x: k.x / 100.0,
      y: k.y / 100.0,
      width: k.width / 100,
      height: k.height / 100.0,
      r: (k.r || 0) / 100.0,
      rx: (k.rx || 0) / 100.0,
      ry: (k.ry || 0) / 100.0,
      children: (
        header ? (
          <HidUsageLabel
            hid_usage={keymap.layers[selectedLayerIndex].bindings[i].param1}
          />
        ) : null
      ),
      layerBindings
    };
  });

  return (
    <PhysicalLayoutComp
      positions={positions}
      oneU={60}
      hoverZoom={true}
      zoom={scale}
      selectedPosition={selectedKeyPosition}
      onPositionClicked={onKeyPositionClicked}
    />
  );
};
