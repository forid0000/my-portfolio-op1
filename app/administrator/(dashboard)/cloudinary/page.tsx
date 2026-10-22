'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  Loader2,
  Trash2,
  Copy,
  CheckCircle2,
  Image as ImageIcon,
  ExternalLink,
  Calendar,
  HardDrive,
  Folder,
  ChevronRight,
  Edit2,
  AlertTriangle,
  CheckSquare,
  Square,
  Upload,
  FolderPlus,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface CloudinaryImage {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

interface CloudinaryFolder {
  name: string;
  path: string;
}

export default function CloudinaryExplorer() {
  const [currentPath, setCurrentPath] = useState<string>(''); // empty string means root
  const [folders, setFolders] = useState<CloudinaryFolder[]>([]);
  const [images, setImages] = useState<CloudinaryImage[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Create Folder state
  const [isCreatingFolderModalOpen, setIsCreatingFolderModalOpen] = useState(false);
  const [newFolderInput, setNewFolderInput] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Lightbox state
  const [viewingImage, setViewingImage] = useState<CloudinaryImage | null>(null);

  const fetchDirectory = async (path: string, cursor?: string) => {
    try {
      // If fetching from scratch, get folders first
      if (!cursor) {
        setLoading(true);
        const folderUrl = path
          ? `/api/admin/cloudinary-media?action=folders&path=${path}`
          : `/api/admin/cloudinary-media?action=folders`;
        const folderRes = await fetch(folderUrl);
        if (folderRes.ok) {
          const folderData = await folderRes.json();
          setFolders(folderData.folders || []);
        }
      }

      // Fetch resources
      const resUrl = new URL(window.location.origin + '/api/admin/cloudinary-media');
      resUrl.searchParams.set('action', 'resources');
      if (path) resUrl.searchParams.set('folder', path);
      if (cursor) resUrl.searchParams.set('next_cursor', cursor);

      const res = await fetch(resUrl.toString());
      if (!res.ok) throw new Error('Failed to fetch media');

      const data = await res.json();

      if (cursor) {
        setImages((prev) => [...prev, ...data.resources]);
      } else {
        setImages(data.resources);
      }

      setNextCursor(data.next_cursor);
    } catch (error) {
      toast.error('Failed to load directory contents');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setSelectedIds(new Set());
    setNextCursor(null);
    fetchDirectory(currentPath);
  }, [currentPath]);

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Copied URL to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelection = (public_id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(public_id)) newSet.delete(public_id);
    else newSet.add(public_id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      setSelectedIds(new Set(images.map((img) => img.public_id))); // Select all
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to permanently delete ${selectedIds.size} selected image(s) from Cloudinary?\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/cloudinary-media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_ids: Array.from(selectedIds) }),
      });

      if (!res.ok) throw new Error('Delete failed');

      setImages((prev) => prev.filter((img) => !selectedIds.has(img.public_id)));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} image(s) permanently deleted`);
    } catch (error) {
      toast.error('Failed to delete images');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRename = async () => {
    if (!renamingId || !newName.trim()) return;

    if (
      !window.confirm(
        `WARNING: Renaming this file will completely change its secure URL.\nIf this image is used on your live site, the image will break.\n\nAre you sure you want to rename it?`
      )
    ) {
      return;
    }

    setIsRenaming(true);
    try {
      const folderPrefix = currentPath ? `${currentPath}/` : '';
      const to_public_id = `${folderPrefix}${newName.trim()}`;

      const res = await fetch('/api/admin/cloudinary-media?action=rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_public_id: renamingId, to_public_id }),
      });

      if (!res.ok) throw new Error('Rename failed');

      toast.success('File renamed successfully');
      setRenamingId(null);
      setNewName('');
      // Refresh directory to get new URLs
      fetchDirectory(currentPath);
    } catch (error) {
      toast.error('Failed to rename file');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderInput.trim()) return;

    setIsCreatingFolder(true);
    try {
      const folderPrefix = currentPath ? `${currentPath}/` : '';
      const path = `${folderPrefix}${newFolderInput.trim()}`;

      const res = await fetch('/api/admin/cloudinary-media?action=create_folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });

      if (!res.ok) throw new Error('Failed to create folder');

      toast.success('Folder created successfully');
      setIsCreatingFolderModalOpen(false);
      setNewFolderInput('');
      fetchDirectory(currentPath);
    } catch (error) {
      toast.error('Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderPath: string, folderName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the folder "${folderName}"?\nCloudinary only allows deleting empty folders. If this folder contains images, deletion will fail.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/cloudinary-media?action=folder', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || 'Failed to delete folder');
      }

      toast.success('Folder deleted successfully');
      fetchDirectory(currentPath);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete folder');
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        toast.loading(`Uploading ${i + 1} of ${files.length}...`, { id: 'upload-toast' });

        const imageBase64 = await readFileAsDataURL(file);

        const res = await fetch('/api/admin/cloudinary-media?action=upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, folder: currentPath || undefined }),
        });

        if (res.ok) {
          successCount++;
        }
      }

      toast.success(`Successfully uploaded ${successCount} file(s)`, { id: 'upload-toast' });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh directory
      fetchDirectory(currentPath);
    } catch (error) {
      toast.error('Error during upload process', { id: 'upload-toast' });
    } finally {
      setIsUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Build breadcrumbs
  const pathParts = currentPath ? currentPath.split('/') : [];
  const breadcrumbs = [];
  breadcrumbs.push({ name: 'Root', path: '' });
  let cumulative = '';
  for (const part of pathParts) {
    cumulative += cumulative ? `/${part}` : part;
    breadcrumbs.push({ name: part, path: cumulative });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header & Breadcrumbs */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row justify-between gap-4 md:items-center relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />

          <div>
            <div className="flex items-center gap-3 mb-2">
              <Cloud className="w-8 h-8 text-emerald-400" />
              <h1 className="text-2xl font-bold text-gray-100 tracking-tight">
                Cloudinary Explorer
              </h1>
            </div>

            {/* Breadcrumb Nav */}
            <div className="flex items-center gap-2 text-sm ml-11 flex-wrap">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.path}>
                  <button
                    onClick={() => setCurrentPath(crumb.path)}
                    className={`font-mono transition-colors ${idx === breadcrumbs.length - 1 ? 'text-emerald-400 font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {crumb.name}
                  </button>
                  {idx < breadcrumbs.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gray-950 px-4 py-2 rounded-lg border border-gray-800 shrink-0 self-start md:self-auto">
            <div className="text-sm font-medium flex gap-4">
              <span className="flex items-center gap-1" title="Total Folders">
                <Folder className="w-4 h-4 text-gray-400" />{' '}
                <span className="text-emerald-400">{folders.length}</span>
              </span>
              <span className="flex items-center gap-1" title="Total Images">
                <ImageIcon className="w-4 h-4 text-gray-400" />{' '}
                <span className="text-emerald-400">{images.length}</span>
              </span>
            </div>

            <div className="w-px h-6 bg-gray-800 mx-1" />

            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleUploadFiles}
              disabled={isUploading}
            />
            <button
              onClick={() => setIsCreatingFolderModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-xs font-bold uppercase tracking-widest transition-colors shadow-sm"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 rounded-md text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload
            </button>
          </div>
        </div>

        {/* Admin Hint */}
        <div className="bg-blue-950/30 border-t border-blue-900/50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200/80 leading-relaxed">
              <strong className="text-blue-300">Admin Hint:</strong> Folders can only be deleted if
              they are <strong className="text-white">completely empty</strong>. Additionally,
              renaming an image will change its secure URL-if that image is currently embedded
              anywhere on your live site, the link will break.
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar for Multi-Delete */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-gray-800 border border-gray-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6">
            <span className="text-sm font-medium text-emerald-400 font-mono">
              {selectedIds.size} items selected
            </span>
            <div className="w-px h-6 bg-gray-700" />
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 rounded-full text-sm font-medium transition-colors"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {isDeleting ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>
        </div>
      )}

      {/* Directory Contents */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-gray-400 font-mono animate-pulse">Loading directory contents...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Folders Grid */}
          {folders.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 px-1">
                Folders
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {folders.map((folder) => (
                  <div
                    key={folder.path}
                    className="group relative flex bg-gray-900 border border-gray-800 rounded-xl hover:border-emerald-500/50 hover:bg-gray-800/50 transition-all shadow-sm"
                  >
                    <button
                      onClick={() => setCurrentPath(folder.path)}
                      className="flex-1 flex items-center gap-3 p-4 text-left"
                    >
                      <Folder className="w-8 h-8 text-emerald-500/70 group-hover:text-emerald-400 transition-colors shrink-0" />
                      <span className="font-medium text-gray-200 truncate font-mono text-sm">
                        {folder.name}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.path, folder.name);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete Folder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Grid */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Files</h2>
              {images.length > 0 && (
                <button
                  onClick={selectAll}
                  className="text-xs font-medium text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  {selectedIds.size === images.length ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  {selectedIds.size === images.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {images.length === 0 ? (
              <div className="text-center py-16 bg-gray-900/50 border border-gray-800 border-dashed rounded-2xl">
                <ImageIcon className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-mono">No files in this directory.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {images.map((img) => {
                  const isSelected = selectedIds.has(img.public_id);
                  const filename = img.public_id.split('/').pop() || '';

                  return (
                    <div
                      key={img.public_id}
                      className={`group relative bg-gray-900 border rounded-xl overflow-hidden transition-all flex flex-col shadow-sm ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-gray-800 hover:border-gray-600'}`}
                    >
                      {/* Checkbox overlay */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(img.public_id);
                        }}
                        className={`absolute top-2 left-2 z-20 p-1 rounded transition-colors ${isSelected ? 'bg-emerald-500 text-white' : 'bg-black/40 text-transparent group-hover:text-white/70 hover:bg-black/60 border border-transparent group-hover:border-white/20'}`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      {/* Image Preview Container */}
                      <div
                        className="aspect-square relative bg-gray-950 overflow-hidden cursor-pointer"
                        onClick={() => setViewingImage(img)}
                      >
                        <img
                          src={img.secure_url}
                          alt={filename}
                          className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-105 opacity-80' : 'group-hover:scale-105'}`}
                          loading="lazy"
                        />

                        {/* Hover Actions (only show if not selecting multiple) */}
                        {selectedIds.size === 0 && (
                          <div
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCopyUrl(img.secure_url, img.public_id)}
                                className="p-2 bg-gray-800 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-lg"
                                title="Copy URL"
                              >
                                {copiedId === img.public_id ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <a
                                href={img.secure_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-gray-800 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-lg"
                                title="Open in new tab"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => {
                                  setRenamingId(img.public_id);
                                  setNewName(filename);
                                }}
                                className="p-2 bg-gray-800 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-lg flex items-center gap-1 px-3 text-xs font-medium"
                              >
                                <Edit2 className="w-3 h-3" /> Rename
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Meta Info */}
                      <div className="p-3 bg-gray-900 flex-1 flex flex-col justify-between border-t border-gray-800">
                        <p
                          className="text-xs font-mono text-gray-300 truncate mb-2 select-all"
                          title={filename}
                        >
                          {filename}
                        </p>
                        <div className="space-y-1 mt-auto">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3" />
                              {formatBytes(img.bytes)}
                            </span>
                            <span className="uppercase">{img.format}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(img.created_at).toLocaleDateString()}
                            </span>
                            <span>
                              {img.width}x{img.height}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Load More Pagination */}
          {nextCursor && (
            <div className="flex justify-center pt-8 pb-12">
              <button
                onClick={() => {
                  setLoadingMore(true);
                  fetchDirectory(currentPath, nextCursor);
                }}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/50 text-emerald-400 rounded-xl font-medium transition-all shadow-lg"
              >
                {loadingMore ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Cloud className="w-5 h-5" />
                )}
                {loadingMore ? 'Loading More...' : 'Load More Images'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rename Modal */}
      {renamingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Rename File</h3>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4 flex gap-3 text-orange-400 text-sm leading-relaxed">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Renaming will change the image's public URL. If this image is currently displayed on
                your website, it will break.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  New Name (without extension)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. hero-background"
                />
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setRenamingId(null);
                    setNewName('');
                  }}
                  disabled={isRenaming}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRename}
                  disabled={isRenaming || !newName.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isRenaming && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreatingFolderModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create New Folder</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Folder Name</label>
                <input
                  type="text"
                  value={newFolderInput}
                  onChange={(e) => setNewFolderInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 2025-gallery"
                />
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setIsCreatingFolderModalOpen(false);
                    setNewFolderInput('');
                  }}
                  disabled={isCreatingFolder}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={isCreatingFolder || !newFolderInput.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isCreatingFolder && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 md:p-12 cursor-zoom-out"
          onClick={() => setViewingImage(null)}
        >
          <div className="absolute top-6 right-6 flex gap-4">
            <a
              href={viewingImage.secure_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-3 bg-gray-800/80 hover:bg-emerald-600 text-white rounded-full transition-colors shadow-2xl"
              title="Open full resolution"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <button
              className="p-3 bg-gray-800/80 hover:bg-red-500 text-white rounded-full transition-colors shadow-2xl"
              title="Close"
            >
              <Trash2 className="w-5 h-5 hidden" />{' '}
              {/* Just spacing, use CSS X later if needed. The background click closes it anyway */}
              <span className="font-bold text-xl leading-none">&times;</span>
            </button>
          </div>

          <img
            src={viewingImage.secure_url}
            alt="Full view"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking the image itself
          />

          <div
            className="mt-6 bg-gray-900/80 backdrop-blur border border-gray-800 px-6 py-3 rounded-full flex gap-6 text-sm text-gray-300 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-mono text-emerald-400 truncate max-w-[200px] sm:max-w-sm">
              {viewingImage.public_id.split('/').pop()}
            </span>
            <div className="w-px h-5 bg-gray-700" />
            <span>
              {viewingImage.width} &times; {viewingImage.height}
            </span>
            <div className="w-px h-5 bg-gray-700" />
            <span className="uppercase">{viewingImage.format}</span>
          </div>
        </div>
      )}
    </div>
  );
}
