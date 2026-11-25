import type { InputType } from "../../../services/api/shopPricing";

/** The field types a shop can add, in the order they're offered */
export const FIELD_TYPES: Array<{ type: InputType; label: string }> = [
  { type: "select", label: "Pick one" },
  { type: "multi_select", label: "Pick any" },
  { type: "checkbox", label: "Yes / no" },
  { type: "text", label: "Text" },
  { type: "number", label: "Number" },
  { type: "measurement", label: "Length" },
  { type: "dimensions", label: "Width × height" },
  { type: "file", label: "File upload" },
  { type: "date", label: "Date" },
];

/** A field as the condition editor sees it: its key (once saved), name, type and options */
export interface FieldRef {
  key?: string;
  name: string;
  type: InputType;
  options: Array<{ key?: string; name: string }>;
}
