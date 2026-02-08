import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  GetBehaviorDetailsResponse,
  BehaviorBindingParametersSet,
  BehaviorParameterValueDescription,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { validateValue } from "./parameters";
import {
  BEHAVIOR_CATEGORIES,
  categorizeBehaviors,
  type BehaviorCategory,
} from "./BehaviorCategories";
import { HidUsageGrid } from "./HidUsageGrid";
import {
  hid_usage_page_and_id_from_usage,
  hid_usage_get_label,
} from "../hid-usages";

export interface BehaviorBindingPickerProps {
  binding: BehaviorBinding;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  onBindingChanged: (binding: BehaviorBinding) => void;
}

function validateBinding(
  metadata: BehaviorBindingParametersSet[],
  layerIds: number[],
  param1?: number,
  param2?: number
): boolean {
  if (
    (param1 === undefined || param1 === 0) &&
    metadata.every((s) => !s.param1 || s.param1.length === 0)
  ) {
    return true;
  }

  let matchingSet = metadata.find((s) =>
    validateValue(layerIds, param1, s.param1)
  );

  if (!matchingSet) {
    return false;
  }

  return validateValue(layerIds, param2, matchingSet.param2);
}

function hasHidUsage(values: BehaviorParameterValueDescription[]): boolean {
  return values.some((v) => v.hidUsage);
}

function hasLayerId(values: BehaviorParameterValueDescription[]): boolean {
  return values.some((v) => v.layerId);
}

function hasConstants(values: BehaviorParameterValueDescription[]): boolean {
  return values.every((v) => v.constant !== undefined);
}

