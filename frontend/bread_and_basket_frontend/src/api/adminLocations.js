import { request } from "./client";

// Fetch all locations
export function getAdminLocations() {
  return request("/admin/locations");
}

// Create a new delivery or collection location.
export function createAdminLocation(data) {
  return request("/admin/locations", {
    method: "POST",
    body: data,
  });
}

// Update an existing location.
export function updateAdminLocation(locationId, data) {
  return request(`/admin/locations/${encodeURIComponent(locationId)}`, {
    method: "PATCH",
    body: data,
  });
}
