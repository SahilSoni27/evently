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
exports.register = (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { email, password, name, role } = req.body;
    // Check if user already exists
    const existingUser = await prisma_1.default.user.findUnique({
        where: { email }
    });
    if (existingUser) {
        throw (0, errorHandler_1.createConflictError)('User with this email already exists');
    }
    // Hash password
    const saltRounds = 12; // Increased for better security
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
exports.login = (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { email, password } = req.body;
    // Find user in database
    const user = await prisma_1.default.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            password: true
        }
    });
    if (!user) {
        throw (0, errorHandler_1.createUnauthorizedError)('Invalid email or password');
    }
    // Verify password
    const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw (0, errorHandler_1.createUnauthorizedError)('Invalid email or password');
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
// Get current user profile
exports.getProfile = (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.userId;
    if (!userId) {
        throw (0, errorHandler_1.createUnauthorizedError)('User not authenticated');
    }
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true
        }
    });
    if (!user) {
        throw (0, errorHandler_1.createUnauthorizedError)('User not found');
    }
    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});
name: true,
    role;
true,
    createdAt;
true;
;
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
try { }
catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error during registration'
    });
}
;
// Login user
const login = async (req, res) => {
    try {
        // Validate input data
        const validationResult = loginSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: validationResult.error.issues
            });
        }
        const { email, password } = validationResult.data;
        // Find user in database
        const user = await prisma_1.default.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                password: true
            }
        });
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password'
            });
        }
        // Verify password
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password'
            });
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
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error during login'
        });
    }
};
exports.login = login;
// Get current user profile (protected route)
const getProfile = async (req, res) => {
    try {
        // User info is already available from auth middleware
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                status: 'error',
                message: 'User not authenticated'
            });
        }
        // Get full user details from database
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: { user }
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getProfile = getProfile;
