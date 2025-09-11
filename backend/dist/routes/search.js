"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const searchController_1 = require("../controllers/searchController");
const router = (0, express_1.Router)();
// Public search routes
router.get('/', searchController_1.searchEvents);
router.get('/suggestions', searchController_1.getSearchSuggestions);
router.get('/popular', searchController_1.getPopularSearches);
router.get('/upcoming', searchController_1.getUpcomingEvents);
router.get('/similar/:eventId', searchController_1.getSimilarEvents);
exports.default = router;
