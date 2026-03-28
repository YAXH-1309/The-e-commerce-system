import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

const LIMIT = 12;

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow p-4 animate-pulse">
      <div className="bg-gray-200 h-48 rounded mb-3" />
      <div className="bg-gray-200 h-4 rounded w-3/4 mb-2" />
      <div className="bg-gray-200 h-4 rounded w-1/3" />
    </div>
  );
}

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (category) params.category = category;
      if (sort) params.sort = sort;
      const { data } = await apiClient.get('/products', { params });
      setProducts(data.data.products);
      setTotal(data.data.total);
      setPages(data.data.pages);
    } catch {
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset to page 1 when filters change
  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Products</h1>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border rounded px-3 py-2 flex-1 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Category"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="border rounded px-3 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {/* Error */}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Results count */}
      {!loading && !error && (
        <p className="text-sm text-gray-500 mb-4">{total} product{total !== 1 ? 's' : ''} found</p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: LIMIT }).map((_, i) => <SkeletonCard key={i} />)
          : products.length === 0
            ? (
              <p className="col-span-full text-center text-gray-500 py-16">
                No products match your search. Try different filters.
              </p>
            )
            : products.map((p) => (
              <Link
                key={p._id}
                to={`/products/${p._id}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-4 flex flex-col"
              >
                {p.images?.[0] && (
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="h-48 w-full object-cover rounded mb-3"
                  />
                )}
                <p className="font-medium text-gray-800 flex-1">{p.name}</p>
                <p className="text-sm text-gray-500 mt-1">{p.category}</p>
                <p className="text-blue-600 font-semibold mt-2">${p.price.toFixed(2)}</p>
              </Link>
            ))
        }
      </div>

      {/* Pagination */}
      {!loading && pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100"
          >
            ‹ Prev
          </button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
