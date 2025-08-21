import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { TreeNode } from '@/lib/types';

async function buildFileTree(dirPath: string, basePath: string = ''): Promise<TreeNode[]> {
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  const tree: TreeNode[] = [];

  for (const item of items) {
    // Skip hidden files and common directories to ignore
    if (item.name.startsWith('.') || 
        item.name === 'node_modules' || 
        item.name === 'dist' ||
        item.name === 'build' ||
        item.name === '.git') {
      continue;
    }

    const fullPath = path.join(dirPath, item.name);
    const relativePath = basePath ? `${basePath}/${item.name}` : item.name;

    if (item.isDirectory()) {
      const children = await buildFileTree(fullPath, relativePath);
      tree.push({
        name: item.name,
        path: relativePath,
        type: 'directory',
        children: children
      });
    } else {
      tree.push({
        name: item.name,
        path: relativePath,
        type: 'file'
      });
    }
  }

  return tree;
}

export async function POST(request: NextRequest) {
  try {
    const { path: repoPath } = await request.json();
    
    if (!repoPath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // Check if path exists
    try {
      await fs.access(repoPath);
    } catch {
      return NextResponse.json({ error: 'Path does not exist' }, { status: 404 });
    }

    const tree = await buildFileTree(repoPath);
    
    return NextResponse.json({ tree });
  } catch (error) {
    console.error('Error reading local repo:', error);
    return NextResponse.json({ error: 'Failed to read repository' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path');
  const basePath = searchParams.get('base');
  
  if (!filePath || !basePath) {
    return NextResponse.json({ error: 'Path and base are required' }, { status: 400 });
  }

  try {
    const fullPath = path.join(basePath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}