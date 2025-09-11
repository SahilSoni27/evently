"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingStatus = exports.EventCategory = exports.UserRole = void 0;
// Define enums manually (these should match Prisma schema)
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var EventCategory;
(function (EventCategory) {
    EventCategory["CONFERENCE"] = "CONFERENCE";
    EventCategory["WORKSHOP"] = "WORKSHOP";
    EventCategory["NETWORKING"] = "NETWORKING";
    EventCategory["SOCIAL"] = "SOCIAL";
    EventCategory["BUSINESS"] = "BUSINESS";
    EventCategory["ENTERTAINMENT"] = "ENTERTAINMENT";
    EventCategory["SPORTS"] = "SPORTS";
    EventCategory["EDUCATION"] = "EDUCATION";
    EventCategory["CULTURAL"] = "CULTURAL";
    EventCategory["OTHER"] = "OTHER";
})(EventCategory || (exports.EventCategory = EventCategory = {}));
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["CONFIRMED"] = "CONFIRMED";
    BookingStatus["CANCELLED"] = "CANCELLED";
    BookingStatus["PENDING"] = "PENDING";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