const InlineParamPicker = ({
  values,
  value,
  layers,
  onValueChanged,
  label,
}: {
  values: BehaviorParameterValueDescription[];
  value?: number;
  layers: { id: number; name: string }[];
  onValueChanged: (value?: number) => void;
  label?: string;
}) => {
  if (values.length === 0) return null;

  if (hasConstants(values)) {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <div className="text-sm text-base-content/60 mb-1">{label}</div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(3.2rem,1fr))] gap-1.5">
          {values.map((v) => {
            const name = v.name || "";
            const colSpan = name.length > 7 ? 3 : name.length > 3 ? 2 : 1;
            const spanClass = colSpan === 3 ? "col-span-3" : colSpan === 2 ? "col-span-2" : "";
            return (
              <button
                key={v.constant}
                onClick={() => onValueChanged(v.constant)}
                className={`${spanClass} h-[3.2rem] rounded text-sm font-medium cursor-pointer transition-colors flex items-center justify-center ${value === v.constant
                  ? "bg-primary text-primary-content"
                  : "bg-base-100 text-base-content hover:bg-base-300"
                  }`}
              >
                <span className="truncate px-1">{name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (values.length === 1 && values[0].layerId) {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <div className="text-sm text-base-content/60 mb-1">{label}</div>
        )}
        <div className="flex gap-1.5 flex-wrap">
          {layers.map(({ name, id }) => (
            <button
              key={id}
              onClick={() => onValueChanged(id)}
              className={`px-4 py-1.5 rounded text-sm font-medium cursor-pointer transition-colors ${value === id
                ? "bg-primary text-primary-content"
                : "bg-base-100 text-base-content hover:bg-base-300"
                }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (values.length === 1 && values[0].range) {
    const { min, max } = values[0].range;
    const buttons = [];
    for (let i = min; i <= max; i++) {
      buttons.push(i);
    }
    return (
      <div className="flex flex-col gap-1">
        <div className="text-sm text-base-content/60 mb-1">{values[0].name}</div>
        <div className="flex gap-1.5 flex-wrap">
          {buttons.map((n) => (
            <button
              key={n}
              onClick={() => onValueChanged(n)}
              className={`w-10 h-10 rounded text-sm font-medium cursor-pointer transition-colors flex items-center justify-center ${value === n
                ? "bg-primary text-primary-content"
                : "bg-base-100 text-base-content hover:bg-base-300"
                }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export const BehaviorBindingPicker = ({
  binding,
  layers,
  behaviors,
  onBindingChanged,
}: BehaviorBindingPickerProps) => {
  const { t } = useTranslation();
  const [behaviorId, setBehaviorId] = useState(binding.behaviorId);
  const [param1, setParam1] = useState<number | undefined>(binding.param1);
  const [param2, setParam2] = useState<number | undefined>(binding.param2);

  const categorized = useMemo(
    () => categorizeBehaviors(behaviors),
    [behaviors]
  );

  const currentCategory = useMemo(() => {
    for (const cat of BEHAVIOR_CATEGORIES) {
      if (categorized[cat.id]?.some((b) => b.id === behaviorId)) {
        return cat.id;
      }
    }
    return "other";
  }, [categorized, behaviorId]);

  const [selectedCategoryId, setSelectedCategoryId] = useState(currentCategory);

  useEffect(() => {
    setSelectedCategoryId(currentCategory);
  }, [currentCategory]);

  const metadata = useMemo(
    () => behaviors.find((b) => b.id == behaviorId)?.metadata,
    [behaviorId, behaviors]
  );

  const selectedBehavior = useMemo(
    () => behaviors.find((b) => b.id == behaviorId),
    [behaviorId, behaviors]
  );

  useEffect(() => {
    if (
      binding.behaviorId === behaviorId &&
      binding.param1 === param1 &&
      binding.param2 === param2
    ) {
      return;
    }

    if (!metadata) {
      console.error(
        "Can't find metadata for the selected behaviorId",
        behaviorId
      );
      return;
    }

    if (
      validateBinding(
        metadata,
        layers.map(({ id }) => id),
        param1,
        param2
      )
    ) {
      onBindingChanged({
        behaviorId,
        param1: param1 || 0,
        param2: param2 || 0,
      });
    }
  }, [behaviorId, param1, param2]);

  useEffect(() => {
    setBehaviorId(binding.behaviorId);
    setParam1(binding.param1);
    setParam2(binding.param2);
  }, [binding]);

  const handleBehaviorSelect = useCallback(
    (id: number) => {
      setBehaviorId(id);
      setParam1(0);
      setParam2(0);
    },
    []
  );

  const handleCategorySelect = useCallback(
    (catId: string) => {
      setSelectedCategoryId(catId);
      const catBehaviors = categorized[catId] || [];
      if (catBehaviors.length > 0 && !catBehaviors.some((b) => b.id === behaviorId)) {
        handleBehaviorSelect(catBehaviors[0].id);
      }
    },
    [categorized, behaviorId, handleBehaviorSelect]
  );

  const param1Values = useMemo(
    () => metadata?.flatMap((m) => m.param1) || [],
    [metadata]
  );

  const param2Values = useMemo(() => {
    if (!metadata) return [];
    const set = metadata.find((s) =>
      validateValue(
        layers.map((l) => l.id),
        param1,
        s.param1
      )
    );
    return set?.param2 || [];
  }, [metadata, param1, layers]);

  const param1IsHid = hasHidUsage(param1Values);
  const param2IsHid = hasHidUsage(param2Values);

  const hidUsagePages = useMemo(() => {
    const hidParam = [...param1Values, ...param2Values].find(
      (v) => v.hidUsage
    );
    if (!hidParam?.hidUsage) return null;
    return [
      { id: 7, min: 4, max: hidParam.hidUsage.keyboardMax },
      { id: 12, max: hidParam.hidUsage.consumerMax },
    ];
  }, [param1Values, param2Values]);

  const availableCategories = useMemo(
    () => BEHAVIOR_CATEGORIES.filter((c) => (categorized[c.id]?.length || 0) > 0),
    [categorized]
  );

  const categoryBehaviors = categorized[selectedCategoryId] || [];

  return (
    <div className="flex gap-0 min-h-0 h-full">
      <div className="flex flex-col gap-0.5 w-36 flex-shrink-0 pr-2 border-r border-base-300 overflow-y-auto">
        {availableCategories.map((cat) => (
          <CategoryButton
            key={cat.id}
            category={cat}
            isActive={selectedCategoryId === cat.id}
            onClick={() => handleCategorySelect(cat.id)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-0.5 flex-shrink-0 px-2 border-r border-base-300 overflow-y-auto">
        {categoryBehaviors.map((b) => (
          <button
            key={b.id}
            onClick={() => handleBehaviorSelect(b.id)}
            className={`px-3 py-1.5 rounded text-sm text-left cursor-pointer transition-colors whitespace-nowrap ${behaviorId === b.id
              ? "bg-primary text-primary-content"
              : "text-base-content hover:bg-base-300"
              }`}
          >
            {b.displayName}
          </button>
        ))}
      </div>

      <div className="flex-1 pl-3 min-w-0 flex flex-col">
        {param1IsHid && param2IsHid && hidUsagePages && (
          <DualHidPicker
            param1={param1}
            param2={param2}
            usagePages={hidUsagePages}
            onParam1Changed={setParam1}
            onParam2Changed={setParam2}
          />
        )}

        {(param1IsHid !== param2IsHid) && (param1IsHid || param2IsHid) && hidUsagePages && (
          <>
            <HidUsageGrid
              value={param1IsHid ? param1 : param2}
              usagePages={hidUsagePages}
              onValueChanged={param1IsHid ? setParam1 : setParam2}
            />
            {hasLayerId(param1Values) && (
              <div className="mt-2">
                <InlineParamPicker
                  values={param1Values}
                  value={param1}
                  layers={layers}
                  onValueChanged={setParam1}
                  label={t("binding.layer")}
                />
              </div>
            )}
          </>
        )}

        {!param1IsHid && !param2IsHid && param1Values.length > 0 && (
          <InlineParamPicker
            values={param1Values}
            value={param1}
            layers={layers}
            onValueChanged={setParam1}
          />
        )}

        {!param2IsHid && param2Values.length > 0 && (
          <div className="mt-2">
            <InlineParamPicker
              values={param2Values}
              value={param2}
              layers={layers}
              onValueChanged={setParam2}
            />
          </div>
        )}

        {param1Values.length === 0 &&
          param2Values.length === 0 &&
          selectedBehavior && (
            <div className="flex items-center justify-center h-full text-base-content/40 text-sm">
              {selectedBehavior.displayName} — {t("binding.noParameters")}
            </div>
          )}
      </div>
    </div>
  );
};

const CategoryButton = ({
  category,
  isActive,
  onClick,
}: {
  category: BehaviorCategory;
  isActive: boolean;
  onClick: () => void;
}) => {
  const { t } = useTranslation();
  const Icon = category.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer transition-colors text-left ${isActive
        ? "bg-primary text-primary-content"
        : "text-base-content hover:bg-base-300"
        }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{t(`behavior.category.${category.id}`)}</span>
    </button>
  );
};

function getHidLabel(value?: number): string {
  if (!value || value === 0) return "—";
  const masked = value & 0x00ffffff;
  const [page, id] = hid_usage_page_and_id_from_usage(masked);
  return hid_usage_get_label(page, id) || "?";
}

const DualHidPicker = ({
  param1,
  param2,
  usagePages,
  onParam1Changed,
  onParam2Changed,
}: {
  param1?: number;
  param2?: number;
  usagePages: { id: number; min?: number; max?: number }[];
  onParam1Changed: (value?: number) => void;
  onParam2Changed: (value?: number) => void;
}) => {
  const { t } = useTranslation();
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);

  const slot1Label = getHidLabel(param1);
  const slot2Label = getHidLabel(param2);

  const handleValueChanged = useCallback(
    (value?: number) => {
      if (activeSlot === 1) {
        onParam1Changed(value);
      } else {
        onParam2Changed(value);
      }
    },
    [activeSlot, onParam1Changed, onParam2Changed]
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setActiveSlot(1)}
          className={`flex-1 flex flex-col items-center gap-0.5 px-3 py-2 rounded cursor-pointer transition-colors ${activeSlot === 1
            ? "ring-2 ring-primary bg-base-100"
            : "bg-base-300 hover:bg-base-100"
            }`}
        >
          <span className="text-sm text-base-content/50">{t("binding.hold")}</span>
          <span className="text-base font-semibold text-base-content truncate max-w-full">
            {slot1Label}
          </span>
        </button>
        <span className="text-base-content/30 text-lg">+</span>
        <button
          onClick={() => setActiveSlot(2)}
          className={`flex-1 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded cursor-pointer transition-colors ${activeSlot === 2
            ? "ring-2 ring-primary bg-base-100"
            : "bg-base-300 hover:bg-base-100"
            }`}
        >
          <span className="text-sm text-base-content/50">{t("binding.tap")}</span>
          <span className="text-base font-semibold text-base-content truncate max-w-full">
            {slot2Label}
          </span>
        </button>
      </div>

      <HidUsageGrid
        value={activeSlot === 1 ? param1 : param2}
        usagePages={usagePages}
        onValueChanged={handleValueChanged}
      />
    </div>
  );
};
