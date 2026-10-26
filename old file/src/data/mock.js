/**
 * Mock data shaped after the FSD data entities (section 6).
 * Generated with a seeded RNG so the dashboard looks the same on every load.
 * Replace with API calls when the backend is ready (see src/data/store.jsx).
 */

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = rng(20261026);
const pick = (arr) => arr[Math.floor(r() * arr.length)];
const int = (min, max) => Math.floor(r() * (max - min + 1)) + min;
const round = (n, to) => Math.round(n / to) * to;
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();
const past = (maxDays, minDays = 0) => new Date(now - (minDays * DAY + r() * (maxDays - minDays) * DAY)).toISOString();
const pad = (n, w = 4) => String(n).padStart(w, '0');

export const ROLES = {
  owner: 'Vehicle owner',
  dealer: 'Dealer',
  parts: 'Parts provider',
  mechanic: 'Mechanic',
  haulage: 'Haulage',
  insurer: 'Insurer',
};
export const BUSINESS_ROLES = ['dealer', 'parts', 'mechanic', 'haulage', 'insurer'];

export const CATEGORIES = {
  vehicles: 'Vehicles',
  parts: 'Parts',
  services: 'Mechanic services',
  haulage: 'Haulage & towing',
  insurance: 'Insurance',
};

const CITIES = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu', 'Benin City', 'Warri'];
const FIRST = ['Chinedu', 'Aisha', 'Tunde', 'Ngozi', 'Emeka', 'Fatima', 'Segun', 'Amaka', 'Ibrahim', 'Kemi', 'Obinna', 'Zainab', 'Femi', 'Chioma', 'Yusuf', 'Bisi', 'Ifeanyi', 'Halima', 'Dayo', 'Uche', 'Musa', 'Funke', 'Kelechi', 'Hauwa', 'Gbenga', 'Adaeze', 'Sani', 'Toyin', 'Nnamdi', 'Ruth'];
const LAST = ['Okafor', 'Bello', 'Adeyemi', 'Eze', 'Ibrahim', 'Okonkwo', 'Balogun', 'Nwosu', 'Abubakar', 'Ogunleye', 'Obi', 'Lawal', 'Akande', 'Uchenna', 'Danjuma', 'Afolabi', 'Chukwu', 'Olawale', 'Ekwueme', 'Yakubu'];
const BIZ = {
  dealer: ['Motors', 'Autos', 'Car Mart', 'Auto Gallery', 'Wheels'],
  parts: ['Spares', 'Auto Parts', 'Parts Hub', 'Genuine Parts', 'Spare Depot'],
  mechanic: ['Auto Clinic', 'Garage', 'Motor Works', 'Auto Care', 'Service Centre'],
  haulage: ['Towing', 'Recovery', 'Haulage', 'Logistics', 'Rescue'],
  insurer: ['Insurance', 'Assurance', 'General Insurance', 'Underwriters', 'Insurance Brokers'],
};
const MAKES = {
  Toyota: ['Camry', 'Corolla', 'Highlander', 'RAV4', 'Hilux', 'Sienna'],
  Honda: ['Accord', 'Civic', 'CR-V', 'Pilot'],
  Lexus: ['RX 350', 'ES 350', 'GX 460'],
  'Mercedes-Benz': ['C300', 'GLE 350', 'E350'],
  Hyundai: ['Elantra', 'Tucson', 'Santa Fe'],
  Kia: ['Sorento', 'Rio', 'Sportage'],
  Ford: ['Explorer', 'Ranger', 'Edge'],
  Peugeot: ['301', '3008', '508'],
};
const PARTS = ['Brake pads (front set)', 'Alternator', 'Shock absorber pair', 'Oil filter', 'Timing belt kit', 'Radiator', 'Headlamp assembly', 'Fuel pump', 'Spark plugs (set of 4)', 'Clutch kit', 'CV joint', 'AC compressor', 'Battery 75Ah', 'Wiper blades'];
const SERVICES = ['Full diagnostic scan', 'Engine overhaul', 'Brake service', 'AC repair & regas', 'Wheel alignment', 'Gearbox repair', 'Oil change & filter', 'Suspension repair', 'Electrical fault tracing'];
const POLICIES = ['Third-party motor', 'Comprehensive private', 'Comprehensive fleet', 'Third-party fire & theft'];

