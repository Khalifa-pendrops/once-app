const PREFIXES = [
  'GHOST', 'PHANTOM', 'SHADOW', 'RAZOR', 'VOID', 
  'ZENITH', 'VECTOR', 'ORACLE', 'ECHO', 'ONYX',
  'NEON', 'TITAN', 'CYPHER', 'PRISM', 'WRAITH',
  'NOVA', 'QUARTZ', 'COBALT', 'APEX', 'HELIX'
];

const SUFFIXES = [
  'STRIKER', 'PULSE', 'CORE', 'BLADE', 'REACH', 
  'DRIVE', 'NODE', 'SIGHT', 'LINK', 'WIRE',
  'SHELL', 'GRID', 'FLOW', 'NODE', 'VALLEY',
  'PEAK', 'ZERO', 'SHIFT', 'BREACH', 'SYNC'
];

/**
 * Generates a consistent, anonymous codename for a given identity string.
 * Uses a simple numeric hash of the input to select from the dictionaries.
 */
export const getMaskedIdentity = (id: string): string => {
  if (!id) return 'UNKNOWN // NODE';

  // Simple string hashing
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  const absHash = Math.abs(hash);
  const prefix = PREFIXES[absHash % PREFIXES.length];
  const suffix = SUFFIXES[(absHash >> 8) % SUFFIXES.length];
  
  // Add a 3-char hex suffix from the end of the id if possible, otherwise use hash
  const hexSuffix = id.length > 3 
    ? id.substring(id.length - 3).toUpperCase() 
    : absHash.toString(16).substring(0, 3).toUpperCase();

  return `${prefix} // ${suffix}-${hexSuffix}`;
};
