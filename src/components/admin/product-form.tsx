'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { getIdString } from '@/src/lib/id';
import { extractCloudinaryPublicId } from '@/src/utils/cloudinary';

export type Category = { _id?: unknown; name: string };
export type CustomizationGroup = { id: string; name: string };
export type ProductLike = {
  _id?: unknown;
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  categoryId?: string;
  price?: number;
  discountPrice?: number | null;
  image?: string | null;
  images?: string[];
  customizationGroupIds?: string[];
  isAvailable?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  preparationTime?: number | null;
  tags?: string[];
};

type ProductFormState = {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  price: string;
  discountPrice: string;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder: string;
  preparationTime: string;
  tags: string;
  customizationGroupIds: string[];
};

const emptyFormState = (): ProductFormState => ({
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  categoryId: '',
  price: '',
  discountPrice: '',
  isAvailable: true,
  isFeatured: false,
  displayOrder: '0',
  preparationTime: '',
  tags: '',
  customizationGroupIds: [],
});

function getExistingImageUrls(product?: ProductLike | null) {
  if (!product) return [];
  const imageUrls = [...(product.images ?? []), ...(product.image ? [product.image] : [])].filter(Boolean);
  return Array.from(new Set(imageUrls));
}

function formStateFromProduct(product?: ProductLike | null, categories: Category[] = []): ProductFormState {
  const next = emptyFormState();
  if (!product) {
    const first = categories[0];
    next.categoryId = first ? getIdString(first._id) : '';
    return next;
  }

  next.name = product.name || '';
  next.slug = product.slug || '';
  next.description = product.description || '';
  next.shortDescription = product.shortDescription || '';
  next.categoryId = product.categoryId || '';
  next.price = String(product.price ?? '');
  next.discountPrice = String(product.discountPrice ?? '');
  next.isAvailable = product.isAvailable ?? true;
  next.isFeatured = product.isFeatured ?? false;
  next.displayOrder = String(product.displayOrder ?? 0);
  next.preparationTime = String(product.preparationTime ?? '');
  next.tags = (product.tags || []).join(', ');
  next.customizationGroupIds = product.customizationGroupIds || [];
  return next;
}