function personName() {
  return `${pick(FIRST)} ${pick(LAST)}`;
}

/* ---------------- Users ---------------- */
const roleWeights = ['owner', 'owner', 'owner', 'owner', 'dealer', 'parts', 'parts', 'mechanic', 'mechanic', 'haulage', 'insurer'];

export const users = Array.from({ length: 64 }, (_, i) => {
  const role = i < 6 ? BUSINESS_ROLES[i % 5] : pick(roleWeights);
  const name = personName();
  const isBiz = role !== 'owner';
  const city = pick(CITIES);
  const kycRoll = r();
  const kycStatus = !isBiz ? 'not_required' : kycRoll < 0.22 ? 'pending' : kycRoll < 0.3 ? 'rejected' : 'approved';
  const roles = [role];
  if (isBiz && r() < 0.35) roles.push('owner');
  const joinedAt = past(420, 2);
  return {
    id: `USR-${pad(1040 + i)}`,
    name,
    businessName: isBiz ? `${name.split(' ')[1]} ${pick(BIZ[role])}` : null,
    email: `${name.toLowerCase().replace(' ', '.')}${i}@${isBiz ? 'mail.ng' : 'gmail.com'}`,
    phone: `+234 80${int(1, 9)} ${int(100, 999)} ${int(1000, 9999)}`,
    primaryRole: role,
    roles,
    city,
    kycStatus,
    status: r() < 0.06 ? 'suspended' : 'active',
    twoFactor: isBiz ? r() < 0.6 : false,
    joinedAt,
    lastActive: past(9),
    rating: isBiz && kycStatus === 'approved' ? +(3.4 + r() * 1.6).toFixed(1) : null,
    reviewCount: isBiz && kycStatus === 'approved' ? int(4, 380) : 0,
    vehicles: role === 'owner' || roles.includes('owner') ? int(1, 4) : 0,
  };
});

export const userById = (id) => users.find((u) => u.id === id);
const byRole = (role) => users.filter((u) => u.primaryRole === role);
const owners = users.filter((u) => u.roles.includes('owner'));
const approved = (role) => byRole(role).filter((u) => u.kycStatus === 'approved');

/* ---------------- KYC submissions (FR-1.4, FR-13.1) ---------------- */
const DOCS = {
  dealer: ['Government ID', 'CAC business registration', 'Dealer licence'],
  parts: ['Government ID', 'CAC business registration', 'Tax ID (TIN)'],
  mechanic: ['Government ID', 'Workshop address proof', 'Trade certification'],
  haulage: ['Government ID', 'CAC business registration', 'Vehicle registration & roadworthiness'],
  insurer: ['Government ID', 'CAC business registration', 'NAICOM operating licence'],
};

export const kycSubmissions = users
  .filter((u) => u.kycStatus === 'pending' || u.kycStatus === 'rejected')
  .map((u, i) => {
    const flagged = r() < 0.3;
    return {
      id: `KYC-${pad(310 + i)}`,
      userId: u.id,
      role: u.primaryRole,
      submittedAt: past(6),
      status: u.kycStatus,
      autoCheck: flagged ? 'flagged' : 'passed',
      autoCheckNote: flagged ? pick(['Name on ID does not match CAC record', 'Licence image is blurred', 'Document expired 3 months ago', 'Address could not be verified']) : 'Identity verification API matched all fields',
      documents: DOCS[u.primaryRole].map((label, d) => ({
        label,
        file: `${label.toLowerCase().replace(/[^a-z]+/g, '-')}.pdf`,
        check: flagged && d === int(0, 2) ? 'issue' : 'ok',
      })),
      rejectionReason: u.kycStatus === 'rejected' ? 'Business registration number not found on CAC portal' : null,
    };
  });

