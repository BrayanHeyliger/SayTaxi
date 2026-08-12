import type { ParcelOrder } from "@/components/ParcelTracking";

export type ParcelZone = 'local' | 'intercity';

export interface ParcelPricingInput {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  packageType: 'small' | 'medium' | 'large';
  weight: number;
  loyaltyEligible?: boolean;
}

export interface ParcelPricingResult {
  basePrice: number;
  distanceKm: number;
  multiplier: number;
  zone: ParcelZone;
  price: number;
  discountLabel: string;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function calculateParcelPricing(input: ParcelPricingInput): ParcelPricingResult {
  const distanceKm = haversineKm(
    { lat: input.pickupLat, lng: input.pickupLng },
    { lat: input.dropoffLat, lng: input.dropoffLng }
  );

  const baseByType: Record<string, number> = { small: 3.5, medium: 5.5, large: 8.5 };
  const basePrice = baseByType[input.packageType] || 3.5;
  const zone: ParcelZone = distanceKm <= 15 ? 'local' : 'intercity';
  const multiplier = zone === 'intercity' ? 1.6 : 1.0;
  const weightMultiplier = input.weight > 3 ? 1.15 : 1;
  const loyaltyDiscount = input.loyaltyEligible ? 0.15 : 0;
  const price = Number((basePrice * multiplier * weightMultiplier * (1 - loyaltyDiscount)).toFixed(2));

  return {
    basePrice,
    distanceKm: Number(distanceKm.toFixed(1)),
    multiplier,
    zone,
    price,
    discountLabel: loyaltyDiscount > 0 ? 'Descuento lealtad 15%' : 'Sin descuento',
  };
}

export function normalizeParcelOrder(order: Partial<ParcelOrder> & Record<string, unknown>): ParcelOrder & {
  deliveryAddress?: string;
  totalPrice: number;
  basePrice: number;
  distance?: number;
  pricePerKm?: number;
  extraCharges?: number;
  paymentMethod?: string;
  parcelType?: string;
  driverName?: string;
  driverPlate?: string;
} {
  const estimated = typeof order.estimatedPrice === 'string' ? order.estimatedPrice : '$0.00';
  const numericPrice = Number(String(estimated).replace(/[^0-9.-]/g, '')) || 0;

  return {
    id: String(order.id ?? ''),
    trackingCode: String(order.trackingCode ?? ''),
    pickupAddress: String(order.pickupAddress ?? ''),
    pickupLat: Number(order.pickupLat ?? 0),
    pickupLng: Number(order.pickupLng ?? 0),
    dropoffAddress: String(order.dropoffAddress ?? ''),
    dropoffLat: Number(order.dropoffLat ?? 0),
    dropoffLng: Number(order.dropoffLng ?? 0),
    status: (order.status as ParcelOrder['status']) ?? 'pending',
    estimatedPrice: estimated,
    actualPrice: typeof order.actualPrice === 'string' ? order.actualPrice : estimated,
    createdAt: String(order.createdAt ?? new Date().toISOString()),
    acceptedAt: typeof order.acceptedAt === 'string' ? order.acceptedAt : undefined,
    deliveredAt: typeof order.deliveredAt === 'string' ? order.deliveredAt : undefined,
    driver: typeof order.driver === 'object' && order.driver ? (order.driver as ParcelOrder['driver']) : undefined,
    driverLocation: typeof order.driverLocation === 'object' && order.driverLocation ? (order.driverLocation as ParcelOrder['driverLocation']) : undefined,
    deliveryAddress: String(order.dropoffAddress ?? ''),
    totalPrice: numericPrice,
    basePrice: numericPrice,
    distance: 0,
    pricePerKm: 0,
    extraCharges: 0,
    paymentMethod: 'cash',
    parcelType: String(order.packageType ?? 'small'),
    driverName: order.driver && typeof order.driver === 'object' && 'name' in order.driver ? String((order.driver as { name?: string }).name ?? '') : undefined,
    driverPlate: order.driver && typeof order.driver === 'object' && 'plate' in order.driver ? String((order.driver as { plate?: string }).plate ?? '') : undefined,
  };
}
