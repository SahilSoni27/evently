"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// GET /api/events
router.get('/', (req, res) => {
    res.status(501).json({
        status: 'error',
        message: 'Get events endpoint not implemented yet'
    });
});
// GET /api/events/:id
router.get('/:id', (req, res) => {
    res.status(501).json({
        status: 'error',
        message: 'Get event by ID endpoint not implemented yet'
    });
});
exports.default = router;
