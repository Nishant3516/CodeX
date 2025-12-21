/**
 * Utility for generating random lab IDs using mythological names
 * Used across different components for consistent naming
 */

const MYTHOLOGICAL_WORDS = [
  "ram",
  "vibhishan", 
  "laxman",
  "hanuman",
  "krishna",
  "arjuna",
  "bhima",
  "yudhishthira",
  "draupadi",
  "sita",
  "ravana",
  "bharata",
  "shatrughna",
  "kumbhakarna",
  "valmiki",
  "vyasa",
  "drona",
  "karna",
  "pandavas",
  "kouravas",
];

/**
 * Generates a random lab ID using 2-4 mythological words joined by hyphens
 * @returns A string like "ram-krishna-arjuna"
 */
export function generateRandomLabId(): string {
  const numWords = Math.floor(Math.random() * 3) + 2; // 2 to 4 words
  const selectedWords: string[] = [];
  
  for (let i = 0; i < numWords; i++) {
    const randomIndex = Math.floor(Math.random() * MYTHOLOGICAL_WORDS.length);
    selectedWords.push(MYTHOLOGICAL_WORDS[randomIndex]);
  }
  
  return selectedWords.join("-");
}

/**
 * Generates a random lab ID with a specific number of words
 * @param wordCount Number of words to include (minimum 2, maximum 4)
 * @returns A string like "ram-krishna"
 */
export function generateRandomLabIdWithWordCount(wordCount: number): string {
  const clampedCount = Math.max(2, Math.min(4, wordCount));
  const selectedWords: string[] = [];
  
  for (let i = 0; i < clampedCount; i++) {
    const randomIndex = Math.floor(Math.random() * MYTHOLOGICAL_WORDS.length);
    selectedWords.push(MYTHOLOGICAL_WORDS[randomIndex]);
  }
  
  return selectedWords.join("-");
}

/**
 * Gets all available mythological words for UI display
 * @returns Array of all mythological words
 */
export function getMythologicalWords(): string[] {
  return [...MYTHOLOGICAL_WORDS];
}