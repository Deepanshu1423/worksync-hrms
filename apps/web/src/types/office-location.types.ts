export type OfficeLocation = {
  id?: string;
  officeLocationId?: string;
  locationId?: string;
  _id?: string;

  name: string;
  address: string | null;

  latitude: number;
  longitude: number;

  /**
   * Backend DB field name.
   */
  allowedRadius?: number;

  /**
   * Frontend display-friendly alias.
   */
  radiusMeters?: number;

  /**
   * Extra fallback names if response changes later.
   */
  radius?: number;
  allowedRadiusMeters?: number;

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
};

export type OfficeLocationsResponse = {
  success: boolean;
  message: string;
  data: {
    officeLocations: OfficeLocation[];
  };
};

export type OfficeLocationResponse = {
  success: boolean;
  message: string;
  data: {
    officeLocation: OfficeLocation;
  };
};

export type CreateOfficeLocationPayload = {
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;

  /**
   * Frontend uses radiusMeters.
   * Service file will convert this to backend allowedRadius.
   */
  radiusMeters: number;

  isActive?: boolean;
};

export type UpdateOfficeLocationPayload = {
  name?: string;
  address?: string | null;
  latitude?: number;
  longitude?: number;

  /**
   * Frontend uses radiusMeters.
   * Service file will convert this to backend allowedRadius.
   */
  radiusMeters?: number;

  isActive?: boolean;
};

export type UpdateOfficeLocationStatusPayload = {
  isActive: boolean;
};

export type DeleteOfficeLocationResponse = {
  success: boolean;
  message: string;
  data?: {
    id?: string;
  };
};