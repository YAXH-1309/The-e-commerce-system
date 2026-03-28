import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';

const EMPTY_FORM = {
  name: '', description: '', price: '', category: '', stock: '', images: '',
};

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 inline-block" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function ProductForm({ initial, onSave, onCancel, submitLabel }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.description.trim()) e.description = 'Description is required.';
    if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) < 0)
      e.price = 'Price must be a non-negative number.';
    if (!form.category.trim()) e.category = 'Category is required.';
    if (form.stock === '' || isNaN(Number(form.stock)) || Number(form.stock) < 0)
      e.stock = 'Stock must be a non-negative integer.';
    if (!form.images.trim()) e.images = 'At least one image URL is required.';
    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const ve = validate();
    if (Object.keys(ve).length) { setErrors(ve); return; }
    setServerError('');
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category.trim(),
        stock: Number(form.stock),
        images: form.images.split(',').map((s) => s.trim()).filter(Boolean),
      };
      await onSave(payload);
    } catch (err) {
      setServerError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'price', label: 'Price ($)', type: 'number' },
    { name: 'category', label: 'Category', type: 'text' },
    { name: 'stock', label: 'Stock', type: 'number' },
    { name: 'images', label: 'Image URLs (comma-separated)', type: 'text' },
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {fields.map(({ name, label, type }) => (
        <div key={name}>
          <label className="block text-sm font-medium mb-1" htmlFor={name}>{label}</label>
          {type === 'textarea' ? (
            <textarea
              id={name} name={name} rows={3}
              value={form[name]} onChange={handleChange}
              className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[name] ? 'border-red-400' : ''}`}
            />
          ) : (
            <input
              id={name} name={name} type={type}
              value={form[name]} onChange={handleChange}
              className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[name] ? 'border-red-400' : ''}`}
            />
          )}
          {errors[name] && <p className="text-red-600 text-xs mt-1">{errors[name]}</p>}
        </div>
      ))}

      {serverError && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
          {serverError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit" disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Spinner />}
          {loading ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function AdminPanelPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/products', { params: { limit: 100 } });
      setProducts(data.data.products);
    } catch {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function flash(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  async function handleCreate(payload) {
    const { data } = await apiClient.post('/products', payload);
    setProducts((p) => [data.data.product, ...p]);
    setShowCreate(false);
    flash('Product created.');
  }

  async function handleUpdate(id, payload) {
    const { data } = await apiClient.put(`/products/${id}`, payload);
    setProducts((p) => p.map((pr) => pr._id === id ? data.data.product : pr));
    setEditingId(null);
    flash('Product updated.');
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this product?')) return;
    setDeleteLoading((p) => ({ ...p, [id]: true }));
    setError('');
    try {
      await apiClient.delete(`/products/${id}`);
      setProducts((p) => p.filter((pr) => pr._id !== id));
      flash('Product deleted.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete product.');
    } finally {
      setDeleteLoading((p) => ({ ...p, [id]: false }));
    }
  }

  function formInitial(product) {
    return {
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category,
      stock: String(product.stock),
      images: (product.images ?? []).join(', '),
    };
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Admin Panel — Products</h1>
        <button
          onClick={() => { setShowCreate((v) => !v); setEditingId(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          {showCreate ? 'Cancel' : '+ New Product'}
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded px-3 py-2">
          {successMsg}
        </div>
      )}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold mb-4">New Product</h2>
          <ProductForm
            submitLabel="Create Product"
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Product list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="bg-gray-200 h-4 rounded w-1/3 mb-2" />
              <div className="bg-gray-200 h-3 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No products yet. Create one above.</p>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const busy = !!deleteLoading[product._id];
            const isEditing = editingId === product._id;
            return (
              <div key={product._id} className="bg-white rounded-lg shadow p-4">
                {isEditing ? (
                  <>
                    <h3 className="font-semibold mb-4">Edit: {product.name}</h3>
                    <ProductForm
                      initial={formInitial(product)}
                      submitLabel="Save Changes"
                      onSave={(payload) => handleUpdate(product._id, payload)}
                      onCancel={() => setEditingId(null)}
                    />
                  </>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 items-start flex-1 min-w-0">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-14 w-14 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.category} · ${product.price.toFixed(2)} · {product.stock} in stock</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(product._id); setShowCreate(false); }}
                        className="text-sm border px-3 py-1 rounded hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        disabled={busy}
                        className="text-sm border border-red-300 text-red-600 px-3 py-1 rounded hover:bg-red-50 disabled:opacity-40 flex items-center gap-1"
                      >
                        {busy && <Spinner />}
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
