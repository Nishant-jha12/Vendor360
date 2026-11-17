/**
 * Standalone client-side demo engine for Vendor360.
 *
 * Replaces remote HTTP calls with a persistent localStorage-backed store so the
 * full Kirana POS workflow (auth + 2FA OTP, FEFO batch inventory, barcode scan &
 * intake GST register, multilingual voice entry, digital khata, dynamic UPI QR
 * checkout + Soundbox simulation, analytics, and offline sync) runs smoothly
 * without a Python/FastAPI backend.
 */
import QRCode from 'qrcode';

const STORAGE_KEY = 'vendor360_demo_db_v1';

const DEMO_VENDOR_ID = 'demo-vendor-001';
const DEMO_OTP = '123456';

const GS1_PREFIXES = [
  [[0, 19], 'USA / Canada'],
  [[30, 39], 'France'],
  [[300, 379], 'France'],
  [[400, 440], 'Germany'],
  [[450, 459], 'Japan'],
  [[460, 469], 'Russia'],
  [[471, 471], 'Taiwan'],
  [[480, 480], 'Philippines'],
  [[489, 489], 'Hong Kong'],
  [[490, 499], 'Japan'],
  [[500, 509], 'United Kingdom'],
  [[540, 549], 'Belgium / Luxembourg'],
  [[690, 699], 'China'],
  [[800, 839], 'Italy'],
  [[840, 849], 'Spain'],
  [[880, 880], 'South Korea'],
  [[885, 885], 'Thailand'],
  [[888, 888], 'Singapore'],
  [[890, 890], 'India'],
  [[893, 893], 'Vietnam'],
  [[899, 899], 'Indonesia'],
  [[930, 939], 'Australia'],
  [[955, 955], 'Malaysia'],
  [[978, 979], 'Book (ISBN)'],
];

// Helpful offline open-product suggestions for unrecognized barcodes scanned in demo
const OPEN_BARCODE_CATALOG = {
  '8901491101837': { sku_name: "Lay's India's Magic Masala 50g", brand: "Lay's", size: '50 g', category: 'Snacks' },
  '8901764012270': { sku_name: 'Coca-Cola Original Taste 750ml', brand: 'Coca-Cola', size: '750 ml', category: 'Beverages' },
  '8902080000227': { sku_name: 'Bisleri Mineral Water 1L', brand: 'Bisleri', size: '1 L', category: 'Beverages' },
  '7622201425142': { sku_name: 'Cadbury Dairy Milk 52g', brand: 'Cadbury', size: '52 g', category: 'Confectionery' },
  '8901063151017': { sku_name: 'Britannia Good Day Butter 200g', brand: 'Britannia', size: '200 g', category: 'Bakery' },
  '8901396115205': { sku_name: 'Dettol Antiseptic Liquid 250ml', brand: 'Dettol', size: '250 ml', category: 'Household' },
};

const CATALOGUE_SEED = [
  // [name, category, unit, qty, reorder, cost, sell, expiresInDays, barcode, popularity, packType, unitsPerPack, gstRate, hsn]
  ['Amul Taaza Milk 500ml', 'Dairy', 'packets', 24, 10, 27, 33, 2, '8901262010053', 10, 'loose', 1, 0, '0401'],
  ['Britannia Whole Wheat Bread', 'Bakery', 'loaves', 12, 5, 38, 48, 4, '8901063141208', 8, 'loose', 1, 0, '1905'],
  ['Mother Dairy Dahi 400g', 'Dairy', 'cups', 8, 6, 30, 38, 3, '8901648001095', 6, 'loose', 1, 0, '0403'],
  ['Fortune Sunflower Oil 1L', 'Staples', 'pouches', 24, 8, 145, 170, 120, '8906007280014', 5, 'carton', 12, 5, '1512'],
  ['Tata Salt 1kg', 'Staples', 'packets', 40, 15, 22, 28, 365, '8901030381019', 4, 'loose', 1, 0, '2501'],
  ['Aashirvaad Atta 5kg', 'Staples', 'bags', 14, 6, 245, 285, 180, '8901030865278', 5, 'loose', 1, 5, '1101'],
  ['Maggi Noodles 70g', 'Instant', 'packets', 60, 20, 11, 14, 240, '8901058000009', 9, 'carton', 24, 12, '1902'],
  ['Parle-G Biscuits 100g', 'Bakery', 'packets', 50, 20, 8, 10, 200, '8901719101045', 7, 'loose', 1, 18, '1905'],
  ['Red Label Tea 250g', 'Beverages', 'packets', 18, 8, 125, 150, 300, '8901030629471', 4, 'loose', 1, 5, '0902'],
  ['Surf Excel 1kg', 'Household', 'packets', 4, 5, 165, 195, 500, '8901030773631', 3, 'loose', 1, 18, '3402'],
  ['Colgate Toothpaste 100g', 'Personal Care', 'tubes', 16, 6, 52, 65, 400, '8901314010016', 3, 'loose', 1, 18, '3306'],
  ['Sugar 1kg', 'Staples', 'packets', 30, 12, 42, 50, 300, null, 6, 'loose', 1, 5, '1701'],
];

const CUSTOMERS_SEED = [
  ['Ramesh Kumar (Flat 402)', '+91 98231 44120', 1450],
  ['Sunita Verma', '+91 97110 52319', 620],
  ['Amit Patel (Shop #4)', '+91 99882 10924', 3100],
  ['Pooja Sharma', '+91 98450 11982', 0],
];

const INDIC_DIGITS = {
  '\u0966': '0', '\u0967': '1', '\u0968': '2', '\u0969': '3', '\u096a': '4',
  '\u096b': '5', '\u096c': '6', '\u096d': '7', '\u096e': '8', '\u096f': '9',
  '\u09e6': '0', '\u09e7': '1', '\u09e8': '2', '\u09e9': '3', '\u09ea': '4',
  '\u09eb': '5', '\u09ec': '6', '\u09ed': '7', '\u09ee': '8', '\u09ef': '9',
};

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, dozen: 12, fifteen: 15, twenty: 20, fifty: 50, hundred: 100,
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5, panch: 5, chhah: 6, saat: 7, aath: 8, nau: 9, das: 10, bees: 20,
  'এক': 1, 'দুই': 2, 'তিন': 3, 'চার': 4, 'পাঁচ': 5, 'ছয়': 6, 'সাত': 7, 'আট': 8, 'নয়': 9, 'দশ': 10,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10, 'बीस': 20, 'पचास': 50, 'सौ': 100,
  'दोन': 2, 'सहा': 6,
};

const SOLD_PHRASES = [
  'bik gaya', 'bik gaye', 'bik gayi', 'bech diya', 'bech diye',
  'निकल गया', 'बिक गया', 'बिक गए', 'बेच दिया', 'विकले', 'विकला', 'কমেছে', 'বিক্রি হয়েছে',
];

const ADDED_PHRASES = [
  'aa gaya', 'aa gaye', 'aa gayi', 'aaya hai', 'add kar', 'add karo', 'stock me daal',
  'आ गया', 'आ गए', 'आ गई', 'मिला', 'आले', 'आला', 'এসেছে', 'যোগ হয়েছে',
];

const SOLD_WORDS = new Set([
  'sold', 'sell', 'minus', 'remove', 'removed', 'subtract', 'less', 'deduct',
  'becha', 'bech', 'bika', 'nikal', 'kam', 'ghata', 'vikla', 'vikli', 'bikri',
  'बेचा', 'कम', 'बिका', 'ঘাটতি', 'बिक्री',
]);

const ADDED_WORDS = new Set([
  'added', 'add', 'plus', 'received', 'restock', 'restocked', 'got', 'came',
  'aaya', 'laaya', 'mila', 'jodo', 'badhao', 'bharo', 'aahe',
  'जोड़ो', 'मिलाओ', 'आया', 'लाया', 'बढ़ाओ', 'ঢুকেছে', 'যোগ',
]);

const SYNONYMS = {
  'दूध': ['milk', 'taaza', 'amul'],
  'दुध': ['milk', 'taaza', 'amul'],
  'দুধ': ['milk', 'taaza', 'amul'],
  'दही': ['dahi', 'curd'],
  'দই': ['dahi', 'curd'],
  'ब्रेड': ['bread'],
  'পাউরুটি': ['bread'],
  'पाव': ['bread'],
  'नमक': ['salt', 'tata'],
  'मीठ': ['salt', 'tata'],
  'নুন': ['salt', 'tata'],
  'लवण': ['salt'],
  'चीनी': ['sugar'],
  'शक्कर': ['sugar'],
  'साखर': ['sugar'],
  'চিনি': ['sugar'],
  'तेल': ['oil', 'sunflower', 'fortune'],
  'তেল': ['oil', 'sunflower', 'fortune'],
  'आटा': ['atta', 'aashirvaad'],
  'আটা': ['atta', 'aashirvaad'],
  'कणिक': ['atta', 'aashirvaad'],
  'चाय': ['tea', 'red label'],
  'चहा': ['tea', 'red label'],
  'চা': ['tea', 'red label'],
  'बिस्किट': ['biscuit', 'biscuits', 'parle'],
  'বিস্কুট': ['biscuit', 'biscuits', 'parle'],
  'मैगी': ['maggi', 'noodles'],
  'मॅगी': ['maggi', 'noodles'],
  'ম্যাগি': ['maggi', 'noodles'],
  'सर्फ': ['surf', 'excel'],
  'সার্ফ': ['surf', 'excel'],
  'कोलगेट': ['colgate', 'toothpaste'],
  'কোলগেট': ['colgate', 'toothpaste'],
  'अमूल': ['amul'],
  'आमুল': ['amul'],
  'टाटा': ['tata'],
  'টাটা': ['tata'],
  'पारले': ['parle'],
  'ब्रिटानिया': ['britannia'],
  'फॉर्च्यून': ['fortune'],
  'आशीर्वाद': ['aashirvaad', 'atta'],
};

const REVERSE_SYNONYMS = {};
for (const [k, list] of Object.entries(SYNONYMS)) {
  for (const s of list) {
    const key = s.toLowerCase();
    if (!REVERSE_SYNONYMS[key]) REVERSE_SYNONYMS[key] = [];
    REVERSE_SYNONYMS[key].push(k.toLowerCase());
  }
}

function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function round3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}

function localDateKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base, days) {
  const dt = new Date(base.getTime());
  dt.setDate(dt.getDate() + days);
  return dt;
}

function daysBetween(futureIso, nowMs) {
  return Math.max(0, Math.floor((new Date(futureIso).getTime() - nowMs) / 86400000));
}

function createPrng(seed = 42) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function httpError(status, detail) {
  const err = new Error(detail);
  err.response = {
    status,
    statusText: String(status),
    data: { detail },
  };
  err.isAxiosError = true;
  return err;
}

function normaliseBarcode(code) {
  return String(code || '').replace(/[^0-9]/g, '');
}

