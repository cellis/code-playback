export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  content?: string;
  language?: string;
}

export interface RepoData {
  owner?: string;
  repo?: string;
  path: string;
  type: 'local' | 'github';
}

export interface PlaybackState {
  isPlaying: boolean;
  speed: number;
  currentPosition: number;
  totalLength: number;
}