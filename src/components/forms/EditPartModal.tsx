"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Gauge,
  Hash,
  Layers,
  Package,
  Pencil,
  PoundSterling,
  Tag,
  Truck,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextInput } from "@/components/ui/Field";
import { updatePart } from "@/lib/supabase/mutations";
import type { Part, ProductType, Supplier } from "@/lib/types";

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: "part", label: "Part" },
  { value: "tyre", label: "Tyre" },
  { value: "consumable", label: "Consumable" },
  { value: "wheel", label: "Wheel" },
];

export function EditPartButton({
  part,
  suppliers = [],
}: {
  part: Part;
  suppliers?: Supplier[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productType, setProductType] = useState<ProductType>(part.productType);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updatePart(part.id, {
      name: String(formData.get("name") ?? ""),
      sku: String(formData.get("sku") ?? ""),
      supplierId: String(formData.get("supplierId") ?? "") || null,
      category: String(formData.get("category") ?? ""),
      productType: formData.get("productType") as ProductType,
      stockLevel: Number(formData.get("stockLevel") ?? 0),
      reorderLevel: Number(formData.get("reorderLevel") ?? 0),
      costPrice: Number(formData.get("costPrice") ?? 0),
      sellPrice: Number(formData.get("sellPrice") ?? 0),
      tyreWidth: formData.get("tyreWidth") ? Number(formData.get("tyreWidth")) : null,
      tyreProfile: formData.get("tyreProfile") ? Number(formData.get("tyreProfile")) : null,
      tyreRimSize: formData.get("tyreRimSize") ? Number(formData.get("tyreRimSize")) : null,
      tyreLoadIndex: String(formData.get("tyreLoadIndex") ?? "") || null,
      tyreSpeedRating: String(formData.get("tyreSpeedRating") ?? "") || null,
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Edit ${part.name}`}
      >
        <Pencil size={14} />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit Part"
        subtitle="Update stock, pricing, and details"
        icon={Pencil}
        maxWidth="max-w-lg"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Part Name" htmlFor="name" required>
              <TextInput
                id="name"
                name="name"
                icon={Package}
                required
                defaultValue={part.name}
              />
            </FieldGroup>
            <FieldGroup label="Type" htmlFor="productType">
              <Select
                id="productType"
                name="productType"
                icon={Tag}
                value={productType}
                onChange={(e) => setProductType(e.target.value as ProductType)}
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="SKU" htmlFor="sku" required>
              <TextInput
                id="sku"
                name="sku"
                icon={Hash}
                required
                defaultValue={part.sku}
                className="uppercase"
              />
            </FieldGroup>

            <FieldGroup label="Category" htmlFor="category">
              <TextInput
                id="category"
                name="category"
                icon={Tag}
                defaultValue={part.category ?? ""}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Supplier" htmlFor="supplierId">
            <Select id="supplierId" name="supplierId" icon={Truck} defaultValue={part.supplierId ?? ""}>
              <option value="">No supplier linked</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FieldGroup>

          {productType === "tyre" ? (
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-100 p-3 sm:grid-cols-5">
              <FieldGroup label="Width" htmlFor="tyreWidth">
                <TextInput
                  id="tyreWidth"
                  name="tyreWidth"
                  type="number"
                  icon={Gauge}
                  defaultValue={part.tyreWidth ?? ""}
                />
              </FieldGroup>
              <FieldGroup label="Profile" htmlFor="tyreProfile">
                <TextInput id="tyreProfile" name="tyreProfile" type="number" defaultValue={part.tyreProfile ?? ""} />
              </FieldGroup>
              <FieldGroup label="Rim" htmlFor="tyreRimSize">
                <TextInput
                  id="tyreRimSize"
                  name="tyreRimSize"
                  type="number"
                  step="0.1"
                  defaultValue={part.tyreRimSize ?? ""}
                />
              </FieldGroup>
              <FieldGroup label="Load index" htmlFor="tyreLoadIndex">
                <TextInput id="tyreLoadIndex" name="tyreLoadIndex" defaultValue={part.tyreLoadIndex ?? ""} />
              </FieldGroup>
              <FieldGroup label="Speed rating" htmlFor="tyreSpeedRating">
                <TextInput id="tyreSpeedRating" name="tyreSpeedRating" defaultValue={part.tyreSpeedRating ?? ""} />
              </FieldGroup>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Stock Level" htmlFor="stockLevel" required>
              <TextInput
                id="stockLevel"
                name="stockLevel"
                type="number"
                icon={Boxes}
                min="0"
                step="1"
                defaultValue={part.stockLevel}
                required
              />
            </FieldGroup>

            <FieldGroup label="Reorder Level" htmlFor="reorderLevel" required>
              <TextInput
                id="reorderLevel"
                name="reorderLevel"
                type="number"
                icon={Layers}
                min="0"
                step="1"
                defaultValue={part.reorderLevel}
                required
              />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Cost Price (£)" htmlFor="costPrice" required>
              <TextInput
                id="costPrice"
                name="costPrice"
                type="number"
                icon={PoundSterling}
                min="0"
                step="0.01"
                defaultValue={part.costPrice}
                required
              />
            </FieldGroup>

            <FieldGroup label="Sell Price (£)" htmlFor="sellPrice" required>
              <TextInput
                id="sellPrice"
                name="sellPrice"
                type="number"
                icon={PoundSterling}
                min="0"
                step="0.01"
                defaultValue={part.sellPrice}
                required
              />
            </FieldGroup>
          </div>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