function checkDigitOk(digits) {
  if (![8, 12, 13, 14].includes(digits.length)) return null;
  const body = digits.slice(0, -1);
  const check = Number(digits.slice(-1));
  let total = 0;
  for (let idx = 0; idx < body.length; idx += 1) {
    const ch = Number(body[body.length - 1 - idx]);
    total += ch * (idx % 2 === 0 ? 3 : 1);
  }
  return (10 - (total % 10)) % 10 === check;
}

function countryOfOrigin(digits) {
  if (digits.length < 3) return null;
  const prefix = Number(digits.slice(0, 3));
  for (const [[low, high], name] of GS1_PREFIXES) {
    if (prefix >= low && prefix <= high) return name;
  }
  return null;
}

function describeBarcode(raw) {
  const digits = normaliseBarcode(raw);
  return {
    barcode: digits,
    check_digit_valid: checkDigitOk(digits),
    country: countryOfOrigin(digits),
    symbology: { 8: 'EAN-8', 12: 'UPC-A', 13: 'EAN-13', 14: 'ITF-14' }[digits.length] || null,
  };
}

function similarityRatio(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  let maxLen = 0;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) maxLen = dp[i][j];
      }
    }
  }
  return (2 * maxLen) / (m + n);
}

function seedVendorStore(db, vendorId) {
  const now = new Date();
  const vendor = db.vendors.find((v) => v.id === vendorId);
  if (vendor && !vendor.upi_id) vendor.upi_id = 'sharmakirana@okaxis';
  if (vendor && !vendor.gstin) vendor.gstin = '27AABCU9603R1ZM';

  // Wipe vendor-owned collections cleanly
  db.inventory = db.inventory.filter((i) => i.vendor_id !== vendorId);
  db.batches = db.batches.filter((b) => b.vendor_id !== vendorId);
  db.customers = db.customers.filter((c) => c.vendor_id !== vendorId);
  db.sales = db.sales.filter((s) => s.vendor_id !== vendorId);
  db.intakes = db.intakes.filter((s) => s.vendor_id !== vendorId);
  db.payments = db.payments.filter((p) => p.vendor_id !== vendorId);
  db.activities = db.activities.filter((a) => a.vendor_id !== vendorId);

  const items = [];
  const weights = [];

  for (const row of CATALOGUE_SEED) {
    const [
      sku_name, category, unit, current_qty, reorder_point, cost_price,
      selling_price, expiresInDays, barcode, popularity, pack_type, units_per_pack, gst_rate, hsn_code,
    ] = row;

    const expiryIso = addDays(now, expiresInDays).toISOString();
    const item = {
      id: uid('itm'),
      vendor_id: vendorId,
      sku_name,
      category,
      unit,
      current_qty,
      reorder_point,
      cost_price,
      selling_price,
      expiry_date: expiryIso,
      mfg_date: addDays(now, -10).toISOString(),
      barcode,
      pack_type,
      units_per_pack,
      gst_rate,
      hsn_code,
      sale_count: popularity * 3,
      is_archived: false,
      last_updated: now.toISOString(),
    };
    db.inventory.push(item);
    items.push(item);
    weights.push(popularity);

    // Split Amul Taaza Milk across two FEFO batches so batch inspection shows multiple lots
    if (sku_name.includes('Amul Taaza')) {
      db.batches.push(
        {
          id: uid('bat'),
          vendor_id: vendorId,
          item_id: item.id,
          batch_no: 'AM-204A',
          qty_received: 10,
          qty_remaining: 10,
          unit_cost: cost_price,
          mfg_date: addDays(now, -1).toISOString(),
          expiry_date: addDays(now, 2).toISOString(),
          received_at: addDays(now, -1).toISOString(),
          intake_line_id: null,
        },
        {
          id: uid('bat'),
          vendor_id: vendorId,
          item_id: item.id,
          batch_no: 'AM-209B',
          qty_received: 14,
          qty_remaining: 14,
          unit_cost: cost_price,
          mfg_date: now.toISOString(),
          expiry_date: addDays(now, 5).toISOString(),
          received_at: now.toISOString(),
          intake_line_id: null,
        },
      );
    } else {
      db.batches.push({
        id: uid('bat'),
        vendor_id: vendorId,
        item_id: item.id,
        batch_no: `LOT-${barcode ? barcode.slice(-4) : '01'}`,
        qty_received: current_qty,
        qty_remaining: current_qty,
        unit_cost: cost_price,
        mfg_date: addDays(now, -15).toISOString(),
        expiry_date: expiryIso,
        received_at: addDays(now, -15).toISOString(),
        intake_line_id: null,
      });
    }
  }

  const customers = [];
  for (let idx = 0; idx < CUSTOMERS_SEED.length; idx += 1) {
    const [name, phone, balance] = CUSTOMERS_SEED[idx];
    const cust = {
      id: uid('cust'),
      vendor_id: vendorId,
      name,
      phone,
      total_credit_balance: balance,
      khata_transactions: balance > 0
        ? [
            {
              id: uid('ktx'),
              amount: balance,
              transaction_type: 'credit',
              notes: 'Opening balance',
              date: addDays(now, -(5 + idx * 3)).toISOString(),
            },
          ]
        : [],
    };
    db.customers.push(cust);
    customers.push(cust);
  }

  // Deterministic 30 days of synthetic sales so Dashboard, Forecast & HealthScore light up immediately
  const rng = createPrng(42);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const pickWeightedItem = () => {
    let r = rng() * weightSum;
    for (let i = 0; i < items.length; i += 1) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[0];
  };

  let salesCount = 0;
  for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
    const dayDate = addDays(now, -daysAgo);
    const weekday = dayDate.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const billsToday = daysAgo === 0
      ? 6
      : (isWeekend ? 9 + Math.floor(rng() * 7) : 5 + Math.floor(rng() * 6));

    for (let b = 0; b < billsToday; b += 1) {
      const billDate = new Date(dayDate.getTime());
      const maxHour = daysAgo === 0 ? Math.max(8, now.getHours()) : 21;
      billDate.setHours(8 + Math.floor(rng() * Math.max(1, maxHour - 7)), Math.floor(rng() * 55), 0, 0);

      const lineCount = 1 + Math.floor(rng() * 3);
      const lineItems = [];
      let totalAmount = 0;
      let totalCost = 0;

      for (let li = 0; li < lineCount; li += 1) {
        const chosen = pickWeightedItem();
        const qtyVal = 1 + Math.floor(rng() * 3);
        lineItems.push({
          id: uid('sli'),
          item_id: chosen.id,
          sku_name: chosen.sku_name,
          qty: qtyVal,
          unit_price: chosen.selling_price,
          unit_cost: chosen.cost_price,
          allocations: [],
        });
        totalAmount += qtyVal * chosen.selling_price;
        totalCost += qtyVal * chosen.cost_price;
      }

      const modePick = rng();
      const payment_mode = modePick < 0.5 ? 'cash' : modePick < 0.88 ? 'upi' : 'khata';
      const cust = payment_mode === 'khata'
        ? customers[Math.floor(rng() * customers.length)]
        : null;

      db.sales.push({
        id: uid('sale'),
        offline_id: uid('off'),
        vendor_id: vendorId,
        customer_id: cust ? cust.id : null,
        customer_name: cust ? cust.name : null,
        payment_mode,
        total_amount: round2(totalAmount),
        total_cost: round2(totalCost),
        note: null,
        created_at: billDate.toISOString(),
        line_items: lineItems,
      });
      salesCount += 1;
    }
  }

  // Two closed supplier deliveries in the current month so Deliveries + GST Purchase Register work immediately
  const oilItem = items.find((i) => i.sku_name.includes('Fortune'));
  const maggiItem = items.find((i) => i.sku_name.includes('Maggi'));
  const deliveryStart1 = addDays(now, -2);
  const deliveryStart2 = addDays(now, -6);

  const buildClosedLine = (item, packs, perPack, batchNo) => {
    const qtyUnits = round3(packs * perPack);
    const taxable = round2(qtyUnits * item.cost_price);
    const gst = round2((taxable * (item.gst_rate || 0)) / 100);
    return {
      id: uid('inl'),
      item_id: item.id,
      sku_name: item.sku_name,
      barcode: item.barcode,
      hsn_code: item.hsn_code || '2106',
      pack_type: item.pack_type || 'carton',
      packs,
      units_per_pack: perPack,
      qty_units: qtyUnits,
      unit_cost: item.cost_price,
      unit_price: item.selling_price,
      gst_rate: item.gst_rate || 0,
      taxable_value: taxable,
      gst_amount: gst,
      line_total: round2(taxable + gst),
      batch_no: batchNo,
      mfg_date: addDays(now, -20).toISOString(),
      expiry_date: item.expiry_date,
      source: 'barcode',
      created_at: deliveryStart1.toISOString(),
    };
  };

  if (oilItem && maggiItem) {
    const lines1 = [
      buildClosedLine(oilItem, 2, 12, 'FO-882'),
      buildClosedLine(maggiItem, 2, 24, 'MG-419'),
    ];
    db.intakes.push({
      id: uid('intk'),
      vendor_id: vendorId,
      status: 'closed',
      supplier_name: 'Mahalaxmi FMCG Distributors',
      supplier_gstin: '27AAACM4125K1Z8',
      invoice_no: 'INV-2026-1042',
      invoice_date: deliveryStart1.toISOString(),
      note: 'Weekly FMCG wholesale restock',
      started_at: deliveryStart1.toISOString(),
      closed_at: deliveryStart1.toISOString(),
      lines: lines1,
    });

    const teaItem = items.find((i) => i.sku_name.includes('Red Label'));
    if (teaItem) {
      const lines2 = [buildClosedLine(teaItem, 18, 1, 'RL-109')];
      db.intakes.push({
        id: uid('intk'),
        vendor_id: vendorId,
        status: 'closed',
        supplier_name: 'Deccan Chai & Staples Traders',
        supplier_gstin: '27AABCS9042H1Z1',
        invoice_no: 'DCS-887',
        invoice_date: deliveryStart2.toISOString(),
        note: 'Beverage replenishment',
        started_at: deliveryStart2.toISOString(),
        closed_at: deliveryStart2.toISOString(),
        lines: lines2,
      });
    }
  }

  db.activities.push(
    {
      id: uid('act'),
      vendor_id: vendorId,
      action: 'Demo Store Loaded',
      details: `${items.length} products, ${customers.length} khata accounts, and ${salesCount} bills ready.`,
      created_at: new Date(now.getTime() - 120000).toISOString(),
    },
    {
      id: uid('act'),
      vendor_id: vendorId,
      action: 'Expiry Alert Triggered',
      details: 'Amul Taaza Milk 500ml (Batch AM-204A) expires in 2 days.',
      created_at: new Date(now.getTime() - 1800000).toISOString(),
    },
    {
      id: uid('act'),
      vendor_id: vendorId,
      action: 'UPI Payment Received',
      details: 'Rs 285.00 received from Amit Desai (UTR: 482910384712)',
      created_at: new Date(now.getTime() - 3600000).toISOString(),
    },
  );

  return {
    products: items.length,
    customers: customers.length,
    sales: salesCount,
  };
}

