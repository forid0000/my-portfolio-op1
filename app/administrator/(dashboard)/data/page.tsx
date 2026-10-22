'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  Table,
  Trash2,
  Loader2,
  RefreshCcw,
  Search,
  Plus,
  Edit,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { JsonView, darkStyles, allExpanded } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

export default function DatabaseManager() {
  interface DBNode {
    name: string;
    collections: string[];
  }
  const [databases, setDatabases] = useState<DBNode[]>([]);
  const [expandedDbs, setExpandedDbs] = useState<string[]>([]);
  const [currentDb, setCurrentDb] = useState<string>('');
  const [currentCollection, setCurrentCollection] = useState<string>('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 25;

  // CRUD Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    fetchDatabases();
  }, []);

  const fetchDatabases = async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/data');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch collections');
      }

      if (data.databases) {
        setDatabases(data.databases);
        if (data.databases.length > 0 && !currentDb) {
          const firstDb = data.databases[0];
          setExpandedDbs([firstDb.name]);
          if (firstDb.collections.length > 0) {
            fetchDocuments(firstDb.name, firstDb.collections[0]);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  const fetchDocuments = async (
    dbName: string,
    collection: string,
    currentPage: number = 1,
    search: string = ''
  ) => {
    setLoading(true);
    setError(null);
    setCurrentDb(dbName);
    setCurrentCollection(collection);
    try {
      const res = await fetch(
        `/api/admin/data?db=${encodeURIComponent(dbName)}&collection=${encodeURIComponent(collection)}&page=${currentPage}&limit=${limit}&search=${encodeURIComponent(search)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch documents');
      }

      if (data.documents) {
        setDocuments(data.documents);
        setTotalCount(data.totalCount || 0);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDocuments(currentDb, currentCollection, 1, searchQuery);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > Math.ceil(totalCount / limit)) return;
    setPage(newPage);
    fetchDocuments(currentDb, currentCollection, newPage, searchQuery);
  };

  const openModal = (mode: 'create' | 'edit', doc?: any) => {
    setModalMode(mode);
    setJsonError('');
    if (mode === 'edit' && doc) {
      setEditingId(doc._id);
      setJsonInput(JSON.stringify(doc, null, 2));
    } else {
      setEditingId(null);
      setJsonInput('{\n  \n}');
    }
    setIsModalOpen(true);
  };

  const handleSaveDocument = async () => {
    setJsonError('');
    let parsedDoc;
    try {
      parsedDoc = JSON.parse(jsonInput);
    } catch (e: any) {
      setJsonError('Invalid JSON: ' + e.message);
      return;
    }

    try {
      const res = await fetch('/api/admin/data', {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbName: currentDb,
          collectionName: currentCollection,
          id: editingId,
          document: parsedDoc,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save document');
      }

      setIsModalOpen(false);
      fetchDocuments(currentDb, currentCollection, page, searchQuery);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this document?`)) return;

    setError(null);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbName: currentDb, collectionName: currentCollection, id }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete document');
      }

      setDocuments((prev) => prev.filter((d) => d._id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar Collections */}
      <div className="w-full lg:w-64 bg-gray-950 border border-gray-800 rounded-xl shadow-sm flex flex-col overflow-hidden text-gray-100">
        <div className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
          <h3 className="font-semibold text-gray-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            Databases
          </h3>
          <button
            onClick={fetchDatabases}
            className="text-gray-400 hover:text-emerald-400 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {databases.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">No databases found</div>
          ) : (
            databases.map((db) => (
              <div key={db.name} className="mb-2">
                <button
                  onClick={() =>
                    setExpandedDbs((prev) =>
                      prev.includes(db.name)
                        ? prev.filter((n) => n !== db.name)
                        : [...prev, db.name]
                    )
                  }
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    {db.name}
                  </div>
                  {expandedDbs.includes(db.name) ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                {expandedDbs.includes(db.name) && (
                  <div className="mt-1 ml-4 border-l border-gray-800 pl-2 flex flex-col gap-1">
                    {db.collections.length === 0 ? (
                      <div className="text-xs text-gray-600 italic px-3 py-1">No collections</div>
                    ) : (
                      db.collections.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setSearchQuery('');
                            setPage(1);
                            fetchDocuments(db.name, c, 1, '');
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors ${currentDb === db.name && currentCollection === c ? 'bg-gray-800 text-emerald-400 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'}`}
                        >
                          <Table className="w-3.5 h-3.5 opacity-70" />
                          {c}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Data Area */}
      <div className="flex-1 bg-gray-950 border border-gray-800 rounded-xl shadow-sm flex flex-col overflow-hidden text-gray-100 relative">
        <div className="p-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-gray-100 flex items-center gap-2">
              {currentDb && currentCollection
                ? `${currentDb} > ${currentCollection}`
                : 'Select a collection'}
            </h3>
            {currentCollection && (
              <span className="text-xs font-medium bg-gray-800 px-2 py-1 rounded text-gray-400">
                {totalCount} Document(s)
              </span>
            )}
          </div>
          {currentCollection && (
            <div className="flex items-center gap-3">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search fields or _id..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm bg-gray-950 border border-gray-800 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all w-64"
                />
              </form>
              <button
                onClick={() => openModal('create')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Document
              </button>
            </div>
          )}
        </div>

        {/* Admin Hint */}
        <div className="bg-blue-950/30 border-b border-blue-900/50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200/80 leading-relaxed">
              <strong className="text-blue-300">Admin Hint:</strong> This is a raw database viewer.
              Editing or deleting documents here directly bypasses all API validations. Proceed with
              caution-removing required fields or deleting active references may break the public
              UI.
            </div>
          </div>
        </div>

        {error && (
          <div className="m-4 p-4 bg-red-950/50 border border-red-900/50 text-red-400 text-sm font-medium rounded-lg">
            Error: {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center text-gray-600">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : !currentCollection ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <Database className="w-16 h-16 mb-4 text-gray-800" />
              <p>Select a collection from the sidebar to view its data.</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <Table className="w-16 h-16 mb-4 text-gray-800" />
              <p>This collection is empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc, idx) => (
                <div
                  key={doc._id || idx}
                  className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden group"
                >
                  <div className="flex justify-between items-center p-3 border-b border-gray-800 bg-gray-800/50">
                    <span className="text-xs font-mono text-emerald-400">ID: {doc._id}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openModal('edit', doc)}
                        className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-gray-700 rounded transition-colors"
                        title="Edit Document"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 overflow-x-auto text-sm">
                    <JsonView
                      data={
                        // Truncate large strings (like base64 resumes) to prevent React/DOM crashes in the viewer
                        JSON.parse(
                          JSON.stringify(doc, (key, val) =>
                            typeof val === 'string' && val.length > 300
                              ? val.substring(0, 300) + '... (truncated for view)'
                              : val
                          )
                        )
                      }
                      shouldExpandNode={allExpanded}
                      style={darkStyles}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {currentCollection && totalCount > 0 && (
          <div className="p-4 border-t border-gray-800 bg-gray-900 flex items-center justify-between text-sm text-gray-400">
            <div>
              Showing <span className="font-medium text-gray-200">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-medium text-gray-200">
                {Math.min(page * limit, totalCount)}
              </span>{' '}
              of <span className="font-medium text-gray-200">{totalCount}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-medium text-gray-300">
                Page {page} of {Math.ceil(totalCount / limit) || 1}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= Math.ceil(totalCount / limit)}
                className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold text-gray-100">
                {modalMode === 'create' ? 'Create New Document' : 'Edit Document'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              {jsonError && (
                <div className="mb-4 p-3 bg-red-950/50 border border-red-900/50 text-red-400 text-sm font-medium rounded-lg">
                  {jsonError}
                </div>
              )}
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full flex-1 p-4 bg-gray-950 border border-gray-800 rounded-lg text-emerald-400 font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none min-h-[300px]"
                spellCheck={false}
              />
              <p className="mt-2 text-xs text-gray-500">
                Write strict JSON. Keys and string values must be enclosed in double quotes. Do not
                modify the `_id` field if editing.
              </p>
            </div>
            <div className="p-4 border-t border-gray-800 bg-gray-950 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDocument}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm"
              >
                {modalMode === 'create' ? 'Create Document' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
