/**
 * Menu Engine - Menu and Category Management
 * Handles menu item organization, pricing, and availability
 */

import type { MenuItem, MenuCategory } from "../../drizzle/schema";

/**
 * Get default category for cafeteria
 * Returns first category if no default is set
 */
export function getDefaultCategory(
  categories: MenuCategory[]
): MenuCategory | undefined {
  return categories[0];
}

/**
 * Organize menu items by category
 */
export function organizeItemsByCategory(
  items: MenuItem[],
  categories: MenuCategory[]
): Record<string, MenuItem[]> {
  const organized: Record<string, MenuItem[]> = {};

  categories.forEach((category) => {
    organized[category.id] = items
      .filter((item) => item.categoryId === category.id && item.available);
  });

  return organized;
}

/**
 * Calculate total menu value
 */
export function calculateMenuValue(items: MenuItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
}

/**
 * Get available items count
 */
export function getAvailableItemsCount(items: MenuItem[]): number {
  return items.filter((item) => item.available).length;
}

/**
 * Get average item price
 */
export function getAverageItemPrice(items: MenuItem[]): number {
  if (items.length === 0) return 0;
  const totalPrice = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  return totalPrice / items.length;
}

/**
 * Get most expensive item
 */
export function getMostExpensiveItem(items: MenuItem[]): MenuItem | undefined {
  if (items.length === 0) return undefined;
  return items.reduce((max, item) =>
    (Number(item.price) || 0) > (Number(max.price) || 0) ? item : max
  );
}

/**
 * Get cheapest item
 */
export function getCheapestItem(items: MenuItem[]): MenuItem | undefined {
  if (items.length === 0) return undefined;
  return items.reduce((min, item) =>
    (Number(item.price) || 0) < (Number(min.price) || 0) ? item : min
  );
}

/**
 * Filter items by price range
 */
export function filterByPriceRange(
  items: MenuItem[],
  minPrice: number,
  maxPrice: number
): MenuItem[] {
  return items.filter((item) => {
    const price = Number(item.price) || 0;
    return price >= minPrice && price <= maxPrice;
  });
}

/**
 * Search items by name or description
 */
export function searchItems(items: MenuItem[], query: string): MenuItem[] {
  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(lowerQuery) ||
      (item.description && item.description.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Sort items by price
 */
export function sortByPrice(items: MenuItem[], ascending = true): MenuItem[] {
  return [...items].sort((a, b) => {
    const priceA = Number(a.price) || 0;
    const priceB = Number(b.price) || 0;
    return ascending ? priceA - priceB : priceB - priceA;
  });
}

/**
 * Sort items by name
 */
export function sortByName(items: MenuItem[], ascending = true): MenuItem[] {
  return [...items].sort((a, b) => {
    if (ascending) {
      return a.name.localeCompare(b.name);
    }
    return b.name.localeCompare(a.name);
  });
}

/**
 * Validate menu item data
 */
export function validateMenuItem(
  name: string,
  price: number,
  categoryId: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push("Item name is required");
  }

  if (price <= 0) {
    errors.push("Price must be greater than 0");
  }

  if (!categoryId || categoryId.trim().length === 0) {
    errors.push("Category is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate menu category data
 */
export function validateMenuCategory(
  name: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push("Category name is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get category statistics
 */
export function getCategoryStats(
  items: MenuItem[],
  category: MenuCategory
): {
  categoryId: string;
  categoryName: string;
  itemCount: number;
  availableCount: number;
  totalValue: number;
  averagePrice: number;
} {
  const categoryItems = items.filter((item) => item.categoryId === category.id);
  const availableItems = categoryItems.filter((item) => item.available);
  const totalValue = categoryItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const averagePrice = categoryItems.length > 0 ? totalValue / categoryItems.length : 0;

  return {
    categoryId: category.id,
    categoryName: category.name,
    itemCount: categoryItems.length,
    availableCount: availableItems.length,
    totalValue,
    averagePrice,
  };
}

/**
 * Get menu summary for cafeteria
 */
export function getMenuSummary(
  items: MenuItem[],
  categories: MenuCategory[]
): {
  totalCategories: number;
  totalItems: number;
  availableItems: number;
  totalMenuValue: number;
  averageItemPrice: number;
  categoryStats: ReturnType<typeof getCategoryStats>[];
} {
  const availableItems = items.filter((item) => item.available);
  const totalMenuValue = calculateMenuValue(items);
  const averageItemPrice = getAverageItemPrice(items);
  const categoryStats = categories.map((cat) => getCategoryStats(items, cat));

  return {
    totalCategories: categories.length,
    totalItems: items.length,
    availableItems: availableItems.length,
    totalMenuValue,
    averageItemPrice,
    categoryStats,
  };
}