function createInitialDb() {
  const now = new Date();
  const db = {
    version: 1,
    vendors: [
      {
        id: DEMO_VENDOR_ID,
        name: 'Rajesh Sharma',
        username: 'testowner',
        email: 'test@vendor360.local',
        phone: '+91 98231 44120',
        store_name: 'Sharma Kirana & General Store',
        upi_id: 'sharmakirana@okaxis',
        gstin: '27AABCU9603R1ZM',
        password: 'Test@123456',
        token_version: 1,
        created_at: now.toISOString(),
      },
    ],
    inventory: [],
    batches: [],
    customers: [],
    sales: [],
    intakes: [],
    payments: [],
    activities: [],
    securityLogs: [
      {
        id: uid('sec'),
        vendor_id: DEMO_VENDOR_ID,
        event: 'login.verified',
        outcome: 'allowed',
        description: 'Signed in with 2FA code',
        device: 'Store Counter Browser (Demo Mode)',
        created_at: new Date(now.getTime() - 3600000).toISOString(),
      },
    ],
    challenges: {},
    resets: {},
  };
  seedVendorStore(db, DEMO_VENDOR_ID);
  return db;
}

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.vendors) && parsed.vendors.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fall back to fresh seeded DB if localStorage is corrupted
  }
  const initial = createInitialDb();
  saveDb(initial);
  return initial;
}

function saveDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Quota exceeded in private mode - keep running in memory for current tab
  }
}

function vendorPublic(v) {
  return {
    id: v.id,
    name: v.name,
    username: v.username,
    email: v.email,
    phone: v.phone,
    store_name: v.store_name,
    upi_id: v.upi_id,
    gstin: v.gstin,
  };
}

function makeToken(vendor) {
  return `demo.${vendor.id}.${vendor.token_version || 1}`;
}

function getAuthenticatedVendor(db, config) {
  const rawAuth =
    config.headers?.Authorization ||
    config.headers?.authorization ||
    (typeof localStorage !== 'undefined' ? (() => {
      try {
        const stored = JSON.parse(localStorage.getItem('vendor_auth') || sessionStorage.getItem('vendor_auth') || 'null');
        return stored?.token ? `Bearer ${stored.token}` : '';
      } catch {
        return '';
      }
    })() : '');

  const token = String(rawAuth).replace(/^Bearer\s+/i, '').trim();
  if (!token) throw httpError(401, 'Not signed in');

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'demo') {
    throw httpError(401, 'Session expired. Please sign in again.');
  }
  const [, vendorId, verStr] = parts;
  const vendor = db.vendors.find((v) => v.id === vendorId);
  if (!vendor || Number(verStr) !== (vendor.token_version || 1)) {
    throw httpError(401, 'Session expired. Please sign in again.');
  }
  return vendor;
}

function openBatchesForItem(db, itemId) {
  return db.batches
    .filter((b) => b.item_id === itemId && (b.qty_remaining || 0) > 0)
    .sort((a, b) => {
      if (a.expiry_date && b.expiry_date) {
        const diff = new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        if (diff !== 0) return diff;
      } else if (a.expiry_date) {
        return -1;
      } else if (b.expiry_date) {
        return 1;
      }
      return new Date(a.received_at).getTime() - new Date(b.received_at).getTime();
    });
}

function reconcileItemFromBatches(db, item) {
  const open = openBatchesForItem(db, item.id);
  item.current_qty = round3(open.reduce((sum, b) => sum + (b.qty_remaining || 0), 0));
  const dated = open.filter((b) => b.expiry_date);
  item.expiry_date = dated.length ? dated[0].expiry_date : item.expiry_date;
  item.last_updated = new Date().toISOString();
}

function addStockToBatches(db, vendorId, item, qtyUnits, opts = {}) {
  const batch = {
    id: uid('bat'),
    vendor_id: vendorId,
    item_id: item.id,
    batch_no: opts.batch_no || `LOT-${Date.now().toString().slice(-4)}`,
    qty_received: round3(qtyUnits),
    qty_remaining: round3(qtyUnits),
    unit_cost: round2(opts.unit_cost ?? item.cost_price ?? 0),
    mfg_date: opts.mfg_date || null,
    expiry_date: opts.expiry_date ?? item.expiry_date ?? null,
    received_at: new Date().toISOString(),
    intake_line_id: opts.intake_line_id || null,
  };
  db.batches.push(batch);
  reconcileItemFromBatches(db, item);
  return batch;
}

function consumeStockFEFO(db, item, qtyNeeded) {
  let remainingToTake = round3(qtyNeeded);
  const open = openBatchesForItem(db, item.id);
  const allocations = [];
  let costAcc = 0;

  for (const batch of open) {
    if (remainingToTake <= 0) break;
    const take = round3(Math.min(batch.qty_remaining, remainingToTake));
    batch.qty_remaining = round3(batch.qty_remaining - take);
    remainingToTake = round3(remainingToTake - take);
    costAcc += take * (batch.unit_cost ?? item.cost_price ?? 0);
    allocations.push({ batch_id: batch.id, qty: take, unit_cost: batch.unit_cost ?? item.cost_price ?? 0 });
  }

  // Any uncovered remainder (oversold negative safeguard -> track cost using item.cost_price)
  if (remainingToTake > 0) {
    costAcc += remainingToTake * (item.cost_price || 0);
  }
  reconcileItemFromBatches(db, item);
  return { cost: round2(costAcc), allocations };
}

