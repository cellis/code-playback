'use client';

import React, { useState, useEffect } from 'react';
import FileTree from '@/components/FileTree';
import CodePlayback from '@/components/CodePlayback';
import { TreeNode } from '@/lib/types';
import { fetchGitHubTree, fetchGitHubFileContent, getLanguageFromFilename } from '@/lib/github';
import { Github, FolderOpen, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function Home() {
  const [repoInput, setRepoInput] = useState('');
  const [repoType, setRepoType] = useState<'github' | 'local'>('github');
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string; language: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repoInfo, setRepoInfo] = useState<{ owner?: string; repo?: string; basePath?: string }>({});

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

  const loadRepository = async () => {
    setLoading(true);
    setError('');
    setSelectedFile(null);

    try {
      if (repoType === 'github') {
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
      } else {
        // Local repository
        const response = await axios.post('/api/local-repo', { path: repoInput });
        setFileTree(response.data.tree);
        setRepoInfo({ basePath: repoInput });
      }
      
      // Save successful repo input to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('codePlaybackLastRepo', repoInput);
        localStorage.setItem('codePlaybackRepoType', repoType);
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
      } else if (repoType === 'local' && repoInfo.basePath) {
        const response = await axios.get('/api/local-repo', {
          params: { path, base: repoInfo.basePath }
        });
        content = response.data.content;
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Code Playback
          </h1>
          
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

            {/* Repository input */}
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder={
                repoType === 'github'
                  ? 'Enter GitHub repo (e.g., facebook/react)'
                  : 'Enter local path (e.g., /Users/name/project)'
              }
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && loadRepository()}
            />

            {/* Load button */}
            <button
              onClick={loadRepository}
              disabled={!repoInput || loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Load'}
            </button>
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
