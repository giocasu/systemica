/**
 * Migration utilities for Systemica projects.
 * 
 * Handles backward compatibility when loading older projects
 * that don't have the new token system fields.
 */

import { Node } from '@xyflow/react';
import { NodeData, TypedResources } from '../types';

/**
 * Migrate a node to include token system fields.
 * 
 * For older projects:
 * - Sets tokenType to 'black' (default)
 * - Converts resources number to typedResources map
 * 
 * @param node The node to migrate
 * @returns The migrated node with token fields
 */
export function migrateNodeData(node: Node<NodeData>): Node<NodeData> {
  const data = { ...node.data };
  let migrated = false;
  
  // Migrate tokenType if missing
  if (!data.tokenType) {
    data.tokenType = 'black';
    migrated = true;
  }
  
  // Migrate typedResources if missing
  if (!data.typedResources) {
    // Convert legacy resources to typed resources
    const resources = data.resources || 0;
    data.typedResources = resources > 0 
      ? { [data.tokenType]: resources } 
      : {};
    migrated = true;
  }
  
  // For converters, ensure recipe exists (optional, can be undefined)
  // Legacy converters use inputRatio/outputRatio which still work
  
  if (migrated) {
    return { ...node, data };
  }
  
  return node;
}

/**
 * Migrate all nodes in a project.
 * 
 * @param nodes Array of nodes to migrate
 * @returns Migrated nodes array
 */
export function migrateNodes(nodes: Node<NodeData>[]): Node<NodeData>[] {
  return nodes.map(migrateNodeData);
}

/**
 * Get total resources from typedResources.
 * 
 * Useful for backward compatibility with code that expects
 * a single resources number.
 * 
 * @param typedResources The typed resources map
 * @returns Total of all resources
 */
export function getTotalResources(typedResources: TypedResources): number {
  return Object.values(typedResources).reduce((sum, val) => sum + val, 0);
}

/**
 * Get resources of a specific token type.
 * 
 * @param typedResources The typed resources map
 * @param tokenId The token ID to get
 * @returns Amount of that token (0 if not present)
 */
export function getTokenResources(typedResources: TypedResources, tokenId: string): number {
  return typedResources[tokenId] || 0;
}

/**
 * Add resources of a specific token type.
 * 
 * @param typedResources The typed resources map
 * @param tokenId The token ID to add to
 * @param amount Amount to add
 * @returns New typed resources map
 */
export function addTokenResources(
  typedResources: TypedResources, 
  tokenId: string, 
  amount: number
): TypedResources {
  const current = typedResources[tokenId] || 0;
  return {
    ...typedResources,
    [tokenId]: current + amount,
  };
}

/**
 * Remove resources of a specific token type.
 * 
 * @param typedResources The typed resources map
 * @param tokenId The token ID to remove from
 * @param amount Amount to remove
 * @returns New typed resources map (amount is clamped to 0)
 */
export function removeTokenResources(
  typedResources: TypedResources, 
  tokenId: string, 
  amount: number
): TypedResources {
  const current = typedResources[tokenId] || 0;
  const newAmount = Math.max(0, current - amount);
  
  // If amount is 0, we can optionally remove the key
  if (newAmount === 0) {
    const { [tokenId]: _, ...rest } = typedResources;
    return rest;
  }
  
  return {
    ...typedResources,
    [tokenId]: newAmount,
  };
}

/**
 * Check if typedResources has any resources.
 * 
 * @param typedResources The typed resources map
 * @returns true if any token has resources > 0
 */
export function hasAnyResources(typedResources: TypedResources): boolean {
  return Object.values(typedResources).some(val => val > 0);
}

/**
 * Check if typedResources has a specific token.
 * 
 * @param typedResources The typed resources map
 * @param tokenId The token ID to check
 * @param minAmount Minimum amount required (default 0)
 * @returns true if token exists with at least minAmount
 */
export function hasToken(
  typedResources: TypedResources, 
  tokenId: string, 
  minAmount: number = 0
): boolean {
  return (typedResources[tokenId] || 0) > minAmount;
}
