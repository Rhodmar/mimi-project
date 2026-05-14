require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Serve uploaded files
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Find an existing customer or create a new one from reservation form data.
// Match priority: 1) email  2) firstName + lastName + mobile  3) create new
async function findOrCreateCustomer(b) {
  const email     = b.emailAddress?.trim()  || null;
  const firstName = b.firstName?.trim()     || "Unknown";
  const lastName  = b.lastName?.trim()      || "";
  const mobile    = b.mobileNumber?.trim()  || null;

  const data = {
    firstName,
    middleName:  b.middleName?.trim()   || null,
    lastName,
    email,
    mobile,
    homeAddress: b.homeAddress?.trim()  || null,
    nationality: b.nationality?.trim()  || null,
    civilStatus: b.civilStatus          || null,
    tin:         b.certTin?.trim()      || null,
  };

  // 1. Match by email
  if (email) {
    const byEmail = await prisma.customer.findUnique({ where: { email } });
    if (byEmail) return prisma.customer.update({ where: { id: byEmail.id }, data });
  }

  // 2. Match by name + mobile (catches repeat buyers who skip the email field)
  if (firstName && lastName && mobile) {
    const byNameMobile = await prisma.customer.findFirst({
      where: { firstName, lastName, mobile }
    });
    if (byNameMobile) return prisma.customer.update({ where: { id: byNameMobile.id }, data });
  }

  // 3. Create new customer
  return prisma.customer.create({ data });
}

async function expireReservations() {
  const expired = await prisma.reservation.findMany({
    where: { status: "pending_fulfillment", expiresAt: { lt: new Date() } }
  });
  for (const r of expired) {
    await prisma.reservation.update({ where: { id: r.id }, data: { status: "expired" } });
    await prisma.unit.update({ where: { id: r.unitId }, data: { status: "available" } });
  }
}

