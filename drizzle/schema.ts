import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * WhatsApp Taxi SaaS — Complete Database Schema
 * Includes: Users, Clients, Drivers, Vehicles, Trips, Payments, Ratings
 */

// ===== USERS (Base Auth) =====
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "client", "driver"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ===== CLIENTS (Taxi Customers) =====
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  profileImage: text("profileImage"),
  homeAddress: text("homeAddress"),
  workAddress: text("workAddress"),
  preferredPaymentMethod: mysqlEnum("preferredPaymentMethod", ["cash", "card", "paypal", "stripe"]).default("cash"),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }).default("5.00"),
  totalTrips: int("totalTrips").default(0),
  walletBalance: decimal("walletBalance", { precision: 10, scale: 2 }).default("0.00"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  paypalEmail: varchar("paypalEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ===== DRIVERS (Taxi Drivers) =====
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  profileImage: text("profileImage"),
  licenseNumber: varchar("licenseNumber", { length: 50 }).notNull().unique(),
  licenseExpiry: timestamp("licenseExpiry"),
  licenseDocument: text("licenseDocument"),
  insuranceDocument: text("insuranceDocument"),
  status: mysqlEnum("status", ["active", "inactive", "suspended", "pending"]).default("pending"),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }).default("5.00"),
  totalTrips: int("totalTrips").default(0),
  totalEarnings: decimal("totalEarnings", { precision: 12, scale: 2 }).default("0.00"),
  bankAccountHolder: varchar("bankAccountHolder", { length: 100 }),
  bankAccountNumber: varchar("bankAccountNumber", { length: 50 }),
  bankRoutingNumber: varchar("bankRoutingNumber", { length: 20 }),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  paypalEmail: varchar("paypalEmail", { length: 320 }),
  currentLocation: json("currentLocation"), // { lat, lng }
  isOnline: boolean("isOnline").default(false),
  currentTrip: int("currentTrip"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

// ===== VEHICLES (Taxi Fleet) =====
export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  licensePlate: varchar("licensePlate", { length: 20 }).notNull().unique(),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  year: int("year"),
  color: varchar("color", { length: 50 }),
  vin: varchar("vin", { length: 50 }).unique(),
  registrationDocument: text("registrationDocument"),
  insuranceDocument: text("insuranceDocument"),
  inspectionDocument: text("inspectionDocument"),
  seats: int("seats").default(4),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

// ===== TRIPS (Taxi Rides) =====
export const trips = mysqlTable("trips", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  driverId: int("driverId"),
  vehicleId: int("vehicleId"),
  pickupLocation: text("pickupLocation").notNull(),
  pickupLatLng: json("pickupLatLng").notNull(), // { lat, lng }
  dropoffLocation: text("dropoffLocation").notNull(),
  dropoffLatLng: json("dropoffLatLng").notNull(), // { lat, lng }
  distance: decimal("distance", { precision: 8, scale: 2 }), // in km
  duration: int("duration"), // in minutes
  status: mysqlEnum("status", ["requested", "accepted", "in_progress", "completed", "cancelled"]).default("requested"),
  fare: decimal("fare", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "paypal", "stripe"]).default("cash"),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed"]).default("pending"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
  cancellationReason: text("cancellationReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;

// ===== RATINGS (Trip Ratings) =====
export const ratings = mysqlTable("ratings", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull().unique(),
  clientId: int("clientId").notNull(),
  driverId: int("driverId").notNull(),
  clientRating: int("clientRating"), // 1-5 stars
  clientComment: text("clientComment"),
  driverRating: int("driverRating"), // 1-5 stars
  driverComment: text("driverComment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Rating = typeof ratings.$inferSelect;
export type InsertRating = typeof ratings.$inferInsert;

// ===== PAYMENTS (Payment History) =====
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  clientId: int("clientId").notNull(),
  driverId: int("driverId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "paypal", "stripe"]).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  paypalTransactionId: varchar("paypalTransactionId", { length: 255 }),
  commission: decimal("commission", { precision: 10, scale: 2 }).default("0.00"),
  driverEarnings: decimal("driverEarnings", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ===== PRICING RULES (Fare Configuration) =====
export const pricingRules = mysqlTable("pricingRules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  baseFare: decimal("baseFare", { precision: 10, scale: 2 }).notNull(),
  costPerKm: decimal("costPerKm", { precision: 10, scale: 2 }).notNull(),
  costPerMinute: decimal("costPerMinute", { precision: 10, scale: 2 }).notNull(),
  minimumFare: decimal("minimumFare", { precision: 10, scale: 2 }).notNull(),
  nightSurgePercentage: decimal("nightSurgePercentage", { precision: 5, scale: 2 }).default("0.00"),
  peakHourSurgePercentage: decimal("peakHourSurgePercentage", { precision: 5, scale: 2 }).default("0.00"),
  holidaySurgePercentage: decimal("holidaySurgePercentage", { precision: 5, scale: 2 }).default("0.00"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = typeof pricingRules.$inferInsert;

// ===== SUBSCRIPTIONS (SaaS Plans) =====
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  planName: mysqlEnum("planName", ["basic", "pro", "enterprise"]).notNull(),
  monthlyPrice: decimal("monthlyPrice", { precision: 10, scale: 2 }).notNull(),
  maxTripsPerMonth: int("maxTripsPerMonth"),
  maxDrivers: int("maxDrivers"),
  features: json("features"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ===== COMPANY SUBSCRIPTIONS (Tenant Subscriptions) =====
export const companySubscriptions = mysqlTable("companySubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  subscriptionId: int("subscriptionId").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  paypalSubscriptionId: varchar("paypalSubscriptionId", { length: 255 }),
  status: mysqlEnum("status", ["active", "cancelled", "suspended", "expired"]).default("active"),
  startDate: timestamp("startDate").defaultNow().notNull(),
  endDate: timestamp("endDate"),
  nextBillingDate: timestamp("nextBillingDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompanySubscription = typeof companySubscriptions.$inferSelect;
export type InsertCompanySubscription = typeof companySubscriptions.$inferInsert;

// ===== SITE SETTINGS (Admin Editor Config) =====
export const siteSettings = mysqlTable("siteSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;

// ===== CONTACT MESSAGES (Landing Page Form) =====
export const contactMessages = mysqlTable("contactMessages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 200 }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["unread", "read", "replied", "archived"]).default("unread").notNull(),
  adminNotes: text("adminNotes"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: varchar("userAgent", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = typeof contactMessages.$inferInsert;

// ===== WHATSAPP (Conversations + Logs) =====
export const whatsappConversations = mysqlTable("whatsapp_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull().unique(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  messages: json("messages").notNull(),
  status: mysqlEnum("status", ["active", "awaiting_route", "awaiting_confirmation", "completed", "cancelled"])
    .default("active")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsAppConversationRecord = typeof whatsappConversations.$inferSelect;
export type InsertWhatsAppConversationRecord = typeof whatsappConversations.$inferInsert;

export const whatsappLogs = mysqlTable("whatsapp_logs", {
  id: int("id").autoincrement().primaryKey(),
  event: varchar("event", { length: 80 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  data: json("data").notNull(),
});

export type WhatsAppLog = typeof whatsappLogs.$inferSelect;
export type InsertWhatsAppLog = typeof whatsappLogs.$inferInsert;
