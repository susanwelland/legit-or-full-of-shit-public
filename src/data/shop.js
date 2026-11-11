// The shop. Prices are set here and read by the server; the browser never decides a price. All amounts are in cents. These are sandbox demo values.
export const currency = "USD";

// "Wear your call": a black tee with the visitor's own call on the back (see src/ShirtMock.jsx).
// It can only be bought for a call the visitor has made, and the server prints the name from the
// site's data. Made to order by Printful.
export const shirt = { priceCents: 2400, sizes: ["S", "M", "L", "XL", "2XL"] };

// Sandbox demo merch. Every item below costs the same $1 test price and is bought with PayPal sandbox
// money only: nothing prints, nothing ships, no Printful call. The price is set here, never in the browser.
export const MERCH_DEMO_CENTS = 100;
const TEE_SIZES = ["S", "M", "L", "XL", "2XL"];
export const merch = {
  "record-tee": { name: "The Record Tee", sizes: TEE_SIZES },
  "roundel-tee": { name: "The Roundel Tee", sizes: TEE_SIZES },
  "roundel-cap": { name: "The Roundel Cap", sizes: null },
  "trucker-hat": { name: "The Wings Trucker Hat", sizes: null },
  "sticker-pack": { name: "Field Sticker Pack", sizes: null },
  "roundel-sticker": { name: "Roundel Sticker", sizes: null },
  "source-mug": { name: "The Source Mug", sizes: null },
  "insulated-flask": { name: "The Insulated Flask", sizes: null },
  "hip-flask": { name: "The Hip Flask", sizes: null },
};
