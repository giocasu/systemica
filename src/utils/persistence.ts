/**
 * Persistence utilities for auto-save and shareable links
 */

import { Node, Edge } from '@xyflow/react';
import { NodeData } from '../types';
import { EdgeData } from '../store/simulatorStore';

const STORAGE_KEY = 'game-economy-simulator-canvas';

interface CanvasState {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  savedAt: string;
}

/**
 * Save canvas state to localStorage
 */
export function saveToLocalStorage(nodes: Node<NodeData>[], edges: Edge<EdgeData>[]): void {
  try {
    const state: CanvasState = {
      nodes,
      edges,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

/**
 * Load canvas state from localStorage
 */
export function loadFromLocalStorage(): CanvasState | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as CanvasState;
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
    return null;
  }
}

/**
 * Clear saved canvas from localStorage
 */
export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Compress string using built-in compression (where available) or simple base64
 */
async function compressString(str: string): Promise<string> {
  try {
    // Use CompressionStream if available (modern browsers)
    if ('CompressionStream' in window) {
      const blob = new Blob([str]);
      const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
      const compressedBlob = await new Response(stream).blob();
      const buffer = await compressedBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Convert to base64url (URL-safe base64)
      let binary = '';
      bytes.forEach(byte => binary += String.fromCharCode(byte));
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
  } catch (e) {
    console.warn('Compression failed, using plain base64:', e);
  }
  
  // Fallback: plain base64url
  return btoa(encodeURIComponent(str)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decompress string
 */
async function decompressString(compressed: string): Promise<string> {
  try {
    // Restore base64 padding
    let base64 = compressed.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    
    // Try decompression first (for gzip-compressed data)
    if ('DecompressionStream' in window) {
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes]);
        const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
        const decompressedBlob = await new Response(stream).blob();
        return await decompressedBlob.text();
      } catch {
        // Not gzip compressed, try plain base64
      }
    }
    
    // Fallback: plain base64
    return decodeURIComponent(atob(base64));
  } catch (e) {
    console.warn('Decompression failed:', e);
    throw new Error('Invalid share link');
  }
}

/**
 * Generate a shareable URL with canvas state
 */
export async function generateShareableLink(nodes: Node<NodeData>[], edges: Edge<EdgeData>[]): Promise<string> {
  // Minimize the data we encode
  const minimalNodes = nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
    data: n.data,
  }));
  
  const minimalEdges = edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    data: e.data,
  }));
  
  const state = { n: minimalNodes, e: minimalEdges };
  const json = JSON.stringify(state);
  const compressed = await compressString(json);
  
  const url = new URL(window.location.href);
  url.hash = `share=${compressed}`;
  
  return url.toString();
}

/**
 * Parse canvas state from URL hash
 */
export async function parseShareableLink(): Promise<CanvasState | null> {
  const hash = window.location.hash;
  if (!hash.startsWith('#share=')) return null;
  
  try {
    const compressed = hash.slice(7); // Remove '#share='
    const json = await decompressString(compressed);
    const state = JSON.parse(json);
    
    // Reconstruct full node/edge structure
    const nodes: Node<NodeData>[] = state.n.map((n: { id: string; type: string; position: { x: number; y: number }; data: NodeData }) => ({
      id: n.id,
      type: n.type || 'custom',
      position: n.position,
      data: n.data,
    }));
    
    const edges: Edge<EdgeData>[] = state.e.map((e: { id: string; source: string; target: string; data: EdgeData }) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: e.data || { flowRate: 1 },
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#e94560', strokeWidth: 2 },
      label: e.data?.flowRate?.toString() || '1',
      labelStyle: { fill: '#fff', fontWeight: 700 },
      labelBgStyle: { fill: '#16213e', fillOpacity: 0.8 },
    }));
    
    return {
      nodes,
      edges,
      savedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.warn('Failed to parse share link:', e);
    return null;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
