import axios from 'axios';
import { TreeNode } from './types';

const GITHUB_API_BASE = 'https://api.github.com';

export async function fetchGitHubTree(owner: string, repo: string, path: string = ''): Promise<TreeNode[]> {
  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
    const response = await axios.get(url);
    const items = response.data;

    const tree: TreeNode[] = await Promise.all(
      items.map(async (item: any) => {
        const node: TreeNode = {
          name: item.name,
          path: item.path,
          type: item.type === 'dir' ? 'directory' : 'file',
        };

        if (item.type === 'dir') {
          // For directories, we'll fetch children on-demand when expanded
          node.children = [];
        }

        return node;
      })
    );

    return tree;
  } catch (error) {
    console.error('Error fetching GitHub tree:', error);
    throw error;
  }
}

export async function fetchGitHubFileContent(owner: string, repo: string, path: string): Promise<string> {
  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
    const response = await axios.get(url);
    
    if (response.data.content) {
      // GitHub API returns base64 encoded content
      return atob(response.data.content);
    }
    
    return '';
  } catch (error) {
    console.error('Error fetching file content:', error);
    throw error;
  }
}

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
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
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
  };
  
  return languageMap[ext || ''] || 'plaintext';
}