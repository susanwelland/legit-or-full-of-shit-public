// The shop. Prices are set here and read by the server; the browser never decides a price. All amounts are in cents. These are sandbox demo values.
export const currency = "USD";

// "Wear your call": a black tee with the visitor's own call on the back (see src/ShirtMock.jsx).
// It can only be bought for a call the visitor has made, and the server prints the name from the
// site's data. Made to order by Printful.
export const shirt = { priceCents: 2400, sizes: ["S", "M", "L", "XL", "2XL"] };
