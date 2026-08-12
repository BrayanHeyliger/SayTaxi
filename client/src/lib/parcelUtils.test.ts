import { describe, it, expect } from 'vitest';
import { calculateParcelPricing, normalizeParcelOrder } from './parcelUtils';

describe('calculateParcelPricing', () => {
  it('applies local zone pricing for short distances', () => {
    const result = calculateParcelPricing({
      pickupLat: 19.4326,
      pickupLng: -99.1332,
      dropoffLat: 19.4426,
      dropoffLng: -99.1432,
      packageType: 'small',
      weight: 1,
      loyaltyEligible: false,
    });

    expect(result.zone).toBe('local');
    expect(result.price).toBeGreaterThan(0);
    expect(result.discountLabel).toBe('Sin descuento');
  });

  it('applies an intercity multiplier and loyalty discount when eligible', () => {
    const result = calculateParcelPricing({
      pickupLat: 19.4326,
      pickupLng: -99.1332,
      dropoffLat: 20.6747,
      dropoffLng: -103.3440,
      packageType: 'medium',
      weight: 4,
      loyaltyEligible: true,
    });

    expect(result.zone).toBe('intercity');
    expect(result.price).toBeGreaterThan(result.basePrice);
    expect(result.discountLabel).toContain('15%');
  });
});

describe('normalizeParcelOrder', () => {
  it('maps backend parcel rows to the UI shape expected by the dashboard', () => {
    const normalized = normalizeParcelOrder({
      id: 'parcel-1',
      trackingCode: 'ABC12345',
      pickupAddress: 'Calle 1',
      dropoffAddress: 'Calle 2',
      estimatedPrice: '$14.50',
      createdAt: '2025-01-01T00:00:00.000Z',
      status: 'pending',
    });

    expect(normalized.deliveryAddress).toBe('Calle 2');
    expect(normalized.totalPrice).toBe(14.5);
    expect(normalized.status).toBe('pending');
  });
});
