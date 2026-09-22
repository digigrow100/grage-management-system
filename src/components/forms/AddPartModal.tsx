"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Gauge,
  Hash,
  Layers,
  Package,
  Plus,
  PoundSterling,
  Tag,
  Truck,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextInput } from "@/components/ui/Field";
import { addPart } from "@/lib/supabase/mutations";
import type { ProductType, Supplier } from "@/lib/types";

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: "part", label: "Part" },
  { value: "tyre", label: "Tyre" },
  { value: "consumable", label: "Consumable" },
  { value: "wheel", label: "Wheel" },
];

export function AddPartButton({ suppliers = [] }: { suppliers?: Supplier[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productType, setProductType] = useState<ProductType>("part");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await addPart({
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
    setProductType("part");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-accent-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <Plus size={15} /> New part
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Part"
        subtitle="Add a part, tyre, consumable, or wheel to your inventory"
        icon={Package}
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
                placeholder="Front Brake Pads (Set)"
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
                placeholder="BRK-PAD-001"
                className="uppercase"
              />
            </FieldGroup>

            <FieldGroup label="Category" htmlFor="category">
              <TextInput
                id="category"
                name="category"
                icon={Tag}
                placeholder="Brakes"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Supplier" htmlFor="supplierId">
            <Select id="supplierId" name="supplierId" icon={Truck} defaultValue="">
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
                <TextInput id="tyreWidth" name="tyreWidth" type="number" icon={Gauge} placeholder="205" />
              </FieldGroup>
              <FieldGroup label="Profile" htmlFor="tyreProfile">
                <TextInput id="tyreProfile" name="tyreProfile" type="number" placeholder="55" />
              </FieldGroup>
              <FieldGroup label="Rim" htmlFor="tyreRimSize">
                <TextInput id="tyreRimSize" name="tyreRimSize" type="number" step="0.1" placeholder="16" />
              </FieldGroup>
              <FieldGroup label="Load index" htmlFor="tyreLoadIndex">
                <TextInput id="tyreLoadIndex" name="tyreLoadIndex" placeholder="91" />
              </FieldGroup>
              <FieldGroup label="Speed rating" htmlFor="tyreSpeedRating">
                <TextInput id="tyreSpeedRating" name="tyreSpeedRating" placeholder="V" />
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
                defaultValue="0"
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
                defaultValue="0"
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
                defaultValue="0"
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
                defaultValue="0"
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
              {submitting ? "Adding..." : "Add Part"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
