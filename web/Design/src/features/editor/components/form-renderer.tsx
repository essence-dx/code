"use client";

import { Check } from "lucide-react";
import type { CSSProperties } from "react";

import type { DesignElement, FormElement } from "@/features/editor/types";

type FormRendererProps = {
  element: Extract<DesignElement, { type: "form" }>;
  baseStyle: CSSProperties;
};

export function FormRenderer({ element, baseStyle }: FormRendererProps) {
  if (element.fieldKind === "checkbox") {
    return <CheckboxField element={element} baseStyle={baseStyle} />;
  }

  if (element.fieldKind === "button") {
    return <ButtonField element={element} baseStyle={baseStyle} />;
  }

  return (
    <div style={getShellStyle(element, baseStyle)}>
      {element.label ? <FormLabel element={element} /> : null}
      <div
        style={{
          ...getFieldStyle(element),
          alignItems:
            element.fieldKind === "textarea" ? "flex-start" : "center",
          minHeight: element.fieldKind === "textarea" ? 0 : undefined,
        }}
      >
        <span
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace:
              element.fieldKind === "textarea" ? "pre-wrap" : "nowrap",
            color: getDisplayValue(element) ? element.textColor : "#71717a",
          }}
        >
          {getDisplayValue(element) || element.placeholder}
        </span>
        {element.fieldKind === "dropdown" ? (
          <span
            aria-hidden="true"
            style={{
              width: Math.max(8, element.fontSize * 0.5),
              height: Math.max(8, element.fontSize * 0.5),
              borderRight: `${Math.max(1, element.borderWidth)}px solid ${
                element.textColor
              }`,
              borderBottom: `${Math.max(1, element.borderWidth)}px solid ${
                element.textColor
              }`,
              transform: "rotate(45deg)",
              opacity: 0.65,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function CheckboxField({
  element,
  baseStyle,
}: {
  element: FormElement;
  baseStyle: CSSProperties;
}) {
  return (
    <div
      style={{
        ...getShellStyle(element, baseStyle),
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <span
        style={{
          display: "flex",
          width: Math.max(20, element.fontSize * 1.25),
          height: Math.max(20, element.fontSize * 1.25),
          flex: "0 0 auto",
          alignItems: "center",
          justifyContent: "center",
          border: `${Math.max(1, element.borderWidth)}px solid ${
            element.checked ? element.accentColor : element.borderColor
          }`,
          borderRadius: Math.max(4, element.radius * 0.35),
          background: element.checked
            ? element.accentColor
            : element.fieldColor,
          color: "#ffffff",
        }}
      >
        {element.checked ? (
          <Check strokeWidth={3} style={{ width: "75%", height: "75%" }} />
        ) : null}
      </span>
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {element.label || element.value || "Checkbox"}
      </span>
    </div>
  );
}

function ButtonField({
  element,
  baseStyle,
}: {
  element: FormElement;
  baseStyle: CSSProperties;
}) {
  return (
    <div
      style={{
        ...baseStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: element.padding,
        borderRadius: element.radius,
        border: `${Math.max(0, element.borderWidth)}px solid ${
          element.borderColor
        }`,
        background: element.accentColor,
        color: element.textColor,
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        lineHeight: 1.1,
        overflow: "hidden",
        textAlign: "center",
        wordBreak: "break-word",
      }}
    >
      {element.value || "Button"}
    </div>
  );
}

function FormLabel({ element }: { element: FormElement }) {
  return (
    <div
      style={{
        flex: "0 0 auto",
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontWeight: Math.max(600, element.fontWeight),
      }}
    >
      {element.label}
    </div>
  );
}

function getShellStyle(
  element: FormElement,
  baseStyle: CSSProperties,
): CSSProperties {
  return {
    ...baseStyle,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: Math.max(6, element.padding * 0.5),
    padding: element.padding,
    borderRadius: element.radius,
    border: `${Math.max(0, element.borderWidth)}px solid ${element.borderColor}`,
    background: element.surfaceColor,
    color: element.textColor,
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
    lineHeight: 1.2,
    overflow: "hidden",
  };
}

function getFieldStyle(element: FormElement): CSSProperties {
  return {
    display: "flex",
    minHeight: Math.max(34, element.fontSize * 2.35),
    flex: "1 1 auto",
    gap: Math.max(8, element.padding * 0.55),
    justifyContent: "space-between",
    padding:
      element.fieldKind === "textarea"
        ? `${Math.max(10, element.padding * 0.7)}px ${Math.max(
            10,
            element.padding,
          )}px`
        : `0 ${Math.max(10, element.padding)}px`,
    borderRadius: Math.max(4, element.radius * 0.75),
    border: `${Math.max(0, element.borderWidth)}px solid ${element.borderColor}`,
    background: element.fieldColor,
    boxSizing: "border-box",
    overflow: "hidden",
  };
}

function getDisplayValue(element: FormElement) {
  if (element.fieldKind === "dropdown") {
    return element.value || element.options[0] || "";
  }

  return element.value;
}
