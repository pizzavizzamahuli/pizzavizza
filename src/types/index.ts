export type UserRole =
  | "CUSTOMER"
  | "MAIN_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "KITCHEN_STAFF"
  | "DELIVERY_STAFF";

export type AccountStatus = "ACTIVE" | "DISABLED" | "PENDING" | "SUSPENDED";

export type TemporaryAccessStatus = "ACTIVE" | "DISABLED" | "EXPIRED" | "REVOKED";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "CASH_ON_DELIVERY";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export interface PermissionKey {
  id: string;
  description?: string;
}

export interface UserBase {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: AccountStatus;
  protected?: boolean;
  temporaryAccess?: {
    enabled: boolean;
    startsAt?: string | null;
    expiresAt?: string | null;
    forcePasswordChange?: boolean;
    status?: TemporaryAccessStatus;
  };
}

export interface AddressDetails {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  distanceFromRestaurant?: number | null;
}
