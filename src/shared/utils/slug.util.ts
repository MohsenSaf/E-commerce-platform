export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-') // spaces and underscores → dash
    .replace(/[^\w-]+/g, '') // remove special chars
    .replace(/--+/g, '-') // multiple dashes → single
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

// "Men's Shoes & Boots" → "mens-shoes-boots"
// "Men  Shoes"          → "men-shoes"
