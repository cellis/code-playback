'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { TreeNode } from '@/lib/types';

interface FileTreeProps {
  nodes: TreeNode[];
  onFileSelect: (path: string, language: string) => void;
  onFolderExpand?: (path: string) => Promise<TreeNode[]>;
}

interface TreeItemProps {
  node: TreeNode;
  onFileSelect: (path: string, language: string) => void;
  onFolderExpand?: (path: string) => Promise<TreeNode[]>;
  level: number;
}

const TreeItem: React.FC<TreeItemProps> = ({ node, onFileSelect, onFolderExpand, level }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<TreeNode[]>(node.children || []);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (node.type === 'directory') {
      if (!isExpanded && children.length === 0 && onFolderExpand) {
        setIsLoading(true);
        try {
          const newChildren = await onFolderExpand(node.path);
          setChildren(newChildren);
        } catch (error) {
          console.error('Error expanding folder:', error);
        } finally {
          setIsLoading(false);
        }
      }
      setIsExpanded(!isExpanded);
    } else {
      const ext = node.name.split('.').pop()?.toLowerCase() || '';
      const language = getLanguageFromExtension(ext);
      onFileSelect(node.path, language);
    }
  };

  const getLanguageFromExtension = (ext: string): string => {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'ps1': 'powershell',
      'bat': 'batch',
    };
    
    return languageMap[ext] || 'plaintext';
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer select-none"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleToggle}
      >
        {node.type === 'directory' && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isLoading ? (
              <span className="animate-spin">⟳</span>
            ) : isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </span>
        )}
        
        <span className="w-4 h-4 flex items-center justify-center">
          {node.type === 'directory' ? (
            isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />
          ) : (
            <File size={14} />
          )}
        </span>
        
        <span className="text-sm">{node.name}</span>
      </div>
      
      {node.type === 'directory' && isExpanded && children.length > 0 && (
        <div>
          {children.map((child, index) => (
            <TreeItem
              key={`${child.path}-${index}`}
              node={child}
              onFileSelect={onFileSelect}
              onFolderExpand={onFolderExpand}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({ nodes, onFileSelect, onFolderExpand }) => {
  return (
    <div className="w-full h-full overflow-auto bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {nodes.map((node, index) => (
        <TreeItem
          key={`${node.path}-${index}`}
          node={node}
          onFileSelect={onFileSelect}
          onFolderExpand={onFolderExpand}
          level={0}
        />
      ))}
    </div>
  );
};

export default FileTree;