// POST /login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /units
app.get("/units", async (_req, res) => {
  try {
    await expireReservations();
    const units = await prisma.unit.findMany({
      include: {
        reservations: {
          where: { status: { in: ["pending_fulfillment", "fulfilled", "approved"] } },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });
    res.json(units);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /projects
app.get("/projects", async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({ include: { units: true } });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/reservations — all actionable reservations
app.get("/admin/reservations", async (_req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { status: { in: ["fulfilled", "approved", "denied"] } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        unit: true
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /my-reservations/:userId — agent's own reservations
app.get("/my-reservations/:userId", async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        userId: parseInt(req.params.userId),
        status: { in: ["fulfilled", "approved", "denied"] }
      },
      include: { unit: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /customers — all customers with their reservation history
app.get("/customers", async (_req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        reservations: {
          include: {
            unit: true,
            user: { select: { name: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /customers/:id — update tags and notes
app.put("/customers/:id", async (req, res) => {
  const { tags, notes } = req.body;
  try {
    const customer = await prisma.customer.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(tags  !== undefined && { tags }),
        ...(notes !== undefined && { notes })
      }
    });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /reserve
app.post("/reserve", async (req, res) => {
  const { userId, unitId } = req.body;
  try {
    await expireReservations();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(400).json({ error: "Session expired. Please log out and log back in." });

    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) return res.status(404).json({ error: "Unit not found" });
    if (unit.status !== "available") return res.status(400).json({ error: "Unit not available" });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.unit.update({ where: { id: unitId }, data: { status: "temp_reserved" } });
    const reservation = await prisma.reservation.create({
      data: { userId, unitId, status: "pending_fulfillment", expiresAt }
    });
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /reservations/:id/fulfill
app.post(
  "/reservations/:id/fulfill",
  upload.fields([
    { name: "govId", maxCount: 1 },
    { name: "appDoc", maxCount: 1 },
    { name: "payment", maxCount: 1 }
  ]),
  async (req, res) => {
    const reservationId = parseInt(req.params.id);
    const b = req.body;
    try {
      const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
      if (!reservation) return res.status(404).json({ error: "Reservation not found" });
      if (reservation.status !== "pending_fulfillment") {
        return res.status(400).json({ error: "Reservation is no longer active" });
      }
      if (new Date() > new Date(reservation.expiresAt)) {
        await prisma.reservation.update({ where: { id: reservationId }, data: { status: "expired" } });
        await prisma.unit.update({ where: { id: reservation.unitId }, data: { status: "available" } });
        return res.status(400).json({ error: "Reservation has expired" });
      }

      // Find or create customer record
      const customer = await findOrCreateCustomer(b);

      const fullName = [b.firstName, b.middleName, b.lastName].filter(Boolean).join(" ");
      await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: "fulfilled",
          clientName: fullName || null,
          customerId: customer.id,
          // Purchase
          purpose: b.purpose ?? null,
          whyChooseProject: b.whyChooseProject ?? null,
          howLearnedAbout: b.howLearnedAbout ?? null,
          // Payment
          sdp: b.sdp ?? null,
          computation: b.computation ?? null,
          // Documents
          govIdPath: req.files?.govId?.[0]?.filename ?? null,
          appDocPath: req.files?.appDoc?.[0]?.filename ?? null,
          paymentPath: req.files?.payment?.[0]?.filename ?? null,
          // Personal
          firstName: b.firstName ?? null,
          middleName: b.middleName ?? null,
          lastName: b.lastName ?? null,
          age: b.age ?? null,
          sex: b.sex ?? null,
          civilStatus: b.civilStatus ?? null,
          birthday: b.birthday ?? null,
          nationality: b.nationality ?? null,
          homeAddress: b.homeAddress ?? null,
          telNo: b.telNo ?? null,
          addressAbroad: b.addressAbroad ?? null,
          officeAddress: b.officeAddress ?? null,
          emailAddress: b.emailAddress ?? null,
          mobileNumber: b.mobileNumber ?? null,
          businessName: b.businessName ?? null,
          position: b.position ?? null,
          occupationalField: b.occupationalField ?? null,
          // Spouse
          spouseFirstName: b.spouseFirstName ?? null,
          spouseMiddleName: b.spouseMiddleName ?? null,
          spouseSurname: b.spouseSurname ?? null,
          spouseAge: b.spouseAge ?? null,
          spouseSex: b.spouseSex ?? null,
          spouseBirthday: b.spouseBirthday ?? null,
          spouseNationality: b.spouseNationality ?? null,
          spouseAddressAbroad: b.spouseAddressAbroad ?? null,
          spouseTelAbroad: b.spouseTelAbroad ?? null,
          spouseOfficeAddress: b.spouseOfficeAddress ?? null,
          spouseTelOffice: b.spouseTelOffice ?? null,
          spouseEmail: b.spouseEmail ?? null,
          spouseMobile: b.spouseMobile ?? null,
          spouseBusinessName: b.spouseBusinessName ?? null,
          spousePosition: b.spousePosition ?? null,
          spouseOccupField: b.spouseOccupField ?? null,
          // Certification
          certFullName: b.certFullName ?? null,
          certTin: b.certTin ?? null,
          certResCertNo: b.certResCertNo ?? null,
          certDateIssue: b.certDateIssue ?? null,
          certPlaceIssue: b.certPlaceIssue ?? null,
          spouseCertFullName: b.spouseCertFullName ?? null,
          spouseCertTin: b.spouseCertTin ?? null,
          spouseCertResCertNo: b.spouseCertResCertNo ?? null,
          spouseCertDateIssue: b.spouseCertDateIssue ?? null,
          spouseCertPlaceIssue: b.spouseCertPlaceIssue ?? null,
          isCertified: b.isCertified === "true"
        }
      });
      await prisma.unit.update({ where: { id: reservation.unitId }, data: { status: "pending" } });
      res.json({ message: "Reservation fulfilled successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /reservations/:id/approve
app.post("/reservations/:id/approve", async (req, res) => {
  const reservationId = parseInt(req.params.id);
  const { note } = req.body;
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return res.status(404).json({ error: "Reservation not found" });
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "approved", adminNote: note ?? null, resolvedAt: new Date() }
    });
    await prisma.unit.update({ where: { id: reservation.unitId }, data: { status: "sold" } });
    res.json({ message: "Reservation approved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /reservations/:id/deny
app.post("/reservations/:id/deny", async (req, res) => {
  const reservationId = parseInt(req.params.id);
  const { note } = req.body;
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return res.status(404).json({ error: "Reservation not found" });
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "denied", adminNote: note ?? null, resolvedAt: new Date() }
    });
    await prisma.unit.update({ where: { id: reservation.unitId }, data: { status: "available" } });
    res.json({ message: "Reservation denied" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /seed
app.post("/seed", async (_req, res) => {
  try {
    await prisma.reservation.deleteMany();
    try { await prisma.customer.deleteMany(); } catch {} // table may not exist before migration
    await prisma.unit.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.createMany({
      data: [
        { name: "Admin User",   email: "admin@demo.com",   password: "admin123", role: "admin" },
        { name: "Maria Santos", email: "agent@demo.com",   password: "demo123",  role: "agent" },
        { name: "Juan Reyes",   email: "agent2@demo.com",  password: "agent456", role: "agent" }
      ]
    });

    const project = await prisma.project.create({
      data: { name: "Primary Homes", image: "siteplan" }
    });

    await prisma.unit.createMany({
      data: [
        { unitCode: "A1", price: 250000, x: 65,  y: 90,  projectId: project.id },
        { unitCode: "A2", price: 260000, x: 185, y: 90,  projectId: project.id },
        { unitCode: "A3", price: 255000, x: 65,  y: 200, projectId: project.id },
        { unitCode: "A4", price: 270000, x: 185, y: 200, projectId: project.id },
        { unitCode: "B1", price: 280000, x: 525, y: 90,  projectId: project.id },
        { unitCode: "B2", price: 285000, x: 645, y: 90,  projectId: project.id },
        { unitCode: "B3", price: 290000, x: 525, y: 200, projectId: project.id },
        { unitCode: "B4", price: 295000, x: 645, y: 200, projectId: project.id },
        { unitCode: "C1", price: 320000, x: 240, y: 445, projectId: project.id },
        { unitCode: "C2", price: 325000, x: 360, y: 445, projectId: project.id }
      ]
    });

    res.json({ message: "Demo data loaded. Please log out and log back in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