/* ---------------- Listings (FR-3, FR-4, FR-5.1, FR-7.1) ---------------- */
function vehicleListing(i) {
  const seller = r() < 0.75 ? pick(approved('dealer').length ? approved('dealer') : byRole('dealer')) : pick(owners);
  const make = pick(Object.keys(MAKES));
  const model = pick(MAKES[make]);
  const year = int(2008, 2024);
  return {
    type: 'vehicle',
    title: `${year} ${make} ${model}`,
    sellerId: seller.id,
    price: round(int(3_500_000, 68_000_000), 50_000),
    meta: {
      Condition: pick(['Foreign used', 'Nigerian used', 'Brand new']),
      Mileage: `${num0(int(8_000, 190_000))} km`,
      VIN: `${pick(['JT', '1H', 'KM', '5X', 'WD'])}${Math.floor(r() * 1e15).toString(36).toUpperCase().slice(0, 15).padEnd(15, 'X')}`,
      Transmission: pick(['Automatic', 'Manual']),
    },
  };
}
const num0 = (n) => new Intl.NumberFormat('en-NG').format(n);

function partListing() {
  const seller = pick(approved('parts').length ? approved('parts') : byRole('parts'));
  const make = pick(Object.keys(MAKES));
  return {
    type: 'part',
    title: `${pick(PARTS)} — ${make} ${pick(MAKES[make])}`,
    sellerId: seller.id,
    price: round(int(4_000, 420_000), 500),
    meta: {
      SKU: `${make.slice(0, 3).toUpperCase()}-${int(10000, 99999)}`,
      Stock: `${int(0, 60)} units`,
      Fits: `${make} ${int(2010, 2018)}–${int(2019, 2024)}`,
      Condition: pick(['New (OEM)', 'New (aftermarket)', 'Tokunbo']),
    },
  };
}

function serviceListing() {
  const seller = pick(approved('mechanic').length ? approved('mechanic') : byRole('mechanic'));
  const lo = round(int(8_000, 150_000), 1000);
  return {
    type: 'service',
    title: pick(SERVICES),
    sellerId: seller.id,
    price: lo,
    meta: { Pricing: r() < 0.5 ? 'Fixed' : `Estimate ₦${num0(lo)}–₦${num0(lo * 2)}`, Duration: `${int(1, 8)} h`, 'Slots this week': `${int(0, 24)}` },
  };
}

function insuranceListing() {
  const seller = pick(byRole('insurer'));
  return {
    type: 'insurance',
    title: pick(POLICIES),
    sellerId: seller.id,
    price: round(int(15_000, 650_000), 500),
    meta: { Premium: 'Annual', Cover: pick(['Up to ₦5m', 'Up to ₦15m', 'Market value', 'Third-party only']), Eligibility: pick(['Vehicles under 15 yrs', 'Private use only', 'Fleet of 5+', 'All vehicles']) },
  };
}

const makers = [vehicleListing, vehicleListing, partListing, partListing, partListing, serviceListing, serviceListing, insuranceListing];
export const listings = Array.from({ length: 70 }, (_, i) => {
  const base = pick(makers)(i);
  const roll = r();
  const status = i < 11 ? 'pending' : roll < 0.62 ? 'active' : roll < 0.72 ? 'reserved' : roll < 0.88 ? 'sold' : roll < 0.95 ? 'suspended' : 'rejected';
  return {
    id: `LST-${pad(5200 + i)}`,
    ...base,
    status: base.type !== 'vehicle' && (status === 'reserved' || status === 'sold') ? 'active' : status,
    createdAt: status === 'pending' ? past(3) : past(120, 3),
    views: status === 'pending' ? 0 : int(20, 4200),
    inquiries: status === 'pending' ? 0 : int(0, 85),
    photos: int(1, 12),
    autoCheck: status === 'pending' && r() < 0.35 ? pick(['Price 60% below market average', 'VIN already used on another listing', 'Photos found elsewhere online', 'Contact details in description']) : null,
  };
});

