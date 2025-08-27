import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Based on the Tokyo Night VS Code theme
const colors = {
  background: "#1a1b26",
  foreground: "#a9b1d6",
  selection: "#44475a",
  cursor: "#c0caf5",
  lineHighlight: "#1f2335",
  gutterBackground: "#1a1b26",
  gutterForeground: "#414868",
  comment: "#565f89",
  variableName: "#c0caf5",
  string: "#9ece6a",
  number: "#ff9e64",
  keyword: "#bb9af7",
  operator: "#89ddff",
  className: "#7dcfff",
  functionName: "#7aa2f7",
  tagName: "#f7768e",
  attributeName: "#ff9e64",
  attributeValue: "#9ece6a",
  heading: "#89ddff",
  link: "#7aa2f7",
  invalid: "#f7768e",
};

export const tokyoNightTheme = EditorView.theme(
  {
    "&": {
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    ".cm-content": {
      caretColor: colors.cursor,
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: colors.cursor },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: colors.selection },
    ".cm-activeLine": { backgroundColor: colors.lineHighlight },
    ".cm-gutters": {
      backgroundColor: colors.gutterBackground,
      color: colors.gutterForeground,
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: colors.lineHighlight,
    },
  },
  { dark: true }
);

export const tokyoNightHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: colors.keyword },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: colors.variableName },
  { tag: [t.function(t.variableName), t.labelName], color: colors.functionName },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#e0af68" },
  { tag: [t.definition(t.name), t.separator], color: colors.variableName },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: colors.className },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: colors.operator },
  { tag: [t.meta, t.comment], color: colors.comment },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: colors.link, textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: colors.heading },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: colors.variableName },
  { tag: [t.processingInstruction, t.string, t.inserted], color: colors.string },
  { tag: t.invalid, color: colors.invalid },
  { tag: t.tagName, color: colors.tagName },
  { tag: t.attributeName, color: colors.attributeName },
  { tag: t.attributeValue, color: colors.attributeValue },
]);

export const tokyoNight: Extension = [
  tokyoNightTheme,
  syntaxHighlighting(tokyoNightHighlightStyle),
];