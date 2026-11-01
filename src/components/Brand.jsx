/** Official artwork is used verbatim. White background and aspect ratio are intentional. */
export default function Brand({ light = false, compact = false }) {
  return (
    <a
      className={`brand ${light ? "brand-light" : ""} ${compact ? "brand-compact" : ""}`}
      href="#/"
      aria-label="AzulSkye — início"
    >
      <img
        src={
          compact
            ? "/brand/azulskye-simbolo-v3-192.png"
            : "/brand/azulskye-logo-oficial.png"
        }
        width={compact ? 192 : 2172}
        height={compact ? 192 : 724}
        alt="AzulSkye — Equipados para ir além."
        decoding="async"
      />
    </a>
  );
}
