"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// POST /api/bookings
router.post('/', (req, res) => {
    res.status(501).json({
        status: 'error',
        message: 'Create booking endpoint not implemented yet'
    });
});
// GET /api/bookings/user/:userId
router.get('/user/:userId', (req, res) => {
    res.status(501).json({
        status: 'error',
        message: 'Get user bookings endpoint not implemented yet'
    });
});
// DELETE /api/bookings/:id
router.delete('/:id', (req, res) => {
    res.status(501).json({
        status: 'error',
        message: 'Cancel booking endpoint not implemented yet'
    });
});
exports.default = router;
