/**
 * Formatting utility functions for SQLens
 * Provides consistent formatting for numbers, bytes, dates, and display values
 */

/**
 * Format a number with comma separators
 * @param n - The number to format
 * @returns Formatted string with commas (e.g., 1000 -> "1,000")
 */
export function formatNumber(n: number): string {
  if (n === null || n === undefined || isNaN(n)) {
    return '0';
  }
  return n.toLocaleString('en-US');
}

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @returns Human-readable string (e.g., 1024 -> "1 KB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) {
    return '0 B';
  }

  if (bytes === 0) {
    return '0 B';
  }

  const isNegative = bytes < 0;
  const absoluteBytes = Math.abs(bytes);

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  const base = 1024;

  // Find the appropriate unit
  const exponent = Math.min(
    Math.floor(Math.log(absoluteBytes) / Math.log(base)),
    units.length - 1
  );

  const value = absoluteBytes / Math.pow(base, exponent);
  const unit = units[exponent];

  // Format with appropriate decimal places
  let formatted: string;
  if (exponent === 0) {
    // Bytes - no decimal places
    formatted = Math.round(value).toString();
  } else if (value >= 100) {
    // Large values - no decimal places
    formatted = Math.round(value).toString();
  } else if (value >= 10) {
    // Medium values - one decimal place
    formatted = value.toFixed(1).replace(/\.0$/, '');
  } else {
    // Small values - two decimal places
    formatted = value.toFixed(2).replace(/\.?0+$/, '');
  }

  return `${isNegative ? '-' : ''}${formatted} ${unit}`;
}

/**
 * Format milliseconds to human-readable duration
 * @param ms - Duration in milliseconds
 * @returns Human-readable string (e.g., 1500 -> "1.5s")
 */
