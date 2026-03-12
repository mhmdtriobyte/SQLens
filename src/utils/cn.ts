/**
 * Classname utility for combining Tailwind CSS classes
 * Uses clsx for conditional class construction and tailwind-merge for deduplication
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class values into a single className string
 * Handles conditional classes, arrays, and objects
 * Uses tailwind-merge to properly handle Tailwind CSS class conflicts
 *
 * @param inputs - Class values to combine (strings, arrays, objects, or conditionals)
 * @returns Merged and deduplicated className string
 *
 * @example
 * // Basic usage
 * cn('px-4 py-2', 'bg-blue-500')
 * // => 'px-4 py-2 bg-blue-500'
 *
 * @example
 * // Conditional classes
 * cn('base-class', isActive && 'active', isDisabled && 'disabled')
 * // => 'base-class active' (if isActive is true and isDisabled is false)
 *
 * @example
 * // Object syntax
 * cn('base', { 'text-red-500': hasError, 'text-green-500': !hasError })
 * // => 'base text-red-500' (if hasError is true)
 *
 * @example
 * // Tailwind class conflict resolution
 * cn('px-4', 'px-6')
 * // => 'px-6' (later class wins)
 *
 * @example
 * // Complex example with all features
 * cn(
 *   'flex items-center gap-2',
 *   'px-4 py-2 rounded-md',
 *   variant === 'primary' && 'bg-blue-500 text-white',
 *   variant === 'secondary' && 'bg-gray-100 text-gray-900',
 *   { 'opacity-50 cursor-not-allowed': disabled },
 *   className // passed from props
 * )
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
