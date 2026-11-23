import { useState } from "react";
import { ArrowRight, Upload, Package } from "lucide-react";
import { groupOf, GROUPS, validateProduct } from "../model.js";
function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
function Field({ label, children, hint, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />} {hint && <small>{hint}</small>}
    </label>
  );
}
export default function ProductForm({ product, onSubmit }) {
  const [image, setImage] = useState(product?.image || "");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const loadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return setError("Selecione uma imagem JPG, PNG ou WebP.");
    if (file.size > 5 * 1024 * 1024)
      return setError("Escolha uma foto de até 5 MB.");
    setReading(true);
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
      canvas.width = bitmap.width * scale;
      canvas.height = bitmap.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      setImage(canvas.toDataURL("image/webp", 0.78));
      bitmap.close();
    } catch {
      setError("Não foi possível abrir essa imagem. Tente outra foto.");
    } finally {
      setReading(false);
    }
  };
  return (
    <form
      className="form-stack product-form"
      onSubmit={(e) => {
        e.preventDefault();
        const data = {
          ...Object.fromEntries(new FormData(e.currentTarget)),
          image,
        };
        const issue = validateProduct(data, !!product?.official);
        if (issue) return setError(issue);
        onSubmit(data);
      }}
    >
      <div className="form-grid">
        <div>
          <label className="upload-area">
            {image ? (
              <img src={image} alt="Prévia do produto" />
            ) : (
              <>
                <Upload size={27} />
                <strong>Foto do equipamento</strong>
                <span>JPG, PNG ou WebP · até 5 MB</span>
              </>
            )}
            <input
              aria-label="Foto do produto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={loadPhoto}
            />
            <span className="upload-action">
              {reading
                ? "Preparando imagem…"
                : image
                  ? "Trocar foto"
                  : "Selecionar foto"}
            </span>
          </label>
        </div>
        <div className="form-stack">
          <Field
            label="Nome do produto"
            name="name"
            defaultValue={product?.name}
            required
            maxLength="140"
          />
          <Field
            label="Marca"
            name="brand"
            maxLength="80"
            defaultValue={product?.brand}
          />
          <Field label="Categoria">
            <select
              name="category"
              defaultValue={product ? groupOf(product) : "Paramotores"}
            >
              {GROUPS.filter((g) => g !== "Todos").map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Estado do equipamento">
            <select
              name="condition"
              defaultValue={product?.condition || "Novo"}
            >
              <option>Novo</option>
              <option>Usado</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="form-grid three">
        <Field
          label="Preço (R$)"
          name="price"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={product?.price}
        />
        <Field
          label={
            product?.official
              ? "Quantidade (vazio para sob demanda)"
              : "Quantidade"
          }
          name="quantity"
          type="number"
          min="0"
          step="1"
          required={!product?.official}
          defaultValue={
            product?.quantity ??
            (product?.official && product.stock
              ? ""
              : product?.stock === false
                ? 0
                : 1)
          }
        />
        <Field
          label="SKU / referência"
          name="sku"
          defaultValue={product?.sku}
        />
      </div>
      <Field label="Descrição e compatibilidade">
        <textarea
          name="description"
          rows="4"
          required
          defaultValue={product?.description}
          placeholder="Informe modelo, fabricante, compatibilidade e, para usados, marcas de uso."
          maxLength="3000"
        />
      </Field>
      <div className="form-section-title">
        <Package size={17} />
        <strong>Embalagem para envio</strong>
        <span>Medidas do produto embalado</span>
      </div>
      <div className="form-grid four">
        {[
          ["weight", "Peso (kg)"],
          ["length", "Comprimento (cm)"],
          ["width", "Largura (cm)"],
          ["height", "Altura (cm)"],
        ].map(([key, label]) => (
          <Field
            key={key}
            label={label}
            name={key}
            type="number"
            min="0.01"
            step="0.01"
            required={!product?.official}
            defaultValue={product?.[key]}
          />
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button className="full" type="submit" disabled={reading}>
        {product ? "Salvar alterações" : "Salvar produto e continuar"}
        <ArrowRight size={17} />
      </Button>
    </form>
  );
}