export function formatDuration(ms: number): string {
  if (ms === null || ms === undefined || isNaN(ms)) {
    return '0ms';
  }

  const absoluteMs = Math.abs(ms);
  const sign = ms < 0 ? '-' : '';

  if (absoluteMs < 1) {
    // Microseconds
    const us = absoluteMs * 1000;
    return `${sign}${us.toFixed(0)}μs`;
  }

  if (absoluteMs < 1000) {
    // Milliseconds
    if (absoluteMs < 10) {
      return `${sign}${absoluteMs.toFixed(2)}ms`;
    }
    if (absoluteMs < 100) {
      return `${sign}${absoluteMs.toFixed(1)}ms`;
    }
    return `${sign}${Math.round(absoluteMs)}ms`;
  }

  if (absoluteMs < 60000) {
    // Seconds
    const seconds = absoluteMs / 1000;
    if (seconds < 10) {
      return `${sign}${seconds.toFixed(2)}s`;
    }
    return `${sign}${seconds.toFixed(1)}s`;
  }

  if (absoluteMs < 3600000) {
    // Minutes and seconds
    const minutes = Math.floor(absoluteMs / 60000);
    const seconds = Math.round((absoluteMs % 60000) / 1000);
    if (seconds === 0) {
      return `${sign}${minutes}m`;
    }
    return `${sign}${minutes}m ${seconds}s`;
  }

  // Hours, minutes, seconds
  const hours = Math.floor(absoluteMs / 3600000);
  const minutes = Math.floor((absoluteMs % 3600000) / 60000);
  const seconds = Math.round((absoluteMs % 60000) / 1000);

  if (minutes === 0 && seconds === 0) {
    return `${sign}${hours}h`;
  }
  if (seconds === 0) {
    return `${sign}${hours}h ${minutes}m`;
  }
  return `${sign}${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Format a cell value for display in tables
 * Handles null, undefined, objects, arrays, and long strings
 * @param value - The value to format
 * @param maxLength - Maximum length before truncation (default: 100)
 * @returns Formatted string suitable for display
 */
export function formatCellValue(value: any, maxLength: number = 100): string {
  // Handle null and undefined
  if (value === null) {
    return 'NULL';
  }

  if (value === undefined) {
    return '';
  }

  // Handle boolean
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  // Handle numbers
  if (typeof value === 'number') {
    if (isNaN(value)) {
      return 'NaN';
    }
    if (!isFinite(value)) {
      return value > 0 ? 'Infinity' : '-Infinity';
    }
    // Format large numbers with commas
    if (Math.abs(value) >= 1000 && Number.isInteger(value)) {
      return formatNumber(value);
    }
    return value.toString();
  }

  // Handle Date objects
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return 'Invalid Date';
    }
    return formatDate(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const jsonStr = JSON.stringify(value);
    return truncate(jsonStr, maxLength);
  }

  // Handle objects
  if (typeof value === 'object') {
    try {
      const jsonStr = JSON.stringify(value);
      return truncate(jsonStr, maxLength);
    } catch {
      return '[Object]';
    }
  }

  // Handle strings
  const str = String(value);

  // Replace newlines and tabs for single-line display
  const singleLine = str.replace(/[\r\n]+/g, ' ').replace(/\t/g, ' ');

  return truncate(singleLine, maxLength);
}

/**
 * Truncate text with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (maxLength <= 0) {
    return '';
  }

  if (maxLength <= 3) {
    return text.substring(0, maxLength);
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate a unique ID
 * Uses crypto.randomUUID if available, falls back to timestamp + random
 * @returns A unique identifier string
 */
export function generateId(): string {
  // Try to use crypto.randomUUID (available in modern browsers and Node.js)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: timestamp + random string
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);

  return `${timestamp}-${randomPart}-${randomPart2}`;
}

/**
 * Format a date string or Date object for display
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  if (!date) {
    return '';
  }

  let dateObj: Date;

  if (typeof date === 'string') {
    // Try to parse the date string
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return '';
  }

  // Check for invalid date
  if (isNaN(dateObj.getTime())) {
    return typeof date === 'string' ? date : 'Invalid Date';
  }

  // Check if date has time component (not midnight)
  const hasTime = dateObj.getHours() !== 0 ||
                  dateObj.getMinutes() !== 0 ||
                  dateObj.getSeconds() !== 0;

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (hasTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
  }

  try {
    return dateObj.toLocaleString('en-US', options);
  } catch {
    // Fallback to ISO string
    return dateObj.toISOString();
  }
}

/**
 * Convert snake_case or kebab-case to Title Case
 * @param str - The string to convert
 * @returns Title case string
 */
export function toTitleCase(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Insert space before uppercase letters (for camelCase)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Capitalize first letter of each word
    .replace(/\b\w/g, (char) => char.toUpperCase())
    // Trim extra spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get a human-readable display name for SQL data types
 * @param type - The SQL type string
 * @returns Human-readable type name
 */
export function getSqlTypeDisplay(type: string): string {
  if (!type || typeof type !== 'string') {
    return 'Unknown';
  }

  const normalizedType = type.toUpperCase().trim();

  // Map of SQL types to display names
  const typeMap: Record<string, string> = {
    // Numeric types
    'INT': 'Integer',
    'INTEGER': 'Integer',
    'SMALLINT': 'Small Integer',
    'TINYINT': 'Tiny Integer',
    'MEDIUMINT': 'Medium Integer',
    'BIGINT': 'Big Integer',
    'DECIMAL': 'Decimal',
    'NUMERIC': 'Numeric',
    'FLOAT': 'Float',
    'REAL': 'Real',
    'DOUBLE': 'Double',
    'DOUBLE PRECISION': 'Double Precision',

    // String types
    'CHAR': 'Character',
    'VARCHAR': 'Variable Character',
    'TEXT': 'Text',
    'TINYTEXT': 'Tiny Text',
    'MEDIUMTEXT': 'Medium Text',
    'LONGTEXT': 'Long Text',
    'NCHAR': 'Unicode Character',
    'NVARCHAR': 'Unicode Varchar',
    'NTEXT': 'Unicode Text',

    // Binary types
    'BINARY': 'Binary',
    'VARBINARY': 'Variable Binary',
    'BLOB': 'Binary Large Object',
    'TINYBLOB': 'Tiny Blob',
    'MEDIUMBLOB': 'Medium Blob',
    'LONGBLOB': 'Long Blob',

    // Date/Time types
    'DATE': 'Date',
    'TIME': 'Time',
    'DATETIME': 'DateTime',
    'TIMESTAMP': 'Timestamp',
    'YEAR': 'Year',
    'INTERVAL': 'Interval',

    // Boolean
    'BOOLEAN': 'Boolean',
    'BOOL': 'Boolean',
    'BIT': 'Bit',

    // JSON
    'JSON': 'JSON',
    'JSONB': 'JSON Binary',

    // UUID
    'UUID': 'UUID',
    'UNIQUEIDENTIFIER': 'Unique Identifier',

    // Other
    'ENUM': 'Enumeration',
    'SET': 'Set',
    'ARRAY': 'Array',
    'XML': 'XML',
    'MONEY': 'Money',
    'SMALLMONEY': 'Small Money',
    'SERIAL': 'Serial',
    'BIGSERIAL': 'Big Serial',
    'SMALLSERIAL': 'Small Serial',
  };

  // Check for exact match
  if (typeMap[normalizedType]) {
    return typeMap[normalizedType];
  }

  // Check for type with parameters (e.g., VARCHAR(255))
  const baseType = (normalizedType.split('(')[0] || '').trim();
  if (typeMap[baseType]) {
    // Extract parameters if present
    const paramMatch = normalizedType.match(/\(([^)]+)\)/);
    if (paramMatch) {
      return `${typeMap[baseType]}(${paramMatch[1]})`;
    }
    return typeMap[baseType];
  }

  // Return the original type in title case as fallback
  return toTitleCase(type.toLowerCase());
}
