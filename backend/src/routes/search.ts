import { Router } from 'express';
import {
  searchEvents,
  getSearchSuggestions,
  getPopularSearches,
  getUpcomingEvents,
  getSimilarEvents
} from '../controllers/searchController';

const router = Router();

// Public search routes
router.get('/', searchEvents);
router.get('/suggestions', getSearchSuggestions);
router.get('/popular', getPopularSearches);
router.get('/upcoming', getUpcomingEvents);
router.get('/similar/:eventId', getSimilarEvents);

export default router;
