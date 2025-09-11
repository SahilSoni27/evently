"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// User registration validation
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please provide a valid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
    name: zod_1.z.string().min(1, 'Name is required').optional(),
    role: zod_1.z.enum(['USER', 'ADMIN']).default('USER').optional()
});
// User login validation
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please provide a valid email address'),
    password: zod_1.z.string().min(1, 'Password is required')
});
