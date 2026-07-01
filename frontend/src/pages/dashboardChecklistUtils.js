export function getAdjacentCategoryIndex(currentIndex, direction, total) {
  if (total <= 0) return 0;

  const nextIndex = currentIndex + direction;

  if (nextIndex < 0) {
    return total - 1;
  }

  if (nextIndex >= total) {
    return 0;
  }

  return nextIndex;
}
