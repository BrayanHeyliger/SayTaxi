ALTER TABLE `users`
  MODIFY COLUMN `role` enum('user','admin','client','driver','fleet','dispatcher') NOT NULL DEFAULT 'user';

ALTER TABLE `users`
  ADD COLUMN `passwordHash` varchar(255),
  ADD COLUMN `isActive` boolean NOT NULL DEFAULT true;

ALTER TABLE `drivers`
  ADD COLUMN `permissions` json;

CREATE TABLE `dispatchers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `name` varchar(200) NOT NULL,
  `email` varchar(320) NOT NULL,
  `phone` varchar(20),
  `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `permissions` json NOT NULL,
  `assignedZone` varchar(200),
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `dispatchers_id` PRIMARY KEY(`id`),
  CONSTRAINT `dispatchers_userId_unique` UNIQUE(`userId`),
  CONSTRAINT `dispatchers_email_unique` UNIQUE(`email`)
);

ALTER TABLE `trips`
  ADD COLUMN `source` enum('client','admin_manual','dispatcher') NOT NULL DEFAULT 'client',
  ADD COLUMN `internalNotes` text,
  ADD COLUMN `scheduledAt` timestamp NULL;

CREATE TABLE `billingEvents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `stripeEventId` varchar(255) NOT NULL,
  `userId` int,
  `eventType` varchar(120) NOT NULL,
  `status` varchar(80) NOT NULL,
  `stripeSubscriptionId` varchar(255),
  `payload` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `billingEvents_id` PRIMARY KEY(`id`),
  CONSTRAINT `billingEvents_stripeEventId_unique` UNIQUE(`stripeEventId`)
);

CREATE TABLE `userSubscriptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `planId` enum('basic','pro','enterprise') NOT NULL,
  `stripeCustomerId` varchar(255),
  `stripeSubscriptionId` varchar(255),
  `status` varchar(80) NOT NULL,
  `currentPeriodEnd` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `userSubscriptions_id` PRIMARY KEY(`id`),
  CONSTRAINT `userSubscriptions_userId_unique` UNIQUE(`userId`),
  CONSTRAINT `userSubscriptions_stripeSubscriptionId_unique` UNIQUE(`stripeSubscriptionId`)
);
