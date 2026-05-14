import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000"
});

export const login = (data) => API.post("/login", data);
export const getUnits = () => API.get("/units");
export const getProjects = () => API.get("/projects");
export const reserveUnit = (data) => API.post("/reserve", data);
export const fulfillReservation = (id, formData) =>
  API.post(`/reservations/${id}/fulfill`, formData);
export const getAdminReservations = () => API.get("/admin/reservations");
export const getMyReservations = (userId) => API.get(`/my-reservations/${userId}`);
export const approveReservation = (id, note) =>
  API.post(`/reservations/${id}/approve`, { note });
export const denyReservation = (id, note) =>
  API.post(`/reservations/${id}/deny`, { note });
export const seedData = () => API.post("/seed");
export const getCustomers = () => API.get("/customers");
export const updateCustomer = (id, data) => API.put(`/customers/${id}`, data);
