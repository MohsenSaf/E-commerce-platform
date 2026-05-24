export const CacheKeys = {
  // products
  PRODUCTS: 'products',
  PRODUCT: (id: string) => `product:${id}`,
  PRODUCT_SLUG: (slug: string) => `product:slug:${slug}`,
  PRODUCTS_FEATURED: 'products:featured',

  // categories
  CATEGORIES: 'categories',
  CATEGORY: (id: string) => `category:${id}`,
  CATEGORY_SLUG: (slug: string) => `category:slug:${slug}`,
} as const;

// TTL constants in seconds
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 60 * 5, // 5 minutes
  LONG: 60 * 60, // 1 hour
  DAY: 60 * 60 * 24, // 24 hours
} as const;
