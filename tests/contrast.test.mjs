import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");
const tokens = Object.fromEntries(
  [...css.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
);
function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((channel) => parseInt(channel, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(foreground, background) {
  const a = luminance(tokens[foreground]),
    b = luminance(tokens[background]);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
test("brand actions, neutral surfaces and positive states meet AA for normal text", () => {
  for (const [fg, bg] of [
    ["--background-primary", "--brand-primary"],
    ["--background-primary", "--brand-primary-hover"],
    ["--text-on-navy", "--brand-navy"],
    ["--text-primary", "--background-primary"],
    ["--text-secondary", "--background-secondary"],
    ["--text-muted", "--background-primary"],
    ["--brand-primary-hover", "--brand-primary-soft"],
    ["--brand-navy-light", "--brand-primary-soft"],
    ["--status-success", "--background-primary"],
  ])
    assert.ok(
      contrast(fg, bg) >= 4.5,
      `${fg} on ${bg}: ${contrast(fg, bg).toFixed(2)}`,
    );
});
