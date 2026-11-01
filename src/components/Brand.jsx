/** Official artwork is used verbatim. White background and aspect ratio are intentional. */
export default function Brand({ light = false, compact = false }) {
  return (
    <a
      className={`brand ${light ? "brand-light" : ""} ${compact ? "brand-compact" : ""}`}
      href="#/"
      aria-label="AzulSkye — início"
    >
      <img
        src="/brand/azulskye-logo-oficial.png"
        width="2172"
        height="724"
        alt="AzulSkye — Equipados para ir além."
        decoding="async"
      />
    </a>
  );
}
