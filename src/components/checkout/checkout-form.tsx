'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LocationMap from '@/src/components/map/location-map';
import { generateMapLink, geocodeAddress } from '@/src/services/map-provider';

export type CartItem = { productId: string; name?: string; unitPrice?: number; quantity: number };
export type CartShape = { items: CartItem[] } | null;
type PaymentMethod = 'COD' | 'ONLINE' | 'MANUAL';

type CheckoutSettings = {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  codEnabled: boolean;
  onlinePaymentEnabled: boolean;
  manualPaymentEnabled?: boolean;
  manualPaymentUpiId?: string | null;
  manualPaymentQrUrl?: string | null;
  manualPaymentBankDetails?: string | null;
};

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string | null;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => Promise<void>;
  prefill: Record<string, string>;
  theme: { color: string };
};

type RazorpayConstructor = new (options: RazorpayOptions) => { open: () => void };

type WindowWithRazorpay = Window & {
  Razorpay?: RazorpayConstructor;
};

type NewAddressForm = {
  label: string;
  fullName: string;
  mobile: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
};

const defaultNewAddress: NewAddressForm = {
  label: '',
  fullName: '',
  mobile: '',
  addressLine1: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  latitude: null,
  longitude: null,
  googleMapsUrl: null,
};

export default function CheckoutForm({ settings, reservationBookingNumber = null }: { settings: CheckoutSettings; reservationBookingNumber?: string | null }): React.ReactElement {
  const enabledPaymentMethods = [
    settings.codEnabled ? 'COD' : null,
    settings.onlinePaymentEnabled || settings.manualPaymentEnabled ? 'ONLINE' : null,
  ].filter((method): method is PaymentMethod => Boolean(method));

  const [cart, setCart] = useState<CartShape | undefined>(undefined);
  const [addresses, setAddresses] = useState<Array<Record<string, unknown>>>([]);
  const [fulfillment, setFulfillment] = useState<'DELIVERY' | 'PICKUP'>(settings.deliveryEnabled ? 'DELIVERY' : 'PICKUP');
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    settings.onlinePaymentEnabled ? 'ONLINE' : settings.manualPaymentEnabled ? 'ONLINE' : 'COD',
  );
  const [couponCode, setCouponCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState<NewAddressForm>(defaultNewAddress);
  const [newAddressSearch, setNewAddressSearch] = useState('');
  const [savingNewAddress, setSavingNewAddress] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [restaurantSettings, setRestaurantSettings] = useState<Record<string, unknown> | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [manualProofFile, setManualProofFile] = useState<File | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [manualProofPreview, setManualProofPreview] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!manualProofFile) {
      setManualProofPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(manualProofFile);
    setManualProofPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [manualProofFile]);

  function selectManualProof(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file for payment proof.');
      return;
    }
    setManualProofFile(file);
    setUploadProgress(0);
    setUploadStatus('idle');
    setError(null);
  }

  function removeManualProof() {
    setManualProofFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
  }

  useEffect(() => {
    fetch('/api/cart')
      .then((r) => r.json())
      .then((j) => setCart(j.success ? j.data : null))
      .catch(() => setCart(null));
    fetch('/api/account/addresses')
      .then((r) => r.json())
      .then((j) => {
        const addrs = j.data || [];
        setAddresses(addrs);
        if (addrs.length) {
          const id = addrs[0].id || addrs[0]._id?.$oid || addrs[0]._id || null;
          setSelectedAddress(id);
        }
      })
      .catch(() => setAddresses([]));
    fetch('/api/admin/settings/restaurant')
      .then((r) => r.json())
      .then((j) => setRestaurantSettings(j.success ? j.data : null))
      .catch(() => setRestaurantSettings(null));
  }, []);

  async function geocodeAndSetNewAddress(searchText?: string) {
    const query = (searchText || newAddressSearch || `${newAddress.addressLine1} ${newAddress.city} ${newAddress.state} ${newAddress.postalCode} ${newAddress.country}`).trim();
    if (!query) {
      setError('Enter an address or choose a location on the map.');
      return;
    }

    try {
      const result = await geocodeAddress(query);
      if (!result) {
        throw new Error('Could not locate that address. Please choose a point on the map instead.');
      }

      const next = {
        ...newAddress,
        addressLine1: result.formattedAddress || newAddress.addressLine1 || query,
        latitude: result.latitude,
        longitude: result.longitude,
        googleMapsUrl: generateMapLink(result.latitude, result.longitude, newAddress.label || newAddress.fullName || 'Delivery address'),
      };
      setNewAddress(next);
      setNewAddressSearch('');
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Address lookup failed';
      setError(message);
    }
  }

  async function useMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Browser geolocation is unavailable on this device.');
      return;
    }

    setGeoLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setNewAddress((current) => ({
          ...current,
          latitude: nextPoint.latitude,
          longitude: nextPoint.longitude,
          googleMapsUrl: generateMapLink(nextPoint.latitude, nextPoint.longitude, current.label || current.fullName || 'Delivery address'),
        }));
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setError('Location access was denied. Please select a location manually on the map.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function saveNewAddress() {
    if (!newAddress.fullName || !newAddress.mobile || !newAddress.addressLine1 || !newAddress.city || !newAddress.state || !newAddress.postalCode || !newAddress.country) {
      setError('Please complete all delivery address details.');
      return;
    }

    let latitude = typeof newAddress.latitude === 'number' ? newAddress.latitude : undefined;
    let longitude = typeof newAddress.longitude === 'number' ? newAddress.longitude : undefined;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      const query = `${newAddress.addressLine1}, ${newAddress.city}, ${newAddress.state}, ${newAddress.postalCode}, ${newAddress.country}`;
      const found = await geocodeAddress(query);
      if (!found) {
        setError('Please select a valid location on the map or add a complete address.');
        return;
      }
      latitude = found.latitude;
      longitude = found.longitude;
    }

    const payload = {
      ...newAddress,
      latitude,
      longitude,
      googleMapsUrl: generateMapLink(latitude, longitude, newAddress.label || newAddress.fullName || 'Delivery address'),
    };

    setSavingNewAddress(true);
    setError(null);
    try {
      const res = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Failed to save address');

      const createdId = json?.data?.id || json?.data?._id?.$oid || json?.data?._id || null;
      if (!createdId) throw new Error('Address saved but no ID returned');

      const addressList = await fetch('/api/account/addresses').then((r) => r.json());
      const refreshed = addressList.data || [];
      setAddresses(refreshed);
      setSelectedAddress(String(createdId));
      setShowNewAddressForm(false);
      setNewAddress(defaultNewAddress);
      setFulfillment('DELIVERY');
      setMessage('New delivery address added successfully.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to save address';
      setError(message);
    } finally {
      setSavingNewAddress(false);
    }
  }

  async function placeOrder() {
    setLoading(true);
    setMessage(null);
    try {
      const shouldUseManualFlow = paymentMethod === 'ONLINE' && !settings.onlinePaymentEnabled && settings.manualPaymentEnabled;
      const effectivePaymentMethod = shouldUseManualFlow ? 'MANUAL' : paymentMethod;

      if (effectivePaymentMethod === 'MANUAL') {
        if (!transactionId.trim()) {
          throw new Error('Please enter the transaction ID from your payment confirmation.');
        }
        if (!manualProofFile) {
          throw new Error('Please upload a payment proof before placing the order.');
        }
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          fulfillmentType: fulfillment,
          addressId: fulfillment === 'DELIVERY' ? selectedAddress : null,
          paymentMethod: effectivePaymentMethod,
          reservationBookingNumber,
          transactionId: effectivePaymentMethod === 'MANUAL' ? transactionId.trim() : null,
          couponCode: couponCode.trim() || null,
          walletAmount: walletAmount ? Number(walletAmount) : 0,
          referralCode: referralCode.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const errorMessage = json?.error || `Failed to place order (${res.status})`;
        throw new Error(errorMessage);
      }

      if (effectivePaymentMethod === 'MANUAL') {
        if (!json?.data?.orderNumber) {
          throw new Error('Order was created but no order number was returned.');
        }

        const formData = new FormData();
        formData.append('proof', manualProofFile as File);
        formData.append('transactionId', transactionId.trim());

        setUploadStatus('uploading');
        setUploadProgress(0);

        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(percent);
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              setUploadProgress(100);
              setUploadStatus('success');
              resolve();
            } else {
              try {
                const resp = JSON.parse(xhr.responseText);
                reject(new Error(resp?.error || 'Payment proof upload failed'));
              } catch {
                reject(new Error('Payment proof upload failed'));
              }
            }
          });
          xhr.addEventListener('error', () => {
            setUploadStatus('error');
            reject(new Error('Payment proof upload failed'));
          });
          xhr.open('POST', `/api/account/orders/${json.data.orderNumber}/payment-proof`);
          xhr.send(formData);
        }).catch((err) => {
          setUploadStatus('error');
          throw err;
        });

        router.push(`/account/orders/${json.data.orderNumber}`);
        return;
      }

      // If server returned Razorpay payload, invoke Razorpay checkout flow
      if (json?.data?.razorpay && paymentMethod === 'ONLINE') {
        const rp = json.data.razorpay;
        const keyId = rp.keyId || (rp.order && rp.order.key_id) || null;
        const orderPayload = rp.order || rp;
        // Load Razorpay SDK
        await loadRazorpaySDK();

        const options: RazorpayOptions = {
          key: keyId,
          amount: orderPayload.amount || Math.round((json.data.totalAmount || 0) * 100),
          currency: orderPayload.currency || 'INR',
          name: 'Pizza Vizza',
          description: `Order ${json.data.orderNumber}`,
          order_id: orderPayload.id,
          handler: async function (response) {
            try {
              const verifyRes = await fetch('/api/checkout/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderNumber: json.data.orderNumber,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });
              const verifyJson = await verifyRes.json().catch(() => null);
              if (!verifyRes.ok) {
                setError(verifyJson?.error || 'Payment verification failed');
                return;
              }
              router.push(`/account/orders/${json.data.orderNumber}`);
            } catch {
              setError('Payment verification failed');
            }
          },
          prefill: {},
          theme: { color: '#F59E0B' },
        };

        const Razorpay = (window as WindowWithRazorpay).Razorpay;
        if (!Razorpay) throw new Error('Razorpay SDK did not load');
        const rzp = new Razorpay(options);
        rzp.open();
        return;
      }

      if (!json?.data?.orderNumber) {
        throw new Error('Order was created but no order number was returned.');
      }
      router.push(`/account/orders/${json.data.orderNumber}`);
      return;
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      console.error('Checkout failed', err);
      setError(m || 'Error');
      setMessage(null);
    } finally {
      setLoading(false);
    }
  }

  function loadRazorpaySDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('Not in browser'));
      if ((window as WindowWithRazorpay).Razorpay) return resolve();
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.head.appendChild(s);
    });
  }

  if (cart === undefined) return <div>Loading cart…</div>;
  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <h2 className="text-3xl font-semibold">Checkout</h2>
        <p className="mt-4 text-stone-600">Your cart is empty. Add items before placing an order.</p>
      </div>
    );
  }

  const subtotal = (cart.items || []).reduce((s: number, it: CartItem) => s + ((it.unitPrice || 0) * it.quantity), 0);
  const totalItems = (cart?.items || []).reduce((count: number, item: CartItem) => count + item.quantity, 0);

  function toFiniteNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  }

  const selectedAddressRecord =
    fulfillment === 'DELIVERY' && selectedAddress
      ? addresses.find((address) => String(address.id || address._id || '') === String(selectedAddress)) || null
      : null;

  const restaurantLatitude = toFiniteNumber(restaurantSettings?.latitude);
  const restaurantLongitude = toFiniteNumber(restaurantSettings?.longitude);
  const selectedAddressLatitude = toFiniteNumber(selectedAddressRecord?.latitude);
  const selectedAddressLongitude = toFiniteNumber(selectedAddressRecord?.longitude);
  const deliveryRadius = Number(restaurantSettings?.deliveryRadius ?? 0);
  const deliveryRadiusUnit = restaurantSettings?.deliveryRadiusUnit === 'MILES' ? 'MILES' : 'KM';

  const selectedDistanceKm =
    restaurantLatitude !== null && restaurantLongitude !== null && selectedAddressLatitude !== null && selectedAddressLongitude !== null
      ? haversineKm(restaurantLatitude, restaurantLongitude, selectedAddressLatitude, selectedAddressLongitude)
      : null;

  const allowedDistanceKm = deliveryRadiusUnit === 'MILES' ? deliveryRadius * 1.60934 : deliveryRadius;
  const isSelectedAddressWithinRadius =
    fulfillment !== 'DELIVERY' ||
    !restaurantSettings ||
    deliveryRadius <= 0 ||
    selectedDistanceKm === null ||
    selectedDistanceKm <= allowedDistanceKm;

  const canFulfill = fulfillment === 'DELIVERY' ? settings.deliveryEnabled && Boolean(selectedAddress) : settings.pickupEnabled;
  const canPlaceOrder = canFulfill && enabledPaymentMethods.includes(paymentMethod) && isSelectedAddressWithinRadius;

  const deliveryRadiusMessage =
    fulfillment === 'DELIVERY' && restaurantSettings && deliveryRadius > 0 && selectedDistanceKm !== null && !isSelectedAddressWithinRadius
      ? `This address is ${selectedDistanceKm.toFixed(2)} km away. Delivery is available only within ${deliveryRadius} ${deliveryRadiusUnit.toLowerCase()}.`
      : null;

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-3xl font-semibold">Checkout</h2>
          <p className="mt-2 text-sm text-stone-600">Finalize your order details, select delivery or pickup, and choose how you would like to pay.</p>

          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">Fulfillment</h3>
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm cursor-pointer">
                <input type="radio" name="fulfillment" disabled={!settings.deliveryEnabled} checked={fulfillment === 'DELIVERY'} onChange={() => setFulfillment('DELIVERY')} />
                Delivery
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm cursor-pointer">
                <input type="radio" name="fulfillment" disabled={!settings.pickupEnabled} checked={fulfillment === 'PICKUP'} onChange={() => setFulfillment('PICKUP')} />
                Pickup
              </label>
            </div>

            {fulfillment === 'DELIVERY' && (
              <div className="mt-4">
                <div className="text-sm text-stone-600">Select delivery address</div>
                <select value={selectedAddress || ''} onChange={(e) => setSelectedAddress(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                  <option value="">-- Select address --</option>
                  {addresses.map((a) => (
                    <option key={String(a.id || a._id || '')} value={String(a.id || a._id || '')}>{(a.label as string) || (a.addressLine1 as string) || 'Address'}</option>
                  ))}
                </select>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <button type="button" onClick={() => setShowNewAddressForm((value) => !value)} className="rounded-full border border-amber-600 px-3 py-2 font-medium text-amber-700">{showNewAddressForm ? 'Hide form' : 'Add new delivery address'}</button>
                  <a href="/account/addresses" className="rounded-full border border-stone-200 px-3 py-2 text-stone-700">Manage addresses</a>
                </div>

                {showNewAddressForm && (
                  <div className="mt-4 space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm">
                        <span className="mb-2 block font-medium text-stone-700">Label</span>
                        <input value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2" placeholder="Home, Office, etc." />
                      </label>
                      <label className="text-sm">
                        <span className="mb-2 block font-medium text-stone-700">Full name</span>
                        <input value={newAddress.fullName} onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2" placeholder="Receiver name" />
                      </label>
                      <label className="text-sm">
                        <span className="mb-2 block font-medium text-stone-700">Mobile</span>
                        <input value={newAddress.mobile} onChange={(e) => setNewAddress({ ...newAddress, mobile: e.target.value })} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2" placeholder="9876543210" />
                      </label>
                      <label className="text-sm md:col-span-2">
                        <span className="mb-2 block font-medium text-stone-700">Search or enter address</span>
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                          <input value={newAddressSearch} onChange={(e) => setNewAddressSearch(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2" placeholder="Search address for map lookup" />
                          <button type="button" onClick={() => geocodeAndSetNewAddress()} className="rounded-xl bg-amber-600 px-4 py-2 font-medium text-white">Find</button>
                          <button type="button" onClick={useMyLocation} disabled={geoLoading} className="rounded-xl border border-stone-300 bg-white px-3 py-2 font-medium text-stone-700 disabled:opacity-60">
                            {geoLoading ? 'Locating...' : 'Use My Location'}
                          </button>
                        </div>
                      </label>
                    </div>

                    <LocationMap
                      value={
                        typeof newAddress.latitude === 'number' && typeof newAddress.longitude === 'number'
                          ? { latitude: newAddress.latitude, longitude: newAddress.longitude }
                          : null
                      }
                      center={
                        typeof restaurantSettings?.latitude === 'number' && typeof restaurantSettings?.longitude === 'number'
                          ? { latitude: restaurantSettings.latitude, longitude: restaurantSettings.longitude }
                          : null
                      }
                      onChange={(point) => setNewAddress((current) => ({
                        ...current,
                        latitude: point.latitude,
                        longitude: point.longitude,
                        googleMapsUrl: generateMapLink(point.latitude, point.longitude, current.label || current.fullName || 'Delivery address'),
                      }))}
                      height={260}
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm md:col-span-2">
                        <span className="mb-2 block font-medium text-stone-700">Address line 1</span>
                        <input value={newAddress.addressLine1} onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2" placeholder="House/Flat No., Street, Locality" />
                      </label>
                      <label className="text-sm">
                        <span className="mb-2 block font-medium text-stone-700">City</span>
                        <input value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2" placeholder="City" />
                      </label>
                      <label className="text-sm">
                        <span className="mb-2 block font-medium text-stone-700">State</span>
                        <input value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2" placeholder="State" />
                      </label>
                      <label className="text-sm">
                        <span className="mb-2 block font-medium text-stone-700">Postal code</span>
                        <input value={newAddress.postalCode} onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2" placeholder="Postal code" />
                      </label>
                      <label className="text-sm">
                        <span className="mb-2 block font-medium text-stone-700">Country</span>
                        <input value={newAddress.country} onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2" placeholder="Country" />
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button type="button" onClick={saveNewAddress} disabled={savingNewAddress} className="rounded-full bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-60">
                        {savingNewAddress ? 'Saving...' : 'Use this address'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">Payment</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block font-medium text-stone-700">Payment method</span>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                  {settings.codEnabled ? <option value="COD">Cash on Delivery</option> : null}
                  {(settings.onlinePaymentEnabled || settings.manualPaymentEnabled) ? <option value="ONLINE">Pay now</option> : null}
                </select>
              </label>
              <div className="text-sm text-stone-600 md:col-span-2">
                {enabledPaymentMethods.length === 0 && 'No payment methods are currently enabled. Please contact the restaurant.'}
                {paymentMethod === 'COD' && settings.codEnabled && 'Pay in cash when your order arrives. Wallet funds will be used first if provided.'}
                {paymentMethod === 'ONLINE' && settings.onlinePaymentEnabled && 'Pay now securely with online payment before your order is prepared.'}
                {paymentMethod === 'ONLINE' && !settings.onlinePaymentEnabled && settings.manualPaymentEnabled && 'Pay now using the restaurant UPI or QR code below. Upload the screenshot and transaction ID to complete your order.'}
              </div>

              {paymentMethod === 'ONLINE' && !settings.onlinePaymentEnabled && settings.manualPaymentEnabled && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-stone-700 md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-stone-900">Restaurant payment details</p>
                      {settings.manualPaymentUpiId ? <p className="mt-2"><span className="font-medium">UPI ID:</span> {settings.manualPaymentUpiId}</p> : null}
                      {settings.manualPaymentBankDetails ? <p className="mt-2 whitespace-pre-line"><span className="font-medium">Bank:</span> {settings.manualPaymentBankDetails}</p> : null}
                    </div>
                    {settings.manualPaymentQrUrl ? (
                      <button type="button" onClick={() => setShowQrModal(true)} className="rounded-xl bg-amber-600 px-3 py-2 font-medium text-white">
                        View QR
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="text-sm md:col-span-1">
                      <span className="mb-2 block font-medium text-stone-700">Transaction ID</span>
                      <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2" placeholder="e.g. UPI ref / txn ID" />
                    </label>
                    <div className="text-sm md:col-span-1">
                      <span className="mb-2 block font-medium text-stone-700">Payment Proof</span>
                      <div
                        className="rounded-2xl border-2 border-dashed border-stone-300 bg-white p-4 text-center hover:border-amber-500"
                        onDrop={(event) => { event.preventDefault(); selectManualProof(event.dataTransfer.files?.[0]); }}
                        onDragOver={(event) => event.preventDefault()}
                      >
                        <input id="checkout-payment-proof-picker" type="file" accept="image/*" className="sr-only" onChange={(event) => { selectManualProof(event.target.files?.[0]); event.target.value = ''; }} />
                        <p className="text-xs text-stone-600">Drop image here</p>
                        <label htmlFor="checkout-payment-proof-picker" className="mt-2 inline-flex cursor-pointer rounded-full bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700">Choose from device</label>
                      </div>
                    </div>
                  </div>
                  {manualProofFile && (
                    <div className="mt-3 rounded-2xl bg-stone-50 p-4">
                      {manualProofPreview ? <img src={manualProofPreview} alt="Selected payment proof" className="mb-3 h-40 w-full rounded-xl object-contain bg-white" /> : null}
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm">
                          <p className="font-medium text-stone-900">{manualProofFile.name}</p>
                          <p className="text-xs text-stone-600 mt-1">{(manualProofFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                        {uploadStatus === 'success' && <span className="text-lg text-emerald-600">✓</span>}
                        {uploadStatus === 'error' && <span className="text-lg text-red-600">✗</span>}
                        <button type="button" onClick={removeManualProof} disabled={loading} className="text-sm font-semibold text-stone-600 hover:text-red-600 disabled:opacity-50">Remove</button>
                      </div>
                      {uploadStatus === 'uploading' && (
                        <div className="mt-3">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-stone-600">Uploading...</span>
                            <span className="text-xs font-medium text-stone-700">{uploadProgress}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                            <div className="h-full bg-amber-600 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {showQrModal && settings.manualPaymentQrUrl ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4" onClick={() => setShowQrModal(false)}>
                  <div className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => setShowQrModal(false)} className="absolute right-3 top-3 rounded-full bg-stone-200 px-2 py-1 text-xs font-medium text-stone-700">Close</button>
                    <p className="mb-4 text-lg font-semibold text-stone-900">Payment QR</p>
                    <img src={settings.manualPaymentQrUrl} alt="Payment QR code" className="mx-auto h-72 w-72 rounded-2xl border border-stone-200 object-contain" />
                    <a href={settings.manualPaymentQrUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block w-full rounded-xl bg-amber-600 px-4 py-2 text-center font-medium text-white">
                      Open QR in browser
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">Promotions</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block font-medium text-stone-700">Coupon code</span>
                <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" placeholder="e.g. WELCOME10" />
              </label>
              <label className="text-sm">
                <span className="mb-2 block font-medium text-stone-700">Referral code</span>
                <input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" placeholder="e.g. PZVABC123" />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block font-medium text-stone-700">Wallet amount to use</span>
                <input value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" placeholder="0" />
              </label>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">Order summary</h3>
            <div className="mt-4 space-y-3 text-sm text-stone-600">
              <div className="flex justify-between">
                <span>Items</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between font-semibold text-stone-900">
                <span>Total</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">Cart items</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {(cart.items || []).map((it: CartItem) => (
                <li key={it.productId} className="flex justify-between">
                  <span>{it.name}</span>
                  <span>{it.quantity} × ₹{(it.unitPrice || 0).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {(error || message || deliveryRadiusMessage) && (
        <div className="mt-6 rounded-3xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          {error ? <p className="text-rose-700">{error}</p> : null}
          {message ? <p className="text-emerald-700">{message}</p> : null}
          {deliveryRadiusMessage ? <p className="text-rose-700">{deliveryRadiusMessage}</p> : null}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-stone-500">
          {fulfillment === 'DELIVERY'
            ? selectedAddress
              ? 'Delivery will be calculated once the order is placed.'
              : 'Please select an address to proceed with delivery.'
            : 'Pickup selected. Collect your order from the restaurant.'}
        </div>
        <button
          type="button"
          onClick={placeOrder}
          disabled={loading || !canPlaceOrder}
          className="inline-flex justify-center rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Placing…' : deliveryRadiusMessage ? 'Out of delivery range' : 'Place Order'}
        </button>
      </div>
    </div>
  );
}
