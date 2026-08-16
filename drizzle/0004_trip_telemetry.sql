CREATE TABLE IF NOT EXISTS `trip_location_samples` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tripId` int NOT NULL,
  `driverId` int NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `accuracyM` decimal(8,2) NOT NULL,
  `headingDeg` decimal(6,2),
  `speedMps` decimal(8,2),
  `capturedAt` timestamp NOT NULL,
  `receivedAt` timestamp NOT NULL,
  CONSTRAINT `trip_location_samples_id` PRIMARY KEY(`id`),
  INDEX `idx_trip_location_samples_trip_captured` (`tripId`, `capturedAt`),
  INDEX `idx_trip_location_samples_driver_captured` (`driverId`, `capturedAt`)
);
