import { User } from '../types';

/**
 * Calculates simulated stats based on the professional's creation date.
 * Growth: 1 client every 2 days, 5 visits per day.
 */
export const getSimulatedStats = (user: User) => {
  if (!user.createdAt) return { views: 0, clicks: 0 };

  const createdAt = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Base stats from the user document if they exist
  const baseViews = user.profesionalInfo?.profileViews || 0;
  const baseClicks = user.profesionalInfo?.whatsappClicks || 0;

  return {
    views: baseViews,
    clicks: baseClicks,
    daysActive: diffDays
  };
};
