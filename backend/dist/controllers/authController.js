"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const jwt_1 = require("../utils/jwt");
const errorHandler_1 = require("../middleware/errorHandler");
const types_1 = require("../types");
// Register a new user
exports.register = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password, name, role } = req.body;
    // Check if user already exists
    const existingUser = await prisma_1.default.user.findUnique({
        where: { email }
    });
    if (existingUser) {
        throw (0, errorHandler_1.createError)('User with this email already exists', 409);
    }
    // Hash password with increased security
    const saltRounds = 12;
    const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
    // Create user in database
    const user = await prisma_1.default.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            role: role || types_1.UserRole.USER
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true
        }
    });
    // Generate JWT token
    const token = (0, jwt_1.generateToken)({
        userId: user.id,
        email: user.email,
        role: user.role
    });
    res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: {
            user,
            token
        }
    });
});
// Login user
exports.login = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    // Find user in database
    const user = await prisma_1.default.user.findUnique({
        where: { email }
    });
    if (!user) {
        throw (0, errorHandler_1.createError)('Invalid email or password', 401);
    }
    // Verify password
    const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw (0, errorHandler_1.createError)('Invalid email or password', 401);
    }
    // Generate JWT token
    const token = (0, jwt_1.generateToken)({
        userId: user.id,
        email: user.email,
        role: user.role
    });
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
            user: userWithoutPassword,
            token
        }
    });
});
// Get current user profile (protected route)
exports.getProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // User info is already available from auth middleware
    const userId = req.user?.id;
    if (!userId) {
        throw (0, errorHandler_1.createError)('User not authenticated', 401);
    }
    // Get full user details from database
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true
        }
    });
    if (!user) {
        throw (0, errorHandler_1.createError)('User not found', 404);
    }
    res.status(200).json({
        status: 'success',
        data: { user }
    });
});
