'use client';

import React, { useState, useEffect } from 'react';
import FileTree from '@/components/FileTree';
import CodePlayback from '@/components/CodePlayback';
import { TreeNode } from '@/lib/types';
import { fetchGitHubTree, fetchGitHubFileContent, getLanguageFromFilename } from '@/lib/github';
import { Github, FolderOpen, AlertCircle } from 'lucide-react';

export default function Home() {
  const [repoInput, setRepoInput] = useState('');
  const [repoType, setRepoType] = useState<'github' | 'local'>('github');
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string; language: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repoInfo, setRepoInfo] = useState<{ owner?: string; repo?: string; basePath?: string }>({});
  const [localDirectoryHandle, setLocalDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [localDirectoryName, setLocalDirectoryName] = useState<string>('');

  // Load saved values from localStorage after hydration
  useEffect(() => {
    const savedRepo = localStorage.getItem('codePlaybackLastRepo');
    const savedType = localStorage.getItem('codePlaybackRepoType');
    
    if (savedRepo) {
      setRepoInput(savedRepo);
    }
    if (savedType === 'github' || savedType === 'local') {
      setRepoType(savedType);
    }
  }, []);

  // Save repo type when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('codePlaybackRepoType', repoType);
    }
  }, [repoType]);

  // Function to build tree from FileSystemDirectoryHandle
  const buildTreeFromDirectory = async (
    dirHandle: FileSystemDirectoryHandle,
    path: string = ''
  ): Promise<TreeNode[]> => {
    const tree: TreeNode[] = [];
    
    try {
      // @ts-expect-error - FileSystemDirectoryHandle.values() is not in TypeScript types yet
      for await (const entry of dirHandle.values()) {
        const nodePath = path ? `${path}/${entry.name}` : entry.name;
        
        if (entry.kind === 'file') {
          tree.push({
            name: entry.name,
            path: nodePath,
            type: 'file'
          });
        } else if (entry.kind === 'directory') {
          const children = await buildTreeFromDirectory(entry, nodePath);
          tree.push({
            name: entry.name,
            path: nodePath,
            type: 'directory',
            children
          });
        }
      }
    } catch (err) {
      console.error('Error reading directory:', err);
    }
    
    return tree.sort((a, b) => {
      // Directories first, then files
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  // Handle local directory selection
  const handleSelectLocalDirectory = async () => {
    try {
      // Check if File System Access API is supported
      if (!('showDirectoryPicker' in window)) {
        throw new Error('Your browser does not support directory selection. Please use Chrome, Edge, or another compatible browser.');
      }

      // @ts-expect-error - showDirectoryPicker is not in TypeScript types yet
      const dirHandle = await window.showDirectoryPicker();
      setLocalDirectoryHandle(dirHandle);
      setLocalDirectoryName(dirHandle.name);
      
      setLoading(true);
      setError('');
      
      const tree = await buildTreeFromDirectory(dirHandle);
      setFileTree(tree);
      setRepoInfo({ basePath: dirHandle.name });
      
    } catch (err: any) {
      if (err.name !== 'AbortError') { // User didn't cancel
        setError(err.message || 'Failed to load directory');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRepository = async () => {
    if (repoType === 'local') {
      // For local, use the directory picker
      await handleSelectLocalDirectory();
      return;
    }

    setLoading(true);
    setError('');
    setSelectedFile(null);

    try {
      // Parse GitHub URL or owner/repo format
      let owner = '';
      let repo = '';
      
      if (repoInput.includes('github.com')) {
        const match = repoInput.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (match) {
          owner = match[1];
          repo = match[2].replace('.git', '');
        }
      } else if (repoInput.includes('/')) {
        [owner, repo] = repoInput.split('/');
      } else {
        throw new Error('Invalid GitHub repository format. Use "owner/repo" or a GitHub URL');
      }

      const tree = await fetchGitHubTree(owner, repo);
      setFileTree(tree);
      setRepoInfo({ owner, repo });
      
      // Save successful repo input to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('codePlaybackLastRepo', repoInput);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load repository');
      setFileTree([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (path: string, language: string) => {
    setLoading(true);
    setError('');

    try {
      let content = '';
      
      if (repoType === 'github' && repoInfo.owner && repoInfo.repo) {
        content = await fetchGitHubFileContent(repoInfo.owner, repoInfo.repo, path);
      } else if (repoType === 'local' && localDirectoryHandle) {
        // Read file from local directory handle
        const pathParts = path.split('/');
        let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle = localDirectoryHandle;
        
        // Navigate to the file
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (currentHandle.kind === 'directory') {
            currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
          }
        }
        
        // Get the file
        if (currentHandle.kind === 'directory') {
          const fileHandle = await currentHandle.getFileHandle(pathParts[pathParts.length - 1]);
          const file = await fileHandle.getFile();
          content = await file.text();
        }
      }

      setSelectedFile({ path, content, language });
    } catch (err: any) {
      setError(err.message || 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderExpand = async (path: string): Promise<TreeNode[]> => {
    if (repoType === 'github' && repoInfo.owner && repoInfo.repo) {
      return await fetchGitHubTree(repoInfo.owner, repoInfo.repo, path);
    }
    return [];
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Code ▶ Playback
            </h1>
            <a
              href="https://github.com/cellis/code-playback"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="View on GitHub"
            >
              <Github size={20} className="text-gray-700 dark:text-gray-300" />
            </a>
          </div>
          
          <div className="flex gap-3">
            {/* Repository type selector */}
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
              <button
                onClick={() => setRepoType('github')}
                className={`px-4 py-2 flex items-center gap-2 transition-colors ${
                  repoType === 'github'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Github size={16} />
                GitHub
              </button>
              <button
                onClick={() => setRepoType('local')}
                className={`px-4 py-2 flex items-center gap-2 transition-colors ${
                  repoType === 'local'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <FolderOpen size={16} />
                Local
              </button>
            </div>

            {/* Repository input or directory info */}
            {repoType === 'github' ? (
              <>
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="Enter GitHub repo (e.g., facebook/react)"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500"
                  onKeyDown={(e) => e.key === 'Enter' && loadRepository()}
                />
                <button
                  onClick={loadRepository}
                  disabled={!repoInput || loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Loading...' : 'Load'}
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {localDirectoryName || 'No directory selected'}
                </div>
                <button
                  onClick={handleSelectLocalDirectory}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Loading...' : 'Select Directory'}
                </button>
              </>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-2 flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree sidebar */}
        <aside className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-auto">
          {fileTree.length > 0 ? (
            <FileTree
              nodes={fileTree}
              onFileSelect={handleFileSelect}
              onFolderExpand={repoType === 'github' ? handleFolderExpand : undefined}
            />
          ) : (
            <div className="p-4 text-gray-500 text-sm">
              {loading ? 'Loading repository...' : 'Load a repository to browse files'}
            </div>
          )}
        </aside>

        {/* Code playback area */}
        <main className="flex-1 bg-gray-900">
          {selectedFile ? (
            <CodePlayback
              code={selectedFile.content}
              language={selectedFile.language}
              filename={selectedFile.path}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              {fileTree.length > 0 ? 'Select a file to start playback' : 'Load a repository to get started'}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