function computeIntakeSummary(session, vendor) {
  const lines = [...(session.lines || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  let taxableTotal = 0;
  let gstTotal = 0;
  let unitTotal = 0;
  const byRate = new Map();

  for (const line of lines) {
    taxableTotal += line.taxable_value || 0;
    gstTotal += line.gst_amount || 0;
    unitTotal += line.qty_units || 0;
    const rKey = line.gst_rate || 0;
    if (!byRate.has(rKey)) {
      byRate.set(rKey, { rate: rKey, taxable_value: 0, gst_amount: 0 });
    }
    const bucket = byRate.get(rKey);
    bucket.taxable_value = round2(bucket.taxable_value + (line.taxable_value || 0));
    bucket.gst_amount = round2(bucket.gst_amount + (line.gst_amount || 0));
  }

  const vendorGstin = (vendor.gstin || '').trim();
  const supplierGstin = (session.supplier_gstin || '').trim();
  const interstate = Boolean(vendorGstin && supplierGstin && vendorGstin.slice(0, 2) !== supplierGstin.slice(0, 2));
  const taxBasisAssumed = !(vendorGstin && supplierGstin);

  const gstBreakup = [...byRate.values()]
    .sort((a, b) => a.rate - b.rate)
    .map((bucket) => {
      if (interstate) {
        return { ...bucket, igst: bucket.gst_amount, cgst: 0, sgst: 0, total: round2(bucket.taxable_value + bucket.gst_amount) };
      }
      const half = round2(bucket.gst_amount / 2);
      return {
        ...bucket,
        igst: 0,
        cgst: half,
        sgst: round2(bucket.gst_amount - half),
        total: round2(bucket.taxable_value + bucket.gst_amount),
      };
    });

  return {
    intake: session,
    store: {
      name: vendor.store_name,
      owner: vendor.name,
      phone: vendor.phone,
      gstin: vendor.gstin,
    },
    totals: {
      line_count: lines.length,
      total_units: round3(unitTotal),
      taxable_value: round2(taxableTotal),
      gst_amount: round2(gstTotal),
      grand_total: round2(taxableTotal + gstTotal),
    },
    gst_breakup: gstBreakup,
    interstate,
    tax_basis_assumed: taxBasisAssumed,
    gst_ready: Boolean(vendor.gstin) && gstTotal > 0,
    generated_at: new Date().toISOString(),
  };
}

function processSingleSale(db, vendor, req) {
  if (req.offline_id) {
    const existing = db.sales.find((s) => s.vendor_id === vendor.id && s.offline_id === req.offline_id);
    if (existing) {
      const existingCust = existing.customer_id
        ? db.customers.find((c) => c.id === existing.customer_id)
        : null;
      return {
        sale: existing,
        stock_warnings: [],
        customer_balance: existingCust ? existingCust.total_credit_balance : null,
        duplicate: true,
      };
    }
  }

  let customer = null;
  if (req.customer_id) {
    customer = db.customers.find((c) => c.id === req.customer_id && c.vendor_id === vendor.id);
    if (!customer) throw httpError(404, 'Customer not found');
  }
  if (req.payment_mode === 'khata' && !customer) {
    throw httpError(400, 'Select a customer to record a Khata bill');
  }

  const lineItems = [];
  const stockWarnings = [];
  let totalAmount = 0;
  let totalCost = 0;

  for (const entry of req.items || []) {
    const item = entry.item_id
      ? db.inventory.find((i) => i.id === entry.item_id && i.vendor_id === vendor.id && !i.is_archived)
      : null;

    const unitPrice = Number(entry.unit_price ?? item?.selling_price ?? 0);
    const qtyVal = round3(entry.qty || 1);
    const lineAmount = round2(qtyVal * unitPrice);
    totalAmount += lineAmount;

    let costVal = round2(qtyVal * (item?.cost_price || 0));
    let allocations = [];

    if (item) {
      const consumed = consumeStockFEFO(db, item, qtyVal);
      costVal = consumed.cost;
      allocations = consumed.allocations;
      item.sale_count = (item.sale_count || 0) + 1;

      if ((item.current_qty || 0) <= (item.reorder_point || 0)) {
        stockWarnings.push(`${item.sku_name} is low (${item.current_qty} ${item.unit} left)`);
      }
    }

    totalCost += costVal;
    lineItems.push({
      id: uid('sli'),
      item_id: item?.id || entry.item_id || null,
      sku_name: item?.sku_name || entry.sku_name || 'Item',
      qty: qtyVal,
      unit_price: unitPrice,
      unit_cost: item?.cost_price || 0,
      allocations,
    });
  }

  totalAmount = round2(totalAmount);
  totalCost = round2(totalCost);

  const sale = {
    id: uid('sale'),
    offline_id: req.offline_id || uid('off'),
    vendor_id: vendor.id,
    customer_id: customer ? customer.id : null,
    customer_name: customer ? customer.name : null,
    payment_mode: req.payment_mode || 'cash',
    total_amount: totalAmount,
    total_cost: totalCost,
    note: req.note || null,
    created_at: req.created_at || new Date().toISOString(),
    line_items: lineItems,
  };
  db.sales.push(sale);

  if (req.payment_mode === 'khata' && customer) {
    customer.total_credit_balance = round2((customer.total_credit_balance || 0) + totalAmount);
    customer.khata_transactions = customer.khata_transactions || [];
    customer.khata_transactions.push({
      id: uid('ktx'),
      amount: totalAmount,
      transaction_type: 'credit',
      notes: `Bill #${sale.id.slice(-6).toUpperCase()}`,
      date: sale.created_at,
    });
  }

  db.activities.unshift({
    id: uid('act'),
    vendor_id: vendor.id,
    action: `${(req.payment_mode || 'cash').toUpperCase()} Sale`,
    details: `Rs ${totalAmount.toFixed(2)} across ${lineItems.length} item(s)${customer ? ` (${customer.name})` : ''}`,
    created_at: new Date().toISOString(),
  });

  return {
    sale,
    stock_warnings: stockWarnings,
    customer_balance: customer ? customer.total_credit_balance : null,
    duplicate: false,
  };
}

function parseVoiceTranscript(transcript, items) {
  const text = String(transcript || '').toLowerCase().trim();
  const words = text.match(/[a-z0-9\u0900-\u097f\u0980-\u09ff]+/g) || [];

  let qty = null;
  for (const w of words) {
    const normalizedDigits = [...w].map((ch) => INDIC_DIGITS[ch] || ch).join('');
    if (/^\d+$/.test(normalizedDigits)) {
      qty = Number(normalizedDigits);
      break;
    }
    if (NUMBER_WORDS[w] !== undefined) {
      qty = Number(NUMBER_WORDS[w]);
      break;
    }
  }
  if (qty === null) qty = 1;

  let direction = 1;
  if (ADDED_PHRASES.some((p) => text.includes(p))) direction = 1;
  else if (SOLD_PHRASES.some((p) => text.includes(p))) direction = -1;
  else if (words.some((w) => SOLD_WORDS.has(w))) direction = -1;
  else if (words.some((w) => ADDED_WORDS.has(w))) direction = 1;

  let bestItem = null;
  let bestScore = 0;

  for (const item of items) {
    const name = (item.sku_name || '').toLowerCase();
    if (!name) continue;
    let score = similarityRatio(text, name);
    const nameTokens = name.match(/[a-z0-9\u0900-\u097f\u0980-\u09ff]+/g) || [];

    for (const spoken of words) {
      const isIndic = /[\u0900-\u09ff]/.test(spoken);
      const minLen = isIndic ? 2 : 3;
      if (spoken.length < minLen || /^\d+$/.test(spoken) || NUMBER_WORDS[spoken] !== undefined) {
        continue;
      }
      if (name.includes(spoken)) score = Math.max(score, 0.8);
      for (const token of nameTokens) {
        score = Math.max(score, similarityRatio(spoken, token) * 0.95);
      }
      const syns = [...(SYNONYMS[spoken] || []), ...(REVERSE_SYNONYMS[spoken] || [])];
      for (const syn of syns) {
        if (name.includes(syn) || nameTokens.some((tok) => tok === syn)) {
          score = Math.max(score, 0.92);
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  const matched = bestScore >= 0.55 ? bestItem : null;
  return {
    understood: matched !== null,
    transcript,
    item_id: matched ? matched.id : null,
    sku_name: matched ? matched.sku_name : null,
    qty,
    direction,
    confidence: round2(bestScore),
    message: matched
      ? `${direction < 0 ? 'Remove' : 'Add'} ${qty} ${direction < 0 ? 'from' : 'to'} ${matched.sku_name}?`
      : 'Could not match that to a product. Pick one below.',
    candidates: items.slice(0, 20).map((i) => ({
      id: i.id,
      sku_name: i.sku_name,
      current_qty: i.current_qty,
    })),
  };
}

function normalizePath(url, baseURL) {
  let raw = String(url || '');
  if (baseURL && raw.startsWith(baseURL)) {
    raw = raw.slice(baseURL.length);
  }
  raw = raw.replace(/^https?:\/\/[^/]+/, '');
  const [pathOnly, qs] = raw.split('?');
  let clean = pathOnly.replace(/^\/api(?=\/|$)/, '');
  if (!clean.startsWith('/')) clean = `/${clean}`;
  if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
  return { path: clean, searchParams: new URLSearchParams(qs || '') };
}

function parseBody(data) {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
}

export async function handleDemoRequest(config) {
  const db = loadDb();
  const method = String(config.method || 'get').toLowerCase();
  const { path, searchParams } = normalizePath(config.url, config.baseURL);

  const params = { ...Object.fromEntries(searchParams.entries()), ...(config.params || {}) };
  const body = parseBody(config.data);

  // Brief natural yield so async loading skeletons behave identically to real HTTP
  await new Promise((r) => setTimeout(r, 25));

  // ---------- Health ----------
  if (method === 'get' && path === '/health') {
    return { status: 'ok', mode: 'demo', timestamp: new Date().toISOString() };
  }

  // ---------- Auth ----------
  if (method === 'post' && path === '/auth/signup') {
    const username = String(body.username || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    if (!username || !email || !body.password) {
      throw httpError(422, 'Name, username, email, phone and password are required');
    }
    const exists = db.vendors.find(
      (v) => v.username.toLowerCase() === username.toLowerCase() || v.email.toLowerCase() === email,
    );
    if (exists) {
      throw httpError(409, 'An account with that username or email already exists');
    }
    const vendor = {
      id: uid('vnd'),
      name: String(body.name || username).trim(),
      username,
      email,
      phone: String(body.phone || '').trim(),
      store_name: `${String(body.name || username).trim()}'s Kirana Store`,
      upi_id: `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@okaxis`,
      gstin: null,
      password: String(body.password),
      token_version: 1,
      created_at: new Date().toISOString(),
    };
    db.vendors.push(vendor);
    // Seed starter inventory & sample sales so new demo signup users immediately explore full functionality
    seedVendorStore(db, vendor.id);
    const challengeToken = uid('chg');
    db.challenges[challengeToken] = { vendor_id: vendor.id, otp: DEMO_OTP, expires_at: Date.now() + 600000 };
    db.securityLogs.unshift({
      id: uid('sec'),
      vendor_id: vendor.id,
      event: 'signup.created',
      outcome: 'allowed',
      description: 'Store account created',
      device: 'Store Browser (Demo Mode)',
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return {
      challenge_token: challengeToken,
      debug_otp: DEMO_OTP,
      message: 'Account created. Enter verification code.',
    };
  }

  if (method === 'post' && path === '/auth/login') {
    const id = String(body.identifier || '').trim().toLowerCase();
    const pwd = String(body.password || '');
    const vendor = db.vendors.find(
      (v) => v.username.toLowerCase() === id || v.email.toLowerCase() === id,
    );
    if (!vendor || vendor.password !== pwd) {
      if (vendor) {
        db.securityLogs.unshift({
          id: uid('sec'),
          vendor_id: vendor.id,
          event: 'login.failed',
          outcome: 'denied',
          description: 'Wrong password entered',
          device: 'Store Browser (Demo Mode)',
          created_at: new Date().toISOString(),
        });
        saveDb(db);
      }
      throw httpError(401, 'Incorrect username or password');
    }
    const challengeToken = uid('chg');
    db.challenges[challengeToken] = { vendor_id: vendor.id, otp: DEMO_OTP, expires_at: Date.now() + 600000 };
    db.securityLogs.unshift({
      id: uid('sec'),
      vendor_id: vendor.id,
      event: 'login.password_ok',
      outcome: 'allowed',
      description: 'Password verified, OTP sent',
      device: 'Store Browser (Demo Mode)',
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return {
      challenge_token: challengeToken,
      debug_otp: DEMO_OTP,
      message: 'Verification code sent.',
    };
  }

  if (method === 'post' && path === '/auth/verify-otp') {
    const ch = db.challenges[body.challenge_token];
    if (!ch || ch.expires_at < Date.now()) {
      throw httpError(401, 'That sign-in attempt expired. Enter your password again.');
    }
    if (String(body.otp || '').trim() !== ch.otp && String(body.otp || '').trim() !== DEMO_OTP) {
      throw httpError(401, 'Incorrect verification code');
    }
    const vendor = db.vendors.find((v) => v.id === ch.vendor_id);
    if (!vendor) throw httpError(401, 'Account not found');
    delete db.challenges[body.challenge_token];
    db.securityLogs.unshift({
      id: uid('sec'),
      vendor_id: vendor.id,
      event: 'login.verified',
      outcome: 'allowed',
      description: 'Signed in with 2FA code',
      device: 'Store Browser (Demo Mode)',
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return {
      token: makeToken(vendor),
      vendor: vendorPublic(vendor),
    };
  }

  if (method === 'post' && path === '/auth/resend-otp') {
    const prev = db.challenges[body.challenge_token];
    if (!prev) throw httpError(401, 'That sign-in attempt expired. Enter your password again.');
    delete db.challenges[body.challenge_token];
    const nextToken = uid('chg');
    db.challenges[nextToken] = { vendor_id: prev.vendor_id, otp: DEMO_OTP, expires_at: Date.now() + 600000 };
    saveDb(db);
    return {
      challenge_token: nextToken,
      debug_otp: DEMO_OTP,
      message: 'A new code has been sent.',
    };
  }

  if (method === 'post' && path === '/auth/forgot-password') {
    const id = String(body.identifier || '').trim().toLowerCase();
    const vendor = db.vendors.find(
      (v) => v.username.toLowerCase() === id || v.email.toLowerCase() === id,
    );
    if (vendor) {
      const rt = uid('rst');
      db.resets[rt] = { vendor_id: vendor.id, expires_at: Date.now() + 1800000 };
      saveDb(db);
    }
    return { message: 'If that account exists in this demo store, reset instructions have been processed.' };
  }

  if (method === 'post' && path === '/auth/reset-password') {
    const rec = db.resets[body.reset_token];
    if (!rec || rec.expires_at < Date.now()) {
      throw httpError(400, 'That reset link is no longer valid');
    }
    const vendor = db.vendors.find((v) => v.id === rec.vendor_id);
    if (!vendor) throw httpError(404, 'Account not found');
    vendor.password = String(body.new_password || '');
    vendor.token_version = (vendor.token_version || 1) + 1;
    delete db.resets[body.reset_token];
    saveDb(db);
    return { message: 'Password updated.' };
  }

  // ---------- Authenticated Vendor Endpoints ----------
  const vendor = getAuthenticatedVendor(db, config);

  if (method === 'get' && (path === '/auth/me' || path === '/vendor/me')) {
    return vendorPublic(vendor);
  }

  if (method === 'put' && path === '/vendor/me') {
    if (body.name !== undefined) vendor.name = String(body.name).trim() || vendor.name;
    if (body.store_name !== undefined) vendor.store_name = String(body.store_name).trim() || vendor.store_name;
    if (body.phone !== undefined) vendor.phone = body.phone ? String(body.phone).trim() : null;
    if (body.upi_id !== undefined) vendor.upi_id = body.upi_id ? String(body.upi_id).trim() : null;
    if (body.gstin !== undefined) vendor.gstin = body.gstin ? String(body.gstin).trim().toUpperCase() : null;
    saveDb(db);
    return vendorPublic(vendor);
  }

  if (method === 'get' && path === '/auth/security-log') {
    const limit = Number(params.limit || 50);
    return db.securityLogs
      .filter((s) => s.vendor_id === vendor.id)
      .slice(0, limit);
  }

  if (method === 'post' && path === '/auth/logout-all') {
    vendor.token_version = (vendor.token_version || 1) + 1;
    db.securityLogs.unshift({
      id: uid('sec'),
      vendor_id: vendor.id,
      event: 'session.revoked_all',
      outcome: 'allowed',
      description: 'Signed out all devices',
      device: 'Store Browser (Demo Mode)',
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return { message: 'All sessions signed out' };
  }

  // ---------- Demo Seeder ----------
  if (method === 'post' && (path === '/demo/seed' || path === '/demo/reset')) {
    const counts = seedVendorStore(db, vendor.id);
    saveDb(db);
    return { status: 'seeded', ...counts };
  }

  // ---------- Inventory ----------
  const myItems = () =>
    db.inventory.filter((i) => i.vendor_id === vendor.id && !i.is_archived);

  if (method === 'get' && path === '/inventory') {
    let list = myItems();
    if (params.search) {
      const q = String(params.search).trim().toLowerCase();
      list = list.filter(
        (i) =>
          (i.sku_name || '').toLowerCase().includes(q) ||
          (i.barcode || '').toLowerCase().includes(q),
      );
    }
    if (String(params.low_stock_only) === 'true') {
      list = list.filter((i) => (i.current_qty || 0) <= (i.reorder_point || 0));
    }
    list.sort((a, b) => (a.sku_name || '').localeCompare(b.sku_name || ''));
    const offset = Number(params.offset || 0);
    const limit = Number(params.limit || 500);
    return list.slice(offset, offset + limit);
  }

  if (method === 'get' && path === '/inventory/frequent') {
    const limit = Number(params.limit || 12);
    return myItems()
      .sort((a, b) => (b.sale_count || 0) - (a.sale_count || 0) || a.sku_name.localeCompare(b.sku_name))
      .slice(0, limit);
  }

  if (method === 'get' && path === '/inventory/expiring-soon') {
    const days = Number(params.days || 7);
    const nowMs = Date.now();
    const thresholdMs = nowMs + days * 86400000;
    const itemMap = new Map(myItems().map((i) => [i.id, i]));
    const rows = [];

    for (const batch of db.batches) {
      if (batch.vendor_id !== vendor.id || (batch.qty_remaining || 0) <= 0 || !batch.expiry_date) {
        continue;
      }
      const item = itemMap.get(batch.item_id);
      if (!item) continue;
      const expMs = new Date(batch.expiry_date).getTime();
      if (expMs > thresholdMs) continue;

      const isExpired = expMs < nowMs;
      const daysLeft = isExpired ? 0 : daysBetween(batch.expiry_date, nowMs);
      const urgency = isExpired ? 'expired' : daysLeft <= 2 ? 'critical' : 'warning';
      const lotCost = batch.unit_cost || item.cost_price || 0;
      let discountPct = 0;
      let suggested = 0;
      if (!isExpired) {
        discountPct = daysLeft <= 1 ? 30 : daysLeft <= 2 ? 20 : 10;
        suggested = round2((item.selling_price || 0) * (1 - discountPct / 100));
        if (lotCost && suggested < lotCost) suggested = round2(lotCost);
      }

      rows.push({
        ...item,
        expiry_date: batch.expiry_date,
        current_qty: batch.qty_remaining,
        batch_id: batch.id,
        batch_no: batch.batch_no,
        qty_at_risk: batch.qty_remaining,
        days_left: daysLeft,
        urgency,
        estimated_loss_risk: round2((batch.qty_remaining || 0) * lotCost),
        suggested_discount_pct: discountPct,
        suggested_price: suggested,
      });
    }

    rows.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
    return rows;
  }

  if (method === 'post' && path === '/inventory/voice-entry') {
    const items = myItems();
    if (!body.commit) {
      return parseVoiceTranscript(body.transcript, items);
    }
    const item = items.find((i) => i.id === body.item_id);
    if (!item) throw httpError(404, 'Product not found');
    const signedQty = Number(body.qty || 0);
    if (signedQty > 0) {
      addStockToBatches(db, vendor.id, item, signedQty, { unit_cost: item.cost_price });
    } else if (signedQty < 0) {
      consumeStockFEFO(db, item, Math.abs(signedQty));
    }
    db.activities.unshift({
      id: uid('act'),
      vendor_id: vendor.id,
      action: 'Voice entry',
      details: `${item.sku_name} ${signedQty >= 0 ? '+' : ''}${signedQty} (heard: "${String(body.transcript || '').slice(0, 60)}")`,
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return {
      message: `${item.sku_name} updated`,
      sku_name: item.sku_name,
      new_qty: item.current_qty,
    };
  }

  const invBatchesMatch = path.match(/^\/inventory\/([^/]+)\/batches$/);
  if (method === 'get' && invBatchesMatch) {
    const item = myItems().find((i) => i.id === invBatchesMatch[1]);
    if (!item) throw httpError(404, 'Item not found');
    return openBatchesForItem(db, item.id).map((b) => ({
      ...b,
      value_at_cost: round2((b.qty_remaining || 0) * (b.unit_cost || 0)),
    }));
  }

  const invAdjustMatch = path.match(/^\/inventory\/([^/]+)\/adjust$/);
  if (method === 'post' && invAdjustMatch) {
    const item = myItems().find((i) => i.id === invAdjustMatch[1]);
    if (!item) throw httpError(404, 'Item not found');
    const delta = Number(body.qty_change || 0);
    if (delta > 0) {
      addStockToBatches(db, vendor.id, item, delta, { unit_cost: item.cost_price });
    } else if (delta < 0) {
      consumeStockFEFO(db, item, Math.abs(delta));
    }
    db.activities.unshift({
      id: uid('act'),
      vendor_id: vendor.id,
      action: body.reason || 'Stock adjusted',
      details: `${item.sku_name}: ${delta >= 0 ? '+' : ''}${delta} ${item.unit}`,
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return item;
  }

  if (method === 'post' && path === '/inventory') {
    const item = {
      id: uid('itm'),
      vendor_id: vendor.id,
      sku_name: String(body.sku_name || 'New Product').trim(),
      category: String(body.category || 'General').trim(),
      unit: String(body.unit || 'unit').trim(),
      current_qty: round3(body.current_qty || 0),
      reorder_point: round3(body.reorder_point ?? 10),
      cost_price: round2(body.cost_price || 0),
      selling_price: round2(body.selling_price || 0),
      expiry_date: body.expiry_date || null,
      mfg_date: body.mfg_date || null,
      barcode: body.barcode ? String(body.barcode).trim() : null,
      pack_type: body.pack_type === 'carton' ? 'carton' : 'loose',
      units_per_pack: Number(body.units_per_pack || 1),
      hsn_code: body.hsn_code ? String(body.hsn_code).trim() : null,
      gst_rate: Number(body.gst_rate || 0),
      sale_count: 0,
      is_archived: false,
      last_updated: new Date().toISOString(),
    };
    db.inventory.push(item);
    if (item.current_qty > 0) {
      addStockToBatches(db, vendor.id, item, item.current_qty, {
        unit_cost: item.cost_price,
        mfg_date: item.mfg_date,
        expiry_date: item.expiry_date,
      });
    }
    db.activities.unshift({
      id: uid('act'),
      vendor_id: vendor.id,
      action: 'Product added',
      details: `${item.sku_name} added to catalogue (${item.current_qty} ${item.unit})`,
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return item;
  }

  const invIdMatch = path.match(/^\/inventory\/([^/]+)$/);
  if (invIdMatch && method === 'put') {
    const item = myItems().find((i) => i.id === invIdMatch[1]);
    if (!item) throw httpError(404, 'Item not found');
    const updatable = [
      'sku_name', 'category', 'unit', 'reorder_point', 'cost_price', 'selling_price',
      'expiry_date', 'mfg_date', 'barcode', 'pack_type', 'units_per_pack', 'hsn_code', 'gst_rate',
    ];
    for (const k of updatable) {
      if (body[k] !== undefined) item[k] = body[k];
    }
    item.last_updated = new Date().toISOString();
    saveDb(db);
    return item;
  }

  if (invIdMatch && method === 'delete') {
    const item = myItems().find((i) => i.id === invIdMatch[1]);
    if (!item) throw httpError(404, 'Item not found');
    item.is_archived = true;
    db.activities.unshift({
      id: uid('act'),
      vendor_id: vendor.id,
      action: 'Product archived',
      details: `${item.sku_name} removed from active catalogue`,
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return null;
  }

  // ---------- Customers (Khata) ----------
  const myCustomers = () => db.customers.filter((c) => c.vendor_id === vendor.id);

  if (method === 'get' && path === '/customers') {
    return myCustomers().sort((a, b) => a.name.localeCompare(b.name));
  }

  if (method === 'post' && path === '/customers') {
    const bal = round2(body.initial_credit_balance || 0);
    const customer = {
      id: uid('cust'),
      vendor_id: vendor.id,
      name: String(body.name || 'Customer').trim(),
      phone: body.phone ? String(body.phone).trim() : null,
      total_credit_balance: bal,
      khata_transactions: bal > 0
        ? [{
            id: uid('ktx'),
            amount: bal,
            transaction_type: 'credit',
            notes: 'Opening balance',
            date: new Date().toISOString(),
          }]
        : [],
    };
    db.customers.push(customer);
    saveDb(db);
    return customer;
  }

  const custRemMatch = path.match(/^\/customers\/([^/]+)\/reminder$/);
  if (method === 'get' && custRemMatch) {
    const customer = myCustomers().find((c) => c.id === custRemMatch[1]);
    if (!customer) throw httpError(404, 'Customer not found');
    const balance = customer.total_credit_balance || 0;
    if (balance <= 0) throw httpError(400, `${customer.name} has nothing outstanding`);
    const digitsRaw = String(customer.phone || '').replace(/\D/g, '');
    if (!digitsRaw) throw httpError(400, `No phone number saved for ${customer.name}`);
    const digits = digitsRaw.length === 10 ? `91${digitsRaw}` : digitsRaw;
    let msg = `Namaste ${customer.name}, this is a gentle reminder from ${vendor.store_name}. Your pending balance is Rs ${balance.toFixed(2)}.`;
    msg += vendor.upi_id ? ` You can pay by UPI to ${vendor.upi_id}. Thank you!` : ' Thank you!';
    return {
      customer_name: customer.name,
      balance: round2(balance),
      message: msg,
      whatsapp_url: `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`,
      sms_url: `sms:+${digits}?body=${encodeURIComponent(msg)}`,
    };
  }

  const custTxMatch = path.match(/^\/customers\/([^/]+)\/transaction$/);
  if (method === 'post' && custTxMatch) {
    const customer = myCustomers().find((c) => c.id === custTxMatch[1]);
    if (!customer) throw httpError(404, 'Customer not found');
    const amount = round2(body.amount || 0);
    if (amount <= 0) throw httpError(422, 'Amount must be greater than zero');
    const txType = body.transaction_type === 'credit' ? 'credit' : 'payment';
    customer.total_credit_balance = txType === 'credit'
      ? round2((customer.total_credit_balance || 0) + amount)
      : round2((customer.total_credit_balance || 0) - amount);
    customer.khata_transactions = customer.khata_transactions || [];
    customer.khata_transactions.push({
      id: uid('ktx'),
      amount,
      transaction_type: txType,
      notes: body.notes || null,
      date: new Date().toISOString(),
    });
    db.activities.unshift({
      id: uid('act'),
      vendor_id: vendor.id,
      action: txType === 'credit' ? 'Credit given' : 'Payment received',
      details: `Rs ${amount.toFixed(2)} ${txType === 'credit' ? 'udhaar to' : 'settled by'} ${customer.name}`,
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return customer;
  }

  const custIdMatch = path.match(/^\/customers\/([^/]+)$/);
  if (method === 'delete' && custIdMatch) {
    const idx = db.customers.findIndex((c) => c.id === custIdMatch[1] && c.vendor_id === vendor.id);
    if (idx === -1) throw httpError(404, 'Customer not found');
    const bal = db.customers[idx].total_credit_balance || 0;
    if (Math.abs(bal) > 0.005) {
      throw httpError(
        409,
        bal > 0
          ? `${db.customers[idx].name} still owes Rs ${bal.toFixed(2)}. Settle the balance first.`
          : `${db.customers[idx].name} has an advance balance of Rs ${Math.abs(bal).toFixed(2)}. Settle the balance first.`,
      );
    }
    db.customers.splice(idx, 1);
    saveDb(db);
    return null;
  }

  // ---------- Sales ----------
  if (method === 'post' && path === '/sales') {
    const result = processSingleSale(db, vendor, body);
    saveDb(db);
    return {
      sale: result.sale,
      stock_warnings: result.stock_warnings,
      customer_balance: result.customer_balance,
    };
  }

  if (method === 'post' && path === '/sales/sync-batch') {
    const synced_ids = [];
    const duplicates_skipped = [];
    const stock_warnings = [];
    const failed = [];
    for (const s of body.sales || []) {
      try {
        const res = processSingleSale(db, vendor, s);
        if (res.duplicate) {
          duplicates_skipped.push(s.offline_id);
        } else {
          synced_ids.push(s.offline_id);
          stock_warnings.push(...res.stock_warnings);
        }
      } catch (err) {
        failed.push({ offline_id: s.offline_id, reason: err?.response?.data?.detail || err.message || 'Sync error' });
      }
    }
    saveDb(db);
    return { synced_ids, duplicates_skipped, stock_warnings, failed };
  }

  if (method === 'get' && path === '/sales/day-close') {
    const targetKey = params.date || localDateKey(new Date());
    const daySales = db.sales.filter(
      (s) => s.vendor_id === vendor.id && localDateKey(s.created_at) === targetKey,
    );
    const byMode = { cash: 0, upi: 0, khata: 0 };
    let revenue = 0;
    let cost = 0;
    const itemTotals = new Map();

    for (const sale of daySales) {
      revenue += sale.total_amount || 0;
      cost += sale.total_cost || 0;
      const mode = sale.payment_mode || 'cash';
      byMode[mode] = round2((byMode[mode] || 0) + (sale.total_amount || 0));
      for (const li of sale.line_items || []) {
        const prev = itemTotals.get(li.sku_name) || { sku_name: li.sku_name, qty: 0, amount: 0 };
        prev.qty += li.qty || 0;
        prev.amount = round2(prev.amount + (li.qty || 0) * (li.unit_price || 0));
        itemTotals.set(li.sku_name, prev);
      }
    }
    const profit = round2(revenue - cost);
    return {
      date: targetKey,
      bill_count: daySales.length,
      revenue: round2(revenue),
      profit,
      margin_pct: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
      average_bill: daySales.length ? round2(revenue / daySales.length) : 0,
      by_payment_mode: byMode,
      top_items: [...itemTotals.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
      cash_in_hand: round2(byMode.cash || 0),
    };
  }

  const saleDelMatch = path.match(/^\/sales\/([^/]+)$/);
  if (method === 'delete' && saleDelMatch) {
    const idx = db.sales.findIndex((s) => s.id === saleDelMatch[1] && s.vendor_id === vendor.id);
    if (idx === -1) throw httpError(404, 'Sale not found');
    const [sale] = db.sales.splice(idx, 1);

    for (const line of sale.line_items || []) {
      const item = line.item_id ? myItems().find((i) => i.id === line.item_id) : null;
      if (!item) continue;
      if (line.allocations?.length) {
        for (const alloc of line.allocations) {
          const batch = db.batches.find((b) => b.id === alloc.batch_id);
          if (batch) batch.qty_remaining = round3((batch.qty_remaining || 0) + alloc.qty);
        }
        reconcileItemFromBatches(db, item);
      } else {
        addStockToBatches(db, vendor.id, item, line.qty, { unit_cost: line.unit_cost });
      }
      item.sale_count = Math.max(0, (item.sale_count || 0) - 1);
    }

    if (sale.customer_id) {
      const cust = myCustomers().find((c) => c.id === sale.customer_id);
      if (cust) {
        cust.total_credit_balance = round2((cust.total_credit_balance || 0) - (sale.total_amount || 0));
        cust.khata_transactions = cust.khata_transactions || [];
        cust.khata_transactions.push({
          id: uid('ktx'),
          amount: sale.total_amount,
          transaction_type: 'payment',
          notes: `Reversal of voided sale ${sale.id.slice(-6).toUpperCase()}`,
          date: new Date().toISOString(),
        });
      }
    }

    db.activities.unshift({
      id: uid('act'),
      vendor_id: vendor.id,
      action: 'Sale voided',
      details: `Reversed bill of Rs ${sale.total_amount.toFixed(2)}`,
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return null;
  }

  // ---------- UPI Checkout & Dynamic QR ----------
  if (method === 'post' && path === '/checkout/create-intent') {
    const amount = round2(body.amount || 0);
    if (amount <= 0) throw httpError(422, 'Enter a valid amount greater than zero');
    if (!vendor.upi_id) throw httpError(400, 'Add your UPI ID under Account settings first');

    const txnRef = `V360${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;
    const note = String(body.note || 'Store purchase').slice(0, 60);
    const upiUrl = `upi://pay?pa=${encodeURIComponent(vendor.upi_id)}&pn=${encodeURIComponent(vendor.store_name || vendor.name)}&am=${amount.toFixed(2)}&cu=INR&tr=${encodeURIComponent(txnRef)}&tn=${encodeURIComponent(note)}`;

    const qrDataUrl = await QRCode.toDataURL(upiUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#1a73e8', light: '#ffffff' },
    });

    const intent = {
      id: uid('upi'),
      vendor_id: vendor.id,
      txn_ref: txnRef,
      upi_url: upiUrl,
      upi_id: vendor.upi_id,
      amount,
      note,
      status: 'pending',
      expires_in_seconds: 900,
      payer_name: null,
      payer_vpa: null,
      bank_ref_num: null,
      qr_base64: qrDataUrl,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    db.payments.push(intent);
    saveDb(db);
    return intent;
  }

  const intentStatusMatch = path.match(/^\/checkout\/intent\/([^/]+)\/status$/);
  if (method === 'get' && intentStatusMatch) {
    const payment = db.payments.find(
      (p) => p.txn_ref === intentStatusMatch[1] && p.vendor_id === vendor.id,
    );
    if (!payment) throw httpError(404, 'Payment intent not found');
    return payment;
  }

  if (method === 'post' && path === '/checkout/simulate-payment') {
    const payment = db.payments.find(
      (p) => p.txn_ref === body.txn_ref && p.vendor_id === vendor.id,
    );
    if (!payment) throw httpError(404, 'Payment intent not found');
    if (payment.status !== 'completed') {
      const bankRef = `4${Math.floor(10000000000 + Math.random() * 89999999999)}`;
      payment.status = 'completed';
      payment.completed_at = new Date().toISOString();
      payment.payer_name = body.payer_name || 'Rahul Sharma';
      payment.payer_vpa = body.payer_vpa || 'rahul@oksbi';
      payment.bank_ref_num = bankRef;
      db.activities.unshift({
        id: uid('act'),
        vendor_id: vendor.id,
        action: 'UPI Payment Received',
        details: `Rs ${payment.amount.toFixed(2)} received from ${payment.payer_name} (UTR: ${bankRef})`,
        created_at: new Date().toISOString(),
      });
      saveDb(db);
    }
    return payment;
  }

  // ---------- Stock Intake & GST Purchase Register ----------
  const getOrCreateOpenIntake = () => {
    let open = db.intakes.find((s) => s.vendor_id === vendor.id && s.status === 'open');
    if (!open) {
      open = {
        id: uid('intk'),
        vendor_id: vendor.id,
        status: 'open',
        supplier_name: null,
        supplier_gstin: null,
        invoice_no: null,
        invoice_date: null,
        note: null,
        started_at: new Date().toISOString(),
        closed_at: null,
        lines: [],
      };
      db.intakes.push(open);
    }
    return open;
  };

  if (method === 'get' && path === '/intake/session/current') {
    return db.intakes.find((s) => s.vendor_id === vendor.id && s.status === 'open') || null;
  }

  if (method === 'get' && path === '/intake/sessions') {
    const limit = Number(params.limit || 50);
    return db.intakes
      .filter((s) => s.vendor_id === vendor.id)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, limit)
      .map((s) => {
        const lines = s.lines || [];
        return {
          ...s,
          line_count: lines.length,
          total_units: round3(lines.reduce((acc, l) => acc + (l.qty_units || 0), 0)),
          grand_total: round2(lines.reduce((acc, l) => acc + (l.line_total || 0), 0)),
        };
      });
  }

  const intakeSumMatch = path.match(/^\/intake\/session\/([^/]+)\/summary$/);
  if (method === 'get' && intakeSumMatch) {
    const session = db.intakes.find((s) => s.id === intakeSumMatch[1] && s.vendor_id === vendor.id);
    if (!session) throw httpError(404, 'Delivery session not found');
    return computeIntakeSummary(session, vendor);
  }

  if (method === 'get' && path === '/intake/register') {
    const month = String(params.month || new Date().toISOString().slice(0, 7));
    const sessions = db.intakes
      .filter(
        (s) =>
          s.vendor_id === vendor.id &&
          s.status === 'closed' &&
          String(s.started_at || '').startsWith(month),
      )
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

    const entries = [];
    const byRate = new Map();
    let interstateTaxable = 0;

    for (const s of sessions) {
      const summary = computeIntakeSummary(s, vendor);
      const { totals, gst_breakup: breakup, interstate } = summary;
      if (interstate) interstateTaxable += totals.taxable_value;
      for (const b of breakup) {
        if (!byRate.has(b.rate)) {
          byRate.set(b.rate, { rate: b.rate, taxable_value: 0, gst_amount: 0, cgst: 0, sgst: 0, igst: 0 });
        }
        const cur = byRate.get(b.rate);
        cur.taxable_value = round2(cur.taxable_value + b.taxable_value);
        cur.gst_amount = round2(cur.gst_amount + b.gst_amount);
        cur.cgst = round2(cur.cgst + b.cgst);
        cur.sgst = round2(cur.sgst + b.sgst);
        cur.igst = round2(cur.igst + b.igst);
      }
      entries.push({
        id: s.id,
        date: s.started_at,
        supplier_name: s.supplier_name,
        supplier_gstin: s.supplier_gstin,
        invoice_no: s.invoice_no,
        invoice_date: s.invoice_date,
        interstate,
        line_count: totals.line_count,
        taxable_value: totals.taxable_value,
        gst_amount: totals.gst_amount,
        grand_total: totals.grand_total,
      });
    }

    const taxableTotal = round2(entries.reduce((acc, e) => acc + e.taxable_value, 0));
    const gstTotal = round2(entries.reduce((acc, e) => acc + e.gst_amount, 0));

    return {
      month,
      store: { name: vendor.store_name, gstin: vendor.gstin },
      entries,
      gst_breakup: [...byRate.values()].sort((a, b) => a.rate - b.rate),
      totals: {
        deliveries: entries.length,
        taxable_value: taxableTotal,
        gst_amount: gstTotal,
        grand_total: round2(taxableTotal + gstTotal),
        interstate_taxable_value: round2(interstateTaxable),
      },
      gst_ready: Boolean(vendor.gstin) && gstTotal > 0,
      generated_at: new Date().toISOString(),
    };
  }

  if (method === 'post' && path === '/intake/scan') {
    const rawCode = normaliseBarcode(body.barcode);
    if (!rawCode && !body.item_id) throw httpError(400, 'Scan a barcode or pick an item');
    const session = getOrCreateOpenIntake();
    const item = body.item_id
      ? myItems().find((i) => i.id === body.item_id)
      : myItems().find((i) => normaliseBarcode(i.barcode) === rawCode);

    if (!item) {
      const details = describeBarcode(body.barcode);
      const product = OPEN_BARCODE_CATALOG[rawCode] || null;
      saveDb(db);
      return {
        status: 'unknown',
        barcode: rawCode || body.barcode,
        details,
        product,
        message: product ? `Found ${product.sku_name} details` : 'New barcode — enter product details once',
      };
    }

    const packs = Number(body.packs || 1);
    const unitsPerPack = item.pack_type === 'carton' ? Number(item.units_per_pack || 1) : 1;

    if (item.pack_type === 'carton') {
      saveDb(db);
      return {
        status: 'confirm',
        intake_id: session.id,
        item,
        suggestion: {
          item_id: item.id,
          sku_name: item.sku_name,
          packs,
          units_per_pack: unitsPerPack,
          qty_units: round3(packs * unitsPerPack),
          unit_cost: item.cost_price || 0,
          unit_price: item.selling_price || 0,
          gst_rate: item.gst_rate || 0,
          hsn_code: item.hsn_code,
          mfg_date: item.mfg_date,
          expiry_date: item.expiry_date,
        },
        message: `${item.sku_name}: 1 box of ${unitsPerPack} ${item.unit || 'units'}. Confirm batch & expiry.`,
      };
    }

    const qtyUnits = round3(packs);
    const taxable = round2(qtyUnits * (item.cost_price || 0));
    const gst = round2((taxable * (item.gst_rate || 0)) / 100);
    const line = {
      id: uid('inl'),
      item_id: item.id,
      sku_name: item.sku_name,
      barcode: item.barcode,
      hsn_code: item.hsn_code,
      pack_type: 'loose',
      packs,
      units_per_pack: 1,
      qty_units: qtyUnits,
      unit_cost: item.cost_price || 0,
      unit_price: item.selling_price || 0,
      gst_rate: item.gst_rate || 0,
      taxable_value: taxable,
      gst_amount: gst,
      line_total: round2(taxable + gst),
      batch_no: null,
      mfg_date: item.mfg_date,
      expiry_date: item.expiry_date,
      source: 'barcode',
      created_at: new Date().toISOString(),
    };
    session.lines.push(line);
    addStockToBatches(db, vendor.id, item, qtyUnits, {
      unit_cost: item.cost_price,
      intake_line_id: line.id,
    });
    saveDb(db);
    return {
      status: 'applied',
      intake_id: session.id,
      line,
      item,
      message: `${item.sku_name} +${packs} · now ${item.current_qty} ${item.unit || 'units'}`,
    };
  }

  if (method === 'post' && path === '/intake/confirm') {
    const item = myItems().find((i) => i.id === body.item_id);
    if (!item) throw httpError(404, 'Item not found');
    const session = getOrCreateOpenIntake();
    const packs = Number(body.packs || 1);
    const perPack = Number(body.units_per_pack || item.units_per_pack || 1);
    const qtyUnits = round3(packs * perPack);
    const unitCost = round2(body.unit_cost ?? item.cost_price ?? 0);
    const unitPrice = round2(body.unit_price ?? item.selling_price ?? 0);
    const gstRate = Number(body.gst_rate ?? item.gst_rate ?? 0);
    const taxable = round2(qtyUnits * unitCost);
    const gst = round2((taxable * gstRate) / 100);

    const line = {
      id: uid('inl'),
      item_id: item.id,
      sku_name: item.sku_name,
      barcode: item.barcode,
      hsn_code: body.hsn_code || item.hsn_code,
      pack_type: perPack > 1 ? 'carton' : 'loose',
      packs,
      units_per_pack: perPack,
      qty_units: qtyUnits,
      unit_cost: unitCost,
      unit_price: unitPrice,
      gst_rate: gstRate,
      taxable_value: taxable,
      gst_amount: gst,
      line_total: round2(taxable + gst),
      batch_no: body.batch_no || null,
      mfg_date: body.mfg_date || null,
      expiry_date: body.expiry_date || null,
      source: 'barcode',
      cost_price_before: item.cost_price,
      created_at: new Date().toISOString(),
    };
    session.lines.push(line);
    addStockToBatches(db, vendor.id, item, qtyUnits, {
      unit_cost: unitCost,
      batch_no: body.batch_no || undefined,
      mfg_date: body.mfg_date || null,
      expiry_date: body.expiry_date || item.expiry_date,
      intake_line_id: line.id,
    });

    if (body.remember !== false) {
      if (unitCost > 0) item.cost_price = unitCost;
      if (unitPrice > 0) item.selling_price = unitPrice;
      item.gst_rate = gstRate;
      if (body.hsn_code) item.hsn_code = body.hsn_code;
      item.units_per_pack = perPack;
      item.pack_type = perPack > 1 ? 'carton' : 'loose';
    }
    saveDb(db);
    return {
      status: 'applied',
      intake_id: session.id,
      line,
      item,
      message: `${item.sku_name} +${qtyUnits} ${item.unit || 'units'}`,
    };
  }

  const intakeLineDelMatch = path.match(/^\/intake\/lines\/([^/]+)$/);
  if (method === 'delete' && intakeLineDelMatch) {
    const lineId = intakeLineDelMatch[1];
    for (const session of db.intakes) {
      if (session.vendor_id !== vendor.id) continue;
      const lIdx = (session.lines || []).findIndex((l) => l.id === lineId);
      if (lIdx === -1) continue;
      if (session.status === 'closed') {
        throw httpError(409, 'Cannot remove a line from a closed delivery session.');
      }
      const [line] = session.lines.splice(lIdx, 1);
      const item = myItems().find((i) => i.id === line.item_id);
      if (item) {
        const linkedBatches = db.batches.filter((b) => b.intake_line_id === line.id);
        for (const b of linkedBatches) {
          b.qty_remaining = Math.max(0, round3((b.qty_remaining || 0) - (line.qty_units || 0)));
        }
        reconcileItemFromBatches(db, item);
      }
      saveDb(db);
      return null;
    }
    throw httpError(404, 'Line not found');
  }

  const intakeCloseMatch = path.match(/^\/intake\/session\/([^/]+)\/close$/);
  if (method === 'post' && intakeCloseMatch) {
    const session = db.intakes.find((s) => s.id === intakeCloseMatch[1] && s.vendor_id === vendor.id);
    if (!session) throw httpError(404, 'Delivery session not found');
    session.status = 'closed';
    session.closed_at = new Date().toISOString();
    db.activities.unshift({
      id: uid('act'),
      vendor_id: vendor.id,
      action: 'Delivery closed',
      details: `${session.supplier_name || 'Delivery'} · ${session.lines?.length || 0} line(s) received`,
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return computeIntakeSummary(session, vendor);
  }

  const intakeUpdateMatch = path.match(/^\/intake\/session\/([^/]+)$/);
  if (method === 'put' && intakeUpdateMatch) {
    const session = db.intakes.find((s) => s.id === intakeUpdateMatch[1] && s.vendor_id === vendor.id);
    if (!session) throw httpError(404, 'Delivery session not found');
    session.supplier_name = body.supplier_name ? String(body.supplier_name).trim() : null;
    session.supplier_gstin = body.supplier_gstin ? String(body.supplier_gstin).trim().toUpperCase() : null;
    session.invoice_no = body.invoice_no ? String(body.invoice_no).trim() : null;
    session.invoice_date = body.invoice_date || null;
    session.note = body.note ? String(body.note).trim() : null;
    saveDb(db);
    return session;
  }

  // ---------- Analytics ----------
  const mySales = () => db.sales.filter((s) => s.vendor_id === vendor.id);

  if (method === 'get' && path === '/analytics/sales-trend') {
    const days = Math.min(90, Math.max(1, Number(params.days || 7)));
    const today = new Date();
    const start = addDays(today, -(days - 1));
    const startKey = localDateKey(start);

    const sales = mySales().filter((s) => localDateKey(s.created_at) >= startKey);
    const buckets = new Map();
    for (const s of sales) {
      const k = localDateKey(s.created_at);
      const cur = buckets.get(k) || { sales: 0, profit: 0, bills: 0 };
      cur.sales += s.total_amount || 0;
      cur.profit += (s.total_amount || 0) - (s.total_cost || 0);
      cur.bills += 1;
      buckets.set(k, cur);
    }

    const trend = [];
    for (let offset = 0; offset < days; offset += 1) {
      const d = addDays(start, offset);
      const k = localDateKey(d);
      const b = buckets.get(k) || { sales: 0, profit: 0, bills: 0 };
      trend.push({
        date: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        full_date: k,
        sales: round2(b.sales),
        profit: round2(b.profit),
        bills: b.bills,
      });
    }

    const todayBucket = trend[trend.length - 1] || { sales: 0, profit: 0, bills: 0 };
    const weekSales = round2(trend.reduce((a, d) => a + d.sales, 0));
    const weekProfit = round2(trend.reduce((a, d) => a + d.profit, 0));

    return {
      has_data: sales.length > 0,
      trend,
      today_sales: todayBucket.sales,
      today_profit: todayBucket.profit,
      today_bills: todayBucket.bills,
      week_sales: weekSales,
      week_profit: weekProfit,
      margin_pct: todayBucket.sales > 0 ? Math.round((todayBucket.profit / todayBucket.sales) * 1000) / 10 : 0,
    };
  }

  if (method === 'get' && path === '/analytics/health-score') {
    const cutoff = addDays(new Date(), -30).getTime();
    const sales = mySales().filter((s) => new Date(s.created_at).getTime() >= cutoff);
    const items = myItems();
    const activeDays = new Set(sales.map((s) => localDateKey(s.created_at))).size;

    if (sales.length < 5) {
      return {
        has_data: false,
        health_score: null,
        days_of_history: activeDays,
        sales_recorded: sales.length,
        message: 'Record at least 5 sales and your score will appear here.',
        breakdown: {},
      };
    }

    const salesConsistency = Math.min(100, Math.round((activeDays / 30) * 100));
    const unitsSold = sales.reduce(
      (sum, s) => sum + (s.line_items || []).reduce((acc, l) => acc + (l.qty || 0), 0),
      0,
    );
    const unitsHeld = items.reduce((sum, i) => sum + (i.current_qty || 0), 0) || 1;
    const inventoryTurnover = Math.min(100, Math.round((unitsSold / unitsHeld) * 100));

    const nowMs = Date.now();
    const openLots = db.batches.filter((b) => b.vendor_id === vendor.id && (b.qty_remaining || 0) > 0);
    const stockValue = openLots.reduce((sum, b) => sum + (b.qty_remaining || 0) * (b.unit_cost || 0), 0) || 1;
    const expiredValue = openLots
      .filter((b) => b.expiry_date && new Date(b.expiry_date).getTime() < nowMs)
      .reduce((sum, b) => sum + (b.qty_remaining || 0) * (b.unit_cost || 0), 0);
    const wastePct = Math.round((expiredValue / stockValue) * 100);
    const wasteControl = Math.max(0, 100 - wastePct * 3);

    const restocking = items.length
      ? Math.round((items.filter((i) => (i.current_qty || 0) > (i.reorder_point || 0)).length / items.length) * 100)
      : 0;

    const score = Math.round(
      salesConsistency * 0.35 + inventoryTurnover * 0.25 + wasteControl * 0.2 + restocking * 0.2,
    );

    return {
      has_data: true,
      health_score: score,
      days_of_history: activeDays,
      sales_recorded: sales.length,
      breakdown: {
        sales_consistency: salesConsistency,
        inventory_turnover: inventoryTurnover,
        waste_control: wasteControl,
        on_time_restocking: restocking,
      },
      weights: {
        sales_consistency: 35,
        inventory_turnover: 25,
        waste_control: 20,
        on_time_restocking: 20,
      },
      expired_stock_value: round2(expiredValue),
    };
  }

  if (method === 'get' && path === '/analytics/forecast') {
    const cutoff = addDays(new Date(), -56).getTime();
    const sales = mySales().filter((s) => new Date(s.created_at).getTime() >= cutoff);
    const distinctDays = new Set(sales.map((s) => localDateKey(s.created_at))).size;

    if (distinctDays < 14) {
      return {
        has_data: false,
        days_of_history: distinctDays,
        days_needed: 14,
        message: `${distinctDays} of 14 days of sales recorded. Forecasts start once there is a fortnight to learn from.`,
        predictions: [],
      };
    }

    const perWeekday = new Map();
    const weekdayDays = new Map();
    const perItemTotal = new Map();

    for (const s of sales) {
      const d = new Date(s.created_at);
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
      if (!perWeekday.has(weekday)) perWeekday.set(weekday, new Map());
      if (!weekdayDays.has(weekday)) weekdayDays.set(weekday, new Set());
      weekdayDays.get(weekday).add(localDateKey(d));
      const wMap = perWeekday.get(weekday);
      for (const li of s.line_items || []) {
        const val = (li.qty || 0) * (li.unit_price || 0);
        wMap.set(li.sku_name, (wMap.get(li.sku_name) || 0) + val);
        perItemTotal.set(li.sku_name, (perItemTotal.get(li.sku_name) || 0) + val);
      }
    }

    const tomorrow = addDays(new Date(), 1).toLocaleDateString('en-US', { weekday: 'long' });
    const tomorrowDayCount = (weekdayDays.get(tomorrow)?.size) || 1;
    const totalDays = distinctDays || 1;

    const topSkus = [...perItemTotal.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const predictions = [];
    for (const [sku, total] of topSkus) {
      const overallDailyAvg = total / totalDays;
      const tomorrowAvg = ((perWeekday.get(tomorrow)?.get(sku)) || 0) / tomorrowDayCount;
      if (overallDailyAvg <= 0) continue;
      const changePct = Math.round(((tomorrowAvg - overallDailyAvg) / overallDailyAvg) * 100);
      predictions.push({
        sku_name: sku,
        expected_value: round2(tomorrowAvg),
        daily_average: round2(overallDailyAvg),
        change_pct: changePct,
        driver: `${tomorrow}s run ${changePct >= 0 ? 'above' : 'below'} your daily average`,
      });
    }
    predictions.sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));

    return {
      has_data: true,
      days_of_history: distinctDays,
      forecast_for: tomorrow,
      predictions,
      method: 'Day-of-week average against a 56-day baseline',
    };
  }

  if (method === 'get' && path === '/analytics/reorder-list') {
    const low = myItems()
      .filter((i) => (i.current_qty || 0) <= (i.reorder_point || 0))
      .sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.sku_name.localeCompare(b.sku_name));

    let estimatedCost = 0;
    const lines = low.map((item) => {
      const suggested = Math.max(1, Math.round((item.reorder_point || 0) * 2 - (item.current_qty || 0)));
      const lineCost = round2(suggested * (item.cost_price || 0));
      estimatedCost += lineCost;
      return {
        id: item.id,
        sku_name: item.sku_name,
        category: item.category,
        current_qty: item.current_qty,
        reorder_point: item.reorder_point,
        suggested_qty: suggested,
        unit: item.unit,
        estimated_cost: lineCost,
      };
    });

    const shareText = lines.length
      ? `${vendor.store_name} - restock order\n\n` +
        lines.map((l, idx) => `${idx + 1}. ${l.sku_name} - ${l.suggested_qty} ${l.unit}`).join('\n')
      : '';

    return {
      has_data: lines.length > 0,
      items: lines,
      estimated_cost: round2(estimatedCost),
      share_text: shareText,
    };
  }

  if (method === 'get' && path === '/analytics/activities') {
    const limit = Number(params.limit || 30);
    return db.activities
      .filter((a) => a.vendor_id === vendor.id)
      .slice(0, limit);
  }

  if (method === 'get' && path === '/analytics/heatmap') {
    const lat = Number(params.lat ?? 18.5204);
    const lng = Number(params.lng ?? 73.8567);
    const radiusKm = Number(params.radius_km ?? 3.0);
    const category = params.category;

    let zones = [
      {
        id: 'z1', name: 'North Commercial Market & Food Street', category: 'Dairy & Sweets',
        intensity: 92, weekly_market_size_inr: 58000, top_demand: 'Milk, Ghee, Paneer, Sweets',
        demand_driver: 'Festival prep and the morning tea-stall rush',
        lat: lat + 0.012, lng: lng - 0.008, crowd_type: 'Morning & Evening Peak',
      },
      {
        id: 'z2', name: 'Central Railway / Metro Transit Hub', category: 'Rain Gear & Quick Snacks',
        intensity: 97, weekly_market_size_inr: 84000, top_demand: 'Umbrellas, Rain Covers, Cold Drinks, Wafers',
        demand_driver: 'Commuter footfall',
        lat: lat + 0.004, lng: lng + 0.014, crowd_type: 'Continuous Heavy Transit',
      },
      {
        id: 'z3', name: 'West High-Density Residential', category: 'Daily Staples',
        intensity: 74, weekly_market_size_inr: 46000, top_demand: 'Atta, Oil, Rice, Pulses, Sugar',
        demand_driver: 'Monthly household replenishment',
        lat: lat - 0.011, lng: lng - 0.018, crowd_type: 'Family Residential',
      },
      {
        id: 'z4', name: 'East IT Park & Student Hostels', category: 'Instant Foods & Energy Drinks',
        intensity: 81, weekly_market_size_inr: 49000, top_demand: 'Noodles, Energy Drinks, Biscuits, Chips',
        demand_driver: 'Late-night consumption, high impulse purchase',
        lat: lat - 0.006, lng: lng + 0.022, crowd_type: 'Youth & Tech Workforce',
      },
      {
        id: 'z5', name: 'South Suburban Extension', category: 'Bakery & Biscuits',
        intensity: 48, weekly_market_size_inr: 22000, top_demand: 'Bread, Milk, Rusk, Tea Powder',
        demand_driver: 'Morning breakfast baseline',
        lat: lat - 0.022, lng: lng + 0.005, crowd_type: 'Suburban Households',
      },
    ];

    if (category && String(category).toLowerCase() !== 'all') {
      const needle = String(category).toLowerCase();
      const matched = zones.filter(
        (z) => z.category.toLowerCase().includes(needle) || z.top_demand.toLowerCase().includes(needle),
      );
      if (matched.length) zones = matched;
    }

    const wholesalers = [
      {
        id: 'w1', name: 'APMC Grain & Spices Wholesale Mandi', type: 'Primary Agriculture Mandi',
        specialty: 'Bulk grains, rice, pulses', discount_rate: '18-22% off MRP',
        distance_km: 2.4, lat: lat + 0.018, lng: lng + 0.011, open_hours: '04:00 - 14:00', contact: '+912024451122',
      },
      {
        id: 'w2', name: 'Dairy Master Depot', type: 'Authorised Dairy Distributor',
        specialty: 'Milk, ghee, butter, paneer', discount_rate: '12-15% margin',
        distance_km: 1.2, lat: lat - 0.009, lng: lng - 0.014, open_hours: '05:00 - 20:00', contact: '+912024459900',
      },
      {
        id: 'w3', name: 'Metro B2B FMCG Cash & Carry', type: 'Super Stockist',
        specialty: 'Packaged goods, soaps, oil', discount_rate: 'Bulk tiered rebates',
        distance_km: 4.1, lat: lat - 0.025, lng: lng + 0.028, open_hours: '07:00 - 21:00', contact: '+912024457788',
      },
    ];

    const competitors = [
      { id: 'c1', name: 'Neighbourhood Kirana', lat: lat + 0.006, lng: lng - 0.005, scale: 'Medium' },
      { id: 'c2', name: 'Local Supermarket', lat: lat - 0.007, lng: lng + 0.008, scale: 'Large' },
      { id: 'c3', name: 'Provision Store', lat: lat + 0.01, lng: lng + 0.004, scale: 'Small' },
    ];

    const households = Math.round(radiusKm * 4200);
    return {
      is_demo: true,
      demo_notice: 'Illustrative sample data, not a live measurement of your area.',
      anchor_lat: lat,
      anchor_lng: lng,
      radius_km: radiusKm,
      demographics: {
        estimated_households: households,
        estimated_population: households * 4,
        monthly_market_potential_crores: round2((households * 8500) / 10000000),
        competitor_count: competitors.length,
        wholesaler_count: wholesalers.length,
      },
      total_hotspots: zones.length,
      zones,
      wholesalers,
      competitors,
    };
  }

  throw httpError(404, `Demo route not found: ${method.toUpperCase()} ${path}`);
}