/* ---------------- Activity: orders, bookings, jobs, policies, claims (FR-9, FR-10) ---------------- */
const KIND = {
  order: { cat: 'parts', label: 'Parts order', statuses: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
  vehicle: { cat: 'vehicles', label: 'Vehicle sale', statuses: ['offer accepted', 'in escrow', 'completed', 'cancelled'] },
  booking: { cat: 'services', label: 'Service booking', statuses: ['requested', 'confirmed', 'quote sent', 'in progress', 'completed', 'cancelled'] },
  haulage: { cat: 'haulage', label: 'Haulage job', statuses: ['searching', 'en route', 'in transit', 'completed', 'cancelled'] },
  policy: { cat: 'insurance', label: 'Policy purchase', statuses: ['quote requested', 'awaiting insurer', 'active', 'declined'] },
};
const providerFor = { order: 'parts', vehicle: 'dealer', booking: 'mechanic', haulage: 'haulage', policy: 'insurer' };
const kinds = ['order', 'order', 'order', 'booking', 'booking', 'booking', 'haulage', 'haulage', 'vehicle', 'policy'];

const amountFor = (k) =>
  ({
    order: round(int(6_000, 380_000), 500),
    vehicle: round(int(4_000_000, 52_000_000), 50_000),
    booking: round(int(10_000, 260_000), 1_000),
    haulage: round(int(18_000, 140_000), 500),
    policy: round(int(20_000, 480_000), 500),
  })[k];

export const activity = Array.from({ length: 120 }, (_, i) => {
  const kind = pick(kinds);
  const def = KIND[kind];
  const status = pick(def.statuses);
  const provider = pick(approved(providerFor[kind]).length ? approved(providerFor[kind]) : byRole(providerFor[kind]));
  const done = ['delivered', 'completed', 'active'].includes(status);
  const cancelled = ['cancelled', 'declined'].includes(status);
  return {
    id: `${kind === 'order' ? 'ORD' : kind === 'vehicle' ? 'VEH' : kind === 'booking' ? 'BKG' : kind === 'haulage' ? 'JOB' : 'POL'}-${pad(80300 + i, 5)}`,
    kind,
    kindLabel: def.label,
    category: def.cat,
    buyerId: pick(owners).id,
    providerId: provider.id,
    amount: amountFor(kind),
    status,
    method: pick(['Card', 'Card', 'Bank transfer', 'Mobile money']),
    escrow: cancelled ? 'refunded' : done ? 'released' : kind === 'policy' ? 'n/a' : 'held',
    createdAt: i < 18 ? past(1) : past(60),
    sos: kind === 'haulage' && r() < 0.3,
    city: pick(CITIES),
  };
}).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/* Live haulage feed for the overview (FR-6.4, FR-6.6) */
export const liveJobs = activity
  .filter((a) => a.kind === 'haulage' && ['searching', 'en route', 'in transit'].includes(a.status))
  .slice(0, 6)
  .map((a) => ({ ...a, eta: a.status === 'searching' ? null : int(6, 48), pickup: `${pick(['Third Mainland Bridge', 'Lekki-Epe Expressway', 'Ikorodu Road', 'Airport Road', 'East-West Road', 'Aba Road', 'Trans-Amadi', 'Kubwa Expressway'])}, ${a.city}` }));

/* ---------------- Disputes (FR-13.4) ---------------- */
const DISPUTE_REASONS = {
  order: ['Part received does not fit listed vehicle', 'Item not delivered after 10 days', 'Counterfeit part received'],
  booking: ['Job charged above approved quote', 'Fault returned two days after repair', 'Mechanic did not show up'],
  haulage: ['Vehicle damaged during tow', 'Charged more than fare estimate', 'Driver cancelled after payment'],
  vehicle: ['Mileage differs from listing', 'Undisclosed accident history', 'Seller refuses to release documents'],
  policy: ['Policy not activated after payment'],
};
export const disputes = activity
  .filter((a) => a.escrow === 'held' || a.status === 'completed' || a.status === 'delivered')
  .slice(0, 16)
  .map((a, i) => {
    const status = i < 5 ? 'open' : i < 9 ? 'investigating' : 'resolved';
    const openedAt = past(14, 0.2);
    const buyer = userById(a.buyerId);
    const provider = userById(a.providerId);
    const reason = pick(DISPUTE_REASONS[a.kind]);
    const timeline = [
      { at: openedAt, who: buyer.name, side: 'buyer', text: `Opened dispute: ${reason.toLowerCase()}.` },
      { at: new Date(new Date(openedAt).getTime() + 3 * HOUR).toISOString(), who: provider.businessName || provider.name, side: 'provider', text: pick(['We delivered exactly what was ordered. Photos attached.', 'Customer approved the work before we closed the job.', 'We are willing to offer a partial refund.', 'The issue was pre-existing before we took the vehicle.']) },
    ];
    if (status !== 'open') timeline.push({ at: new Date(new Date(openedAt).getTime() + 20 * HOUR).toISOString(), who: 'Adaora N. (Support)', side: 'admin', text: 'Escrow frozen. Requested delivery photos and chat history from both parties.' });
    if (status === 'resolved') timeline.push({ at: new Date(new Date(openedAt).getTime() + 50 * HOUR).toISOString(), who: 'Adaora N. (Support)', side: 'admin', text: 'Resolved after reviewing evidence.' });
    return {
      id: `DSP-${pad(140 + i)}`,
      txId: a.id,
      kind: a.kind,
      kindLabel: a.kindLabel,
      buyerId: a.buyerId,
      providerId: a.providerId,
      amount: a.amount,
      reason,
      status,
      priority: a.amount > 1_000_000 || r() < 0.25 ? 'high' : 'normal',
      openedAt,
      timeline,
      resolution: status === 'resolved' ? pick(['Refunded buyer in full', 'Released funds to provider', 'Split 50/50']) : null,
    };
  });

/* ---------------- Reports (FR-11.4) ---------------- */
const REVIEW_TEXT = ['This mechanic is a thief, avoid at all costs!!!', 'Call me on WhatsApp for cheaper price 0803…', 'Fake seller, the car was never there', 'Best parts in Lagos — visit my shop instead', 'Rude driver, used abusive language', 'Five stars, my cousin owns this business'];
export const reports = Array.from({ length: 14 }, (_, i) => {
  const targetType = pick(['listing', 'listing', 'review', 'review', 'user']);
  const listing = pick(listings);
  const target = targetType === 'listing' ? listing.title : targetType === 'review' ? `Review on ${userById(listing.sellerId).businessName || 'provider'}` : pick(users).name;
  return {
    id: `RPT-${pad(900 + i)}`,
    targetType,
    targetId: targetType === 'listing' ? listing.id : targetType === 'user' ? pick(users).id : `REV-${int(1000, 9999)}`,
    target,
    excerpt: targetType === 'review' ? pick(REVIEW_TEXT) : targetType === 'listing' ? `Listed at ${new Intl.NumberFormat('en-NG').format(listing.price)} NGN by ${userById(listing.sellerId).businessName || userById(listing.sellerId).name}` : 'Account reported by multiple users',
    reason: pick(['Fraud or scam', 'Abusive language', 'Fake or misleading', 'Counterfeit goods', 'Off-platform payment request', 'Spam']),
    reporterId: pick(owners).id,
    reportCount: int(1, 9),
    status: i < 9 ? 'open' : pick(['dismissed', 'removed']),
    createdAt: past(10),
  };
});

/* ---------------- Finance (FR-9.2, FR-9.5, FR-13.3) ---------------- */
export const commissionRates = {
  vehicles: { rate: 2.5, cap: 750_000 },
  parts: { rate: 8, cap: null },
  services: { rate: 10, cap: null },
  haulage: { rate: 12, cap: null },
  insurance: { rate: 5, cap: null },
};

export const payoutSchedule = { frequency: 'weekly', day: 'Friday', holdDays: 3, minimum: 5_000 };

export const payouts = users
  .filter((u) => u.primaryRole !== 'owner' && u.kycStatus === 'approved')
  .slice(0, 18)
  .map((u, i) => ({
    id: `PAY-${pad(7700 + i)}`,
    providerId: u.id,
    amount: round(int(45_000, 9_800_000), 100),
    transactions: int(2, 64),
    status: i < 10 ? 'scheduled' : i < 13 ? 'on hold' : 'paid',
    holdReason: i >= 10 && i < 13 ? 'Open dispute on linked transaction' : null,
    bank: pick(['GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'Moniepoint', 'OPay']),
    dueAt: i < 13 ? new Date(now + int(1, 4) * DAY).toISOString() : past(10, 2),
  }));

/* ---------------- Announcements (FR-13.6) ---------------- */
export const announcements = [
  { id: 'ANN-031', title: 'Zero commission on parts this weekend', body: 'Parts providers in Lagos keep 100% of sales from Friday to Sunday.', audience: 'Parts providers in Lagos', channels: ['push', 'email'], status: 'scheduled', sendAt: new Date(now + 2 * DAY).toISOString(), reach: 412 },
  { id: 'ANN-030', title: 'Emergency towing now in Port Harcourt', body: 'Request SOS towing on East-West Road and Aba Road with live tracking.', audience: 'Vehicle owners in Port Harcourt', channels: ['push', 'sms'], status: 'sent', sendAt: past(4, 3), reach: 18_420 },
  { id: 'ANN-029', title: 'Renew your KYC documents', body: 'Licences expiring this quarter must be re-uploaded to keep listings live.', audience: 'All providers', channels: ['email', 'push'], status: 'sent', sendAt: past(12, 10), reach: 2_960 },
  { id: 'ANN-028', title: 'December service rush', body: 'Book your pre-Christmas trip inspection early.', audience: 'All users', channels: ['push'], status: 'draft', sendAt: null, reach: 0 },
];

/* ---------------- Audit log (FR-1.7) ---------------- */
const ADMINS = ['Adaora N.', 'Kunle B.', 'Maryam S.'];
const AUDIT_TEMPLATES = [
  ['auth', 'Signed in', 'web console'],
  ['auth', 'Failed sign-in (wrong OTP)', 'mobile app'],
  ['auth', '2FA enabled', 'mobile app'],
  ['auth', 'Password reset via OTP', 'mobile app'],
  ['admin', 'Approved KYC', 'KYC-'],
  ['admin', 'Rejected listing', 'LST-'],
  ['admin', 'Suspended user', 'USR-'],
  ['admin', 'Changed commission rate', 'Parts 7% → 8%'],
  ['admin', 'Resolved dispute', 'DSP-'],
  ['admin', 'Sent announcement', 'ANN-'],
];
export const auditLog = Array.from({ length: 40 }, (_, i) => {
  const [kind, action, tgt] = pick(AUDIT_TEMPLATES);
  const isAdmin = kind === 'admin';
  return {
    id: `EVT-${pad(60000 + i, 5)}`,
    at: new Date(now - i * int(1, 5) * HOUR - int(0, 50) * 60000).toISOString(),
    kind,
    actor: isAdmin ? pick(ADMINS) : pick(users).name,
    action,
    target: tgt.endsWith('-') ? `${tgt}${int(100, 9999)}` : tgt,
    ip: `${pick([102, 105, 129, 197, 41])}.${int(1, 254)}.${int(1, 254)}.${int(1, 254)}`,
  };
}).sort((a, b) => b.at.localeCompare(a.at));

/* ---------------- Analytics (FR-13.5) ---------------- */
const WEEKS = 12;
const base = { vehicles: 210_000_000, parts: 38_000_000, services: 26_000_000, haulage: 9_500_000, insurance: 14_000_000 };
export const gmvWeekly = Array.from({ length: WEEKS }, (_, w) => {
  const growth = 1 + w * 0.035;
  const d = new Date(now - (WEEKS - 1 - w) * 7 * DAY);
  const row = { week: d.toISOString() };
  for (const [k, v] of Object.entries(base)) row[k] = Math.round(v * growth * (0.82 + r() * 0.36));
  row.total = Object.keys(base).reduce((s, k) => s + row[k], 0);
  return row;
});

export const activeUsersDaily = Array.from({ length: 30 }, (_, d) => ({
  day: new Date(now - (29 - d) * DAY).toISOString(),
  value: Math.round(9_200 + d * 95 + (new Date(now - (29 - d) * DAY).getDay() % 6 === 0 ? -900 : 0) + r() * 700),
}));

export const platformTotals = {
  registeredUsers: 48_215,
  verifiedProviders: 1_836,
  transactions30d: 12_904,
  uptime: 99.82,
};
