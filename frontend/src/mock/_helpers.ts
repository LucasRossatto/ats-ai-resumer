// Shared helpers for boilerplate mock data.
// Delete this entire `src/mock/` folder once the backend is connected.

export const minutesAgo = (m: number): string =>
  new Date(Date.now() - m * 60 * 1000).toISOString();
export const hoursAgo = (h: number): string => minutesAgo(h * 60);
export const daysAgo = (d: number): string => hoursAgo(d * 24);

export const mockDelay = (ms = 450): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