function parseCommaSeparated(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isImageFile(file: File) {
  return file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(file.name);
}

export function ProductForm({
  categories,
  customizationGroups,
  editingProduct,
  onSaved,
  onCancel,
}: {
  categories: Category[];
  customizationGroups: CustomizationGroup[];
  editingProduct?: ProductLike | null;
  onSaved?: (product: ProductLike) => void;
  onCancel?: () => void;
}): React.ReactElement {
  const categoryOptions = categories ?? [];
  const initialCategoryId = categoryOptions[0] ? getIdString(categoryOptions[0]._id) : '';

  const [form, setForm] = useState<ProductFormState>(() => formStateFromProduct(editingProduct, categoryOptions));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  type FileItem = { id: string; file: File; preview: string; progress: number };
  const [files, setFiles] = useState<FileItem[]>([]);
  const filesRef = useRef<FileItem[]>([]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => () => {
    filesRef.current.forEach((f) => URL.revokeObjectURL(f.preview));
  }, []);
  const [existingImages, setExistingImages] = useState<string[]>(() => getExistingImageUrls(editingProduct));

  const selectedCategoryId = form.categoryId || initialCategoryId;

  function updateField<K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function removeFileById(id: string) {
    setFiles((current) => {
      const found = current.find((f) => f.id === id);
      if (found) URL.revokeObjectURL(found.preview);
      return current.filter((f) => f.id !== id);
    });
  }

  function addFiles(selectedFiles: File[]) {
    const validFiles = selectedFiles.filter(isImageFile);
    if (!validFiles.length) {
      setMessage('Please select image files only.');
      return;
    }
    setFiles((current) => [
      ...current,
      ...validFiles.map((file) => ({ id: `${file.name}-${Date.now()}-${Math.random()}`, file, preview: URL.createObjectURL(file), progress: 0 })),
    ]);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const newImageUrls = files.length ? await uploadImages(files, setUploadProgress) : [];
      const finalImageUrls = [...existingImages, ...newImageUrls];
      const mainImage = finalImageUrls[0];

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        shortDescription: form.shortDescription.trim() || undefined,
        categoryId: selectedCategoryId,
        price: Number(form.price),
        discountPrice: form.discountPrice === '' ? undefined : Number(form.discountPrice),
        image: mainImage || undefined,
        images: finalImageUrls.length > 1 ? finalImageUrls : undefined,
        customizationGroupIds: form.customizationGroupIds.length > 0 ? form.customizationGroupIds : undefined,
        isAvailable: form.isAvailable,
        isFeatured: form.isFeatured,
        displayOrder: Number(form.displayOrder || 0),
        preparationTime: form.preparationTime === '' ? undefined : Number(form.preparationTime),
        tags: parseCommaSeparated(form.tags),
      };

      const url = editingProduct
        ? `/api/admin/menu/products/${getIdString(editingProduct._id || editingProduct.id)}`
        : '/api/admin/menu/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save product');

      const saved = (json.data || payload) as ProductLike;
      setMessage(editingProduct ? 'Product updated' : 'Product created');
      onSaved?.(saved);

      if (!editingProduct) {
        setForm(formStateFromProduct(null, categoryOptions));
        // revoke previews
        files.forEach((f) => URL.revokeObjectURL(f.preview));
        setFiles([]);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessage(msg || 'Error');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }
  function updateFileProgress(id: string, percent: number) {
    setFiles((current) => current.map((f) => (f.id === id ? { ...f, progress: percent } : f)));
  }

  async function uploadImages(items: { id: string; file: File }[], progressCallback: (percent: number) => void) {
    const results: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const url = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('images', item.file);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            updateFileProgress(item.id, percent);
            const overall = Math.round(((i + percent / 100) / items.length) * 100);
            setUploadProgress(overall);
            progressCallback(overall);
          }
        };

        xhr.onerror = () => reject(new Error('Image upload failed'));
        xhr.onabort = () => reject(new Error('Image upload aborted'));
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              if (json.success && Array.isArray(json.data) && json.data.length) {
                resolve(json.data[0] as string);
              } else {
                reject(new Error(json.error || 'Upload failed'));
              }
            } catch {
              reject(new Error('Invalid upload response'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.open('POST', '/api/admin/menu/upload-images');
        xhr.send(formData);
      });

      results.push(url);
      updateFileProgress(item.id, 100);
      setUploadProgress(Math.round(((i + 1) / items.length) * 100));
    }
    return results;
  }

  async function handleRemoveExistingImage(imageUrl: string) {
    const publicId = extractCloudinaryPublicId(imageUrl);
    if (!publicId) {
      setExistingImages((current) => current.filter((item) => item !== imageUrl));
      setMessage('Image removed from product');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/menu/delete-image?publicId=${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete image');
      }
      setExistingImages((current) => current.filter((item) => item !== imageUrl));
      setMessage('Image removed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg || 'Error deleting image');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isEditing = Boolean(editingProduct);

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">Name</label>
        <input value={form.name} onChange={(e) => updateField('name', e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" required />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">Slug</label>
        <input value={form.slug} onChange={(e) => updateField('slug', e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" required />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">Category</label>
        <select value={selectedCategoryId} onChange={(e) => updateField('categoryId', e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2">
          {categoryOptions.map((c) => {
            const id = getIdString(c._id);
            return (
              <option key={id || c.name} value={id}>
                {c.name}
              </option>
            );
          })}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">Price</label>
        <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => updateField('price', e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" required />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">Offer price</label>
        <input type="number" min="0" step="0.01" value={form.discountPrice} onChange={(e) => updateField('discountPrice', e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" placeholder="Optional offer" />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">Prep time (mins)</label>
        <input type="number" min="0" value={form.preparationTime} onChange={(e) => updateField('preparationTime', e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" placeholder="15" />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">Display order</label>
        <input type="number" min="0" value={form.displayOrder} onChange={(e) => updateField('displayOrder', e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-medium text-stone-700">Images</label>
        {existingImages.length > 0 ? (
          <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
            <div className="mb-2 font-semibold text-stone-900">Current images</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {existingImages.map((url) => (
                <div key={url} className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Product image" className="h-32 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(url)}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-stone-700 shadow transition hover:bg-white"
                  >
                    <span className="sr-only">Remove image</span>✕
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-stone-500">Removing an image deletes it from Cloudinary and removes it from this product.</p>
          </div>
        ) : null}

        <div
          className="relative rounded-3xl border-2 border-dashed border-stone-300 bg-white p-5 text-center transition hover:border-amber-500"
          onDrop={(e) => {
            e.preventDefault();
            addFiles(Array.from(e.dataTransfer.files || []));
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            id="product-image-picker"
            type="file"
            multiple
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              e.target.value = '';
            }}
          />
          <div className="relative">
            <p className="text-sm text-stone-600">Drag and drop images here</p>
            <label htmlFor="product-image-picker" className="mt-3 inline-flex cursor-pointer rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700">
              Choose images from device
            </label>
            <p className="mt-2 text-xs text-stone-500">You can upload multiple images at once. The first image becomes the main product image.</p>
          </div>
        </div>
        {files.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
            <div className="mb-2 font-semibold text-stone-900">Selected images</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {files.map((item, index) => (
                <div key={item.id} className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.preview} alt={item.file.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-stone-900">{item.file.name}</div>
                        <div className="text-xs text-stone-500">{(item.file.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200">
                        <div className="h-full rounded-full bg-amber-600 transition-all" style={{ width: `${item.progress}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-stone-600">
                        <div>{item.progress}%</div>
                        <div className="flex items-center gap-2">
                          {index === 0 ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">Main</span> : null}
                          <button type="button" onClick={() => removeFileById(item.id)} className="text-stone-500 hover:text-stone-700">Remove</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {uploadProgress > 0 ? (
          <div className="mt-3 rounded-2xl bg-stone-100 p-3">
            <div className="mb-2 text-sm font-medium text-stone-700">Upload progress</div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full rounded-full bg-amber-600" style={{ width: `${uploadProgress}%` }} />
            </div>
            <div className="mt-2 text-xs text-stone-600">{uploadProgress}% uploaded</div>
          </div>
        ) : null}
      </div>
      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-medium text-stone-700">Short description</label>
        <input value={form.shortDescription} onChange={(e) => updateField('shortDescription', e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" placeholder="Short summary" />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-medium text-stone-700">Description</label>
        <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" rows={4} placeholder="Full product details" />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-medium text-stone-700">Tags</label>
        <input value={form.tags} onChange={(e) => updateField('tags', e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2" placeholder="veg, bestseller, spicy" />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-medium text-stone-700">Customization groups</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {customizationGroups.map((group) => {
            const checked = form.customizationGroupIds.includes(group.id);
            return (
              <label key={group.id} className="flex cursor-pointer items-center gap-3 rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm transition hover:border-amber-400">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const selected = e.target.checked
                      ? [...form.customizationGroupIds, group.id]
                      : form.customizationGroupIds.filter((id) => id !== group.id);
                    updateField('customizationGroupIds', selected);
                  }}
                  className="h-4 w-4 rounded border-stone-300 text-amber-600"
                />
                <span>{group.name}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={form.isAvailable} onChange={(e) => updateField('isAvailable', e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-amber-600" />
        <label className="text-sm font-medium text-stone-700">Available to customers</label>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={form.isFeatured} onChange={(e) => updateField('isFeatured', e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-amber-600" />
        <label className="text-sm font-medium text-stone-700">Featured item</label>
      </div>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isSubmitting} className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save changes' : 'Create product')}
        </button>
        {isEditing && onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700">
            Cancel
          </button>
        ) : null}
        {message ? <div className="text-sm text-stone-600">{message}</div> : null}
      </div>
    </form>
  );
}

export function AdminProductManager({ categories, initialProducts, customizationGroups }: { categories: Category[]; initialProducts: ProductLike[]; customizationGroups: CustomizationGroup[] }) {
  const [products, setProducts] = useState<ProductLike[]>(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingProduct = useMemo(
    () => products.find((product) => getIdString(product._id || product.id) === editingId) || null,
    [editingId, products],
  );

  function handleSaved(product: ProductLike) {
    const productId = getIdString(product._id || product.id);
    setProducts((current) => {
      const exists = current.some((item) => getIdString(item._id || item.id) === productId);
      if (exists) {
        return current.map((item) => (getIdString(item._id || item.id) === productId ? product : item));
      }
      return [product, ...current];
    });
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <ProductForm
        categories={categories}
        customizationGroups={customizationGroups}
        editingProduct={editingProduct}
        onSaved={handleSaved}
        onCancel={() => setEditingId(null)}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {products.map((product) => {
          const productId = getIdString(product._id || product.id);
          return (
            <article key={productId || product.slug} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt={product.name} className="h-12 w-12 rounded-xl object-cover" />
                    ) : null}
                    <div>
                      <h2 className="font-semibold text-stone-900">{product.name}</h2>
                      <p className="mt-1 text-sm text-stone-600">{product.slug}</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(productId || product.slug)}
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700"
                >
                  Edit
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2 py-1 ${product.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                  {product.isAvailable ? 'Visible' : 'Hidden'}
                </span>
                {product.isFeatured ? <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Featured</span> : null}
                {product.discountPrice ? <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">Offer ₹{product.discountPrice}</span> : null}
              </div>

              <div className="mt-4 space-y-2 text-sm text-stone-600">
                <div className="flex items-center justify-between"><span>Price</span><span className="font-semibold text-stone-900">₹{product.price}</span></div>
                <div className="flex items-center justify-between"><span>Prep</span><span>{product.preparationTime ? `${product.preparationTime} min` : '—'}</span></div>
                <div className="flex items-center justify-between"><span>Category</span><span>{product.categoryId || '—'}</span></div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default AdminProductManager;
