import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qjbfoooshpvjlqiepxxb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmZvb29zaHB2amxxaWVweHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTIxNDAsImV4cCI6MjA5NjEyODE0MH0.5psVFUbii5Wi5MHhoR3FVVs4C8UPMwgt2K1Tzb6VTxQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CAFE_ADDRESS1 = "20, Jalan Ambong Kiri 1, Kepong";
const CAFE_ADDRESS2 = "Baru 52100 Kuala Lumpur";
const CAFE_TIN = "C60634413060";
const CAFE_PHONE = "+60182868126";
const TABLES = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
const TW_SLOTS = Array.from({length:20},(_,i)=>`TW-${String(i+1).padStart(2,"0")}`); // 🥡 Go Takeaway
const isTakeaway = (t) => String(t).startsWith("TW-");
const isGroup = (t) => String(t).startsWith("GRP-");
const groupDisplayName = (t) => { const s = String(t).split("·")[0].replace(/^GRP-/,"").replace(/-/g," "); return s.charAt(0).toUpperCase()+s.slice(1); };
const takeawayLabel = (t) => `Takeaway ${t}`;
const CAFE_NAME = "HOTO LOUNGE";
const CATEGORIES = ["Beverage", "Food & Snacks", "Desserts", "Add-ons"];
const DRINK_CATEGORIES = ["Beverage", "Desserts"];
const FOOD_CATEGORIES = ["Food & Snacks", "Promo", "Add-ons"];

// Staff / admin SLATE theme — slate blue & cool grey (customer order page uses T, untouched)
const C = {
  bg:"#e8ecef", panel:"#ffffff", border:"#d6dbe2", gold:"#394c76", goldLight:"#394c76",
  muted:"#8c8c8c", text:"#2b3346", dark:"#ffffff",
  goldGrad:"linear-gradient(150deg,#394c76,#2c3b5e)",
  panelGrad:"linear-gradient(180deg,#ffffff,#f4f6f9)",
  shadow:"0 6px 22px rgba(57,76,118,0.10)",
  glow:"0 2px 14px rgba(57,76,118,0.16)"
};
const btn = (x={}) => ({ fontFamily:"Georgia,serif", cursor:"pointer", borderRadius:10, letterSpacing:0.3, transition:"all 0.22s ease", ...x });

// Customer bright theme — warm ivory & antique gold
const T = {
  bg:"#efe7db", panel:"#ffffff", border:"#e6ddce",
  brown:"#b4842a", text:"#1c1712", muted:"#8a7e6d",
  green:"#b4842a", greenBg:"#fbf3e2", red:"#c62828",
  orange:"#e65100",
  shadow:"0 8px 26px rgba(70,48,12,0.13)",
  goldGrad:"linear-gradient(135deg,#e6c463,#b4842a)"
};

// ── Grand UI helpers — shared across every screen ──
const uiCard = (x={}) => ({ background:C.panelGrad, border:`1px solid ${C.border}`, borderRadius:18, boxShadow:C.shadow, overflow:"hidden", ...x });
const uiLabel = (x={}) => ({ fontSize:11, color:C.gold, fontWeight:700, letterSpacing:3, textTransform:"uppercase", ...x });
const goldRule = { height:1, background:`linear-gradient(90deg,transparent,${C.gold}55,transparent)` };
// Centered section heading flanked by tapered gold rules — the app's signature motif
function Crest({ label, color=C.gold, sub }) {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
        <span style={{ height:1, width:30, background:`linear-gradient(90deg,transparent,${color})` }} />
        <span style={{ fontSize:11, color, fontWeight:700, letterSpacing:3.5, textTransform:"uppercase" }}>{label}</span>
        <span style={{ height:1, width:30, background:`linear-gradient(90deg,${color},transparent)` }} />
      </div>
      {sub && <div style={{ fontSize:11, color:C.muted, letterSpacing:1, marginTop:5 }}>{sub}</div>}
    </div>
  );
}

// Helper to extract drink/food parts from special_request
const getDrinkReq = (req) => {
  if (!req) return null;
  if (req.includes("🍳") && req.includes("☕")) return req.split("|").filter(s=>s.includes("☕")).map(s=>s.replace("☕","").trim()).join("").trim() || null;
  if (req.includes("🍳")) return null; // food only request
  return req; // drink only or plain request
};
const getFoodReq = (req) => {
  if (!req) return null;
  if (req.includes("☕") && req.includes("🍳")) return req.split("|").filter(s=>s.includes("🍳")).map(s=>s.replace("🍳","").trim()).join("").trim() || null;
  if (req.includes("☕")) return null; // drink only request
  return req; // food only or plain request
};



// Check if promo is active right now based on promo_start/promo_end (MYT)
const isPromoNow = (item) => {
  // Valid if has free drinks, item promo_price, OR addon-level promo_price
  const hasDrinks = item.promo_drinks && item.promo_drinks.length > 0;
  const hasItemPromo = item.promo_price && parseFloat(item.promo_price) > 0;
  const hasAddonPromo = item.addons && item.addons.some(a => a.promo_price && parseFloat(a.promo_price) > 0);
  if (!hasDrinks && !hasItemPromo && !hasAddonPromo) return false;
  // No time window set → promo is always active
  if (!item.promo_start || !item.promo_end) return true;
  const myt = new Date(new Date().toLocaleString("en-US", { timeZone:"Asia/Kuala_Lumpur" }));
  const cur = myt.getHours() * 60 + myt.getMinutes();
  const [sh, sm] = item.promo_start.split(":").map(Number);
  const [eh, em] = item.promo_end.split(":").map(Number);
  return cur >= sh * 60 + sm && cur < eh * 60 + em;
};

// Effective base-item price: VIP price wins outright if set (and, when the item
// restricts vip_price to specific groups via vip_groups, only for those groups);
// otherwise normal price/promo rules apply
const effPrice = (item, isVip, groupSlug) => {
  if (isVip && item.vip_price && parseFloat(item.vip_price) > 0) {
    const scope = item.vip_groups;
    if (!scope || scope.length === 0 || (groupSlug && scope.includes(groupSlug))) {
      return parseFloat(item.vip_price);
    }
  }
  const promo = isPromoNow(item) && item.promo_price && parseFloat(item.promo_price) > 0;
  return parseFloat(promo ? item.promo_price : item.price);
};
// Effective add-on price: same VIP-overrides-promo rule as the base item,
// scoped by the parent item's vip_groups the same way effPrice is (addons
// don't have their own group picker in the admin UI, so they inherit it)
const effAddonPrice = (addon, item, isVip, groupSlug) => {
  if (isVip && addon.vip_price && parseFloat(addon.vip_price) > 0) {
    const scope = item.vip_groups;
    if (!scope || scope.length === 0 || (groupSlug && scope.includes(groupSlug))) {
      return parseFloat(addon.vip_price);
    }
  }
  const promo = isPromoNow(item) && addon.promo_price && parseFloat(addon.promo_price) > 0;
  return parseFloat(promo ? addon.promo_price : (addon.price||0));
};

// Loyalty phone country picker — every country, Malaysia first since that's
// this cafe's home market. Flag emoji are derived from the ISO code (two
// regional-indicator symbols) rather than hand-typed, so they can't be wrong.
const flagEmoji = (iso2) => iso2.replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
const PHONE_COUNTRIES = [
  { code:"MY", dial:"60", name:"Malaysia" },
  { code:"AF", dial:"93", name:"Afghanistan" },
  { code:"AL", dial:"355", name:"Albania" },
  { code:"DZ", dial:"213", name:"Algeria" },
  { code:"AS", dial:"1", name:"American Samoa" },
  { code:"AD", dial:"376", name:"Andorra" },
  { code:"AO", dial:"244", name:"Angola" },
  { code:"AI", dial:"1", name:"Anguilla" },
  { code:"AQ", dial:"672", name:"Antarctica" },
  { code:"AG", dial:"1", name:"Antigua & Barbuda" },
  { code:"AR", dial:"54", name:"Argentina" },
  { code:"AM", dial:"374", name:"Armenia" },
  { code:"AW", dial:"297", name:"Aruba" },
  { code:"AU", dial:"61", name:"Australia" },
  { code:"AT", dial:"43", name:"Austria" },
  { code:"AZ", dial:"994", name:"Azerbaijan" },
  { code:"BS", dial:"1", name:"Bahamas" },
  { code:"BH", dial:"973", name:"Bahrain" },
  { code:"BD", dial:"880", name:"Bangladesh" },
  { code:"BB", dial:"1", name:"Barbados" },
  { code:"BY", dial:"375", name:"Belarus" },
  { code:"BE", dial:"32", name:"Belgium" },
  { code:"BZ", dial:"501", name:"Belize" },
  { code:"BJ", dial:"229", name:"Benin" },
  { code:"BM", dial:"1", name:"Bermuda" },
  { code:"BT", dial:"975", name:"Bhutan" },
  { code:"BO", dial:"591", name:"Bolivia" },
  { code:"BA", dial:"387", name:"Bosnia" },
  { code:"BW", dial:"267", name:"Botswana" },
  { code:"BV", dial:"47", name:"Bouvet Island" },
  { code:"BR", dial:"55", name:"Brazil" },
  { code:"IO", dial:"246", name:"British Indian Ocean Territory" },
  { code:"VG", dial:"1", name:"British Virgin Islands" },
  { code:"BN", dial:"673", name:"Brunei" },
  { code:"BG", dial:"359", name:"Bulgaria" },
  { code:"BF", dial:"226", name:"Burkina Faso" },
  { code:"BI", dial:"257", name:"Burundi" },
  { code:"KH", dial:"855", name:"Cambodia" },
  { code:"CM", dial:"237", name:"Cameroon" },
  { code:"CA", dial:"1", name:"Canada" },
  { code:"CV", dial:"238", name:"Cape Verde" },
  { code:"BQ", dial:"599", name:"Caribbean Netherlands" },
  { code:"KY", dial:"1", name:"Cayman Islands" },
  { code:"CF", dial:"236", name:"Central African Republic" },
  { code:"TD", dial:"235", name:"Chad" },
  { code:"CL", dial:"56", name:"Chile" },
  { code:"CN", dial:"86", name:"China" },
  { code:"CX", dial:"61", name:"Christmas Island" },
  { code:"CC", dial:"61", name:"Cocos Islands" },
  { code:"CO", dial:"57", name:"Colombia" },
  { code:"KM", dial:"269", name:"Comoros" },
  { code:"CG", dial:"242", name:"Congo - Brazzaville" },
  { code:"CD", dial:"243", name:"Congo - Kinshasa" },
  { code:"CK", dial:"682", name:"Cook Islands" },
  { code:"CR", dial:"506", name:"Costa Rica" },
  { code:"HR", dial:"385", name:"Croatia" },
  { code:"CU", dial:"53", name:"Cuba" },
  { code:"CW", dial:"599", name:"Curaçao" },
  { code:"CY", dial:"357", name:"Cyprus" },
  { code:"CZ", dial:"420", name:"Czechia" },
  { code:"CI", dial:"225", name:"Côte d’Ivoire" },
  { code:"DK", dial:"45", name:"Denmark" },
  { code:"DJ", dial:"253", name:"Djibouti" },
  { code:"DM", dial:"1", name:"Dominica" },
  { code:"DO", dial:"1", name:"Dominican Republic" },
  { code:"EC", dial:"593", name:"Ecuador" },
  { code:"EG", dial:"20", name:"Egypt" },
  { code:"SV", dial:"503", name:"El Salvador" },
  { code:"GQ", dial:"240", name:"Equatorial Guinea" },
  { code:"ER", dial:"291", name:"Eritrea" },
  { code:"EE", dial:"372", name:"Estonia" },
  { code:"SZ", dial:"268", name:"Eswatini" },
  { code:"ET", dial:"251", name:"Ethiopia" },
  { code:"FK", dial:"500", name:"Falkland Islands" },
  { code:"FO", dial:"298", name:"Faroe Islands" },
  { code:"FJ", dial:"679", name:"Fiji" },
  { code:"FI", dial:"358", name:"Finland" },
  { code:"FR", dial:"33", name:"France" },
  { code:"GF", dial:"594", name:"French Guiana" },
  { code:"PF", dial:"689", name:"French Polynesia" },
  { code:"TF", dial:"262", name:"French Southern Territories" },
  { code:"GA", dial:"241", name:"Gabon" },
  { code:"GM", dial:"220", name:"Gambia" },
  { code:"GE", dial:"995", name:"Georgia" },
  { code:"DE", dial:"49", name:"Germany" },
  { code:"GH", dial:"233", name:"Ghana" },
  { code:"GI", dial:"350", name:"Gibraltar" },
  { code:"GR", dial:"30", name:"Greece" },
  { code:"GL", dial:"299", name:"Greenland" },
  { code:"GD", dial:"1", name:"Grenada" },
  { code:"GP", dial:"590", name:"Guadeloupe" },
  { code:"GU", dial:"1", name:"Guam" },
  { code:"GT", dial:"502", name:"Guatemala" },
  { code:"GG", dial:"44", name:"Guernsey" },
  { code:"GN", dial:"224", name:"Guinea" },
  { code:"GW", dial:"245", name:"Guinea-Bissau" },
  { code:"GY", dial:"592", name:"Guyana" },
  { code:"HT", dial:"509", name:"Haiti" },
  { code:"HM", dial:"672", name:"Heard & McDonald Islands" },
  { code:"HN", dial:"504", name:"Honduras" },
  { code:"HK", dial:"852", name:"Hong Kong" },
  { code:"HU", dial:"36", name:"Hungary" },
  { code:"IS", dial:"354", name:"Iceland" },
  { code:"IN", dial:"91", name:"India" },
  { code:"ID", dial:"62", name:"Indonesia" },
  { code:"IR", dial:"98", name:"Iran" },
  { code:"IQ", dial:"964", name:"Iraq" },
  { code:"IE", dial:"353", name:"Ireland" },
  { code:"IM", dial:"44", name:"Isle of Man" },
  { code:"IL", dial:"972", name:"Israel" },
  { code:"IT", dial:"39", name:"Italy" },
  { code:"JM", dial:"1", name:"Jamaica" },
  { code:"JP", dial:"81", name:"Japan" },
  { code:"JE", dial:"44", name:"Jersey" },
  { code:"JO", dial:"962", name:"Jordan" },
  { code:"KZ", dial:"7", name:"Kazakhstan" },
  { code:"KE", dial:"254", name:"Kenya" },
  { code:"KI", dial:"686", name:"Kiribati" },
  { code:"KW", dial:"965", name:"Kuwait" },
  { code:"KG", dial:"996", name:"Kyrgyzstan" },
  { code:"LA", dial:"856", name:"Laos" },
  { code:"LV", dial:"371", name:"Latvia" },
  { code:"LB", dial:"961", name:"Lebanon" },
  { code:"LS", dial:"266", name:"Lesotho" },
  { code:"LR", dial:"231", name:"Liberia" },
  { code:"LY", dial:"218", name:"Libya" },
  { code:"LI", dial:"423", name:"Liechtenstein" },
  { code:"LT", dial:"370", name:"Lithuania" },
  { code:"LU", dial:"352", name:"Luxembourg" },
  { code:"MO", dial:"853", name:"Macao" },
  { code:"MG", dial:"261", name:"Madagascar" },
  { code:"MW", dial:"265", name:"Malawi" },
  { code:"MV", dial:"960", name:"Maldives" },
  { code:"ML", dial:"223", name:"Mali" },
  { code:"MT", dial:"356", name:"Malta" },
  { code:"MH", dial:"692", name:"Marshall Islands" },
  { code:"MQ", dial:"596", name:"Martinique" },
  { code:"MR", dial:"222", name:"Mauritania" },
  { code:"MU", dial:"230", name:"Mauritius" },
  { code:"YT", dial:"262", name:"Mayotte" },
  { code:"MX", dial:"52", name:"Mexico" },
  { code:"FM", dial:"691", name:"Micronesia" },
  { code:"MD", dial:"373", name:"Moldova" },
  { code:"MC", dial:"377", name:"Monaco" },
  { code:"MN", dial:"976", name:"Mongolia" },
  { code:"ME", dial:"382", name:"Montenegro" },
  { code:"MS", dial:"1", name:"Montserrat" },
  { code:"MA", dial:"212", name:"Morocco" },
  { code:"MZ", dial:"258", name:"Mozambique" },
  { code:"MM", dial:"95", name:"Myanmar" },
  { code:"NA", dial:"264", name:"Namibia" },
  { code:"NR", dial:"674", name:"Nauru" },
  { code:"NP", dial:"977", name:"Nepal" },
  { code:"NL", dial:"31", name:"Netherlands" },
  { code:"NC", dial:"687", name:"New Caledonia" },
  { code:"NZ", dial:"64", name:"New Zealand" },
  { code:"NI", dial:"505", name:"Nicaragua" },
  { code:"NE", dial:"227", name:"Niger" },
  { code:"NG", dial:"234", name:"Nigeria" },
  { code:"NU", dial:"683", name:"Niue" },
  { code:"NF", dial:"672", name:"Norfolk Island" },
  { code:"KP", dial:"850", name:"North Korea" },
  { code:"MK", dial:"389", name:"North Macedonia" },
  { code:"MP", dial:"1", name:"Northern Mariana Islands" },
  { code:"NO", dial:"47", name:"Norway" },
  { code:"OM", dial:"968", name:"Oman" },
  { code:"PK", dial:"92", name:"Pakistan" },
  { code:"PW", dial:"680", name:"Palau" },
  { code:"PS", dial:"970", name:"Palestine" },
  { code:"PA", dial:"507", name:"Panama" },
  { code:"PG", dial:"675", name:"Papua New Guinea" },
  { code:"PY", dial:"595", name:"Paraguay" },
  { code:"PE", dial:"51", name:"Peru" },
  { code:"PH", dial:"63", name:"Philippines" },
  { code:"PN", dial:"870", name:"Pitcairn" },
  { code:"PL", dial:"48", name:"Poland" },
  { code:"PT", dial:"351", name:"Portugal" },
  { code:"PR", dial:"1", name:"Puerto Rico" },
  { code:"QA", dial:"974", name:"Qatar" },
  { code:"RO", dial:"40", name:"Romania" },
  { code:"RU", dial:"7", name:"Russia" },
  { code:"RW", dial:"250", name:"Rwanda" },
  { code:"RE", dial:"262", name:"Réunion" },
  { code:"WS", dial:"685", name:"Samoa" },
  { code:"SM", dial:"378", name:"San Marino" },
  { code:"SA", dial:"966", name:"Saudi Arabia" },
  { code:"SN", dial:"221", name:"Senegal" },
  { code:"RS", dial:"381", name:"Serbia" },
  { code:"SC", dial:"248", name:"Seychelles" },
  { code:"SL", dial:"232", name:"Sierra Leone" },
  { code:"SG", dial:"65", name:"Singapore" },
  { code:"SX", dial:"1", name:"Sint Maarten" },
  { code:"SK", dial:"421", name:"Slovakia" },
  { code:"SI", dial:"386", name:"Slovenia" },
  { code:"SB", dial:"677", name:"Solomon Islands" },
  { code:"SO", dial:"252", name:"Somalia" },
  { code:"ZA", dial:"27", name:"South Africa" },
  { code:"GS", dial:"500", name:"South Georgia & South Sandwich Islands" },
  { code:"KR", dial:"82", name:"South Korea" },
  { code:"SS", dial:"211", name:"South Sudan" },
  { code:"ES", dial:"34", name:"Spain" },
  { code:"LK", dial:"94", name:"Sri Lanka" },
  { code:"BL", dial:"590", name:"St. Barthélemy" },
  { code:"SH", dial:"290", name:"St. Helena" },
  { code:"KN", dial:"1", name:"St. Kitts & Nevis" },
  { code:"LC", dial:"1", name:"St. Lucia" },
  { code:"MF", dial:"590", name:"St. Martin" },
  { code:"PM", dial:"508", name:"St. Pierre & Miquelon" },
  { code:"VC", dial:"1", name:"St. Vincent & Grenadines" },
  { code:"SD", dial:"249", name:"Sudan" },
  { code:"SR", dial:"597", name:"Suriname" },
  { code:"SJ", dial:"47", name:"Svalbard & Jan Mayen" },
  { code:"SE", dial:"46", name:"Sweden" },
  { code:"CH", dial:"41", name:"Switzerland" },
  { code:"SY", dial:"963", name:"Syria" },
  { code:"ST", dial:"239", name:"São Tomé & Príncipe" },
  { code:"TW", dial:"886", name:"Taiwan" },
  { code:"TJ", dial:"992", name:"Tajikistan" },
  { code:"TZ", dial:"255", name:"Tanzania" },
  { code:"TH", dial:"66", name:"Thailand" },
  { code:"TL", dial:"670", name:"Timor-Leste" },
  { code:"TG", dial:"228", name:"Togo" },
  { code:"TK", dial:"690", name:"Tokelau" },
  { code:"TO", dial:"676", name:"Tonga" },
  { code:"TT", dial:"1", name:"Trinidad & Tobago" },
  { code:"TN", dial:"216", name:"Tunisia" },
  { code:"TM", dial:"993", name:"Turkmenistan" },
  { code:"TC", dial:"1", name:"Turks & Caicos Islands" },
  { code:"TV", dial:"688", name:"Tuvalu" },
  { code:"TR", dial:"90", name:"Türkiye" },
  { code:"VI", dial:"1", name:"U.S. Virgin Islands" },
  { code:"UG", dial:"256", name:"Uganda" },
  { code:"GB", dial:"44", name:"United Kingdom" },
  { code:"UA", dial:"380", name:"Ukraine" },
  { code:"AE", dial:"971", name:"United Arab Emirates" },
  { code:"UY", dial:"598", name:"Uruguay" },
  { code:"US", dial:"1", name:"United States" },
  { code:"UZ", dial:"998", name:"Uzbekistan" },
  { code:"VU", dial:"678", name:"Vanuatu" },
  { code:"VA", dial:"39", name:"Vatican City" },
  { code:"VE", dial:"58", name:"Venezuela" },
  { code:"VN", dial:"84", name:"Vietnam" },
  { code:"WF", dial:"681", name:"Wallis & Futuna" },
  { code:"EH", dial:"212", name:"Western Sahara" },
  { code:"YE", dial:"967", name:"Yemen" },
  { code:"ZM", dial:"260", name:"Zambia" },
  { code:"ZW", dial:"263", name:"Zimbabwe" },
  { code:"AX", dial:"358", name:"Åland Islands" },
].map(c => ({ ...c, flag: flagEmoji(c.code) }));
// Composes whatever the customer typed (with or without a leading 0, spaces,
// dashes, or even the dial code itself) into one unambiguous international
// number like "+60123456789". Phone is looked up by exact match, so a
// Malaysian and Singaporean number that happen to share local digits (e.g.
// "6012...") are only told apart because the dial code is always attached.
const composePhone = (raw, dial) => {
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith(dial)) digits = digits.slice(dial.length);
  digits = digits.replace(/^0+/, "");
  return digits ? `+${dial}${digits}` : "";
};

function QRCode({ url, size=160 }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=394c76&margin=10`;
  return <img src={src} alt="QR" style={{ width:size, height:size, borderRadius:8 }} />;
}

// Ensures the single app_settings row (id=1) exists. Runs on every app
// load (cheap: one indexed select), but only ever inserts once — whichever
// device happens to load first after this ships seeds the shared row from
// its own current localStorage values, so nobody's already-customized PIN/
// password/charge gets silently reset to the hardcoded fallback defaults.
async function ensureAppSettings() {
  const { data } = await supabase.from("app_settings").select("id").eq("id", 1).maybeSingle();
  if (data) return;
  await supabase.from("app_settings").upsert({
    id: 1,
    staff_pin: localStorage.getItem("staff_pin") || "Jack@126",
    admin_pw: localStorage.getItem("admin_pw") || "hotolounge2026",
    service_charge: parseFloat(localStorage.getItem("service_charge") || "10"),
    auto_print_enabled: localStorage.getItem("k_autoprint") === "on",
  }, { onConflict: "id", ignoreDuplicates: true });
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [tableNo, setTableNo] = useState(null);
  const [staffPin, setStaffPin] = useState("Jack@126");
  useEffect(() => {
    const loadPin = () => supabase.from("app_settings").select("staff_pin").eq("id", 1).maybeSingle()
      .then(({ data }) => { if (data) setStaffPin(data.staff_pin); });
    // Wait for seeding to finish before the first read, so the device that's
    // seeding the row from its own localStorage sees its own customized PIN
    // immediately instead of racing the insert and getting stuck on the
    // hardcoded default until a reload.
    ensureAppSettings().then(loadPin);
    const ch = supabase.channel("app-settings-pin-watch")
      .on("postgres_changes", { event:"*", schema:"public", table:"app_settings" }, loadPin)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const submitPin = () => {
    if (pinInput === staffPin) { setPinUnlocked(true); }
    else { setPinError(true); setPinInput(""); }
  };
  // Ensure a proper mobile viewport so staff/admin screens auto-fit phones
  // (the customer tablet screen manages its own no-zoom viewport separately).
  useEffect(() => {
    let vp = document.querySelector("meta[name=viewport]");
    if (!vp) { vp = document.createElement("meta"); vp.name = "viewport"; document.head.appendChild(vp); }
    if (screen !== "tablet") vp.content = "width=device-width, initial-scale=1, viewport-fit=cover";
  }, [screen]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = parseInt(params.get("table"));
    if (t && TABLES.includes(t)) { setTableNo(t); setScreen("tablet"); }
    if (params.get("screen") === "kitchen") setScreen("kitchen");
    if (params.get("screen") === "admin") setScreen("admin");
    const g = params.get("group");
    if (g) { setTableNo(`GRP-${g}`); setScreen("group"); }
    if (params.get("page") === "groups") setScreen("groupadmin");
    const j = params.get("join");
    if (j) { setTableNo(`JOIN-${j}`); setScreen("join"); }
    if (params.get("joinMember")) setScreen("joinmember");
  }, []);
  return (
    <div style={{ fontFamily:"Georgia,serif", background:`radial-gradient(1200px 620px at 50% -12%, rgba(57,76,118,0.08), transparent 62%), ${C.bg}`, minHeight:"100vh", color:C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;1,600&display=swap');
        *{ text-rendering:optimizeLegibility; -webkit-font-smoothing:antialiased; }
        .hl-title{ font-family:'Playfair Display', Georgia, serif !important; }
        .hl-gold{
          background:linear-gradient(135deg,#f2d79a,#d4a544 52%,#a9761f);
          -webkit-background-clip:text; background-clip:text;
          -webkit-text-fill-color:transparent; color:#d4a544;
        }
        ::-webkit-scrollbar{ width:10px; height:10px; }
        ::-webkit-scrollbar-thumb{ background:linear-gradient(#394c76,#2c3b5e); border-radius:8px; }
        ::-webkit-scrollbar-track{ background:rgba(0,0,0,0.18); }
        html, body { overflow-x:hidden; max-width:100%; }
        @media (max-width:640px){ .hl-title{ letter-spacing:1px !important; } }

        /* Staff/Cashier POS split-screen: stack menu above ticket instead of side-by-side when there isn't room (phones) */
        @media (max-width:860px){
          .hl-pos{ flex-direction:column !important; }
          .hl-pos-left{ flex:1 1 auto !important; min-width:auto !important; min-height:0 !important; border-right:none !important; border-bottom:1px solid ${C.border}; }
          .hl-pos-right{ width:100% !important; flex:0 0 46vh !important; border-left:none !important; border-top:1px solid ${C.border}; }
        }

        /* Split Bill screen: side-by-side bucket columns on wide screens,
           one active bucket + a tab strip to switch on phones */
        .hl-split-tabs{ display:none; }
        @media (max-width:760px){
          .hl-split-buckets{ flex-direction:column !important; }
          .hl-split-tabs{ display:flex !important; }
          .hl-split-bucket-col{ display:none !important; }
          .hl-split-bucket-col.is-active{ display:flex !important; }
        }

        /* Admin menu item rows: drop the action buttons to their own line instead of squeezing the name/price column */
        @media (max-width:640px){
          .hl-admin-item{ flex-wrap:wrap; }
          .hl-admin-item .hl-admin-actions{ width:100%; margin-top:8px; justify-content:flex-start !important; }
        }
      `}</style>

      {screen === "home" && !pinUnlocked && !new URLSearchParams(window.location.search).get("join") && !new URLSearchParams(window.location.search).get("group") && !new URLSearchParams(window.location.search).get("page") && !new URLSearchParams(window.location.search).get("joinMember") && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(43,51,70,0.55)", WebkitBackdropFilter:"blur(4px)", backdropFilter:"blur(4px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#ffffff", border:"1px solid #d6dbe2", borderRadius:18, padding:32, width:"100%", maxWidth:320, textAlign:"center", boxShadow:"0 20px 60px rgba(43,51,70,0.35)", fontFamily:"Georgia,serif" }}>
            <div style={{ width:56, height:56, margin:"0 auto 14px", borderRadius:16, background:"#eef1f6", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="lock" size={26} color="#394c76" />
            </div>
            <div className="hl-title" style={{ fontSize:19, color:"#2b3346", fontWeight:700, marginBottom:20 }}>Staff Access</div>
            <input type="password" value={pinInput} onChange={e => { setPinInput(e.target.value); setPinError(false); }} onKeyDown={e => e.key==="Enter" && submitPin()}
              placeholder="Enter PIN" autoFocus
              style={{ width:"100%", background:"#f4f6f9", border:`2px solid ${pinError?"#c62828":"#394c76"}`, color:"#2b3346", padding:"12px 16px", borderRadius:10, fontSize:20, fontFamily:"Georgia,serif", textAlign:"center", letterSpacing:4, boxSizing:"border-box", marginBottom:8, outline:"none" }} />
            {pinError && <div style={{ color:"#c62828", fontSize:13, marginBottom:8, fontWeight:600 }}>Wrong PIN</div>}
            <button onClick={submitPin} style={{ fontFamily:"Georgia,serif", cursor:"pointer", width:"100%", background:"linear-gradient(150deg,#394c76,#2c3b5e)", border:"none", color:"#fff", padding:13, fontSize:15, fontWeight:"bold", marginTop:8, borderRadius:10, boxShadow:"0 4px 12px rgba(57,76,118,0.3)" }}>Unlock ✓</button>
          </div>
        </div>
      )}
      {screen === "home"    && <HomeScreen    setScreen={setScreen} setTableNo={setTableNo} />}
      {screen === "group"      && <GroupWrapper  tableNo={tableNo} />}
      {screen === "groupadmin" && <GroupAdminScreen goHome={() => setScreen("home")} />}
      {screen === "tablet"  && <TabletScreen  tableNo={tableNo} isStaff={tableNo !== null && !window.location.search.includes("table=")} goHome={() => setScreen(String(tableNo).startsWith("TW-") ? "takeaway" : String(tableNo).startsWith("GRP-") ? "vipscreen" : "home")} />}
      {screen === "takeaway" && <TakeawayScreen setScreen={setScreen} setTableNo={setTableNo} goHome={() => setScreen("home")} />}
      {screen === "kitchen" && <KitchenScreen goHome={() => setScreen("home")} />}
      {screen === "qrcodes" && <QRScreen      goHome={() => setScreen("home")} />}
      {screen === "admin"   && <AdminScreen   goHome={() => setScreen("home")} />}
      {screen === "sales"   && <SalesScreen   goHome={() => setScreen("home")} />}
      {screen === "systemsettings" && <SystemSettingsScreen goHome={() => setScreen("home")} />}
      {screen === "members" && <MembersScreen goHome={() => setScreen("home")} />}
      {screen === "cashier" && <CashierScreen goHome={() => setScreen("home")} />}
      {screen === "join"    && <JoinScreen groupSlug={String(tableNo).replace("JOIN-","")} goHome={() => setScreen("home")} />}
      {screen === "joinmember" && <JoinMemberScreen goHome={() => setScreen("home")} />}
      {screen === "vipscreen" && <VIPScreen setScreen={setScreen} setTableNo={setTableNo} goHome={() => setScreen("home")} />}
    </div>
  );
}

// Inline SVG icons (FontAwesome/Feather-style) — recolor via the `color` prop
function Icon({ name, size=24, color="currentColor", stroke=1.8, style }) {
  const paths = {
    utensils: <><path d="M6 3v5a2 2 0 0 0 4 0V3"/><path d="M8 8v13"/><path d="M17 3c-1.7 1.3-2.3 4.2-2.3 6.3H17"/><path d="M17 9.3V21"/></>,
    bag: <><path d="M6 2 3 6.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.2L18 2z"/><path d="M3 6.2h18"/><path d="M16 10.2a4 4 0 0 1-8 0"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    hat: <><path d="M6 13.5V20h12v-6.5"/><path d="M6 13.8a3.5 3.5 0 0 1-1-6.9A4 4 0 0 1 12 4.6a4 4 0 0 1 7 2.3 3.5 3.5 0 0 1-1 6.9"/><path d="M9.5 20v-4M14.5 20v-4"/></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></>,
    coffee: <><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><path d="M6 1.5v2.5M10 1.5v2.5M14 1.5v2.5"/></>,
    chevron: <path d="M9 6l6 6-6 6"/>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>,
    chart: <><path d="M6 20v-5"/><path d="M12 20V9"/><path d="M18 20V5"/></>,
    sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></>,
    dots: <><circle cx="5" cy="12" r="1.6" fill={color} stroke="none"/><circle cx="12" cy="12" r="1.6" fill={color} stroke="none"/><circle cx="19" cy="12" r="1.6" fill={color} stroke="none"/></>,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></>,
    crown: <><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.5 10.5h-15z"/><path d="M4.5 18.5h15"/></>,
    pen: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></>,
    check: <path d="M4 12.5l5 5L20 6.5"/>,
    x: <path d="M6 6l12 12M18 6L6 18"/>,
    trash: <><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></>,
    printer: <><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    minus: <path d="M5 12h14"/>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>,
    arrowLeft: <><path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></>,
    calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18"/><path d="M8 2.5v4M16 2.5v4"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
}

// Home page palette — slate blue / grey (self-contained; other pages unaffected)
const HP = { bg:"#e8ecef", card:"#ffffff", line:"#d6dbe2", navy:"#394c76", navy2:"#4a5f92", grey:"#8c8c8c", ink:"#2b3346", tint:"#eef1f6" };

function HomeScreen({ setScreen, setTableNo }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const hCard = { background:HP.card, border:`1px solid ${HP.line}`, borderRadius:18, boxShadow:"0 6px 22px rgba(57,76,118,0.08)", overflow:"hidden" };
  const hLabel = { fontSize:11, color:HP.grey, fontWeight:700, letterSpacing:2.5, textTransform:"uppercase" };
  return (
    <div style={{ minHeight:"100vh", background:HP.bg, overflowY:"auto", fontFamily:"Georgia,serif" }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(150deg,${HP.navy},#2c3b5e)`, padding:"38px 20px 30px", textAlign:"center", boxShadow:"0 6px 22px rgba(57,76,118,0.25)" }}>
        <div style={{ width:64, height:64, margin:"0 auto 12px", borderRadius:18, background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon name="coffee" size={32} color="#e8ecef" stroke={1.7} />
        </div>
        <div className="hl-title" style={{ fontSize:34, fontWeight:800, letterSpacing:2, color:"#ffffff", lineHeight:1.1 }}>{CAFE_NAME}</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginTop:12 }}>
          <span style={{ height:1, width:40, background:"linear-gradient(90deg,transparent,rgba(232,236,239,0.6))" }} />
          <span style={{ fontSize:11, color:"#c3cad8", letterSpacing:5, textTransform:"uppercase" }}>Ordering System</span>
          <span style={{ height:1, width:40, background:"linear-gradient(90deg,rgba(232,236,239,0.6),transparent)" }} />
        </div>
      </div>

      <div style={{ padding:"30px 18px 44px", maxWidth:460, margin:"0 auto", display:"flex", flexDirection:"column", gap:22 }}>

        {/* Dine In */}
        <div style={hCard}>
          <div style={{ padding:"18px 20px 8px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:HP.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon name="utensils" size={20} color="#ffffff" />
            </div>
            <div>
              <div className="hl-title" style={{ fontSize:18, fontWeight:700, color:HP.ink }}>Dine In</div>
              <div style={{ fontSize:12, color:HP.grey, marginTop:1 }}>Select a table to begin</div>
            </div>
          </div>
          <div style={{ padding:"12px 16px 20px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
              {TABLES.map(tnum => (
                <button key={tnum} onClick={() => { setTableNo(tnum); setScreen("tablet"); }}
                  className="hl-title"
                  style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:HP.card, border:`1.5px solid ${HP.line}`, color:HP.navy, padding:"15px 0", fontSize:19, fontWeight:700, borderRadius:12, transition:"all 0.15s", boxShadow:"0 1px 3px rgba(57,76,118,0.08)" }}>
                  {tnum}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Takeaway + VIP */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {[
            { onClick:()=>setScreen("takeaway"), name:"bag", label:"Takeaway" },
            { onClick:()=>setScreen("vipscreen"), name:"users", label:"VIP" },
          ].map(b => (
            <button key={b.label} onClick={b.onClick}
              style={{ fontFamily:"Georgia,serif", cursor:"pointer", ...hCard, padding:"22px 0", display:"flex", flexDirection:"column", alignItems:"center", gap:12, transition:"all 0.15s" }}>
              <div style={{ width:52, height:52, borderRadius:"50%", background:HP.tint, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name={b.name} size={26} color={HP.navy} />
              </div>
              <span style={{ fontSize:13, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:HP.ink }}>{b.label}</span>
            </button>
          ))}
        </div>

        {/* Staff */}
        <div style={hCard}>
          <div style={{ padding:"14px 20px 10px" }}><span style={hLabel}>Staff</span></div>
          {[
            { onClick:()=>setScreen("kitchen"), name:"hat", label:"Kitchen Screen", sub:"Food orders" },
            { onClick:()=>setScreen("cashier"), name:"card", label:"Cashier Screen", sub:"Drinks + Payment" },
          ].map(s => (
            <button key={s.label} onClick={s.onClick}
              style={{ fontFamily:"Georgia,serif", cursor:"pointer", width:"100%", background:"transparent", border:"none", borderTop:`1px solid ${HP.line}`, padding:"15px 20px", display:"flex", alignItems:"center", gap:14, textAlign:"left" }}>
              <div style={{ width:38, height:38, borderRadius:10, background:HP.tint, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon name={s.name} size={19} color={HP.navy} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700, color:HP.ink }}>{s.label}</div>
                <div style={{ fontSize:11, color:HP.grey, letterSpacing:0.5 }}>{s.sub}</div>
              </div>
              <Icon name="chevron" size={18} color={HP.grey} />
            </button>
          ))}
        </div>

        {/* More button */}
        <button onClick={() => setMoreOpen(true)}
          style={{ fontFamily:"Georgia,serif", cursor:"pointer", width:"100%", background:"transparent", border:`1px solid ${HP.line}`, color:HP.grey, padding:"14px 0", fontSize:12, letterSpacing:2, textTransform:"uppercase", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Icon name="dots" size={18} color={HP.grey} /> More Options
        </button>

      </div>

      {/* More options modal */}
      {moreOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(43,51,70,0.45)", WebkitBackdropFilter:"blur(4px)", backdropFilter:"blur(4px)", zIndex:9999, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
          onClick={() => setMoreOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:HP.card, borderTop:`3px solid ${HP.navy}`, borderRadius:"22px 22px 0 0", width:"100%", maxWidth:460, padding:"18px 18px 34px", boxShadow:"0 -12px 40px rgba(43,51,70,0.25)" }}>
            <div style={{ width:44, height:4, background:HP.line, borderRadius:4, margin:"0 auto 18px" }} />
            <div style={{ marginBottom:14, textAlign:"center" }}><span style={hLabel}>More Options</span></div>
            {[
              { name:"grid", label:"View & Print QR Codes", screen:"qrcodes" },
              { name:"users", label:"Manage VIP Groups", screen:"groupadmin" },
              { name:"chart", label:"Sales Summary", screen:"sales" },
              { name:"sliders", label:"Admin — Manage Menu", screen:"admin" },
              { name:"lock", label:"System Settings", screen:"systemsettings" },
              { name:"crown", label:"Members", screen:"members" },
            ].map(item => (
              <button key={item.screen} onClick={() => { setMoreOpen(false); setScreen(item.screen); }}
                style={{ fontFamily:"Georgia,serif", cursor:"pointer", width:"100%", background:"#f4f6f9", border:`1px solid ${HP.line}`, color:HP.ink, padding:"13px 16px", fontSize:15, fontWeight:600, borderRadius:14, textAlign:"left", marginBottom:10, display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:HP.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon name={item.name} size={18} color={HP.navy} />
                </div>
                {item.label}
                <span style={{ marginLeft:"auto", display:"flex" }}><Icon name="chevron" size={16} color={HP.grey} /></span>
              </button>
            ))}
            <button onClick={() => setMoreOpen(false)}
              style={{ fontFamily:"Georgia,serif", cursor:"pointer", width:"100%", background:"transparent", border:`1px solid ${HP.line}`, color:HP.grey, padding:"12px 0", fontSize:12, letterSpacing:2, textTransform:"uppercase", borderRadius:14, marginTop:2 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── downloadQR helper ──
async function downloadQR(url, label) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=20`;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS) {
    // iOS Safari cannot auto-save to Photos from JS
    // Best approach: open image in new tab, user holds finger → Save to Photos
    // Use <a> with target=_blank to avoid navigating away from current page
    const a = document.createElement("a");
    a.href = qrUrl;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Show hint after small delay
    setTimeout(() => alert("👆 Hold your finger on the QR image → tap \"Save to Photos\" to save to Camera Roll!"), 800);
  } else {
    // Android / desktop: fetch as blob and auto-download
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `QR-${label}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch(e) {
      window.open(qrUrl, "_blank");
    }
  }
}

// ── GroupWrapper — shows table picker then TabletScreen ──
function GroupWrapper({ tableNo: initialTableNo }) {
  const [finalTableNo, setFinalTableNo] = useState(null);
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid] = useState(false);

  // If admin already started an order for this VIP, skip the table picker
  // and jump straight into the existing order.
  useEffect(() => {
    const baseId = String(initialTableNo).split("·")[0]; // GRP-{id}
    const memberId = baseId.replace(/^GRP-/,"");
    const check = async () => {
      // Reject old/removed links — the member must still exist in the roster
      const { data: member } = await supabase.from("groups").select("id").eq("id", memberId).maybeSingle();
      if (!member) { setInvalid(true); setChecking(false); return; }
      const { data } = await supabase.from("orders").select("table_no")
        .like("table_no", `${baseId}%`).not("status","in",'("cancelled","paid")').limit(1);
      if (data && data.length) setFinalTableNo(data[0].table_no);
      setChecking(false);
    };
    check();
  }, [initialTableNo]);

  if (checking) {
    return (
      <div style={{ minHeight:"100vh", background:"#e8ecef", display:"flex", alignItems:"center", justifyContent:"center", color:"#8c8c8c", fontFamily:"Georgia,serif", fontSize:14 }}>
        Loading…
      </div>
    );
  }
  if (invalid) {
    return (
      <div style={{ minHeight:"100vh", background:"#e8ecef", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:24, textAlign:"center", fontFamily:"Georgia,serif" }}>
        <div style={{ width:64, height:64, borderRadius:18, background:"#394c76", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon name="x" size={28} color="#fff" />
        </div>
        <div className="hl-title" style={{ fontSize:20, fontWeight:800, color:"#2b3346" }}>Link No Longer Active</div>
        <div style={{ color:"#8c8c8c", fontSize:14, lineHeight:1.6, maxWidth:340 }}>This VIP link has expired or was removed. Please ask staff for a new link or QR code.</div>
      </div>
    );
  }
  if (!finalTableNo) return <GroupScreen tableNo={initialTableNo} setTableNo={setFinalTableNo} />;
  return <TabletScreen tableNo={finalTableNo} isStaff={false} goHome={() => setFinalTableNo(null)} />;
}

// ── GroupScreen — table picker ──
function GroupScreen({ tableNo, setTableNo, onBack }) {
  const baseId = String(tableNo).split("·")[0]; // strip table suffix for matching
  const memberName = groupDisplayName(baseId);
  const LS_KEY = `hl_grp_table_${baseId}`;
  const lastTable = localStorage.getItem(LS_KEY);

  const proceed = (tbl) => {
    const finalId = tbl ? `${tableNo}·T${tbl}` : tableNo;
    if (tbl) localStorage.setItem(LS_KEY, String(tbl));
    else localStorage.removeItem(LS_KEY);
    setTableNo(finalId);
  };

  return (
    <div style={{ minHeight:"100vh", background:HP.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Georgia,serif" }}>
      <div style={{ width:72, height:72, borderRadius:20, background:"#394c76", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14, boxShadow:"0 8px 22px rgba(57,76,118,0.25)" }}>
        <Icon name="user" size={34} color="#fff" />
      </div>
      <div className="hl-title" style={{ fontSize:26, fontWeight:800, color:"#2b3346", marginBottom:4 }}>Welcome, {memberName}!</div>
      <div style={{ fontSize:13, color:"#8c8c8c", letterSpacing:3, textTransform:"uppercase", marginBottom:24 }}>Which table today?</div>
      {lastTable && (
        <button onClick={() => proceed(parseInt(lastTable))}
          style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"#fff", border:"1.5px solid #394c76", color:"#394c76", borderRadius:12, padding:"13px 24px", fontSize:15, fontWeight:"bold", marginBottom:16, width:"100%", maxWidth:420, boxShadow:"0 2px 8px rgba(57,76,118,0.08)" }}>
          Last time: Table {lastTable} — use same?
        </button>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, width:"100%", maxWidth:420, marginBottom:16 }}>
        {TABLES.map(t => (
          <button key={t} onClick={() => proceed(t)}
            className="hl-title"
            style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"#fff", border:"1.5px solid #d6dbe2", color:"#394c76", borderRadius:12, padding:"15px 0", fontSize:17, fontWeight:700, boxShadow:"0 2px 8px rgba(57,76,118,0.06)" }}>
            {t}
          </button>
        ))}
      </div>
      <button onClick={() => proceed(null)}
        style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"transparent", border:"1.5px dashed #c9cfd8", color:"#8c8c8c", borderRadius:12, padding:"13px 0", fontSize:15, width:"100%", maxWidth:420 }}>
        Skip — No Table
      </button>
      {onBack && (
        <button onClick={onBack}
          style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"transparent", border:"1px solid #d6dbe2", color:"#8c8c8c", borderRadius:12, padding:"11px 28px", fontSize:14, marginTop:16 }}>
          ← Back
        </button>
      )}
    </div>
  );
}


// ── JoinScreen — VIP self-registers their name ──
function JoinScreen({ groupSlug, goHome }) {
  const [groupName, setGroupName] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");
  const baseUrl = window.location.origin + window.location.pathname;

  useEffect(() => {
    supabase.from("groups").select("group_name").eq("group_slug", groupSlug).limit(1)
      .then(({ data }) => { if (data && data[0]) setGroupName(data[0].group_name); });
  }, [groupSlug]);

  const register = async () => {
    if (name.trim().length < 3) { setError("Name must be at least 3 letters"); return; }
    setSaving(true); setError("");
    const id = `${groupSlug}-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-")}`;
    const { error: err } = await supabase.from("groups").upsert({
      id, display_name: name.trim(), group_name: groupName||groupSlug, group_slug: groupSlug
    });
    if (err) { setError("Failed — please try again"); setSaving(false); return; }
    setDone({ name: name.trim(), url: `${baseUrl}?group=${id}` });
    setSaving(false);
  };

  if (done) {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);
    return (
      <div style={{ minHeight:"100vh", background:"#e8ecef", fontFamily:"Georgia,serif", overflowY:"auto" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"32px 20px 40px" }}>
          <div style={{ width:64, height:64, borderRadius:18, background:"#394c76", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12, boxShadow:"0 8px 22px rgba(57,76,118,0.25)" }}>
            <Icon name="check" size={30} color="#fff" stroke={2.4} />
          </div>
          <div className="hl-title" style={{ fontSize:22, fontWeight:800, color:"#2b3346", marginBottom:4 }}>Welcome, {done.name}!</div>
          <div style={{ fontSize:13, color:"#8c8c8c", marginBottom:20, textAlign:"center" }}>Your personal menu link is ready</div>

          {/* PRIMARY actions — the link works the same on iPhone & Android */}
          <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:340, marginBottom:24 }}>
            <a href={done.url}
              style={{ display:"block", background:"linear-gradient(150deg,#394c76,#2c3b5e)", color:"#fff", padding:"16px 0", borderRadius:14, fontWeight:"bold", fontSize:17, textDecoration:"none", textAlign:"center" }}>
              🛒 Open My Menu Now
            </a>
            <a href={`https://wa.me/?text=${encodeURIComponent("My personal Hoto Lounge menu ("+done.name+") — tap to order: "+done.url)}`}
              target="_blank" rel="noreferrer"
              style={{ display:"block", background:"#394c76", color:"#fff", padding:"13px 0", borderRadius:14, fontWeight:"bold", fontSize:15, textDecoration:"none", textAlign:"center" }}>
              💬 Send Link to Myself (WhatsApp)
            </a>
          </div>

          {/* Add to Home Screen instructions */}
          <div style={{ width:"100%", maxWidth:340, background:"#f4f6f9", border:"1.5px solid #c9cfd8", borderRadius:16, padding:16 }}>
            <div style={{ fontSize:14, fontWeight:"bold", color:"#394c76", marginBottom:12, textAlign:"center" }}>
              📲 Best way — Add to Home Screen
            </div>
            <div style={{ fontSize:12, color:"#8c8c8c", marginBottom:12, textAlign:"center", lineHeight:1.6 }}>
              One tap to open your menu — works like an app icon!
            </div>
            {/* iOS instructions */}
            {(isIOS || (!isIOS && !isAndroid)) && (
              <div style={{ marginBottom: isAndroid ? 0 : 12 }}>
                <div style={{ fontSize:12, color:"#394c76", fontWeight:"bold", marginBottom:6 }}>🍎 iPhone / iPad:</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {["1. Tap the link above to open your menu","2. Tap the Share button at the bottom","3. Scroll down → tap Add to Home Screen","4. Tap Add — done! ✅"].map((s,i) => (
                    <div key={i} style={{ fontSize:12, color:"#394c76", background:"#e3e7f0", borderRadius:8, padding:"6px 10px" }}>{s}</div>
                  ))}
                </div>
              </div>
            )}
            {/* Android instructions */}
            {(isAndroid || (!isIOS && !isAndroid)) && (
              <div style={{ marginTop: isIOS ? 12 : 0 }}>
                <div style={{ fontSize:12, color:"#394c76", fontWeight:"bold", marginBottom:6 }}>🤖 Android:</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {["1. Tap the link above to open your menu","2. Tap the 3 dots at top right of Chrome","3. Tap: Add to Home screen","4. Tap Add — done! ✅"].map((s,i) => (
                    <div key={i} style={{ fontSize:12, color:"#394c76", background:"#e3e7f0", borderRadius:8, padding:"6px 10px" }}>{s}</div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontSize:11, color:"#c9cfd8", textAlign:"center", marginTop:12, lineHeight:1.6 }}>
              Or just bookmark the link in your browser — also works great!
            </div>
          </div>

          {/* QR — secondary: for staff to scan or sharing with friends */}
          <div style={{ width:"100%", maxWidth:340, background:"#f4f6f9", border:"1px solid #e5ded1", borderRadius:16, padding:16, marginTop:20, display:"flex", flexDirection:"column", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:"bold", color:"#394c76", marginBottom:4, textAlign:"center" }}>Your QR Code</div>
            <div style={{ fontSize:11, color:"#8c8c8c", marginBottom:12, textAlign:"center", lineHeight:1.5 }}>For staff to scan, or to share with friends. To open it yourself, just use the link above.</div>
            <div style={{ borderRadius:16, overflow:"hidden", border:"4px solid #394c76", marginBottom:10 }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(done.url)}&bgcolor=ffffff&color=000000&margin=10`}
                style={{ width:200, height:200, display:"block" }} alt="Your QR" />
            </div>
            {isIOS
              ? <div style={{ fontSize:11, color:"#8c8c8c", textAlign:"center" }}>👆 Long press the QR → Save to Photos</div>
              : <button onClick={()=>downloadQR(done.url, done.name)}
                  style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"#eef1f6", border:"1.5px solid #394c76", color:"#394c76", padding:"11px 0", borderRadius:12, fontWeight:"bold", fontSize:14, width:"100%" }}>
                  ⬇️ Save QR to Phone
                </button>
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#e8ecef", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Georgia,serif" }}>
      <div style={{ width:64, height:64, borderRadius:18, background:"#394c76", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12, boxShadow:"0 8px 22px rgba(57,76,118,0.25)" }}>
        <Icon name="coffee" size={30} color="#fff" stroke={1.7} />
      </div>
      <div className="hl-title" style={{ fontSize:24, fontWeight:800, color:"#2b3346", marginBottom:4 }}>{groupName || "VIP Group"}</div>
      <div style={{ fontSize:13, color:"#8c8c8c", letterSpacing:2, textTransform:"uppercase", marginBottom:28 }}>Register your name</div>
      <div style={{ width:"100%", maxWidth:360 }}>
        <input value={name} onChange={e=>{setName(e.target.value);setError("");}}
          onKeyDown={e=>e.key==="Enter"&&register()}
          placeholder="Your name (e.g. Ahmad)"
          autoFocus
          style={{ width:"100%", background:"#f4f6f9", border:`2px solid ${error?"#cc4444":"#394c76"}`, color:C.text, padding:"16px 18px", borderRadius:14, fontSize:18, fontFamily:"Georgia,serif", boxSizing:"border-box", textAlign:"center", marginBottom:8, outline:"none" }} />
        {error && <div style={{ color:"#ff7777", fontSize:13, textAlign:"center", marginBottom:8 }}>{error}</div>}
        <button onClick={register} disabled={saving||name.trim().length<3}
          style={{ fontFamily:"Georgia,serif", cursor:"pointer", width:"100%", background:name.trim().length>=3?"linear-gradient(150deg,#394c76,#2c3b5e)":"#dfe3ea", border:"none", color:name.trim().length>=3?"#fff":"#9a9fab", padding:"16px 0", borderRadius:14, fontSize:18, fontWeight:"bold", marginTop:4 }}>
          {saving?"Saving...":"✓ Get My QR Code"}
        </button>
        <div style={{ fontSize:12, color:"#c9cfd8", textAlign:"center", marginTop:12, lineHeight:1.6 }}>
          Already registered before? Just type your name again — we will find your QR! 😊
        </div>
        <div style={{ marginTop:20, background:"#f4f6f9", border:"1px solid #e3e7f0", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
          <div style={{ fontSize:11, color:"#c9cfd8", marginBottom:4 }}>Lost your shortcut or QR?</div>
          <div style={{ fontSize:12, color:"#8c8c8c", lineHeight:1.6 }}>Type your name above and tap <strong style={{ color:"#394c76" }}>Get My QR Code</strong> — your personal link will appear again instantly.</div>
        </div>
      </div>
    </div>
  );
}

// ── JoinMemberScreen — self-registration for the loyalty points program
// (separate from VIP group joining above: no group, just name + phone) ──
function JoinMemberScreen({ goHome }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("MY");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");
  // Lazy initializer reads the URL synchronously on first render, so a plain
  // visit (no ?checkPhone=) never shows a loading flash before the form.
  const [checking, setChecking] = useState(() => !!new URLSearchParams(window.location.search).get("checkPhone"));
  const baseUrl = window.location.origin + window.location.pathname;

  // A personal "?checkPhone=" link (shown after joining, below) auto-looks-up
  // and shows the balance immediately — no form to fill in — so a member can
  // bookmark or re-scan it any time instead of re-typing their phone.
  useEffect(() => {
    const checkPhone = new URLSearchParams(window.location.search).get("checkPhone");
    if (!checkPhone) return;
    supabase.from("members").select("name,points,phone").eq("phone", checkPhone).maybeSingle()
      .then(({ data }) => {
        if (data) setDone({ name: data.name, points: data.points, already: true, phone: data.phone });
        setChecking(false);
      });
  }, []);

  const register = async () => {
    const dial = PHONE_COUNTRIES.find(c=>c.code===country).dial;
    const phoneNorm = composePhone(phone, dial);
    if (phoneNorm.length < 6) { setError("Please enter a valid phone number"); return; }
    setSaving(true); setError("");
    // Check phone first, before requiring a name — an existing member just
    // checking their points shouldn't need to retype their name at all.
    const { data: existing } = await supabase.from("members").select("name,points").eq("phone", phoneNorm).maybeSingle();
    if (existing) { setDone({ name: existing.name, points: existing.points, already: true, phone: phoneNorm }); setSaving(false); return; }
    if (name.trim().length < 2) { setError("Please enter your name to join"); setSaving(false); return; }
    const { data, error: err } = await supabase.from("members").insert({ name: name.trim(), phone: phoneNorm }).select().maybeSingle();
    if (err) { setError("Failed — please try again"); setSaving(false); return; }
    setDone({ name: data.name, points: data.points, already: false, phone: phoneNorm });
    setSaving(false);
  };

  if (checking) {
    return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#8c8c8c", fontFamily:"Georgia,serif" }}>Loading…</div>;
  }

  if (done) {
    return (
      <div style={{ minHeight:"100vh", background:"#e8ecef", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Georgia,serif" }}>
        <div style={{ width:64, height:64, borderRadius:18, background:"#394c76", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12, boxShadow:"0 8px 22px rgba(57,76,118,0.25)" }}>
          <Icon name="check" size={30} color="#fff" stroke={2.4} />
        </div>
        <div className="hl-title" style={{ fontSize:22, fontWeight:800, color:"#2b3346", marginBottom:4, textAlign:"center" }}>
          {done.already ? `Welcome back, ${done.name}!` : `Welcome, ${done.name}!`}
        </div>
        <div style={{ fontSize:14, color:"#8c8c8c", marginBottom:20, textAlign:"center" }}>
          {done.already ? "You're already a member" : "You're now a member"} — you have <strong style={{ color:"#394c76" }}>{done.points} points</strong>
        </div>
        <div style={{ width:"100%", maxWidth:340, background:"#f4f6f9", border:"1px solid #e3e7f0", borderRadius:14, padding:16, textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:13, color:"#394c76", lineHeight:1.6 }}>Show this screen to the cashier to earn and redeem points on your bill.</div>
        </div>

        {/* Personal "check my points" link + QR — bookmark or re-scan any time,
            instead of re-typing your phone number to check your balance. */}
        <div style={{ width:"100%", maxWidth:340, background:"#fff", border:"1px solid #e3e7f0", borderRadius:16, padding:16, display:"flex", flexDirection:"column", alignItems:"center" }}>
          <div style={{ fontSize:13, fontWeight:"bold", color:"#394c76", marginBottom:10, textAlign:"center" }}>📲 Check My Points Anytime</div>
          <QRCode url={`${baseUrl}?joinMember=1&checkPhone=${encodeURIComponent(done.phone)}`} size={140} />
          <a href={`${baseUrl}?joinMember=1&checkPhone=${encodeURIComponent(done.phone)}`}
            style={{ display:"block", marginTop:12, width:"100%", background:"linear-gradient(150deg,#394c76,#2c3b5e)", color:"#fff", padding:"12px 0", borderRadius:12, fontWeight:"bold", fontSize:14, textDecoration:"none", textAlign:"center" }}>
            Open My Points Page
          </a>
          <div style={{ fontSize:11, color:"#aaa", textAlign:"center", marginTop:10, lineHeight:1.6 }}>Bookmark this or save the QR — scanning it always shows your latest points, no typing needed.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#e8ecef", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Georgia,serif" }}>
      <div style={{ width:64, height:64, borderRadius:18, background:"#394c76", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12, boxShadow:"0 8px 22px rgba(57,76,118,0.25)" }}>
        <Icon name="coffee" size={30} color="#fff" stroke={1.7} />
      </div>
      <div className="hl-title" style={{ fontSize:24, fontWeight:800, color:"#2b3346", marginBottom:4 }}>Join as a Member</div>
      <div style={{ fontSize:13, color:"#8c8c8c", letterSpacing:1, textTransform:"uppercase", marginBottom:28, textAlign:"center" }}>Earn & redeem points on every visit</div>
      <div style={{ width:"100%", maxWidth:360 }}>
        <input value={name} onChange={e=>{setName(e.target.value);setError("");}}
          placeholder="Your name" autoFocus
          style={{ width:"100%", background:"#f4f6f9", border:`2px solid ${error?"#cc4444":"#394c76"}`, color:"#2b3346", padding:"16px 18px", borderRadius:14, fontSize:18, fontFamily:"Georgia,serif", boxSizing:"border-box", textAlign:"center", marginBottom:10, outline:"none" }} />
        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
          <select value={country} onChange={e=>setCountry(e.target.value)}
            style={{ background:"#f4f6f9", border:`2px solid ${error?"#cc4444":"#394c76"}`, color:"#2b3346", padding:"0 10px", borderRadius:14, fontSize:16, fontFamily:"Georgia,serif", outline:"none" }}>
            {PHONE_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name} +{c.dial}</option>)}
          </select>
          <input value={phone} onChange={e=>{setPhone(e.target.value);setError("");}}
            onKeyDown={e=>e.key==="Enter"&&register()}
            placeholder="Phone number" type="tel"
            style={{ flex:1, minWidth:0, background:"#f4f6f9", border:`2px solid ${error?"#cc4444":"#394c76"}`, color:"#2b3346", padding:"16px 18px", borderRadius:14, fontSize:18, fontFamily:"Georgia,serif", boxSizing:"border-box", textAlign:"center", outline:"none" }} />
        </div>
        {error && <div style={{ color:"#ff7777", fontSize:13, textAlign:"center", marginBottom:8 }}>{error}</div>}
        <button onClick={register} disabled={saving}
          style={{ fontFamily:"Georgia,serif", cursor:"pointer", width:"100%", background:"linear-gradient(150deg,#394c76,#2c3b5e)", border:"none", color:"#fff", padding:"16px 0", borderRadius:14, fontSize:18, fontWeight:"bold", marginTop:4 }}>
          {saving?"Joining...":"✓ Join Now"}
        </button>
        <div style={{ fontSize:12, color:"#c9cfd8", textAlign:"center", marginTop:12, lineHeight:1.6 }}>
          Already a member? Just enter your phone number (name not needed) to check your points balance.
        </div>
      </div>
    </div>
  );
}

// ── GroupAdminScreen — create groups + generate QR ──
function GroupAdminScreen({ goHome }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ groupName:"", members:"" });
  const [addMode, setAddMode] = useState("new"); // "new" = create group, "existing" = add member to a group
  const [existingSlug, setExistingSlug] = useState(""); // selected group slug when adding to existing
  const [saving, setSaving] = useState(false);
  const [qrTarget, setQrTarget] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // {msg, onConfirm}
  const [toast, setToast] = useState(""); // short toast message
  const [formError, setFormError] = useState(""); // validation message for create form
  const [loyaltyByGroupId, setLoyaltyByGroupId] = useState({}); // groups.id -> linked members row
  const [phoneEditing, setPhoneEditing] = useState(null); // groups.id currently linking a phone
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("MY");

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""), 2000); };

  const loadLoyalty = () => {
    supabase.from("members").select("id,source_group_id,name,phone,points").not("source_group_id","is",null)
      .then(({ data }) => {
        const map = {};
        (data||[]).forEach(r => { map[r.source_group_id] = r; });
        setLoyaltyByGroupId(map);
      });
  };

  const linkPhone = async (member) => {
    const dial = PHONE_COUNTRIES.find(c=>c.code===phoneCountry).dial;
    const phone = composePhone(phoneInput, dial);
    if (phone.length < 6) { showToast("Enter a valid phone number"); return; }
    const existing = loyaltyByGroupId[member.id];
    if (existing) {
      await supabase.from("members").update({ phone, name: member.display_name }).eq("id", existing.id);
    } else {
      const { error } = await supabase.from("members").insert({ name: member.display_name, phone, source_group_id: member.id });
      if (error) { showToast(error.code === "23505" ? "This phone is already linked to another member" : "Could not link phone"); return; }
    }
    setPhoneEditing(null); setPhoneInput("");
    loadLoyalty();
    showToast("Loyalty phone linked!");
  };

  const load = async (showLoader=false) => {
    if (showLoader) setLoading(true);
    const { data } = await supabase.from("groups").select("*").order("created_at",{ ascending:false });
    setGroups(data||[]);
    setLoading(false);
    loadLoyalty();
  };
  useEffect(() => {
    load(true); // show loader only on first load
    // Realtime — silently update without showing loader
    const ch = supabase.channel("groups-watch")
      .on("postgres_changes", { event:"*", schema:"public", table:"groups" }, () => load(false))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const save = async () => {
    setFormError("");
    const members = form.members.split(",").map(m=>m.trim()).filter(Boolean);
    const tooShort = members.filter(m => m.length < 3);

    if (addMode === "existing") {
      // Adding member(s) to an already-created group
      if (!existingSlug) { setFormError("Please select a group"); return; }
      if (members.length === 0) { setFormError("Enter at least one member name"); return; }
      if (tooShort.length > 0) {
        setFormError(`These names are too short (need 3+ letters): ${tooShort.join(", ")}`);
        return;
      }
      const grp = grouped[existingSlug];
      if (!grp) { setFormError("Group not found — refresh and try again"); return; }
      setSaving(true);
      const rows = members.map(name => ({
        id: `${existingSlug}-${name.toLowerCase().replace(/\s+/g,"-")}`,
        display_name: name,
        group_name: grp.name,
        group_slug: existingSlug,
      }));
      await supabase.from("groups").upsert(rows);
      setForm({ groupName:"", members:"" });
      setFormError("");
      setSaving(false);
      await load(false);
      showToast(members.length > 1 ? `${members.length} members added` : "Member added");
      return;
    }

    // addMode === "new" — create a brand new group
    if (form.groupName.trim().length < 3) { setFormError("Group name must be at least 3 letters"); return; }
    if (tooShort.length > 0) {
      setFormError(`These names are too short (need 3+ letters): ${tooShort.join(", ")}`);
      return;
    }
    setSaving(true);
    const slug = form.groupName.trim().toLowerCase().replace(/\s+/g,"-");
    if (members.length > 0) {
      // Staff adding members manually
      const rows = members.map(name => ({
        id: `${slug}-${name.toLowerCase().replace(/\s+/g,"-")}`,
        display_name: name,
        group_name: form.groupName.trim(),
        group_slug: slug,
      }));
      await supabase.from("groups").upsert(rows);
    } else {
      // Just create group with no members yet — VIPs self-register via invite link
      // Insert a placeholder row to store group info so it appears in the list
      await supabase.from("groups").upsert({
        id: `${slug}-__group__`,
        display_name: "__group__",
        group_name: form.groupName.trim(),
        group_slug: slug,
      });
    }
    setForm({ groupName:"", members:"" });
    setFormError("");
    setSaving(false);
    await load(false); // no flicker
  };

  const deleteGroup = (slug, name) => {
    setConfirmModal({
      msg: `Delete group "${name}" and all members?`,
      onConfirm: async () => {
        setConfirmModal(null);
        setGroups(prev => prev.filter(g => g.group_slug !== slug));
        await supabase.from("groups").delete().eq("group_slug", slug);
        showToast("Group deleted");
      }
    });
  };

  const deleteMember = async (id) => {
    setGroups(prev => prev.filter(g => g.id !== id)); // instant UI
    await supabase.from("groups").delete().eq("id", id);
  };

  const grouped = groups.reduce((acc,g) => {
    if (!acc[g.group_slug]) acc[g.group_slug] = { name:g.group_name, slug:g.group_slug, members:[] };
    acc[g.group_slug].members.push(g);
    return acc;
  }, {});

  const baseUrl = window.location.origin + window.location.pathname;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"Georgia,serif" }}>
      <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 16px rgba(57,76,118,0.25)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="users" size={18} color="#fff" /></div>
          <div className="hl-title" style={{ fontSize:20, color:"#fff", fontWeight:700, letterSpacing:0.3 }}>Group Members</div>
        </div>
        <button onClick={goHome} style={btn({ background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", padding:"8px 16px", fontSize:13 })}>← Back</button>
      </div>
      <div style={{ padding:16, maxWidth:600, margin:"0 auto" }}>
        {/* Create / Add form */}
        <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:20 }}>
          {/* Mode toggle */}
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            {[["new","Create New Group"],["existing","Add to Existing"]].map(([key,label]) => (
              <button key={key} onClick={() => { setAddMode(key); setFormError(""); }}
                style={btn({ flex:1, background: addMode===key ? C.goldGrad : "transparent",
                  border:`1px solid ${addMode===key ? C.gold : C.border}`, color: addMode===key ? C.dark : C.muted,
                  padding:"9px 0", fontSize:13, fontWeight:"bold", borderRadius:8 })}>
                {label}
              </button>
            ))}
          </div>

          {addMode === "new" ? (
            <>
              <input value={form.groupName} onChange={e=>{setForm(p=>({...p,groupName:e.target.value}));setFormError("");}}
                placeholder="Group name (e.g. Kopi Gang)"
                style={{ width:"100%", background:C.bg, border:`1px solid ${formError?"#cc4444":C.border}`, color:C.text, padding:"10px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box", marginBottom:10 }} />
              <input value={form.members} onChange={e=>{setForm(p=>({...p,members:e.target.value}));setFormError("");}}
                placeholder="Member names, comma separated (optional — VIPs can self-register)"
                style={{ width:"100%", background:C.bg, border:`1px solid ${formError?"#cc4444":C.border}`, color:C.text, padding:"10px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box", marginBottom:10 }} />
            </>
          ) : (
            <>
              <select value={existingSlug} onChange={e=>{setExistingSlug(e.target.value);setFormError("");}}
                style={{ width:"100%", background:C.bg, border:`1px solid ${formError&&!existingSlug?"#cc4444":C.border}`, color:existingSlug?C.text:C.muted, padding:"10px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box", marginBottom:10 }}>
                <option value="">— Select a group —</option>
                {Object.values(grouped).map(g => (
                  <option key={g.slug} value={g.slug} style={{ color:"#000" }}>{g.name}</option>
                ))}
              </select>
              <input value={form.members} onChange={e=>{setForm(p=>({...p,members:e.target.value}));setFormError("");}}
                placeholder="New member name(s), comma separated"
                style={{ width:"100%", background:C.bg, border:`1px solid ${formError?"#cc4444":C.border}`, color:C.text, padding:"10px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box", marginBottom:10 }} />
            </>
          )}

          {formError && <div style={{ color:"#ff7777", fontSize:13, marginBottom:10 }}>{formError}</div>}
          <button onClick={save} disabled={saving}
            style={btn({ background:C.goldGrad, border:"none", color:C.dark, padding:"11px 0", fontSize:15, fontWeight:"bold", width:"100%", borderRadius:10 })}>
            {saving ? "Saving..." : addMode==="new" ? "✓ Create Group & Generate QRs" : "✓ Add Member"}
          </button>
        </div>

        {/* QR modal */}
        {qrTarget && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}
            onClick={()=>setQrTarget(null)}>
            <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:20, padding:24, textAlign:"center", maxWidth:340, width:"92%" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:2 }}><Icon name="user" size={18} color="#394c76" /><div className="hl-title" style={{ fontSize:18, fontWeight:700, color:"#2b3346" }}>{qrTarget.name}</div></div>
              <div style={{ fontSize:12, color:"#8c8c8c", marginBottom:14 }}>VIP scans this — or send the link (works on any phone)</div>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrTarget.url)}&bgcolor=ffffff&color=000000&margin=10`}
                style={{ width:220, height:220, borderRadius:8, border:"2px solid #d6dbe2" }} alt="QR" />
              {/* Clickable link */}
              <a href={qrTarget.url} target="_blank" rel="noreferrer"
                style={{ display:"block", fontSize:11, color:"#394c76", marginTop:8, marginBottom:14, wordBreak:"break-all", textDecoration:"underline" }}>
                {qrTarget.url}
              </a>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <a href={`https://wa.me/?text=${encodeURIComponent("Hi "+qrTarget.name+"! Here is your personal Hoto Lounge menu — tap to open: "+qrTarget.url)}`}
                  target="_blank" rel="noreferrer"
                  style={{ display:"block", background:"#394c76", color:"#fff", padding:"13px 0", borderRadius:10, fontWeight:"bold", fontSize:15, textDecoration:"none" }}>
                  Send Link via WhatsApp
                </a>
                <button onClick={()=>{ navigator.clipboard?.writeText(qrTarget.url); showToast("Link copied!"); }}
                  style={{ fontFamily:"Georgia,serif", cursor:"pointer", width:"100%", background:"#eef1f6", color:"#394c76", padding:"11px 0", borderRadius:10, fontWeight:"bold", fontSize:14, border:"none" }}>
                  Copy Link
                </button>
                <button onClick={()=>downloadQR(qrTarget.url, qrTarget.name)}
                  style={{ fontFamily:"Georgia,serif", cursor:"pointer", width:"100%", background:"transparent", color:"#394c76", padding:"9px 0", borderRadius:10, fontWeight:"bold", fontSize:13, border:"1px solid #394c76" }}>
                  ⬇️ Download QR (for printing / scanning)
                </button>
              </div>
              <button onClick={()=>setQrTarget(null)}
                style={{ fontFamily:"Georgia,serif", cursor:"pointer", marginTop:10, background:"transparent", border:"none", color:"#aaa", fontSize:13 }}>Close</button>
            </div>
          </div>
        )}

        {/* Toast notification */}
        {toast && (
          <div style={{ position:"fixed", bottom:30, left:"50%", transform:"translateX(-50%)", background:"#eef1f6", border:"1.5px solid #394c76", color:"#394c76", padding:"10px 24px", borderRadius:12, fontSize:14, fontWeight:"bold", zIndex:9999, pointerEvents:"none", boxShadow:"0 4px 20px rgba(0,0,0,0.4)" }}>
            ✓ {toast}
          </div>
        )}

        {/* Confirm modal */}
        {confirmModal && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
            onClick={()=>setConfirmModal(null)}>
            <div onClick={e=>e.stopPropagation()} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:16, padding:24, maxWidth:320, width:"100%", textAlign:"center" }}>
              <div style={{ fontSize:16, color:C.text, marginTop:6, marginBottom:20, lineHeight:1.6, fontWeight:600 }}>{confirmModal.msg}</div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setConfirmModal(null)}
                  style={btn({ flex:1, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"10px 0", borderRadius:10, fontSize:14 })}>
                  Cancel
                </button>
                <button onClick={confirmModal.onConfirm}
                  style={btn({ flex:1, background:"#fbeaea", border:"1px solid #e6c3c3", color:"#c0392b", padding:"10px 0", borderRadius:10, fontSize:14, fontWeight:"bold" })}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Groups list */}
        {loading
          ? <div style={{ color:C.muted, textAlign:"center", padding:40 }}>Loading...</div>
          : Object.values(grouped).length === 0
            ? <div style={{ color:C.muted, textAlign:"center", padding:40 }}>No groups yet — create one above</div>
            : Object.values(grouped).map(grp => (
              <div key={grp.slug} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, marginBottom:14, overflow:"hidden" }}>
                <div style={{ background:`${C.border}44`, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}><Icon name="users" size={16} color="#394c76" /><div className="hl-title" style={{ fontSize:15, fontWeight:700, color:"#2b3346" }}>{grp.name}</div></div>
                  <button onClick={()=>deleteGroup(grp.slug, grp.name)}
                    style={btn({ background:"#fbeaea", border:"1px solid #e6c3c3", color:"#c0392b", padding:"4px 10px", fontSize:12, borderRadius:6 })}>Delete Group</button>
                </div>
                {/* Invite link — always visible */}
                <div style={{ padding:"12px 16px", background:"#eef1f6", borderTop:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:11, color:"#394c76", letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 }}>VIP Self-Register Link</div>
                  <div style={{ fontSize:11, color:"#8c8c8c", fontFamily:"monospace", wordBreak:"break-all", marginBottom:10 }}>{baseUrl}?join={grp.slug}</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={()=>{ navigator.clipboard?.writeText(`${baseUrl}?join=${grp.slug}`); showToast("Link copied!"); }}
                      style={btn({ background:"#fff", border:`1px solid #394c76`, color:"#394c76", padding:"8px 0", fontSize:13, borderRadius:8, flex:1 })}>Copy Link</button>
                    <a href={`https://wa.me/?text=${encodeURIComponent("Hi! Register your name to order at Hoto Lounge — tap this link, type your name and save your personal QR code: "+baseUrl+"?join="+grp.slug)}`}
                      target="_blank" rel="noreferrer"
                      style={{ display:"block", background:"#394c76", color:"#fff", padding:"8px 0", fontSize:13, borderRadius:8, textDecoration:"none", fontWeight:"bold", flex:1, textAlign:"center" }}>Send WhatsApp</a>
                  </div>
                </div>
                {grp.members.filter(m=>m.display_name!=="__group__").map(m => {
                  const url = `${baseUrl}?group=${m.id}`;
                  const loyalty = loyaltyByGroupId[m.id];
                  return (
                    <div key={m.id} style={{ padding:"10px 16px", borderTop:`1px solid ${C.border}` }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, color:C.text }}><Icon name="user" size={15} color="#8c8c8c" /><span style={{ fontSize:14, fontWeight:"bold" }}>{m.display_name}</span></div>
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={()=>setQrTarget({ name:m.display_name, url })}
                            style={btn({ background:C.gold, border:"none", color:"#fff", padding:"6px 14px", fontSize:12, fontWeight:"bold", borderRadius:6, display:"flex", alignItems:"center", gap:6 })}><Icon name="grid" size={13} color="#fff" /> Show QR</button>
                          <button onClick={()=>deleteMember(m.id)}
                            style={btn({ background:"#fbeaea", border:"1px solid #e6c3c3", color:"#c0392b", padding:"6px 10px", fontSize:12, borderRadius:6 })}>✕</button>
                        </div>
                      </div>
                      <div style={{ marginTop:8 }}>
                        {loyalty ? (
                          <div style={{ fontSize:12, color:"#2e7d32", background:"#eaf5ea", borderRadius:6, padding:"5px 10px", display:"inline-block" }}>
                            📱 {loyalty.phone} · {loyalty.points} pts
                          </div>
                        ) : phoneEditing === m.id ? (
                          <div>
                            <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                              <select value={phoneCountry} onChange={e=>setPhoneCountry(e.target.value)}
                                style={{ background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"0 6px", borderRadius:6, fontSize:13, fontFamily:"Georgia,serif" }}>
                                {PHONE_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name} +{c.dial}</option>)}
                              </select>
                              <input value={phoneInput} onChange={e=>setPhoneInput(e.target.value)} placeholder="Phone number" autoFocus type="tel"
                                style={{ flex:1, minWidth:0, background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"6px 10px", borderRadius:6, fontSize:13, fontFamily:"Georgia,serif" }} />
                            </div>
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>linkPhone(m)} style={btn({ background:"#394c76", border:"none", color:"#fff", padding:"6px 12px", fontSize:12, borderRadius:6, fontWeight:"bold", flex:1 })}>Link</button>
                              <button onClick={()=>{setPhoneEditing(null);setPhoneInput("");}} style={btn({ background:"#f5f5f5", border:"1px solid #ddd", color:"#888", padding:"6px 10px", fontSize:12, borderRadius:6 })}>✕</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={()=>{setPhoneEditing(m.id);setPhoneInput("");}}
                            style={btn({ background:"transparent", border:"none", color:"#394c76", padding:0, fontSize:12, textDecoration:"underline" })}>+ Add loyalty phone (optional)</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
        }
      </div>
    </div>
  );
}


// ── VIPScreen — shows all VIP members like Takeaway slots ──
function VIPScreen({ setScreen, setTableNo, goHome }) {
  const [members, setMembers] = useState([]);
  const [activeIds, setActiveIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickedMember, setPickedMember] = useState(null); // { tno } when a member is chosen but table not yet picked

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("groups").select("*")
        .neq("display_name","__group__").order("group_name").order("display_name");
      setMembers(data||[]);
      // Find which VIPs have active orders
      const { data: orders } = await supabase.from("orders").select("table_no")
        .like("table_no","GRP-%").not("status","in",'("cancelled","paid")');
      const active = new Set((orders||[]).map(o => o.table_no.split("·")[0].replace(/^GRP-/,"")));
      setActiveIds([...active]);
      setLoading(false);
    };
    load();
    const ch = supabase.channel("vip-screen-watch")
      .on("postgres_changes",{event:"*",schema:"public",table:"orders"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"groups"},load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // Group by group_name
  const grouped = members.reduce((acc,m) => {
    if (!acc[m.group_name]) acc[m.group_name] = [];
    acc[m.group_name].push(m);
    return acc;
  }, {});

  // After a member is picked (with no active order), show the table picker.
  // Once a table is chosen, hand off to the tablet ordering screen.
  // NOTE: this return MUST come after all hooks above, or React throws error #300.
  if (pickedMember) {
    return (
      <GroupScreen
        tableNo={pickedMember.tno}
        setTableNo={(finalId) => { setTableNo(finalId); setScreen("tablet"); }}
        onBack={() => setPickedMember(null)}
      />
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:HP.bg, display:"flex", flexDirection:"column", fontFamily:"Georgia,serif" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 16px rgba(57,76,118,0.25)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="users" size={19} color="#fff" /></div>
          <div>
            <div className="hl-title" style={{ fontSize:19, color:"#fff", fontWeight:700, letterSpacing:0.3 }}>VIP Members</div>
            <div style={{ fontSize:11, color:"#aeb8cc", letterSpacing:1 }}>Select a member to order</div>
          </div>
        </div>
        <button onClick={goHome} style={btn({ background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", padding:"8px 16px", fontSize:13 })}>← Back</button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 18px 32px", maxWidth:520, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
        {/* Legend */}
        <div style={{ display:"flex", gap:18, fontSize:12, marginBottom:18, color:"#8c8c8c" }}>
          <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:11, height:11, borderRadius:3, border:"1.5px solid #c9cfd8" }} /> Available</span>
          <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:11, height:11, borderRadius:3, background:"#394c76" }} /> Active order</span>
        </div>

        {loading ? <div style={{ color:"#8c8c8c", textAlign:"center", padding:30 }}>Loading…</div> : Object.keys(grouped).length === 0 ? (
          <div style={{ color:"#8c8c8c", textAlign:"center", padding:30 }}>
            <div style={{ fontSize:14, marginBottom:8 }}>No VIP members yet</div>
            <div style={{ fontSize:12 }}>Add members from ••• More Options → Manage VIP Groups</div>
          </div>
        ) : Object.entries(grouped).map(([groupName, gMembers]) => (
          <div key={groupName} style={{ width:"100%", marginBottom:20 }}>
            <div style={{ fontSize:11, color:"#8c8c8c", letterSpacing:2, textTransform:"uppercase", marginBottom:10, fontWeight:700 }}>{groupName}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(110px,1fr))", gap:10 }}>
              {gMembers.map(m => {
                const isActive = activeIds.includes(m.id);
                return (
                  <button key={m.id} onClick={async () => {
                      const { data } = await supabase.from("orders").select("table_no")
                        .like("table_no", `GRP-${m.id}%`).not("status","in",'("cancelled","paid")').limit(1);
                      if (data && data.length) { setTableNo(data[0].table_no); setScreen("tablet"); }
                      else { setPickedMember({ tno: `GRP-${m.id}` }); }
                    }}
                    style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"#fff", border:`1.5px solid ${isActive?"#394c76":"#d6dbe2"}`, color:"#2b3346", padding:"16px 8px", fontSize:13, fontWeight:700, borderRadius:14, position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:8, boxShadow:"0 2px 8px rgba(57,76,118,0.06)" }}>
                    {isActive && <div style={{ position:"absolute", top:8, right:8, width:8, height:8, borderRadius:"50%", background:"#394c76" }} />}
                    <div style={{ width:40, height:40, borderRadius:"50%", background:isActive?"#eef1f6":"#f4f6f9", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="user" size={20} color="#394c76" /></div>
                    <span>{m.display_name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TakeawayScreen({ setScreen, setTableNo, goHome }) {
  const [activeSlots, setActiveSlots] = useState([]);

  useEffect(() => {
    // Fetch which TW slots have active (pending/done) orders
    const fetch = async () => {
      const { data } = await supabase.from("orders").select("table_no")
        .like("table_no","TW-%").not("status","in","(cancelled,paid)");
      setActiveSlots([...new Set((data||[]).map(o=>o.table_no))]);
    };
    fetch();
    const ch = supabase.channel("tw-slots-watch")
      .on("postgres_changes",{event:"*",schema:"public",table:"orders"},fetch).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:HP.bg, display:"flex", flexDirection:"column", fontFamily:"Georgia,serif" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 16px rgba(57,76,118,0.25)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="bag" size={19} color="#fff" /></div>
          <div>
            <div className="hl-title" style={{ fontSize:19, color:"#fff", fontWeight:700, letterSpacing:0.3 }}>Takeaway Orders</div>
            <div style={{ fontSize:11, color:"#aeb8cc", letterSpacing:1 }}>Select a slot to start ordering</div>
          </div>
        </div>
        <button onClick={goHome} style={btn({ background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", padding:"8px 16px", fontSize:13 })}>← Back</button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 18px 32px", maxWidth:520, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
        {/* Legend */}
        <div style={{ display:"flex", gap:18, fontSize:12, marginBottom:18, color:"#8c8c8c" }}>
          <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:11, height:11, borderRadius:3, border:"1.5px solid #c9cfd8" }} /> Available</span>
          <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:11, height:11, borderRadius:3, background:"#394c76" }} /> Active order</span>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(72px,1fr))", gap:10 }}>
          {TW_SLOTS.map(slot => {
            const isActive = activeSlots.includes(slot);
            return (
              <button key={slot} onClick={() => { setTableNo(slot); setScreen("tablet"); }}
                className="hl-title"
                style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"#fff", border:`1.5px solid ${isActive?"#394c76":"#d6dbe2"}`, color:"#2b3346", padding:"16px 0", fontSize:17, fontWeight:700, borderRadius:12, position:"relative", boxShadow:"0 2px 8px rgba(57,76,118,0.06)" }}>
                {slot.replace("TW-","")}
                {isActive && <div style={{ position:"absolute", top:6, right:6, width:8, height:8, borderRadius:"50%", background:"#394c76" }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Dropdown that opens into a checklist of VIP groups (from the `groups` table),
// so a menu item's VIP price can be scoped to specific groups instead of all of them.
function VipGroupsField({ value, onChange }) {
  const [groups, setGroups] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    // Deliberately does NOT exclude the "__group__" placeholder row: a brand-new
    // group with no members yet still needs to be selectable for pricing scope.
    supabase.from("groups").select("group_name,group_slug")
      .then(({ data }) => {
        const bySlug = {};
        (data || []).forEach(g => { bySlug[g.group_slug] = g.group_name; });
        setGroups(Object.entries(bySlug).map(([slug, name]) => ({ slug, name })));
      });
  }, []);
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);
  const toggle = (slug) => {
    onChange(value.includes(slug) ? value.filter(s => s !== slug) : [...value, slug]);
  };
  const summary = value.length === 0
    ? "All VIP groups"
    : groups.filter(g => value.includes(g.slug)).map(g => g.name).join(", ") || `${value.length} group(s)`;
  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width:"100%", textAlign:"left", background:"#f4f6f9", border:"1px solid #d6dbe2", color:"#2b3346", padding:"10px 12px", borderRadius:9, fontSize:14, fontFamily:"Georgia,serif", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span>{summary}</span><span>▾</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, marginTop:4, background:"#fff", border:"1px solid #d6dbe2", borderRadius:9, boxShadow:"0 8px 24px rgba(0,0,0,0.15)", zIndex:10, padding:8, maxHeight:220, overflowY:"auto" }}>
          {groups.length === 0 && <div style={{ fontSize:12, color:"#8c8c8c", padding:6 }}>No VIP groups yet</div>}
          {groups.map(g => (
            <label key={g.slug} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 6px", fontSize:14, cursor:"pointer" }}>
              <input type="checkbox" checked={value.includes(g.slug)} onChange={() => toggle(g.slug)}
                style={{ width:24, height:24, flexShrink:0, accentColor:"#394c76" }} />
              {g.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function SystemSettingsScreen({ goHome }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const load = () => supabase.from("app_settings").select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => { if (data) setForm(f => f || data); });
    load();
    const ch = supabase.channel("app-settings-screen-watch")
      .on("postgres_changes", { event:"*", schema:"public", table:"app_settings" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    await supabase.from("app_settings").update({
      staff_pin: form.staff_pin,
      admin_pw: form.admin_pw,
      service_charge: parseFloat(form.service_charge) || 0,
      auto_print_enabled: form.auto_print_enabled,
      points_earn_rate: parseFloat(form.points_earn_rate) || 0,
      points_earn_basis: form.points_earn_basis,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    setSaving(false);
    showToast("Settings saved!");
  };

  // ── Rewards Catalog — named things a member can redeem points for ──
  const [rewards, setRewards] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [newReward, setNewReward] = useState({ name:"", points_cost:"", reward_type:"discount", discount_amount:"", menu_item_id:"" });
  const loadRewards = () => supabase.from("rewards").select("*").order("points_cost",{ ascending:true })
    .then(({ data }) => setRewards(data||[]));
  useEffect(() => {
    loadRewards();
    const ch = supabase.channel("rewards-settings-watch")
      .on("postgres_changes", { event:"*", schema:"public", table:"rewards" }, loadRewards)
      .subscribe();
    supabase.from("menu_items").select("id,name,item_no,image_url").order("item_no",{ ascending:true })
      .then(({ data }) => setMenuItems(data||[]));
    return () => supabase.removeChannel(ch);
  }, []);

  const addReward = async () => {
    const name = newReward.name.trim();
    const pointsCost = parseFloat(newReward.points_cost);
    if (!name || !pointsCost || pointsCost <= 0) return;
    if (newReward.reward_type === "free_item" && !newReward.menu_item_id) return;
    const discountAmount = newReward.reward_type === "discount" ? parseFloat(newReward.discount_amount)||0 : null;
    const menuItemId = newReward.reward_type === "free_item" ? parseInt(newReward.menu_item_id) : null;
    await supabase.from("rewards").insert({ name, points_cost:pointsCost, reward_type:newReward.reward_type, discount_amount:discountAmount, menu_item_id:menuItemId });
    setNewReward({ name:"", points_cost:"", reward_type:"discount", discount_amount:"", menu_item_id:"" });
  };
  const toggleRewardActive = (reward) => supabase.from("rewards").update({ is_active: !reward.is_active }).eq("id", reward.id);
  const deleteReward = (id) => supabase.from("rewards").delete().eq("id", id);

  if (!form) {
    return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:C.muted }}>Loading…</div>;
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      {toast && (
        <div style={{ position:"fixed", top:24, left:"50%", transform:"translateX(-50%)", zIndex:99999, background:"#394c76", color:"#fff", padding:"14px 28px", borderRadius:12, fontSize:14, fontWeight:"bold", boxShadow:"0 6px 22px rgba(57,76,118,0.3)" }}>
          {toast}
        </div>
      )}
      <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 16px rgba(57,76,118,0.25)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="lock" size={19} color="#fff" /></div>
          <div className="hl-title" style={{ fontSize:19, color:"#fff", fontWeight:700, letterSpacing:0.3 }}>System Settings</div>
        </div>
        <button onClick={goHome} style={btn({ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.28)", color:"#fff", padding:"7px 12px", fontSize:14 })}>✕</button>
      </div>
      <div style={{ flex:1, padding:20, overflowY:"auto", maxWidth:520, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
        <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:"bold", color:C.text, marginBottom:14 }}>Passwords</div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:5 }}>Staff Home PIN</div>
            <input type="text" value={form.staff_pin} onChange={e => setForm(f => ({ ...f, staff_pin:e.target.value }))}
              style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", borderRadius:9, fontSize:14, boxSizing:"border-box" }} />
          </div>
          <div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:5 }}>Admin Password</div>
            <input type="text" value={form.admin_pw} onChange={e => setForm(f => ({ ...f, admin_pw:e.target.value }))}
              style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", borderRadius:9, fontSize:14, boxSizing:"border-box" }} />
          </div>
        </div>
        <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:"bold", color:C.text, marginBottom:14 }}>Service Charge</div>
          <div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:5 }}>Percentage (%)</div>
            <input type="number" step="0.5" min="0" max="20" value={form.service_charge} onChange={e => setForm(f => ({ ...f, service_charge:e.target.value }))}
              style={{ width:120, background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", borderRadius:9, fontSize:16, fontWeight:"bold", boxSizing:"border-box" }} />
          </div>
          <div style={{ fontSize:11, color:C.muted, marginTop:10 }}>Set to 0 for no service charge.</div>
        </div>
        <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:"bold", color:C.text, marginBottom:14 }}>Kitchen Auto Print</div>
          <button onClick={() => setForm(f => ({ ...f, auto_print_enabled:!f.auto_print_enabled }))}
            style={btn({ background:form.auto_print_enabled?"#394c76":"#eef1f6", border:form.auto_print_enabled?"none":`1px solid ${C.border}`, color:form.auto_print_enabled?"#fff":"#394c76", padding:"10px 18px", fontSize:13, fontWeight:"bold" })}>
            {form.auto_print_enabled ? "Auto-Print On" : "Auto-Print Off"}
          </button>
          <div style={{ fontSize:11, color:C.muted, marginTop:10 }}>Applies to the Kitchen screen on every device immediately.</div>
        </div>
        <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:"bold", color:C.text, marginBottom:14 }}>Loyalty Points</div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:5 }}>Earn Rate (points per RM1 spent)</div>
            <input type="number" step="0.1" min="0" value={form.points_earn_rate} onChange={e => setForm(f => ({ ...f, points_earn_rate:e.target.value }))}
              style={{ width:120, background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", borderRadius:9, fontSize:16, fontWeight:"bold", boxSizing:"border-box" }} />
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:5 }}>Earn Basis</div>
            <select value={form.points_earn_basis} onChange={e => setForm(f => ({ ...f, points_earn_basis:e.target.value }))}
              style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", borderRadius:9, fontSize:14, boxSizing:"border-box" }}>
              <option value="final_total">Final total (incl. service charge)</option>
              <option value="subtotal">Subtotal (before service charge)</option>
            </select>
          </div>
          <div style={{ fontSize:11, color:C.muted, marginTop:10 }}>Earning applies at the Cashier's payment screen when a member is attached to a bill. What members can redeem points for is set up below.</div>
        </div>
        <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:"bold", color:C.text, marginBottom:14 }}>Rewards Catalog</div>
          {rewards.length === 0 && <div style={{ fontSize:13, color:C.muted, marginBottom:14 }}>No rewards yet — add one below.</div>}
          {rewards.map(r => {
            const linkedItem = menuItems.find(mi=>mi.id===r.menu_item_id);
            return (
            <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}`, opacity:r.is_active?1:0.5 }}>
              {r.reward_type === "free_item" && (
                linkedItem?.image_url
                  ? <img src={linkedItem.image_url} alt="" style={{ width:40, height:40, borderRadius:8, objectFit:"cover", flexShrink:0 }} />
                  : <div style={{ width:40, height:40, borderRadius:8, background:"#eef1f6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:18 }}>🎁</div>
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:"bold", color:C.text }}>{r.name}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                  {r.points_cost} pts · {r.reward_type === "discount" ? `RM${parseFloat(r.discount_amount||0).toFixed(2)} off` : `Free item${linkedItem ? ": "+linkedItem.name : ""}`}
                  {!r.is_active && " · Inactive"}
                </div>
              </div>
              <button onClick={() => toggleRewardActive(r)} style={btn({ background:"#eef1f6", border:`1px solid ${C.border}`, color:"#394c76", padding:"7px 12px", fontSize:12, fontWeight:"bold", whiteSpace:"nowrap" })}>
                {r.is_active ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => deleteReward(r.id)} style={btn({ background:"#fbeaea", border:"1px solid #e6c3c3", color:"#c0392b", padding:"7px 12px", fontSize:12, fontWeight:"bold" })}>✕</button>
            </div>
            );
          })}
          <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
            <div style={{ fontSize:12, fontWeight:"bold", color:C.text, marginBottom:10 }}>Add New Reward</div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:C.muted, marginBottom:5 }}>Name</div>
              <input value={newReward.name} onChange={e => setNewReward(f => ({ ...f, name:e.target.value }))} placeholder="e.g. Free Coffee"
                style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", borderRadius:9, fontSize:14, boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:5 }}>Points Cost</div>
                <input type="number" step="1" min="0" value={newReward.points_cost} onChange={e => setNewReward(f => ({ ...f, points_cost:e.target.value }))}
                  style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", borderRadius:9, fontSize:14, boxSizing:"border-box" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:5 }}>Type</div>
                <select value={newReward.reward_type} onChange={e => setNewReward(f => ({ ...f, reward_type:e.target.value }))}
                  style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", borderRadius:9, fontSize:14, boxSizing:"border-box" }}>
                  <option value="discount">Cash off</option>
                  <option value="free_item">Free item</option>
                </select>
              </div>
            </div>
            {newReward.reward_type === "discount" ? (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:5 }}>Discount Amount (RM)</div>
                <input type="number" step="0.5" min="0" value={newReward.discount_amount} onChange={e => setNewReward(f => ({ ...f, discount_amount:e.target.value }))}
                  style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", borderRadius:9, fontSize:14, boxSizing:"border-box" }} />
              </div>
            ) : (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:5 }}>Menu Item to Give Free</div>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <select value={newReward.menu_item_id} onChange={e => setNewReward(f => ({ ...f, menu_item_id:e.target.value }))}
                    style={{ flex:1, minWidth:0, background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", borderRadius:9, fontSize:14, boxSizing:"border-box" }}>
                    <option value="">Select an item…</option>
                    {menuItems.map(mi => <option key={mi.id} value={mi.id}>{mi.item_no ? `#${mi.item_no} ` : ""}{mi.name}</option>)}
                  </select>
                  {newReward.menu_item_id && (() => {
                    const picked = menuItems.find(mi => mi.id === parseInt(newReward.menu_item_id));
                    return picked?.image_url
                      ? <img src={picked.image_url} alt="" style={{ width:44, height:44, borderRadius:9, objectFit:"cover", flexShrink:0 }} />
                      : <div style={{ width:44, height:44, borderRadius:9, background:"#eef1f6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:18 }}>🎁</div>;
                  })()}
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>Redeeming this sends it straight to the Kitchen/Cashier at RM0, just like a normal order.</div>
              </div>
            )}
            <button onClick={addReward} style={btn({ width:"100%", background:"#394c76", border:"none", color:"#fff", padding:"11px 0", fontSize:13, fontWeight:"bold" })}>+ Add Reward</button>
          </div>
        </div>
        <button onClick={save} disabled={saving}
          style={btn({ width:"100%", background:"linear-gradient(150deg,#394c76,#2c3b5e)", border:"none", color:"#fff", padding:"14px 0", fontSize:15, fontWeight:"bold", borderRadius:10 })}>
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// ── MembersScreen — view/search loyalty members, adjust points, remove ──
function MembersScreen({ goHome }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null); // member id currently adjusting points
  const [adjustInput, setAdjustInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // {id, name}
  const [toast, setToast] = useState("");
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""), 2000); };
  const [historyMember, setHistoryMember] = useState(null); // member currently viewing item history for
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistory = async (member) => {
    setHistoryMember(member); setHistoryLoading(true);
    const { data } = await supabase.from("orders").select("*").eq("member_id", member.id).eq("status","paid").order("created_at",{ ascending:false });
    setHistoryOrders(data||[]);
    setHistoryLoading(false);
  };

  const load = () => supabase.from("members").select("*").order("created_at",{ ascending:false })
    .then(({ data }) => { setMembers(data||[]); setLoading(false); });
  useEffect(() => {
    load();
    const ch = supabase.channel("members-screen-watch")
      .on("postgres_changes", { event:"*", schema:"public", table:"members" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search.trim())
  );

  const adjustPoints = async (member) => {
    const delta = parseInt(adjustInput);
    if (!delta) { setEditingId(null); setAdjustInput(""); return; }
    await supabase.from("members").update({ points: Math.max(0, parseFloat(member.points) + delta) }).eq("id", member.id);
    setEditingId(null); setAdjustInput("");
    showToast(delta > 0 ? `+${delta} points added` : `${delta} points removed`);
  };

  const deleteMember = async (id) => {
    await supabase.from("members").delete().eq("id", id);
    setConfirmDelete(null);
    showToast("Member removed");
  };

  const exportHistoryCSV = () => {
    const header = ["Date","Order ID","Item","Qty","Unit Price (RM)","Item Total (RM)"];
    const escape = (v) => `"${String(v).replace(/"/g,'""')}"`;
    const rows = [];
    historyOrders.forEach(o => {
      const date = new Date(o.created_at).toLocaleString("en-MY",{ dateStyle:"medium", timeStyle:"short" });
      (o.items||[]).forEach(item => {
        rows.push([date, o.id, item.name, item.qty, item.price.toFixed(2), (item.price*item.qty).toFixed(2)].map(escape).join(","));
      });
    });
    const csv = [header.map(escape).join(","), ...rows].join("\r\n");
    const BOM = String.fromCharCode(0xFEFF);
    const blob = new Blob([BOM+csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${historyMember.name}-history-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // CSV opens natively in Excel — no extra library needed for a browser-only app.
  // Exports whatever the current search has filtered to, so clearing the search
  // exports everyone and typing a name/phone exports just that match.
  const exportCSV = () => {
    const header = ["Name","Phone","Points","Total Spent (RM)","VIP","Joined"];
    const escape = (v) => `"${String(v).replace(/"/g,'""')}"`;
    const rows = filtered.map(m => [
      m.name, m.phone, m.points, parseFloat(m.total_spent||0).toFixed(2),
      m.source_group_id ? "Yes" : "No",
      new Date(m.created_at).toLocaleDateString("en-MY"),
    ].map(escape).join(","));
    const csv = [header.map(escape).join(","), ...rows].join("\r\n");
    const BOM = String.fromCharCode(0xFEFF);
    const blob = new Blob([BOM+csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `members-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      {toast && (
        <div style={{ position:"fixed", top:24, left:"50%", transform:"translateX(-50%)", zIndex:99999, background:"#394c76", color:"#fff", padding:"14px 28px", borderRadius:12, fontSize:14, fontWeight:"bold", boxShadow:"0 6px 22px rgba(57,76,118,0.3)" }}>
          {toast}
        </div>
      )}
      {confirmDelete && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:99998, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:24, width:"100%", maxWidth:320, textAlign:"center" }}>
            <div style={{ fontSize:15, color:C.text, marginBottom:20, fontWeight:600 }}>Remove {confirmDelete.name} as a member? Their points will be lost.</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex:1, background:"#f5f5f5", border:"1px solid #ddd", color:"#555", padding:"11px 0", borderRadius:9, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold" }}>Cancel</button>
              <button onClick={() => deleteMember(confirmDelete.id)} style={{ flex:1, background:"#c0392b", border:"none", color:"#fff", padding:"11px 0", borderRadius:9, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold" }}>Remove</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 16px rgba(57,76,118,0.25)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="crown" size={19} color="#fff" /></div>
          <div className="hl-title" style={{ fontSize:19, color:"#fff", fontWeight:700, letterSpacing:0.3 }}>Members</div>
        </div>
        <button onClick={goHome} style={btn({ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.28)", color:"#fff", padding:"7px 12px", fontSize:14 })}>✕</button>
      </div>
      <div style={{ flex:1, padding:20, overflowY:"auto", maxWidth:560, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or phone…"
            style={{ flex:1, minWidth:0, background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"12px 14px", borderRadius:10, fontSize:15, boxSizing:"border-box" }} />
          <button onClick={exportCSV} disabled={filtered.length===0}
            style={btn({ background:filtered.length?"#394c76":"#ccc", border:"none", color:"#fff", padding:"0 16px", fontSize:13, fontWeight:"bold", borderRadius:10, whiteSpace:"nowrap" })}>
            ⬇️ Export
          </button>
        </div>
        {loading ? (
          <div style={{ textAlign:"center", color:C.muted, padding:40 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", color:C.muted, padding:40 }}>{members.length===0 ? "No members yet." : `No members match "${search}".`}</div>
        ) : filtered.map(m => (
          <div key={m.id} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:"bold", color:C.text }}>
                  {m.name}{m.source_group_id && <span style={{ marginLeft:8, fontSize:10, color:"#394c76", background:"#eef1f6", borderRadius:6, padding:"2px 8px", fontWeight:"bold", letterSpacing:0.5 }}>VIP</span>}
                </div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{m.phone}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:18, fontWeight:"bold", color:"#394c76" }}>{m.points}</div>
                <div style={{ fontSize:10, color:C.muted }}>points</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>RM {parseFloat(m.total_spent||0).toFixed(2)} spent</div>
              </div>
            </div>
            {editingId === m.id ? (
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <input type="number" autoFocus value={adjustInput} onChange={e=>setAdjustInput(e.target.value)}
                  placeholder="e.g. 50 or -20"
                  style={{ flex:1, minWidth:0, background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, boxSizing:"border-box" }} />
                <button onClick={()=>adjustPoints(m)} style={{ background:"#394c76", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:"bold", cursor:"pointer" }}>Apply</button>
                <button onClick={()=>{setEditingId(null);setAdjustInput("");}} style={{ background:"#f5f5f5", border:"1px solid #ddd", color:"#888", borderRadius:8, padding:"8px 12px", fontSize:13, cursor:"pointer" }}>✕</button>
              </div>
            ) : (
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <button onClick={()=>openHistory(m)} style={{ flex:1, background:"#f7f8fa", border:`1px solid ${C.border}`, color:"#394c76", borderRadius:8, padding:"8px 0", fontSize:13, fontWeight:"bold", cursor:"pointer" }}>History</button>
                <button onClick={()=>{setEditingId(m.id);setAdjustInput("");}} style={{ flex:1, background:"#f7f8fa", border:`1px solid ${C.border}`, color:"#394c76", borderRadius:8, padding:"8px 0", fontSize:13, fontWeight:"bold", cursor:"pointer" }}>Adjust Points</button>
                <button onClick={()=>setConfirmDelete({ id:m.id, name:m.name })} style={{ background:"#fbeaea", border:"1px solid #e6c3c3", color:"#c0392b", borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer" }}>Remove</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Item-level purchase history for one member */}
      {historyMember && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:99997, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:420, maxHeight:"80vh", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #eee", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:"bold", color:"#1a1a1a" }}>{historyMember.name}</div>
                <div style={{ fontSize:12, color:"#888" }}>RM {parseFloat(historyMember.total_spent||0).toFixed(2)} lifetime spend</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                {historyOrders.length > 0 && (
                  <button onClick={exportHistoryCSV} style={btn({ background:"#394c76", border:"none", color:"#fff", padding:"8px 12px", fontSize:12, fontWeight:"bold", borderRadius:8, whiteSpace:"nowrap" })}>⬇️ Export</button>
                )}
                <button onClick={()=>setHistoryMember(null)} style={{ background:"#f5f5f5", border:"none", color:"#888", width:30, height:30, borderRadius:8, fontSize:16, cursor:"pointer", flexShrink:0 }}>✕</button>
              </div>
            </div>
            <div style={{ padding:"12px 20px 20px", overflowY:"auto", flex:1 }}>
              {historyLoading ? (
                <div style={{ textAlign:"center", color:"#aaa", padding:20 }}>Loading…</div>
              ) : historyOrders.length === 0 ? (
                <div style={{ textAlign:"center", color:"#aaa", padding:20, fontSize:13 }}>No paid orders on record for this member yet — history only covers visits from when they were attached to a bill at checkout.</div>
              ) : historyOrders.map(o => (
                <div key={o.id} style={{ borderBottom:"1px solid #f0f0f0", padding:"10px 0" }}>
                  <div style={{ fontSize:11, color:"#aaa", marginBottom:4 }}>{new Date(o.created_at).toLocaleString("en-MY",{ dateStyle:"medium", timeStyle:"short" })}</div>
                  {(o.items||[]).map((item,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#333" }}>
                      <span>{item.name} ×{item.qty}</span>
                      <span>RM {(item.price*item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminScreen({ goHome }) {
  const [authed, setAuthed] = useState(true); // no password needed
  const [toast, setToast] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // {id, name}
  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item_no:"", name:"", category:CATEGORIES[0], price:"", vip_price:"", vip_groups:[], description:"", emoji:"🍽️", image_url:"", is_available:true, addons:[], addon_required:false, promo_start:"", promo_end:"", promo_price:"", promo_drinks:[], promo_label:"" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const scrollRef = useRef(null);
  const fetchItems = async () => {
    const scrollEl = scrollRef.current;
    const scrollTop = scrollEl ? scrollEl.scrollTop : 0;
    const { data } = await supabase.from("menu_items").select("*").order("item_no", { ascending:true });
    setItems(data || []);
    setLoading(false);
    requestAnimationFrame(() => { if (scrollEl) scrollEl.scrollTop = scrollTop; });
  };
  useEffect(() => { fetchItems(); }, []);

  const handleLogin = () => { setAuthed(true); };
  const openAdd = () => {
    setForm({ item_no:"", name:"", category:CATEGORIES[0], price:"", vip_price:"", vip_groups:[], description:"", emoji:"🍽️", image_url:"", is_available:true, is_best_seller:false, addons:[], addon_required:false, promo_start:"", promo_end:"", promo_price:"", promo_drinks:[], promo_label:"" });
    setEditItem(null); setShowForm(true);
  };
  const openEdit = (item) => {
    setForm({ item_no:item.item_no, name:item.name, category:item.category, price:item.price, vip_price:item.vip_price||"", vip_groups:item.vip_groups||[], description:item.description||"", emoji:item.emoji||"", image_url:item.image_url||"", is_available:item.is_available!==false, is_best_seller:item.is_best_seller||false, addons:item.addons||[], addon_required:item.addon_required||false, promo_start:item.promo_start||"", promo_end:item.promo_end||"", promo_price:item.promo_price||"", promo_drinks:item.promo_drinks||[], promo_label:item.promo_label||"" });
    setEditItem(item); setShowForm(true);
  };
  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const path = `menu/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, file, { upsert:true });
    if (error) { showToast("Upload failed: " + error.message, "error"); setUploading(false); return; }
    const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
    setForm(f => ({ ...f, image_url:data.publicUrl }));
    setUploading(false);
  };
  const handleSave = async () => {
    const nowMins = (() => { const d = new Date(); const myt = new Date(d.toLocaleString("en-US",{timeZone:"Asia/Kuala_Lumpur"})); return myt.getHours()*60+myt.getMinutes(); })();
    const toMins = (t) => { if (!t) return null; const [h,m] = t.split(":").map(Number); return h*60+m; };
    const s = toMins(form.promo_start); const e = toMins(form.promo_end);
    const promo_active = s !== null && e !== null && nowMins >= s && nowMins < e;
    const p = { item_no:form.item_no, name:form.name, category:form.category, price:parseFloat(form.price), vip_price:form.vip_price?parseFloat(form.vip_price):null, vip_groups:form.vip_groups||[], description:form.description, emoji:form.emoji, image_url:form.image_url, is_available:form.is_available, is_best_seller:form.is_best_seller||false, addons:form.addons||[], addon_required:form.addon_required||false, promo_start:form.promo_start||null, promo_end:form.promo_end||null, promo_price:form.promo_price?parseFloat(form.promo_price):null, promo_drinks:form.promo_drinks||[], promo_label:form.promo_label||null, promo_active };
    if (editItem) await supabase.from("menu_items").update(p).eq("id", editItem.id);
    else await supabase.from("menu_items").insert(p);
    setShowForm(false); fetchItems();
  };
  const handleDelete = async (id) => {
    const item = items.find(i => i.id === id);
    setDeleteModal({ id, name: item?.name || "this item" });
  };
  const confirmDelete = async () => {
    await supabase.from("menu_items").delete().eq("id", deleteModal.id);
    setDeleteModal(null);
    showToast("Item deleted successfully.", "success");
    fetchItems();
  };
  const toggleAvailable = async (item) => { await supabase.from("menu_items").update({ is_available: item.is_available===false }).eq("id", item.id); fetchItems(); };

  // ── Admin SLATE theme (self-contained; matches the home page palette) ──
  const A = {
    bg:"#e8ecef", panel:"#ffffff", line:"#d6dbe2", text:"#2b3346", sub:"#8c8c8c",
    gold:"#394c76", goldText:"#394c76", goldSoft:"#eef1f6",
    green:"#394c76", greenSoft:"#eef1f6", red:"#c62828", redSoft:"#fbe9e9",
    shadow:"0 6px 22px rgba(57,76,118,0.10)"
  };
  const aInput = { width:"100%", background:"#f4f6f9", border:`1px solid ${A.line}`, color:A.text, padding:"10px 12px", borderRadius:9, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box", outline:"none" };
  const aLabel = { fontSize:11, color:A.sub, marginBottom:5, fontWeight:600, letterSpacing:0.4 };
  const aPrimary = (x={}) => ({ fontFamily:"Georgia,serif", cursor:"pointer", border:"none", background:"linear-gradient(150deg,#394c76,#2c3b5e)", color:"#fff", padding:"10px 20px", fontSize:13, fontWeight:700, borderRadius:10, letterSpacing:0.3, boxShadow:"0 3px 10px rgba(57,76,118,0.28)", ...x });
  const aGhost = (x={}) => ({ fontFamily:"Georgia,serif", cursor:"pointer", background:"#fff", border:`1px solid ${A.line}`, color:A.sub, padding:"9px 16px", fontSize:13, fontWeight:600, borderRadius:10, ...x });
  const aToggle = { fontFamily:"Georgia,serif", cursor:"pointer", padding:"8px 16px", fontSize:13, fontWeight:700, borderRadius:9 };
  const aChip = (x={}) => ({ fontFamily:"Georgia,serif", cursor:"pointer", padding:"7px 13px", fontSize:12, fontWeight:700, borderRadius:8, ...x });

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:A.bg, color:A.text, fontFamily:"Georgia,serif" }}>
      {toast && (
        <div style={{ position:"fixed", top:24, left:"50%", transform:"translateX(-50%)", zIndex:99999, background:toast.type==="error"?"#c62828":"#394c76", color:"#fff", padding:"14px 28px", borderRadius:12, fontSize:14, fontFamily:"Georgia,serif", fontWeight:"bold", boxShadow:"0 6px 22px rgba(57,76,118,0.3)", display:"flex", alignItems:"center", gap:10, minWidth:280, textAlign:"center", justifyContent:"center" }}>
          {toast.msg}
        </div>
      )}
      {deleteModal && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.75)", zIndex:99998, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:320, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"20px 24px", textAlign:"center" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}><Icon name="trash" size={30} color="#fff" /></div>
              <div className="hl-title" style={{ fontSize:18, fontWeight:700, color:"#fff" }}>Delete Item?</div>
            </div>
            <div style={{ padding:"20px 24px" }}>
              <div style={{ fontSize:14, color:"#333", fontFamily:"Georgia,serif", textAlign:"center", marginBottom:6 }}>
                Are you sure you want to delete:
              </div>
              <div style={{ fontSize:15, fontWeight:"bold", color:"#c62828", fontFamily:"Georgia,serif", textAlign:"center", marginBottom:16, padding:"10px 14px", background:"#fbeaea", borderRadius:10 }}>
                {deleteModal.name}
              </div>
              <div style={{ fontSize:12, color:"#999", textAlign:"center", marginBottom:20, fontFamily:"Georgia,serif" }}>
                This cannot be undone!
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setDeleteModal(null)}
                  style={{ flex:1, background:"#eef1f6", border:"1px solid #d6dbe2", color:"#5a5145", padding:"11px 0", fontSize:14, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold" }}>
                  Cancel
                </button>
                <button onClick={confirmDelete}
                  style={{ flex:1, background:"#c0392b", border:"none", color:"#fff", padding:"11px 0", fontSize:14, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                  <Icon name="trash" size={15} color="#fff" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 16px rgba(57,76,118,0.25)", position:"sticky", top:0, zIndex:50, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="sliders" size={18} color="#fff" /></div>
          <div className="hl-title" style={{ fontSize:20, color:"#fff", fontWeight:700, letterSpacing:0.3 }}>Menu Management</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={openAdd} style={{ fontFamily:"Georgia,serif", cursor:"pointer", border:"none", background:"#fff", color:"#394c76", padding:"9px 16px", fontSize:13, fontWeight:700, borderRadius:10 }}>+ Add Item</button>
          {[["← Back",false,goHome]].map(([lbl,active,fn]) => (
            <button key={lbl} onClick={fn} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:active?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.12)", border:active?"none":"1px solid rgba(255,255,255,0.28)", color:active?"#394c76":"#fff", padding:"8px 14px", fontSize:13, fontWeight:600, borderRadius:10 }}>{lbl}</button>
          ))}
        </div>
      </div>
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(30,20,8,0.5)", WebkitBackdropFilter:"blur(3px)", backdropFilter:"blur(3px)", zIndex:2000, display:"flex", alignItems:"flex-start", justifyContent:"center", overflowY:"auto", padding:"24px 12px" }}>
        <div style={{ background:A.panel, border:`1px solid ${A.line}`, borderRadius:18, padding:24, width:"100%", maxWidth:900, margin:"auto", position:"relative", boxShadow:"0 24px 70px rgba(0,0,0,0.35)" }}>
          <button onClick={() => setShowForm(false)} style={{ position:"absolute", top:14, right:14, background:"#eef1f6", border:"none", color:A.sub, fontSize:19, cursor:"pointer", fontFamily:"Georgia,serif", width:36, height:36, borderRadius:50 }}>✕</button>
          <div className="hl-title" style={{ fontSize:20, color:A.text, fontWeight:700, marginBottom:18 }}>{editItem ? "Edit Item" : "Add New Item"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:14 }}>
            {[["Item No.","item_no","e.g. A1"],["Item Name","name","e.g. Latte"],["Price (RM)","price","e.g. 8.00"],["VIP Price (RM)","vip_price","optional, leave blank to follow normal price"],["Emoji","emoji","e.g. ☕"],["Description","description","Short description"]].map(([label,key,ph]) => (
              <div key={key}>
                <div style={aLabel}>{label}</div>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]:e.target.value }))} placeholder={ph} type={(key==="price"||key==="vip_price")?"number":"text"} step={(key==="price"||key==="vip_price")?"0.10":undefined}
                  style={aInput} />
              </div>
            ))}
            <div>
              <div style={aLabel}>VIP Price Applies To</div>
              <VipGroupsField value={form.vip_groups||[]} onChange={(v) => setForm(f => ({ ...f, vip_groups:v }))} />
            </div>
            <div>
              <div style={aLabel}>Category</div>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category:e.target.value }))}
                style={{ ...aInput, cursor:"pointer" }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", justifyContent:"flex-end", gap:6 }}>
              <div style={aLabel}>Availability</div>
              <button onClick={() => setForm(f => ({ ...f, is_available:!f.is_available }))}
                style={form.is_available
                  ? { ...aToggle, background:"#394c76", color:"#fff", border:"none" }
                  : { ...aToggle, background:A.redSoft, color:A.red, border:"1px solid #e6b8b8" }}>
                {form.is_available ? "Available" : "Sold Out"}
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", justifyContent:"flex-end", gap:6 }}>
              <div style={aLabel}>Best Seller</div>
              <button onClick={() => setForm(f => ({ ...f, is_best_seller:!f.is_best_seller }))}
                style={form.is_best_seller
                  ? { ...aToggle, background:"#394c76", color:"#fff", border:"none" }
                  : { ...aToggle, background:"#fff", color:A.sub, border:`1px solid ${A.line}` }}>
                {form.is_best_seller ? "Best Seller ON" : "Best Seller OFF"}
              </button>
            </div>
          </div>
          <div style={{ marginTop:18 }}>
            <div style={aLabel}>Food Image</div>
            <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
              {form.image_url && <img src={form.image_url} alt="preview" style={{ width:80, height:80, objectFit:"cover", borderRadius:12, border:`1px solid ${A.line}` }} />}
              <button onClick={() => fileRef.current.click()} style={aGhost({ border:`1px solid ${A.gold}`, color:A.goldText })}>{uploading ? "Uploading..." : "Upload Image"}</button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleUpload} />
              {form.image_url && <button onClick={() => setForm(f => ({ ...f, image_url:"" }))} style={aChip({ background:A.redSoft, color:A.red, border:"1px solid #eecaca" })}>Remove</button>}
            </div>
          </div>
          {/* Add-ons section */}
          <div style={{ marginTop:22, background:"#f4f6f9", border:`1px solid ${A.line}`, borderRadius:14, padding:16 }}>
            <div style={{ fontSize:13, color:A.text, marginBottom:12, fontWeight:700 }}>Add-ons <span style={{ color:A.sub, fontWeight:400 }}>(optional extras customer can select)</span></div>
            {(form.addons||[]).map((addon, ai) => (
              <div key={ai} style={{ display:"flex", gap:8, alignItems:"flex-end", marginBottom:10, flexWrap:"wrap" }}>
                <div style={{ flex:2, minWidth:120 }}>
                  <div style={{ fontSize:10, color:A.sub, marginBottom:3 }}>Name</div>
                  <input value={addon.name} onChange={e => { const u=[...form.addons]; u[ai]={...u[ai],name:e.target.value}; setForm(f=>({...f,addons:u})); }} placeholder="e.g. Tiger Beer"
                    style={{ ...aInput, padding:"8px 11px", fontSize:13 }} />
                </div>
                <div>
                  <div style={{ fontSize:10, color:A.sub, marginBottom:3 }}>Normal Price</div>
                  <input value={addon.price} onChange={e => { const u=[...form.addons]; u[ai]={...u[ai],price:e.target.value}; setForm(f=>({...f,addons:u})); }} placeholder="RM" type="number" step="0.50"
                    style={{ ...aInput, width:92, padding:"8px 10px", fontSize:13 }} />
                </div>
                <div>
                  <div style={{ fontSize:10, color:A.goldText, marginBottom:3, fontWeight:600 }}>Happy Hour</div>
                  <input value={addon.promo_price||""} onChange={e => { const u=[...form.addons]; u[ai]={...u[ai],promo_price:e.target.value}; setForm(f=>({...f,addons:u})); }} placeholder="optional" type="number" step="0.50"
                    style={{ ...aInput, width:92, padding:"8px 10px", fontSize:13, background:A.goldSoft, border:`1px solid ${A.gold}`, color:A.goldText }} />
                </div>
                <div>
                  <div style={{ fontSize:10, color:A.goldText, marginBottom:3, fontWeight:600 }}>VIP Price</div>
                  <input value={addon.vip_price||""} onChange={e => { const u=[...form.addons]; u[ai]={...u[ai],vip_price:e.target.value}; setForm(f=>({...f,addons:u})); }} placeholder="optional" type="number" step="0.50"
                    style={{ ...aInput, width:92, padding:"8px 10px", fontSize:13, background:A.goldSoft, border:`1px solid ${A.gold}`, color:A.goldText }} />
                </div>
                <button onClick={() => setForm(f=>({...f,addons:f.addons.map((a,i)=>i===ai?{...a,sold_out:!a.sold_out}:a)}))}
                  style={addon.sold_out ? aChip({ background:A.redSoft, color:A.red, border:"1px solid #eecaca" }) : aChip({ background:A.greenSoft, color:A.green, border:"1px solid #cbd3e0" })}>
                  {addon.sold_out?"Out":"In"}
                </button>
                <button onClick={() => setForm(f=>({...f,addons:f.addons.filter((_,i)=>i!==ai)}))}
                  style={aChip({ background:"#fff", border:`1px solid ${A.line}`, color:A.red })}>✕</button>
              </div>
            ))}
            <button onClick={() => setForm(f=>({...f,addons:[...(f.addons||[]),{name:"",price:""}]}))}
              style={aGhost({ border:`1px dashed ${A.gold}`, color:A.goldText, padding:"8px 16px" })}>+ Add Option</button>
            {(form.addons||[]).length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:12, flexWrap:"wrap" }}>
                <button onClick={() => setForm(f=>({...f, addon_required:!f.addon_required}))}
                  style={form.addon_required ? aChip({ background:A.green, color:"#fff", border:"none" }) : aChip({ background:"#fff", color:A.sub, border:`1px solid ${A.line}` })}>
                  {form.addon_required ? "Must Select One" : "Optional (multi-select)"}
                </button>
                <span style={{ fontSize:11, color:A.sub }}>e.g. beer brand = Must Select One</span>
              </div>
            )}
          </div>
          <div style={{ marginTop:18, background:"#f4f6f9", border:`1px solid ${A.line}`, borderRadius:14, padding:16 }}>
            <div style={{ fontSize:13, color:A.goldText, marginBottom:14, fontWeight:700 }}>Time-Based Promo <span style={{ color:A.sub, fontWeight:400 }}>(optional)</span></div>
            <div style={{ display:"flex", gap:12, alignItems:"flex-end", flexWrap:"wrap", marginBottom:14 }}>
              <div>
                <div style={aLabel}>Promo Start</div>
                <input type="time" value={form.promo_start} onChange={e => setForm(f=>({...f, promo_start:e.target.value}))}
                  style={{ ...aInput, width:140 }} />
              </div>
              <div>
                <div style={aLabel}>Promo End</div>
                <input type="time" value={form.promo_end} onChange={e => setForm(f=>({...f, promo_end:e.target.value}))}
                  style={{ ...aInput, width:140 }} />
              </div>
              <div>
                <div style={aLabel}>Happy Hour Price (RM)</div>
                <input type="number" step="0.50" placeholder="e.g. 10.00" value={form.promo_price} onChange={e => setForm(f=>({...f, promo_price:e.target.value}))}
                  style={{ ...aInput, width:130 }} />
              </div>
              <div>
                <div style={aLabel}>Promo Label (shown to customer)</div>
                <input type="text" placeholder="e.g. Lunch Promo, Happy Hour" value={form.promo_label} onChange={e => setForm(f=>({...f, promo_label:e.target.value}))}
                  style={{ ...aInput, width:210 }} />
              </div>
            </div>
            <div style={{ marginBottom:8 }}>
              <div style={aLabel}>Free Drink Options (e.g. for breakfast promo — customer picks one)</div>
              {(form.promo_drinks||[]).map((drink, di) => (
                <div key={di} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                  <input value={drink} onChange={e => { const u=[...form.promo_drinks]; u[di]=e.target.value; setForm(f=>({...f,promo_drinks:u})); }} placeholder="e.g. Coffee"
                    style={{ ...aInput, flex:1, padding:"8px 11px", fontSize:13 }} />
                  <button onClick={() => setForm(f=>({...f,promo_drinks:f.promo_drinks.filter((_,i)=>i!==di)}))}
                    style={aChip({ background:"#fff", border:`1px solid ${A.line}`, color:A.red })}>✕</button>
                </div>
              ))}
              <button onClick={() => setForm(f=>({...f,promo_drinks:[...(f.promo_drinks||[]),""]}))}
                style={aGhost({ border:`1px dashed ${A.gold}`, color:A.goldText, padding:"8px 14px", fontSize:12 })}>+ Add Free Drink Option</button>
            </div>
            <div style={{ fontSize:11, color:A.sub, lineHeight:1.5 }}>
              Happy Hour Price auto-switches during promo time · Free Drinks: customer picks a free drink when adding this item
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
            <button onClick={() => setShowForm(false)} style={aGhost({ padding:"11px 22px" })}>Cancel</button>
            <button onClick={handleSave} style={aPrimary({ padding:"11px 30px", fontSize:14 })}>{editItem ? "Save Changes" : "Add Item"}</button>
          </div>
        </div>
        </div>
      )}
      <div ref={scrollRef} style={{ flex:1, padding:18, overflowY:"auto" }}>
        {loading ? <div style={{ color:A.sub, textAlign:"center", padding:40 }}>Loading…</div> :
          CATEGORIES.map(cat => {
            const catItems = items.filter(i => i.category===cat);
            return (
              <div key={cat} style={{ marginBottom:26 }}>
                <div style={{ fontSize:12, color:A.sub, letterSpacing:1.5, textTransform:"uppercase", marginBottom:12, fontWeight:700 }}>
                  {cat} <span style={{ color:A.gold }}>({catItems.length})</span> — {DRINK_CATEGORIES.includes(cat) ? "Cashier serves" : "Kitchen prepares"}
                </div>
                {catItems.length===0 && <div style={{ color:"#b3a893", fontSize:13, marginBottom:8 }}>No items yet</div>}
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {catItems.map(item => (
                    <div key={item.id} className="hl-admin-item" style={{ background:A.panel, border:`1px solid ${A.line}`, borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", gap:14, boxShadow:A.shadow }}>
                      {item.image_url ? <img src={item.image_url} alt={item.name} style={{ width:58, height:58, objectFit:"cover", borderRadius:10, flexShrink:0 }} />
                        : <div style={{ width:58, height:58, background:"#eef1f6", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0 }}>{item.emoji}</div>}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <span style={{ background:A.goldSoft, color:A.goldText, borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:700 }}>#{item.item_no}</span>
                          <span className="hl-title" style={{ fontWeight:700, fontSize:15, color:A.text }}>{item.name}</span>
                          {item.is_available===false && <span style={{ background:A.redSoft, color:A.red, borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:700 }}>SOLD OUT</span>}
                        </div>
                        {item.description && <div style={{ fontSize:12, color:A.sub, marginTop:3 }}>{item.description}</div>}
                        <div style={{ fontSize:14, color:A.goldText, fontWeight:700, marginTop:3 }}>RM {parseFloat(item.price).toFixed(2)}</div>
                      </div>
                      <div className="hl-admin-actions" style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
                        <button onClick={() => toggleAvailable(item)}
                          style={item.is_available!==false ? aChip({ background:"#eef1f6", color:"#394c76", border:"1px solid #d6dbe2" }) : aChip({ background:A.redSoft, color:A.red, border:"1px solid #eecaca" })}>
                          {item.is_available!==false ? "Available" : "Sold Out"}
                        </button>
                        <button onClick={() => supabase.from("menu_items").update({ is_best_seller:!item.is_best_seller }).eq("id", item.id).then(fetchItems)}
                          style={item.is_best_seller ? aChip({ background:"#394c76", color:"#fff", border:"none" }) : aChip({ background:"#fff", color:A.sub, border:`1px solid ${A.line}` })}>
                          Best Seller
                        </button>
                        <button onClick={() => openEdit(item)} style={aChip({ background:"#fff", border:`1px solid ${A.gold}`, color:A.goldText, display:"flex", alignItems:"center", gap:5 })}><Icon name="pen" size={13} color="#394c76" /> Edit</button>
                        <button onClick={() => handleDelete(item.id)} style={aChip({ background:A.redSoft, border:"1px solid #eecaca", color:A.red, display:"flex", alignItems:"center" })}><Icon name="trash" size={14} color="#c0392b" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

function TabletScreen({ tableNo, goHome, isStaff }) {
  const isVip = String(tableNo).startsWith("GRP-");
  useEffect(() => {
    // Set viewport
    const noZoom = "width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover";
    const vp = document.querySelector("meta[name=viewport]");
    if (vp) vp.content = noZoom;
    // Force 16px on inputs
    const style = document.createElement("style");
    style.id = "no-zoom-fix";
    style.textContent = "input, textarea, select { font-size: 16px !important; } * { -webkit-tap-highlight-color: transparent; }";
    if (!document.getElementById("no-zoom-fix")) document.head.appendChild(style);
    // Block pinch zoom on iOS Safari via gesture events
    const blockGesture = e => e.preventDefault();
    const blockPinch = e => { if (e.touches.length > 1) e.preventDefault(); };
    document.addEventListener("gesturestart", blockGesture, { passive:false });
    document.addEventListener("gesturechange", blockGesture, { passive:false });
    document.addEventListener("gestureend", blockGesture, { passive:false });
    document.addEventListener("touchmove", blockPinch, { passive:false });
    return () => {
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      document.removeEventListener("gestureend", blockGesture);
      document.removeEventListener("touchmove", blockPinch);
    };
  }, []);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [cart, setCart] = useState({});
  const [view, setView] = useState("menu");
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [menu, setMenu] = useState({});
  const [menuLoading, setMenuLoading] = useState(true);
  // Tick at top of every minute so isPromoNow() re-evaluates when promo starts/ends
  const [, setTick] = useState(0);
  useEffect(() => {
    const msUntilNextMinute = 60000 - (Date.now() % 60000);
    let interval;
    const timeout = setTimeout(() => {
      setTick(n => n + 1);
      interval = setInterval(() => setTick(n => n + 1), 60000);
    }, msUntilNextMinute);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, []);
  const [myOrders, setMyOrders] = useState([]);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [drinkRequest, setDrinkRequest] = useState("");
  const [foodRequest, setFoodRequest] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [promoModal, setPromoModal] = useState(null); // {item, selectedDrink:""}
  const [lang, setLang] = useState("en");
  // Member identity + rewards, checked/picked from the customer's own phone
  const [memberBannerOpen, setMemberBannerOpen] = useState(false);
  const [phoneMember, setPhoneMember] = useState(null);
  const [memberPhoneInput, setMemberPhoneInput] = useState("");
  const [memberPhoneCountry, setMemberPhoneCountry] = useState("MY");
  const [memberChecking, setMemberChecking] = useState(false);
  const [memberCheckMsg, setMemberCheckMsg] = useState("");
  const [joiningNew, setJoiningNew] = useState(false);
  const [newMemberNameInline, setNewMemberNameInline] = useState("");
  const [rewards, setRewards] = useState([]);
  const [selectedRewardId, setSelectedRewardId] = useState(null);

  // Rewards catalog — needed on both the customer's own phone and the staff order screen
  useEffect(() => {
    supabase.from("rewards").select("*").eq("is_active", true).order("points_cost",{ ascending:true })
      .then(({ data }) => setRewards(data||[]));
  }, []);

  // Restore an existing member/reward pick for this table (e.g. after a page reload) — customer side only
  useEffect(() => {
    if (isStaff) return;
    supabase.from("table_sessions").select("member_id, pending_reward_id").eq("table_no", String(tableNo)).maybeSingle()
      .then(({ data }) => {
        if (data?.member_id) {
          supabase.from("members").select("*").eq("id", data.member_id).maybeSingle()
            .then(({ data:m }) => { if (m) setPhoneMember(m); });
        }
        if (data?.pending_reward_id) setSelectedRewardId(data.pending_reward_id);
      });
  }, [tableNo, isStaff]);

  // Explicit only (Check button / Enter key) — no background auto-check, so the
  // customer is never told "no member found" while they're still mid-typing.
  const checkMemberPhone = async () => {
    const dial = PHONE_COUNTRIES.find(c=>c.code===memberPhoneCountry).dial;
    const phone = composePhone(memberPhoneInput, dial);
    if (phone.length < 6) { setMemberCheckMsg("Enter a valid phone number"); return; }
    setMemberChecking(true); setMemberCheckMsg("");
    const { data } = await supabase.from("members").select("*").eq("phone", phone).maybeSingle();
    if (data) {
      setPhoneMember(data);
      await supabase.from("table_sessions").upsert({ table_no:String(tableNo), member_id:data.id });
    } else {
      setJoiningNew(true);
    }
    setMemberChecking(false);
  };

  const joinAsNewMember = async () => {
    const dial = PHONE_COUNTRIES.find(c=>c.code===memberPhoneCountry).dial;
    const phone = composePhone(memberPhoneInput, dial);
    const name = newMemberNameInline.trim();
    if (name.length < 2) { setMemberCheckMsg("Enter your name to join"); return; }
    setMemberChecking(true);
    const { data, error } = await supabase.from("members").insert({ name, phone }).select().maybeSingle();
    if (error) { setMemberCheckMsg("Could not join — try again"); setMemberChecking(false); return; }
    setPhoneMember(data);
    await supabase.from("table_sessions").upsert({ table_no:String(tableNo), member_id:data.id });
    setMemberChecking(false); setJoiningNew(false);
  };

  // Cash-off rewards are just a preference until the cashier finalizes the bill.
  // Free-item rewards need the kitchen to actually make the thing, so tapping one
  // redeems it immediately — same trust model as placing a normal order.
  const pickReward = async (reward) => {
    if (reward.reward_type === "free_item") { redeemFreeItem(reward); return; }
    const next = selectedRewardId === reward.id ? null : reward.id;
    setSelectedRewardId(next);
    await supabase.from("table_sessions").upsert({ table_no:String(tableNo), pending_reward_id:next });
  };

  const redeemFreeItem = async (reward) => {
    if (!phoneMember || phoneMember.points < reward.points_cost) return;
    const menuItem = Object.values(menu).flat().find(i => i.id === reward.menu_item_id);
    if (!menuItem) { setMemberCheckMsg("This reward's item isn't available right now."); return; }
    if (!window.confirm(`Redeem "${reward.name}" for ${reward.points_cost} points? It'll be sent to the kitchen now.`)) return;
    const now = new Date();
    const time = now.toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kuala_Lumpur"});
    const mytNow = new Date(now.toLocaleString("en-US",{timeZone:"Asia/Kuala_Lumpur"}));
    const seq = String(mytNow.getHours()*60 + mytNow.getMinutes()).padStart(3,"0");
    const rewardItem = { name:menuItem.name, item_no:menuItem.item_no, emoji:menuItem.emoji, category:menuItem.category, price:0, qty:1, is_reward:true };
    const { error } = await supabase.from("orders").insert({
      table_no:tableNo, items:[rewardItem], subtotal:0, tax:0, total:0,
      status:"pending", special_request:`🎁 Redeemed: ${reward.name}`, time, order_seq:seq,
    });
    if (error) { setMemberCheckMsg("Could not redeem — try again."); return; }
    const newPoints = phoneMember.points - reward.points_cost;
    await supabase.from("members").update({ points:newPoints }).eq("id", phoneMember.id);
    setPhoneMember(m => ({ ...m, points:newPoints }));
    setMemberCheckMsg(`🎉 Redeemed ${reward.name}! It's on its way.`);
  };
  const t = {
    en: {
      menu:"Menu", myOrders:"My Orders", callWaiter:"Call Waiter", coming:"✅ Coming!",
      searchPlaceholder:"Search menu...", beverage:"☕ Beverage", food:"🍽️ Food",
      desserts:"🍰 Desserts", addons:"➕ Add-ons", addToOrder:"Add to Order ✓",
      pleaseSelect:"Please select one ↑", selectOne:"Select one (required):",
      addExtras:"Add extras (optional):", freeDrink:"🎁 Choose a free drink:",
      free:"FREE", withFreeDrinks:"🎁 with free drinks", happyHour:"🍺 Happy Hour!",
      add:"+ Add", soldOut:"Sold Out", soldOutBadge:"SOLD OUT",
      noItems:"No items yet", noResults:"No results for",
      loadingMenu:"Loading menu...", noOrders:"No orders yet — browse the menu!",
      browseMenu:"Browse Menu", addMoreItems:"+ Add More Items",
      drinksRequest:"☕ Drinks Special Request", foodRequest:"🍳 Food Special Request",
      drinksPlaceholder:"e.g. no sugar, extra ice...", foodPlaceholder:"e.g. no sauce, extra spicy...",
      total:"Total", placeOrder:"Place Order ✓", placing:"Placing…",
      pending:"⏳ Preparing", kitchenPreparing:"⏳ Kitchen preparing", served:"✅ Served",
      drinks:"☕ Drinks", foodLabel:"🍳 Food", order:"🍽️ Order",
      sessionEnded:"Session Ended", sessionMsg:"Thank you for visiting",
      sessionScan:"Please scan the QR code on your table to place a new order.",
      addWithFree:"Add + Free", addWithoutFree:"Add without free drink",
      breakfastPromo:"🎉 Breakfast Promo!", chooseFree:"Choose a free drink with your order",
    },
    zh: {
      menu:"菜单", myOrders:"我的订单", callWaiter:"呼叫服务员", coming:"✅ 来了！",
      searchPlaceholder:"搜索菜单...", beverage:"☕ 饮料", food:"🍽️ 食物",
      desserts:"🍰 甜点", addons:"➕ 加料", addToOrder:"加入订单 ✓",
      pleaseSelect:"请先选择 ↑", selectOne:"请选择一项（必选）：",
      addExtras:"添加配料（可选）：", freeDrink:"🎁 选择免费饮料：",
      free:"免费", withFreeDrinks:"🎁 附赠免费饮料", happyHour:"🍺 欢乐时光！",
      add:"+ 添加", soldOut:"售罄", soldOutBadge:"售罄",
      noItems:"暂无商品", noResults:"没有找到",
      loadingMenu:"加载菜单中...", noOrders:"暂无订单 — 去浏览菜单！",
      browseMenu:"浏览菜单", addMoreItems:"+ 继续点餐",
      drinksRequest:"☕ 饮料特别要求", foodRequest:"🍳 食物特别要求",
      drinksPlaceholder:"如：不加糖、多加冰...", foodPlaceholder:"如：不加酱、加辣...",
      total:"总计", placeOrder:"下单 ✓", placing:"下单中…",
      pending:"⏳ 准备中", kitchenPreparing:"⏳ 厨房准备中", served:"✅ 已上菜",
      drinks:"☕ 饮料", foodLabel:"🍳 食物", order:"🍽️ 订单",
      sessionEnded:"会话已结束", sessionMsg:"感谢您光临",
      sessionScan:"请扫描桌上的二维码以重新下单。",
      addWithFree:"添加 + 免费", addWithoutFree:"不要免费饮料",
      breakfastPromo:"🎉 早餐优惠！", chooseFree:"选择一份免费饮料",
    }
  }[lang];
  const [addonModal, setAddonModal] = useState(null); // {item, selectedAddons:[]}
  const [itemModal, setItemModal] = useState(null); // {item, qty, note, selectedAddons, freeDrink}
  const [showScrollHint, setShowScrollHint] = useState(false); // bouncing down-arrow on item modal
  const itemScrollRef = useRef(null);
  // Decide whether the down-arrow hint should show: only when content overflows AND not yet at bottom
  const updateScrollHint = () => {
    const el = itemScrollRef.current;
    if (!el) { setShowScrollHint(false); return; }
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    const hasOverflow = el.scrollHeight - el.clientHeight > 24;
    setShowScrollHint(hasOverflow && !atBottom);
  };
  // Re-check whenever the item modal opens or its selections change height
  useEffect(() => {
    if (!itemModal) return;
    const id = setTimeout(updateScrollHint, 60); // wait for render/layout
    return () => clearTimeout(id);
  }, [itemModal]);
  const [editRequestModal, setEditRequestModal] = useState(null); // {orderId, request}
  const [cartEditModal, setCartEditModal] = useState(null); // {cartKey, note, name}
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    // Staff & takeaway slots skip session management entirely
    if (isStaff) return;

    const initSession = async () => {
      try {
        const { data } = await supabase.from("table_sessions").select("session_id").eq("table_no", tableNo).single();

        if (!data) {
          const s = Date.now().toString();
          await supabase.from("table_sessions").upsert({ table_no:tableNo, session_id:s });
          sessionStorage.setItem(`ss_table_${tableNo}`, s);
          return;
        }

        const session_id = data.session_id;

        if (session_id.startsWith("paid_")) {
          const ss = sessionStorage.getItem(`ss_table_${tableNo}`);
          if (ss) { setSessionExpired(true); return; }
          const s = Date.now().toString();
          await supabase.from("table_sessions").upsert({ table_no:tableNo, session_id:s });
          sessionStorage.setItem(`ss_table_${tableNo}`, s);
          return;
        }

        const ss = sessionStorage.getItem(`ss_table_${tableNo}`);
        if (!ss) sessionStorage.setItem(`ss_table_${tableNo}`, session_id);
      } catch(e) {
        // Session table might not exist — allow ordering anyway
        console.warn("Session init error:", e);
      }
    };
    initSession();
    const ch = supabase.channel(`session-${tableNo}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"table_sessions", filter:`table_no=eq.${tableNo}` }, (payload) => {
        if (payload.new?.session_id?.startsWith("paid_")) {
          sessionStorage.setItem(`ss_table_${tableNo}`, "expired");
          setSessionExpired(true);
        }
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [tableNo, isStaff]);

  useEffect(() => {
    const fetchMenu = async () => {
      const { data } = await supabase.from("menu_items").select("*").order("item_no", { ascending:true });
      if (data && data.length > 0) {
        const grouped = {};
        CATEGORIES.forEach(c => { grouped[c] = []; });
        data.forEach(item => { if (grouped[item.category]) grouped[item.category].push(item); });
        setMenu(grouped);
      }
      setMenuLoading(false);
    };
    fetchMenu();
    // Realtime: re-fetch menu whenever any menu_item changes (promo start/end, price, availability)
    // This means every device (iPhone, Android, laptop) updates instantly — no manual refresh needed
    const menuCh = supabase.channel("menu-items-watch")
      .on("postgres_changes", { event:"*", schema:"public", table:"menu_items" }, fetchMenu)
      .subscribe();
    return () => supabase.removeChannel(menuCh);
  }, []);

  useEffect(() => {
    const isVip = String(tableNo).startsWith("GRP-");
    const baseId = String(tableNo).split("·")[0];
    const fetchMyOrders = async () => {
      let q = supabase.from("orders").select("*")
        .not("status","in",'("cancelled","paid")').order("created_at",{ascending:true});
      // VIP: match all orders with same base ID (handles table suffix variants)
      if (isVip) q = q.like("table_no", `${baseId}%`);
      else q = q.eq("table_no", tableNo);
      const { data } = await q;
      setMyOrders(data || []);
    };
    fetchMyOrders();
    const ch = supabase.channel(`table-${baseId}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"orders",
        filter: isVip ? undefined : `table_no=eq.${tableNo}` }, fetchMyOrders).subscribe();
    return () => supabase.removeChannel(ch);
  }, [tableNo]);

  // Resolve which VIP group this table belongs to, so vip_groups-scoped
  // prices (effPrice, App1.jsx) only apply to the customer's own group
  const [vipGroupSlug, setVipGroupSlug] = useState(null);
  useEffect(() => {
    if (!isVip) { setVipGroupSlug(null); return; }
    const memberId = String(tableNo).split("·")[0].replace(/^GRP-/,"");
    supabase.from("groups").select("group_slug").eq("id", memberId).maybeSingle()
      .then(({ data }) => setVipGroupSlug(data?.group_slug || null));
  }, [tableNo, isVip]);

  const addToCart = (item, freeDrink=null, selectedAddons=[], note="", qty=1) => {
    const addonPrice = selectedAddons.reduce((s,a) => s + effAddonPrice(a, item, isVip, vipGroupSlug), 0);
    const basePrice = item.addon_required ? 0 : effPrice(item, isVip, vipGroupSlug);
    const addonNames = selectedAddons.length > 0 ? (item.addon_required ? " " : " +") + selectedAddons.map(a=>a.name).join(" +") : "";
    const cartKey = item.id + (selectedAddons.length > 0 ? "_" + selectedAddons.map(a=>a.name).join("_") : "") + (note ? "_note_"+note.slice(0,20) : "");
    const itemToAdd = { ...item, price: basePrice + addonPrice, name: item.name + addonNames, cartKey, note: note||"" };
    setCart(p => ({ ...p, [cartKey]: { ...itemToAdd, qty:(p[cartKey]?.qty||0)+qty } }));
    if (freeDrink) {
      const drinkKey = `free_${item.id}`;
      const freeItem = { id:drinkKey, name:`${freeDrink} (Free)`, price:0, qty:1, category:"Beverage", emoji:"☕", item_no:"", note:"" };
      setCart(p => ({ ...p, [drinkKey]: { ...freeItem, qty:1 } }));
    }
  };
  const handleAddItem = (item) => {
    const hasPromo = isPromoNow(item) && item.promo_drinks && item.promo_drinks.length > 0;
    setItemModal({
      item,
      qty: 1,
      note: "",
      selectedAddons: [],
      freeDrink: hasPromo ? "" : null,
    });
  };
  const removeFromCart = (key) => setCart(p => {
    const u = {...p};
    if (!u[key]) return u;
    if (u[key].qty > 1) {
      u[key] = {...u[key], qty: u[key].qty - 1};
    } else {
      delete u[key];
      // Also remove linked free drink when food item fully removed
      const originalId = key.toString().replace(/_.*/, "");
      const freeKey = `free_${originalId}`;
      if (u[freeKey]) delete u[freeKey];
    }
    return u;
  });
  const clearItem = (key) => setCart(p => {
    const u = {...p};
    delete u[key];
    // Also remove linked free drink if exists (keyed as free_{originalId})
    const originalId = key.toString().replace(/_.*/, ""); // strip addon suffix
    const freeKey = `free_${originalId}`;
    if (u[freeKey]) delete u[freeKey];
    return u;
  });

  const cartItems = Object.values(cart);
  const total = cartItems.reduce((s,i) => s+i.price*i.qty, 0);

  const placeOrder = async () => {
    if (submittingRef.current) return;
    if (cartItems.length === 0) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    // Snapshot cart before clearing — optimistic UI clears immediately
    const snapCart = {...cart};
    const snapDrinkReq = drinkRequest;
    const snapFoodReq = foodRequest;
    setCart({}); setDrinkRequest(""); setFoodRequest(""); setView("orders");

    try {
      const drinkReq = snapDrinkReq.trim() || null;
      const foodReq = snapFoodReq.trim() || null;
      const now = new Date();
      const time = now.toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kuala_Lumpur"});
      // seq from time — no DB round trip needed (was the main cause of slowness)
      const mytNow = new Date(now.toLocaleString("en-US",{timeZone:"Asia/Kuala_Lumpur"}));
      const seq = String(mytNow.getHours()*60 + mytNow.getMinutes()).padStart(3,"0");

      const snapItems = Object.values(snapCart);
      const cleanItems = (items) => items.map(i => { const {cartKey, basePrice, ...rest} = i; return rest; });
      const drinkItems = cleanItems(snapItems.filter(i => DRINK_CATEGORIES.includes(i.category)));
      const foodItems  = cleanItems(snapItems.filter(i => FOOD_CATEGORIES.includes(i.category)));

      const ordersToInsert = [];
      if (drinkItems.length > 0) {
        const drinkTotal = drinkItems.reduce((s,i) => s+i.price*i.qty, 0);
        ordersToInsert.push({ table_no:tableNo, items:drinkItems, subtotal:drinkTotal, tax:0,
          total:drinkTotal, status:"pending", special_request:drinkReq, time, order_seq:seq });
      }
      if (foodItems.length > 0) {
        const foodTotal = foodItems.reduce((s,i) => s+i.price*i.qty, 0);
        ordersToInsert.push({ table_no:tableNo, items:foodItems, subtotal:foodTotal, tax:0,
          total:foodTotal, status:"pending", special_request:foodReq, time, order_seq:seq });
      }

      const { error } = await supabase.from("orders").insert(ordersToInsert);
      if (error) throw error;
    } catch(e) {
      // Restore cart if insert failed so customer doesn't lose their order
      setCart(snapCart);
      setDrinkRequest(snapDrinkReq);
      setFoodRequest(snapFoodReq);
      setView("cart");
      alert("Order failed: " + (e?.message || e?.details || JSON.stringify(e)));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  const callWaiter = async () => {
    await supabase.from("waiter_calls").upsert({ table_no:tableNo, time:new Date().toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit"}) });
    setWaiterCalled(true); setTimeout(() => setWaiterCalled(false), 3000);
  };

  const pendingOrders = myOrders.filter(o => o.status==="pending");
  const doneOrders = myOrders.filter(o => o.status==="done");
  const allMenuItems = Object.values(menu).flat();
  const currentMenuItems = searchQuery.trim()
    ? allMenuItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.item_no && String(item.item_no).toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : (menu[activeCategory] || []);
  const hasOrders = myOrders.length > 0;

  // ══ STAFF ORDER SCREEN — fast POS split view (left: menu, right: ticket) ══
  // Same cart/addon/note/placeOrder logic as the customer flow below, just a different
  // layout + the navy/grey/white staff theme instead of the customer's warm/gold theme.
  if (isStaff) {
    const takeaway = isTakeaway(tableNo);
    const isVipOrder = String(tableNo).startsWith("GRP-");
    const headerIcon = takeaway ? "bag" : isVipOrder ? "users" : "utensils";
    const headerLabel = takeaway ? takeawayLabel(tableNo) : isVipOrder ? groupDisplayName(tableNo) : `Table ${tableNo}`;
    return (
      <div className="hl-pos" style={{ display:"flex", height:"100vh", overflow:"hidden", background:C.bg, fontFamily:"Georgia,serif" }}>

        {/* ══ LEFT — MENU ══ */}
        <div className="hl-pos-left" style={{ flex:"1 1 60%", minWidth:0, display:"flex", flexDirection:"column", borderRight:`1px solid ${C.border}` }}>
          <div style={{ background:C.goldGrad, padding:"14px 18px", display:"flex", alignItems:"center", gap:12, flexShrink:0, boxShadow:C.glow }}>
            <button onClick={goHome} style={btn({ background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", width:38, height:38, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" })}>
              <Icon name="arrowLeft" size={18} color="#fff" />
            </button>
            <div style={{ width:38, height:38, borderRadius:10, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon name={headerIcon} size={18} color="#fff" />
            </div>
            <div className="hl-title" style={{ fontSize:19, fontWeight:800, color:"#fff", letterSpacing:0.3 }}>{headerLabel}</div>
          </div>

          <div style={{ padding:"12px 16px", background:"#fff", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", display:"flex" }}><Icon name="search" size={16} color={C.muted}/></span>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search menu..."
                style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px 10px 38px", borderRadius:10, fontSize:15, fontFamily:"Georgia,serif", boxSizing:"border-box", outline:"none" }} />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", fontSize:20, color:C.muted, cursor:"pointer" }}>×</button>
              )}
            </div>
          </div>

          {!searchQuery && (
            <div style={{ display:"flex", gap:8, background:"#fff", borderBottom:`1px solid ${C.border}`, overflowX:"auto", flexShrink:0, padding:"10px 16px" }}>
              {CATEGORIES.map(cat => {
                const active = activeCategory===cat;
                return (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:active?C.goldGrad:"#fff", border:`1px solid ${active?"transparent":C.border}`, color:active?"#fff":C.muted, padding:"9px 18px", fontSize:14, fontWeight:active?"bold":500, whiteSpace:"nowrap", flexShrink:0, borderRadius:30 }}>
                    {cat}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ flex:1, overflowY:"auto", padding:"14px 16px" }}>
            {menuLoading ? <div style={{ color:C.muted, textAlign:"center", padding:40, fontSize:16 }}>Loading menu...</div>
              : currentMenuItems.length===0 ? <div style={{ color:C.muted, textAlign:"center", padding:40, fontSize:16 }}>{searchQuery ? `No results for "${searchQuery}"` : "No items yet"}</div>
              : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:12 }}>
                  {currentMenuItems.map(item => {
                    const qty = Object.values(cart).filter(c => c.id === item.id).reduce((s,c) => s+c.qty, 0);
                    const soldOut = item.is_available===false;
                    return (
                      <div key={item.id} onClick={() => !soldOut && handleAddItem(item)}
                        style={{ background:"#fff", border:qty>0?`2px solid ${C.gold}`:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden", opacity:soldOut?0.5:1, boxShadow:qty>0?C.glow:C.shadow, cursor:soldOut?"default":"pointer", display:"flex", flexDirection:"column" }}>
                        <div style={{ padding:"12px 12px 10px", flex:1, display:"flex", flexDirection:"column" }}>
                          {!soldOut && item.is_best_seller && (
                            <div style={{ alignSelf:"flex-start", background:C.gold, color:"#fff", fontWeight:"bold", fontSize:9, padding:"3px 7px", borderRadius:6, letterSpacing:0.4, marginBottom:6 }}>BEST SELLER</div>
                          )}
                          {soldOut && <div style={{ alignSelf:"flex-start", background:"#c62828", color:"#fff", borderRadius:6, padding:"2px 7px", fontSize:10, fontWeight:"bold", marginBottom:6 }}>SOLD OUT</div>}
                          <div style={{ fontWeight:700, fontSize:14, marginBottom:8, color:C.text, lineHeight:1.25, flex:1 }}>
                            {item.item_no && <span style={{ color:C.gold, marginRight:4, fontSize:12 }}>{item.item_no}</span>}{item.name}
                          </div>
                          {isPromoNow(item) && item.promo_drinks && item.promo_drinks.length > 0 && (
                            <div style={{ fontSize:10, color:C.gold, fontWeight:"bold", marginBottom:4 }}>With free drink</div>
                          )}
                          {isPromoNow(item) && item.addons && item.addons.some(a => a.promo_price && parseFloat(a.promo_price) > 0) && (
                            <div style={{ fontSize:10, color:C.gold, fontWeight:"bold", marginBottom:4 }}>{item.promo_label || "Happy Hour"}</div>
                          )}
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            <div style={{ fontSize:13, fontWeight:"bold", color:C.gold }}>
                              {(() => {
                                if (item.addon_required && item.addons && item.addons.length > 0) {
                                  const normalMin = Math.min(...item.addons.map(a=>parseFloat(a.price||0)));
                                  const effMin = Math.min(...item.addons.map(a => effAddonPrice(a, item, isVip, vipGroupSlug)));
                                  return effMin < normalMin
                                    ? <span style={{ display:"flex", flexDirection:"column", lineHeight:1.1 }}><span style={{ textDecoration:"line-through", opacity:0.5, fontWeight:"normal", fontSize:10, color:C.muted }}>RM {normalMin.toFixed(2)}</span><span>RM {effMin.toFixed(2)}+</span></span>
                                    : `RM ${effMin.toFixed(2)}+`;
                                }
                                const eff = effPrice(item, isVip, vipGroupSlug);
                                return eff < parseFloat(item.price)
                                  ? <span style={{ display:"flex", flexDirection:"column", lineHeight:1.1 }}><span style={{ textDecoration:"line-through", opacity:0.5, fontWeight:"normal", fontSize:10, color:C.muted }}>RM {parseFloat(item.price).toFixed(2)}</span><span>RM {eff.toFixed(2)}</span></span>
                                  : `RM ${eff.toFixed(2)}`;
                              })()}
                            </div>
                            {soldOut ? null : qty===0 ? (
                              <button onClick={e => { e.stopPropagation(); handleAddItem(item); }}
                                style={{ background:C.goldGrad, border:"none", color:"#fff", width:30, height:30, fontSize:18, fontWeight:"bold", borderRadius:50, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>+</button>
                            ) : (
                              <div style={{ display:"flex", alignItems:"center", gap:4 }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => removeFromCart(Object.values(cart).find(c=>c.id===item.id)?.cartKey||item.id)}
                                  style={{ background:"#fff", border:`2px solid ${C.gold}`, color:C.gold, width:26, height:26, fontSize:16, fontWeight:"bold", borderRadius:50, cursor:"pointer" }}>−</button>
                                <span style={{ color:C.gold, fontWeight:"bold", fontSize:14, minWidth:16, textAlign:"center" }}>{qty}</span>
                                <button onClick={() => handleAddItem(item)}
                                  style={{ background:C.gold, border:"none", color:"#fff", width:26, height:26, fontSize:16, fontWeight:"bold", borderRadius:50, cursor:"pointer" }}>+</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </div>

        {/* ══ RIGHT — TICKET ══ */}
        <div className="hl-pos-right" style={{ width:"clamp(300px, 34%, 400px)", flexShrink:0, display:"flex", flexDirection:"column", background:"#fff" }}>
          <div style={{ padding:"16px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <div style={{ fontSize:17, fontWeight:800, color:C.text }}>Current Order</div>
            <span style={{ background:cartItems.length>0?C.gold:C.border, color:"#fff", borderRadius:20, padding:"3px 11px", fontSize:13, fontWeight:"bold" }}>{cartItems.reduce((s,i)=>s+i.qty,0)}</span>
          </div>

          {/* Member / Rewards — same lookup used on the customer's own phone, so staff can check it too when placing a VIP/takeaway order */}
          <div style={{ borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
            {!phoneMember ? (
              !memberBannerOpen ? (
                <button onClick={() => setMemberBannerOpen(true)}
                  style={{ width:"100%", cursor:"pointer", background:"transparent", border:"none", color:C.gold, padding:"10px 18px", fontSize:13, fontWeight:"bold", textAlign:"left" }}>
                  🎉 Is the customer a member? Tap to check
                </button>
              ) : (
                <div style={{ padding:"12px 18px" }}>
                  {!joiningNew ? (
                    <>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ fontSize:13, fontWeight:"bold", color:C.text }}>Enter phone number</div>
                        <button onClick={() => setMemberBannerOpen(false)} style={{ background:"transparent", border:"none", color:C.muted, fontSize:16, cursor:"pointer" }}>✕</button>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <select value={memberPhoneCountry} onChange={e=>setMemberPhoneCountry(e.target.value)}
                          style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"0 8px", fontSize:14, color:C.text, background:"#fff" }}>
                          {PHONE_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name} +{c.dial}</option>)}
                        </select>
                        <input value={memberPhoneInput} onChange={e=>setMemberPhoneInput(e.target.value)} placeholder="Phone number" type="tel"
                          style={{ flex:1, minWidth:0, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:14, color:C.text, boxSizing:"border-box" }} />
                        <button onClick={checkMemberPhone} disabled={memberChecking}
                          style={{ background:C.gold, color:"#fff", border:"none", borderRadius:8, padding:"0 14px", fontSize:13, fontWeight:"bold", cursor:"pointer" }}>
                          {memberChecking ? "…" : "Check"}
                        </button>
                      </div>
                      {memberCheckMsg && <div style={{ fontSize:12, color:"#c0392b", marginTop:6 }}>{memberCheckMsg}</div>}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:13, fontWeight:"bold", color:C.text, marginBottom:8 }}>No member found — join now?</div>
                      <input value={newMemberNameInline} onChange={e=>setNewMemberNameInline(e.target.value)} placeholder="Customer's name" autoFocus
                        style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:14, color:C.text, boxSizing:"border-box", marginBottom:8 }} />
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => { setJoiningNew(false); setMemberPhoneInput(""); setMemberCheckMsg(""); }} style={{ flex:1, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"9px 0", fontSize:13, cursor:"pointer" }}>Cancel</button>
                        <button onClick={joinAsNewMember} disabled={memberChecking} style={{ flex:2, background:C.gold, color:"#fff", border:"none", borderRadius:8, padding:"9px 0", fontSize:13, fontWeight:"bold", cursor:"pointer" }}>Join & Continue</button>
                      </div>
                      {memberCheckMsg && <div style={{ fontSize:12, color:"#c0392b", marginTop:6 }}>{memberCheckMsg}</div>}
                    </>
                  )}
                </div>
              )
            ) : (
              <div style={{ padding:"10px 18px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:13 }}><span style={{ fontWeight:"bold", color:C.text }}>{phoneMember.name}</span> <span style={{ color:C.muted }}>· {phoneMember.points} pts</span></div>
                  <button onClick={async () => { setPhoneMember(null); setSelectedRewardId(null); setMemberBannerOpen(false); await supabase.from("table_sessions").upsert({ table_no:String(tableNo), member_id:null, pending_reward_id:null }); }} style={{ background:"transparent", border:"none", color:C.muted, fontSize:12, cursor:"pointer" }}>Remove</button>
                </div>
                {memberCheckMsg && <div style={{ fontSize:12, color:"#2e7d32", marginTop:6 }}>{memberCheckMsg}</div>}
                {rewards.length > 0 && (
                  <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:6 }}>
                    {rewards.map(r => {
                      const affordable = phoneMember.points >= r.points_cost;
                      const selected = selectedRewardId === r.id;
                      const linkedItem = r.reward_type === "free_item" ? Object.values(menu).flat().find(mi => mi.id === r.menu_item_id) : null;
                      return (
                        <button key={r.id} disabled={!affordable} onClick={() => pickReward(r)}
                          style={{ width:"100%", display:"flex", alignItems:"center", gap:8, background:selected?C.gold:"#fff", border:`1.5px solid ${selected?C.gold:C.border}`, color:selected?"#fff":affordable?C.text:"#bbb", borderRadius:8, padding:"8px 10px", fontSize:13, cursor:affordable?"pointer":"not-allowed" }}>
                          {linkedItem?.image_url
                            ? <img src={linkedItem.image_url} alt="" style={{ width:32, height:32, borderRadius:6, objectFit:"cover", flexShrink:0 }} />
                            : <span style={{ fontSize:16, flexShrink:0 }}>{r.reward_type==="discount"?"💰":"🎁"}</span>}
                          <span style={{ flex:1, textAlign:"left" }}>{r.name}</span>
                          <span style={{ fontWeight:"bold", flexShrink:0 }}>{r.points_cost} pts{!affordable?" (not enough)":""}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
            {cartItems.length===0 ? (
              <div style={{ textAlign:"center", padding:"50px 10px", color:C.muted }}>
                <Icon name="bag" size={40} color={C.border} style={{ marginBottom:12 }}/>
                <div style={{ fontSize:14 }}>No items yet — tap the menu to add</div>
              </div>
            ) : cartItems.map(item => (
              <div key={item.cartKey||item.id} style={{ background:C.bg, borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:"bold", color:C.text }}>{item.name}</div>
                    <div style={{ fontSize:13, color:C.gold, fontWeight:"bold", marginTop:2 }}>RM {(item.price*item.qty).toFixed(2)}</div>
                    <div onClick={() => setCartEditModal({ cartKey:item.cartKey||item.id, note:item.note||"", name:item.name })}
                      style={{ display:"flex", alignItems:"center", gap:4, marginTop:6, cursor:"pointer", fontSize:12, color:item.note?C.gold:C.muted }}>
                      <Icon name="pen" size={11} color={item.note?C.gold:C.muted} />
                      {item.note || "Add note"}
                    </div>
                    <div onClick={() => setCart(p => ({ ...p, [item.cartKey||item.id]: { ...p[item.cartKey||item.id], is_takeaway: !p[item.cartKey||item.id]?.is_takeaway } }))}
                      style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, cursor:"pointer", fontSize:12, color:item.is_takeaway?C.gold:C.muted }}>
                      <div style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${item.is_takeaway?C.gold:C.border}`, background:item.is_takeaway?C.gold:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {item.is_takeaway && <Icon name="check" size={10} color="#fff" stroke={3}/>}
                      </div>
                      Takeaway
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:0, border:`1.5px solid ${C.border}`, borderRadius:50, overflow:"hidden", flexShrink:0 }}>
                    <button onClick={() => removeFromCart(item.cartKey||item.id)} style={{ background:"#fff", border:"none", color:C.gold, width:26, height:26, fontSize:16, fontWeight:"bold", cursor:"pointer" }}>−</button>
                    <span style={{ width:22, textAlign:"center", fontSize:13, fontWeight:"bold", color:C.text }}>{item.qty}</span>
                    <button onClick={() => setCart(p => ({ ...p, [item.cartKey||item.id]: { ...p[item.cartKey||item.id], qty:p[item.cartKey||item.id].qty+1 } }))} style={{ background:C.gold, border:"none", color:"#fff", width:26, height:26, fontSize:16, fontWeight:"bold", cursor:"pointer" }}>+</button>
                  </div>
                </div>
              </div>
            ))}

            {myOrders.length > 0 && (
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>Already sent</div>
                {myOrders.map(o => (
                  <div key={o.id} style={{ background:C.bg, borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                      <div style={{ fontSize:12, fontWeight:"bold", color:C.text }}>{o.order_seq && `#${o.order_seq}`} <span style={{ color:C.muted, fontWeight:"normal" }}>· {o.time}</span></div>
                      <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:"bold", color:o.status==="pending"?C.gold:C.muted }}>
                        <Icon name={o.status==="pending"?"clock":"check"} size={11} color={o.status==="pending"?C.gold:C.muted}/>
                        {o.status==="pending"?"Preparing":"Served"}
                      </span>
                    </div>
                    {o.items.map((item,i) => {
                      const done = itemDone(o, item);
                      return (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:2, opacity:done?0.6:1 }}>
                        <span style={{ color:C.text, textDecoration:done?"line-through":"none" }}>{done?"✅ ":""}{item.name} <span style={{ color:C.muted }}>×{item.qty}</span></span>
                        <span style={{ color:C.gold, fontWeight:"bold" }}>RM {(item.price*item.qty).toFixed(2)}</span>
                      </div>
                      );
                    })}
                    {o.items.filter(i=>i.note).map((item,i) => (
                      <div key={i} style={{ fontSize:11, color:C.gold, marginTop:2 }}>{item.name}: {item.note}</div>
                    ))}
                    {o.special_request && <div style={{ fontSize:11, color:C.gold, marginTop:2 }}>{o.special_request}</div>}
                    <div style={{ borderTop:`1px solid ${C.border}`, marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontSize:12, fontWeight:"bold", color:C.text }}>
                      <span>Total</span><span>RM {o.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding:"14px 18px", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:15, fontWeight:"bold", color:C.text, marginBottom:12 }}>
              <span>Total</span><span style={{ color:C.gold }}>RM {total.toFixed(2)}</span>
            </div>
            <button onClick={placeOrder} disabled={isSubmitting||cartItems.length===0}
              style={btn({ width:"100%", background:cartItems.length===0?C.border:C.goldGrad, border:"none", color:cartItems.length===0?C.muted:"#fff", padding:"14px 0", fontSize:15, fontWeight:"bold", borderRadius:12, cursor:(isSubmitting||cartItems.length===0)?"not-allowed":"pointer" })}>
              {cartItems.length===0 ? "Add items to order" : isSubmitting ? "Sending…" : "Send to Kitchen"}
            </button>
          </div>
        </div>

        {/* Item modal (add-ons / free drink / note) — staff themed */}
        {itemModal && (() => {
          const item = itemModal.item;
          const soldOut = item.is_available === false;
          const hasAddons = item.addons && item.addons.length > 0;
          const hasPromo = isPromoNow(item) && item.promo_drinks && item.promo_drinks.length > 0;
          const addonPrice = itemModal.selectedAddons.reduce((s,a) => s + effAddonPrice(a, item, isVip, vipGroupSlug), 0);
          const basePrice = item.addon_required ? 0 : effPrice(item, isVip, vipGroupSlug);
          const unitPrice = basePrice + addonPrice;
          const totalPrice = unitPrice * itemModal.qty;
          const canAdd = !soldOut && (!item.addon_required || itemModal.selectedAddons.length > 0);
          return (
            <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(43,51,70,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setItemModal(null)}>
              <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:18, width:"min(92%, 460px)", maxHeight:"85vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 20px 50px rgba(0,0,0,0.25)" }}>
                <div style={{ background:C.goldGrad, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
                  <div style={{ fontSize:17, fontWeight:800, color:"#fff", paddingRight:12 }}>{item.name}</div>
                  <button onClick={() => setItemModal(null)} style={{ background:"rgba(255,255,255,0.14)", border:"none", borderRadius:50, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                    <Icon name="x" size={15} color="#fff"/>
                  </button>
                </div>
                <div ref={itemScrollRef} onScroll={updateScrollHint} style={{ flex:1, overflowY:"auto", padding:"18px 20px" }}>
                  <div style={{ fontSize:16, fontWeight:"bold", color:C.gold, marginBottom:6 }}>RM {unitPrice.toFixed(2)}</div>
                  {item.description && <div style={{ fontSize:13, color:C.muted, marginBottom:14, lineHeight:1.5 }}>{item.description}</div>}

                  {hasPromo && (
                    <div style={{ background:"#eef1f6", borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
                      <div style={{ fontSize:13, fontWeight:"bold", color:C.gold, marginBottom:8 }}>Choose a free drink:</div>
                      {item.promo_drinks.map((drink, di) => (
                        <div key={di} onClick={() => setItemModal(m=>({...m, freeDrink:drink}))}
                          style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", marginTop:8, borderRadius:10, border:`2px solid ${itemModal.freeDrink===drink?C.gold:C.border}`, background:itemModal.freeDrink===drink?"#eef1f6":"#fff", cursor:"pointer" }}>
                          <span style={{ fontSize:13, color:C.text }}>{drink}</span>
                          <span style={{ fontSize:12, color:C.gold, fontWeight:"bold" }}>FREE</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {hasAddons && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:13, fontWeight:"bold", color:C.text, marginBottom:10 }}>
                        {item.addon_required ? "Select one (required):" : "Add extras (optional):"}
                        {item.addon_required && <span style={{ background:"#fbe9e9", color:"#c62828", fontSize:11, borderRadius:6, padding:"2px 8px", marginLeft:8 }}>Required</span>}
                      </div>
                      {item.addons.map((addon, ai) => {
                        const selected = itemModal.selectedAddons.some(a => a.name === addon.name);
                        const isRequired = item.addon_required;
                        return (
                          <div key={ai} onClick={() => { if (addon.sold_out) return; setItemModal(m => ({
                            ...m,
                            selectedAddons: isRequired ? [addon] : selected
                              ? m.selectedAddons.filter(a => a.name !== addon.name)
                              : [...m.selectedAddons, addon]
                          }));}}
                            style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", marginBottom:8, borderRadius:10, border:`2px solid ${addon.sold_out?"#eee":selected?C.gold:C.border}`, background:addon.sold_out?"#f9f9f9":selected?"#eef1f6":"#fff", cursor:addon.sold_out?"not-allowed":"pointer", opacity:addon.sold_out?0.5:1 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                              <div style={{ width:22, height:22, borderRadius:isRequired?11:6, border:`2px solid ${selected?C.gold:C.border}`, background:selected?C.gold:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                {selected && <Icon name="check" size={12} color="#fff" stroke={3}/>}
                              </div>
                              <span style={{ fontSize:14, color:addon.sold_out?C.muted:C.text }}>{addon.name}</span>
                            </div>
                            <span style={{ fontSize:13, color:C.gold, fontWeight:"bold", flexShrink:0, marginLeft:8 }}>
                              {(() => {
                                const raw = parseFloat(addon.price||0);
                                const eff = effAddonPrice(addon, item, isVip, vipGroupSlug);
                                if (eff === raw) return raw > 0 ? `+RM ${raw.toFixed(2)}` : "";
                                return <span><span style={{ textDecoration:"line-through", opacity:0.5, fontSize:11, marginRight:4 }}>+RM {raw.toFixed(2)}</span>+RM {eff.toFixed(2)}</span>;
                              })()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:14, fontWeight:"bold", color:C.text, marginBottom:8 }}>
                      <Icon name="pen" size={13} color={C.text}/> Note for kitchen
                    </div>
                    <textarea value={itemModal.note} onChange={e => setItemModal(m=>({...m, note:e.target.value}))}
                      placeholder="e.g. no sugar, less ice, extra spicy..." rows={2}
                      style={{ width:"100%", border:`1.5px solid ${C.border}`, borderRadius:10, padding:"10px 12px", fontSize:14, fontFamily:"Georgia,serif", color:C.text, resize:"none", boxSizing:"border-box", outline:"none" }} />
                  </div>
                </div>

                <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.border}`, background:"#fff", flexShrink:0, display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ display:"flex", alignItems:"center", border:`2px solid ${C.border}`, borderRadius:50, overflow:"hidden" }}>
                    <button onClick={() => { if (itemModal.qty<=1) { setItemModal(null); return; } setItemModal(m=>({...m, qty:m.qty-1})); }}
                      style={{ background:"#fff", border:"none", color:C.gold, width:38, height:38, fontSize:20, fontWeight:"bold", cursor:"pointer" }}>−</button>
                    <span style={{ width:34, textAlign:"center", fontSize:16, fontWeight:"bold", color:C.text }}>{itemModal.qty}</span>
                    <button onClick={() => setItemModal(m=>({...m, qty:m.qty+1}))}
                      style={{ background:C.gold, border:"none", color:"#fff", width:38, height:38, fontSize:20, fontWeight:"bold", cursor:"pointer" }}>+</button>
                  </div>
                  <button onClick={() => { if (!canAdd) return; addToCart(item, itemModal.freeDrink||null, itemModal.selectedAddons, itemModal.note, itemModal.qty); setItemModal(null); }}
                    disabled={!canAdd}
                    style={btn({ flex:1, background:canAdd?C.goldGrad:C.border, border:"none", color:canAdd?"#fff":C.muted, padding:"12px 0", fontSize:15, fontWeight:"bold", borderRadius:50, cursor:canAdd?"pointer":"not-allowed" })}>
                    {!canAdd && item.addon_required ? "Please select one ↑" : `Add — RM ${totalPrice.toFixed(2)}`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Cart item note modal — staff themed */}
        {cartEditModal && (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(43,51,70,0.55)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ background:"#fff", borderRadius:16, padding:22, width:"min(92%, 420px)", boxShadow:"0 20px 50px rgba(0,0,0,0.25)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:16, fontWeight:800, color:C.text }}><Icon name="pen" size={14} color={C.text}/> Note for this item</div>
                <button onClick={() => setCartEditModal(null)} style={{ background:"transparent", border:"none", cursor:"pointer" }}><Icon name="x" size={18} color={C.muted}/></button>
              </div>
              <div style={{ fontSize:13, color:C.muted, marginBottom:12 }}>{cartEditModal.name}</div>
              <textarea value={cartEditModal.note} onChange={e => setCartEditModal(m => ({...m, note:e.target.value}))}
                placeholder="e.g. no sugar, less ice, extra shot, less spicy..." rows={3} autoFocus
                style={{ width:"100%", border:`1.5px solid ${C.border}`, borderRadius:10, padding:"12px 14px", fontSize:14, fontFamily:"Georgia,serif", color:C.text, resize:"none", boxSizing:"border-box", outline:"none", marginBottom:16 }} />
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setCartEditModal(null)} style={btn({ flex:1, background:C.bg, border:`1px solid ${C.border}`, color:C.muted, padding:"12px 0", fontSize:14, borderRadius:10, cursor:"pointer" })}>Cancel</button>
                <button onClick={() => { const key=cartEditModal.cartKey; setCart(p => ({ ...p, [key]: { ...p[key], note:cartEditModal.note.trim() } })); setCartEditModal(null); }}
                  style={btn({ flex:2, background:C.goldGrad, border:"none", color:"#fff", padding:"12px 0", fontSize:14, fontWeight:"bold", borderRadius:10, cursor:"pointer" })}>Save Note</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (sessionExpired && !isStaff) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", gap:20, padding:24, textAlign:"center", background:T.bg }}>
      <div style={{ fontSize:70 }}>🔒</div>
      <div style={{ fontSize:26, color:T.brown, fontWeight:"bold" }}>Session Ended</div>
      <div style={{ color:T.muted, fontSize:18, lineHeight:1.8 }}>{t.sessionMsg} {CAFE_NAME}! 😊<br/><br/><span style={{ fontSize:15 }}>{t.sessionScan}</span></div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", background:T.bg, fontFamily:"Georgia,serif" }}>
      {/* Header */}
      <div style={{ background:"radial-gradient(500px 160px at 20% 0%, rgba(212,165,68,0.18), transparent 70%), linear-gradient(135deg, #2a1010, #1a0808)", padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, borderBottom:"2px solid #c8973a", boxShadow:"0 4px 18px rgba(0,0,0,0.35)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {isStaff && <button onClick={goHome} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.4)", color:"#fff", borderRadius:8, padding:"6px 12px", fontSize:13 }}>← Back</button>}
          <div>
            <div className="hl-title hl-gold" style={{ fontSize:24, fontWeight:800, letterSpacing:1.5, lineHeight:1.1 }}>☕ {CAFE_NAME}</div>
            <div style={{ fontSize:12, color:"#ffe099", letterSpacing:3, textTransform:"uppercase", marginTop:2 }}>{isTakeaway(tableNo) ? takeawayLabel(tableNo).toUpperCase() : `TABLE ${tableNo}`}</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={() => setLang(l => l==="en"?"zh":"en")} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.4)", color:"#fff", borderRadius:8, padding:"6px 10px", fontSize:13, fontWeight:"bold" }}>
            {lang==="en" ? "中文" : "EN"}
          </button>
          <button onClick={callWaiter} style={{ fontFamily:"Georgia,serif", cursor:"pointer", borderRadius:10, background:waiterCalled?"#2e7d32":"#fff", border:"none", color:waiterCalled?"#fff":T.brown, padding:"10px 14px", fontSize:14, fontWeight:"bold" }}>
            {waiterCalled ? t.coming : `🔔 ${t.callWaiter}`}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", background:"#2c1a0e", borderBottom:"2px solid #c8973a", flexShrink:0 }}>
        <button onClick={() => setView("menu")} style={{ fontFamily:"Georgia,serif", cursor:"pointer", flex:1, background:"transparent", border:"none", borderBottom:view==="menu"?"3px solid #c8973a":"3px solid transparent", color:view==="menu"?"#c8973a":"#a07060", padding:"14px 0", fontSize:17, fontWeight:view==="menu"?"bold":"normal" }}>
          {t.menu}
        </button>
        <button onClick={() => setView("orders")} style={{ fontFamily:"Georgia,serif", cursor:"pointer", flex:1, background:"transparent", border:"none", borderBottom:view==="orders"?"3px solid #c8973a":"3px solid transparent", color:view==="orders"?"#c8973a":"#a07060", padding:"14px 0", fontSize:17, fontWeight:view==="orders"?"bold":"normal" }}>
          {t.myOrders} {hasOrders && <span style={{ background:pendingOrders.length>0?T.orange:T.green, color:"#fff", borderRadius:12, padding:"2px 9px", fontSize:13, marginLeft:6 }}>{myOrders.length}</span>}
        </button>
        <button onClick={() => setView("rewards")} style={{ fontFamily:"Georgia,serif", cursor:"pointer", flex:1, background:"transparent", border:"none", borderBottom:view==="rewards"?"3px solid #c8973a":"3px solid transparent", color:view==="rewards"?"#c8973a":"#a07060", padding:"14px 0", fontSize:17, fontWeight:view==="rewards"?"bold":"normal" }}>
          🎁 Rewards {phoneMember && <span style={{ background:T.goldGrad, color:"#2a1a0a", borderRadius:12, padding:"2px 9px", fontSize:13, marginLeft:6, fontWeight:"bold" }}>{phoneMember.points}</span>}
        </button>
      </div>

      {/* REWARDS */}
      {view === "rewards" && (
        <div style={{ flex:1, overflowY:"auto", padding:20, background:T.bg }}>
          {!phoneMember ? (
            <div style={{ maxWidth:380, margin:"20px auto" }}>
              <div style={{ textAlign:"center", marginBottom:24 }}>
                <div style={{ fontSize:44, marginBottom:10 }}>🎉</div>
                <div style={{ fontSize:20, fontWeight:"bold", color:T.brown }}>Are you a member?</div>
                <div style={{ fontSize:13, color:T.muted, marginTop:6 }}>Check your points, or join in seconds — just your phone number.</div>
              </div>
              <div style={{ background:T.panel, borderRadius:16, padding:20, boxShadow:T.shadow }}>
                {!joiningNew ? (
                  <>
                    <div style={{ fontSize:12, color:T.muted, marginBottom:8, letterSpacing:0.5 }}>PHONE NUMBER</div>
                    <div style={{ display:"flex", gap:8 }}>
                      <select value={memberPhoneCountry} onChange={e=>setMemberPhoneCountry(e.target.value)}
                        style={{ border:`1px solid ${T.border}`, borderRadius:10, padding:"0 10px", fontSize:16, fontFamily:"Georgia,serif", color:T.text, background:"#fff" }}>
                        {PHONE_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name} +{c.dial}</option>)}
                      </select>
                      <input value={memberPhoneInput} onChange={e=>setMemberPhoneInput(e.target.value)}
                        onKeyDown={e => { if (e.key==="Enter") checkMemberPhone(); }}
                        placeholder="e.g. 12 345 6789" type="tel" autoFocus
                        style={{ flex:1, minWidth:0, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px", fontSize:16, fontFamily:"Georgia,serif", color:T.text, boxSizing:"border-box" }} />
                    </div>
                    <button onClick={() => checkMemberPhone()} disabled={memberChecking}
                      style={{ width:"100%", marginTop:12, background:T.goldGrad, color:"#2a1a0a", border:"none", borderRadius:10, padding:"13px 0", fontSize:15, fontWeight:"bold", cursor:"pointer", fontFamily:"Georgia,serif" }}>
                      {memberChecking ? "Checking…" : "Check My Points"}
                    </button>
                    {memberCheckMsg && <div style={{ fontSize:12, color:T.red, marginTop:10, textAlign:"center" }}>{memberCheckMsg}</div>}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:16, fontWeight:"bold", color:T.brown, marginBottom:4 }}>No member found</div>
                    <div style={{ fontSize:13, color:T.muted, marginBottom:14 }}>Join now — it only takes your name.</div>
                    <input value={newMemberNameInline} onChange={e=>setNewMemberNameInline(e.target.value)}
                      onKeyDown={e => { if (e.key==="Enter") joinAsNewMember(); }}
                      placeholder="Your name" autoFocus
                      style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px", fontSize:16, fontFamily:"Georgia,serif", color:T.text, boxSizing:"border-box", marginBottom:12 }} />
                    <div style={{ display:"flex", gap:10 }}>
                      <button onClick={() => { setJoiningNew(false); setMemberPhoneInput(""); setMemberCheckMsg(""); }} style={{ flex:1, background:"transparent", border:`1px solid ${T.border}`, color:T.muted, borderRadius:10, padding:"12px 0", fontSize:14, cursor:"pointer", fontFamily:"Georgia,serif" }}>Back</button>
                      <button onClick={joinAsNewMember} disabled={memberChecking} style={{ flex:2, background:T.goldGrad, color:"#2a1a0a", border:"none", borderRadius:10, padding:"12px 0", fontSize:14, fontWeight:"bold", cursor:"pointer", fontFamily:"Georgia,serif" }}>Join & Continue</button>
                    </div>
                    {memberCheckMsg && <div style={{ fontSize:12, color:T.red, marginTop:10, textAlign:"center" }}>{memberCheckMsg}</div>}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth:460, margin:"0 auto" }}>
              <div style={{ background:"linear-gradient(135deg,#2a1a0a,#1a0808)", borderRadius:18, padding:"22px 24px", marginBottom:20, boxShadow:T.shadow, textAlign:"center" }}>
                <div style={{ fontSize:13, color:"#ffe099", letterSpacing:2, textTransform:"uppercase" }}>Welcome back</div>
                <div style={{ fontSize:22, fontWeight:"bold", color:"#fff", marginTop:4 }}>{phoneMember.name}</div>
                <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:T.goldGrad, color:"#2a1a0a", borderRadius:20, padding:"6px 18px", marginTop:12, fontSize:15, fontWeight:"bold" }}>
                  ✨ {phoneMember.points} points
                </div>
                <div style={{ marginTop:10 }}>
                  <button onClick={async () => { setPhoneMember(null); setSelectedRewardId(null); setMemberPhoneInput(""); await supabase.from("table_sessions").upsert({ table_no:String(tableNo), member_id:null, pending_reward_id:null }); }} style={{ background:"transparent", border:"none", color:"#c9a86a", fontSize:12, cursor:"pointer" }}>Not you? Switch account</button>
                </div>
              </div>
              {memberCheckMsg && <div style={{ background:"#eafaf0", color:"#2e7d32", borderRadius:10, padding:"10px 14px", fontSize:13, marginBottom:16, textAlign:"center" }}>{memberCheckMsg}</div>}
              <div style={{ fontSize:12, color:T.muted, letterSpacing:1.5, textTransform:"uppercase", marginBottom:12, fontWeight:700 }}>Redeem a Reward</div>
              {rewards.length === 0 ? (
                <div style={{ textAlign:"center", color:T.muted, padding:"30px 0" }}>No rewards available right now.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {rewards.map(r => {
                    const affordable = phoneMember.points >= r.points_cost;
                    const selected = selectedRewardId === r.id;
                    const linkedItem = r.reward_type === "free_item" ? Object.values(menu).flat().find(mi => mi.id === r.menu_item_id) : null;
                    return (
                      <button key={r.id} disabled={!affordable} onClick={() => pickReward(r)}
                        style={{ width:"100%", display:"flex", alignItems:"center", gap:14, background:selected?"#fff8ec":T.panel, border:selected?`2px solid #c8973a`:`1px solid ${T.border}`, color:affordable?T.text:"#bbb", borderRadius:14, padding:14, boxShadow:T.shadow, cursor:affordable?"pointer":"not-allowed", opacity:affordable?1:0.6, textAlign:"left" }}>
                        {linkedItem?.image_url
                          ? <img src={linkedItem.image_url} alt="" style={{ width:56, height:56, borderRadius:12, objectFit:"cover", flexShrink:0 }} />
                          : <div style={{ width:56, height:56, borderRadius:12, background:"#f5f0e8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>{r.reward_type==="discount"?"💰":"🎁"}</div>}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:15, fontWeight:"bold" }}>{r.name}</div>
                          <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{r.reward_type==="discount"?"Cash off your bill":"Free item — sent to kitchen now"}</div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontSize:15, fontWeight:"bold", color:affordable?T.brown:"#bbb" }}>{r.points_cost} pts</div>
                          {!affordable && <div style={{ fontSize:11, color:"#bbb" }}>not enough</div>}
                          {selected && <div style={{ fontSize:11, color:"#2e7d32", fontWeight:"bold" }}>✓ Selected</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedRewardId && (
                <div style={{ fontSize:12, color:T.muted, textAlign:"center", marginTop:14 }}>Show this to the cashier at checkout to apply it</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MY ORDERS */}
      {view === "orders" && (
        <div style={{ flex:1, overflowY:"auto", padding:16, background:T.bg }}>
          {myOrders.length === 0 ? (
            <div style={{ textAlign:"center", color:T.muted, marginTop:60 }}>
              <div style={{ fontSize:52, marginBottom:16 }}>🍽️</div>
              <div style={{ fontSize:18 }}>{t.noOrders}</div>
              <button onClick={() => setView("menu")} style={{ fontFamily:"Georgia,serif", cursor:"pointer", marginTop:20, background:T.brown, border:"none", color:"#fff", padding:"14px 32px", fontSize:18, fontWeight:"bold", borderRadius:12 }}>{t.browseMenu}</button>
            </div>
          ) : (
            <>
              {myOrders.map(order => {
                const isPending = order.status === "pending";
                const isDrinkOrder = order.items.every(i => DRINK_CATEGORIES.includes(i.category));
                const isFoodOrder = order.items.every(i => FOOD_CATEGORIES.includes(i.category));
                const label = isDrinkOrder ? t.drinks : isFoodOrder ? t.foodLabel : t.order;
                const borderColor = isPending ? T.orange : T.green;
                const bgColor = isPending ? "#fff" : T.greenBg;
                const statusText = isPending
                  ? (isDrinkOrder ? t.pending : t.kitchenPreparing)
                  : t.served;
                const statusBg = isPending ? T.orange : T.green;
                return (
                  <div key={order.id} style={{ background:bgColor, border:`2px solid ${borderColor}`, borderRadius:14, padding:16, marginBottom:12, boxShadow:T.shadow }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {order.order_seq && <span style={{ background:T.brown, color:"#fff", borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:"bold" }}>#{order.order_seq}</span>}
                        <span style={{ fontSize:14, fontWeight:"bold", color:T.brown }}>{label}</span>
                        <span style={{ fontSize:13, color:T.muted }}>{order.time}</span>
                      </div>
                      <span style={{ background:statusBg, color:"#fff", borderRadius:8, padding:"3px 10px", fontSize:13, fontWeight:"bold" }}>{statusText}</span>
                    </div>
                    {order.items.map((item,i) => {
                      const done = itemDone(order, item);
                      return (
                      <div key={i} style={{ marginBottom:6 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:16, gap:8 }}>
                          <span style={{ color:done?T.muted:T.text, textDecoration:done?"line-through":"none" }}>
                            {item.item_no && <span style={{ color:T.brown, fontWeight:"bold", marginRight:4 }}>{item.item_no}</span>}
                            {item.name}
                          </span>
                          <span style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                            <span style={{ color:T.brown, fontWeight:"bold" }}>×{item.qty}</span>
                            <span style={{ fontSize:11, fontWeight:"bold", color:done?T.green:T.orange }}>{done?"Ready":"Preparing"}</span>
                          </span>
                        </div>
                        {item.is_takeaway && <div style={{ display:"inline-block", background:"#e65100", color:"#fff", borderRadius:6, padding:"2px 8px", marginTop:3, fontSize:12, fontWeight:"bold" }}>🥡 Takeaway</div>}
                        {item.note && <div style={{ fontSize:13, color:T.orange, marginTop:3 }}>📝 {item.note}</div>}
                      </div>
                      );
                    })}
                    {order.special_request && (
                      <div style={{ fontSize:13, color:T.orange, marginTop:6 }}>📝 {order.special_request}</div>
                    )}
                    <div style={{ borderTop:`1px solid ${isPending?T.border:T.green}`, marginTop:10, paddingTop:10 }}>
                      <span style={{ color:isPending?T.brown:T.green, fontWeight:"bold", fontSize:18 }}>RM {order.total.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setView("menu")} style={{ fontFamily:"Georgia,serif", cursor:"pointer", width:"100%", marginTop:10, background:"#fff", border:`2px solid ${T.brown}`, color:T.brown, padding:"14px 0", fontSize:17, fontWeight:"bold", borderRadius:12 }}>{t.addMoreItems}</button>
            </>
          )}
        </div>
      )}

      {/* MENU */}
      {view === "menu" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#f5f0eb" }}>
          {/* Search bar */}
          <div style={{ padding:"10px 12px", background:"#2c1a0e", borderBottom:"1px solid #4a2020" }}>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:18, color:T.muted }}>🔍</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                style={{ width:"100%", background:"#1a1208", border:"1px solid #4a2020", color:"#f5ede0", padding:"10px 12px 10px 40px", borderRadius:10, fontSize:16, fontFamily:"Georgia,serif", boxSizing:"border-box" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", fontSize:20, color:T.muted, cursor:"pointer" }}>×</button>
              )}
            </div>
          </div>


          {/* Category tabs — hidden when searching */}
          {!searchQuery && (
            <div style={{ display:"flex", gap:8, background:"#1a1208", borderBottom:"1px solid #4a2020", overflowX:"auto", flexShrink:0, padding:"12px 12px" }}>
              {CATEGORIES.map(cat => {
                const active = activeCategory===cat;
                return (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:active?"linear-gradient(135deg,#e6c463,#b4842a)":"transparent", border:`1px solid ${active?"transparent":"#4a3018"}`, color:active?"#1a1208":"#b79268", padding:"10px 18px", fontSize:14, fontWeight:active?"bold":"normal", whiteSpace:"nowrap", flexShrink:0, borderRadius:30, letterSpacing:0.5, boxShadow:active?"0 3px 12px rgba(180,132,42,0.4)":"none", transition:"all 0.2s" }}>
                  {cat==="Beverage"?t.beverage:cat==="Food & Snacks"?t.food:cat==="Desserts"?t.desserts:t.addons}
                </button>
                );
              })}
            </div>
          )}

          {/* Items grid — Zeoniq style */}
          <div style={{ flex:1, overflowY:"auto", padding:"10px 14px 100px" }}>
            {menuLoading ? <div style={{ color:T.muted, textAlign:"center", padding:40, fontSize:18 }}>{t.loadingMenu}</div>
              : currentMenuItems.length===0 ? <div style={{ color:T.muted, textAlign:"center", padding:40, fontSize:18 }}>{searchQuery ? `No results for "${searchQuery}"` : t.noItems}</div>
              : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(160px, 45%), 1fr))", gap:10 }}>
                  {currentMenuItems.map(item => {
                    const qty = Object.values(cart).filter(c => c.id === item.id).reduce((s,c) => s+c.qty, 0);
                    const soldOut = item.is_available===false;
                    return (
                      <div key={item.id} onClick={() => !soldOut && handleAddItem(item)}
                        style={{ background:"#fff", border:qty>0?`2px solid ${T.brown}`:`1px solid ${T.border}`, borderRadius:18, overflow:"hidden", position:"relative", opacity:soldOut?0.5:1, boxShadow:qty>0?"0 10px 26px rgba(180,132,42,0.22)":T.shadow, display:"flex", flexDirection:"column", cursor:soldOut?"default":"pointer", transition:"box-shadow 0.2s, transform 0.2s" }}>

                        {/* Best seller badge - bottom left of image */}
                        {!soldOut && item.is_best_seller && (
                          <div style={{ position:"absolute", top:0, left:0, zIndex:2 }}>
                            <div style={{ background:"#e8000d", color:"#fff", fontWeight:"bold", fontSize:9, padding:"5px 7px", borderRadius:"0 0 8px 0", letterSpacing:0.5, textAlign:"center", lineHeight:1.3, boxShadow:"2px 2px 6px rgba(0,0,0,0.35)" }}>
                              👍<br/>BEST<br/>SELLER
                            </div>
                          </div>
                        )}
                        {soldOut && <div style={{ position:"absolute", top:8, left:8, background:T.red, color:"#fff", borderRadius:6, padding:"2px 7px", fontSize:11, fontWeight:"bold", zIndex:3 }}>{t.soldOutBadge}</div>}

                        {item.image_url
                          ? <img src={item.image_url} alt={item.name} style={{ width:"100%", height:100, objectFit:"cover", filter:soldOut?"grayscale(80%)":"none" }} />
                          : <div style={{ height:100, display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, background:"#f9f9f9" }}>{item.emoji}</div>
                        }

                        <div style={{ padding:"8px 10px 10px", flex:1, display:"flex", flexDirection:"column" }}>
                          {/* Name */}
                          <div className="hl-title" style={{ fontWeight:700, fontSize:15, marginBottom:6, color:T.text, lineHeight:1.25, flex:1, letterSpacing:0.2 }}>
                            {item.item_no && <span style={{ color:T.brown, marginRight:4, fontSize:12, fontFamily:"Georgia,serif" }}>{item.item_no}</span>}{item.name}
                          </div>

                          {/* Bottom group: badges above, price+button row pinned to bottom so + aligns across all cards */}
                          <div style={{ marginTop:"auto" }}>
                          {isPromoNow(item) && item.promo_drinks && item.promo_drinks.length > 0 && (
                            <div style={{ fontSize:10, color:T.green, fontWeight:"bold", marginBottom:4 }}>{t.withFreeDrinks}</div>
                          )}
                          {isPromoNow(item) && item.addons && item.addons.some(a => a.promo_price && parseFloat(a.promo_price) > 0) && (
                            <div style={{ fontSize:10, color:"#e65100", fontWeight:"bold", marginBottom:4 }}>{item.promo_label || t.happyHour}</div>
                          )}
                          {/* Price + button row */}
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            {/* Price */}
                            <div style={{ fontSize:13, fontWeight:"bold", color:T.brown, flexShrink:0 }}>
                              {(() => {
                                if (item.addon_required && item.addons && item.addons.length > 0) {
                                  const normalMin = Math.min(...item.addons.map(a=>parseFloat(a.price||0)));
                                  const effMin = Math.min(...item.addons.map(a => effAddonPrice(a, item, isVip, vipGroupSlug)));
                                  return effMin < normalMin
                                    ? <span style={{ display:"flex", flexDirection:"column", lineHeight:1.1 }}><span style={{ textDecoration:"line-through", opacity:0.5, fontWeight:"normal", fontSize:10 }}>RM {normalMin.toFixed(2)}</span><span style={{ color:"#e65100" }}>RM {effMin.toFixed(2)}+</span></span>
                                    : `RM ${effMin.toFixed(2)}+`;
                                }
                                const eff = effPrice(item, isVip, vipGroupSlug);
                                return eff < parseFloat(item.price)
                                  ? <span style={{ display:"flex", flexDirection:"column", lineHeight:1.1 }}><span style={{ textDecoration:"line-through", opacity:0.5, fontWeight:"normal", fontSize:10 }}>RM {parseFloat(item.price).toFixed(2)}</span><span style={{ color:"#e65100" }}>RM {eff.toFixed(2)}</span></span>
                                  : `RM ${eff.toFixed(2)}`;
                              })()}
                            </div>

                            {soldOut ? null : qty === 0 ? (
                              /* + button */
                              <button onClick={e => { e.stopPropagation(); handleAddItem(item); }}
                                style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"linear-gradient(135deg,#e6c463,#b4842a)", border:"none", color:"#1a1208", width:36, height:36, fontSize:22, fontWeight:"bold", borderRadius:50, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 12px rgba(180,132,42,0.45)" }}>+</button>
                            ) : (
                              /* qty controls */
                              <div style={{ display:"flex", alignItems:"center", gap:4 }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => removeFromCart(Object.values(cart).find(c=>c.id===item.id)?.cartKey||item.id)}
                                  style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"#fff", border:`2px solid ${T.brown}`, color:T.brown, width:30, height:30, fontSize:20, fontWeight:"bold", borderRadius:50 }}>−</button>
                                <span style={{ color:T.brown, fontWeight:"bold", fontSize:16, minWidth:18, textAlign:"center" }}>{qty}</span>
                                <button onClick={() => handleAddItem(item)}
                                  style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:T.brown, border:"none", color:"#fff", width:30, height:30, fontSize:20, fontWeight:"bold", borderRadius:50 }}>+</button>
                              </div>
                            )}
                          </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>

          {/* GrabFood-style Item Modal */}
          {itemModal && (() => {
            const item = itemModal.item;
            const soldOut = item.is_available === false;
            const hasAddons = item.addons && item.addons.length > 0;
            const hasPromo = isPromoNow(item) && item.promo_drinks && item.promo_drinks.length > 0;
            const addonPrice = itemModal.selectedAddons.reduce((s,a) => s + effAddonPrice(a, item, isVip, vipGroupSlug), 0);
            const basePrice = item.addon_required ? 0 : effPrice(item, isVip, vipGroupSlug);
            const unitPrice = basePrice + addonPrice;
            const totalPrice = unitPrice * itemModal.qty;
            const canAdd = !soldOut && (!item.addon_required || itemModal.selectedAddons.length > 0);
            return (
              <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.65)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={() => setItemModal(null)}>
                <div onClick={e => e.stopPropagation()} style={{ position:"relative", background:"#fff", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:520, height:"min(92vh, 680px)", display:"flex", flexDirection:"column", overflow:"hidden" }}>

                  {/* Big photo / emoji */}
                  <div style={{ position:"relative", flexShrink:0 }}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} loading="lazy" style={{ width:"100%", height:200, objectFit:"cover", loading:"lazy" }} />
                      : <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", fontSize:80, background:"#f9f9f9" }}>{item.emoji}</div>
                    }
                    {/* Close button */}
                    <button onClick={() => setItemModal(null)} style={{ position:"absolute", top:14, left:14, background:"rgba(255,255,255,0.9)", border:"none", borderRadius:50, width:40, height:40, fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.2)", fontFamily:"Georgia,serif" }}>✕</button>
                    {/* Best seller badge - top RIGHT so it doesn't cover X */}
                    {item.is_best_seller && (
                      <div style={{ position:"absolute", top:0, right:0, background:"#e8000d", color:"#fff", fontWeight:"bold", fontSize:10, padding:"6px 8px", borderRadius:"0 0 0 10px", textAlign:"center", lineHeight:1.3 }}>
                        👍<br/>BEST<br/>SELLER
                      </div>
                    )}
                  </div>

                  {/* Content - scrollable */}
                  <div ref={itemScrollRef} onScroll={updateScrollHint} style={{ flex:1, overflowY:"auto", padding:"20px 20px 0", WebkitOverflowScrolling:"touch" }}>
                    {/* Name + price */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                      <div style={{ fontSize:22, fontWeight:"bold", color:T.text, flex:1, lineHeight:1.3, paddingRight:12 }}>{item.name}</div>
                      <div style={{ fontSize:22, fontWeight:"bold", color:T.brown, flexShrink:0 }}>
                        RM {unitPrice.toFixed(2)}
                      </div>
                    </div>
                    {item.description && <div style={{ fontSize:14, color:T.muted, marginBottom:16, lineHeight:1.5 }}>{item.description}</div>}

                    {/* Promo badge */}
                    {hasPromo && (
                      <div style={{ background:"#fff8e1", borderRadius:10, padding:"10px 14px", marginBottom:16 }}>
                        <div style={{ fontSize:14, fontWeight:"bold", color:"#e65100" }}>{item.promo_label ? `🎉 ${item.promo_label}` : t.breakfastPromo}</div>
                        <div style={{ fontSize:13, color:"#5a3a00" }}>{t.chooseFree}</div>
                        {item.promo_drinks.map((drink, di) => (
                          <div key={di} onClick={() => setItemModal(m=>({...m, freeDrink:drink}))}
                            style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", marginTop:8, borderRadius:10, border:`2px solid ${itemModal.freeDrink===drink?T.brown:T.border}`, background:itemModal.freeDrink===drink?"#fff8f0":"#fff", cursor:"pointer" }}>
                            <span style={{ fontSize:14, color:T.text }}>☕ {drink}</span>
                            <span style={{ fontSize:13, color:T.green, fontWeight:"bold" }}>{t.free}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Addons */}
                    {hasAddons && (
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:14, fontWeight:"bold", color:T.text, marginBottom:10 }}>
                          {item.addon_required ? t.selectOne : t.addExtras}
                          {item.addon_required && <span style={{ background:"#ffeeee", color:T.red, fontSize:11, borderRadius:6, padding:"2px 8px", marginLeft:8 }}>Required</span>}
                        </div>
                        {item.addons.map((addon, ai) => {
                          const selected = itemModal.selectedAddons.some(a => a.name === addon.name);
                          const isRequired = item.addon_required;
                          return (
                            <div key={ai} onClick={() => { if (addon.sold_out) return; setItemModal(m => ({
                              ...m,
                              selectedAddons: isRequired ? [addon] : selected
                                ? m.selectedAddons.filter(a => a.name !== addon.name)
                                : [...m.selectedAddons, addon]
                            }));}}
                              style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", marginBottom:8, borderRadius:12, border:`2px solid ${addon.sold_out?"#eee":selected?T.brown:T.border}`, background:addon.sold_out?"#f9f9f9":selected?"#fff8f0":"#fff", cursor:addon.sold_out?"not-allowed":"pointer", opacity:addon.sold_out?0.5:1 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0 }}>
                                <div style={{ width:26, height:26, borderRadius:isRequired?13:6, border:`2px solid ${selected?T.brown:T.border}`, background:selected?T.brown:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                  {selected && <span style={{ color:"#fff", fontSize:16, fontWeight:"bold" }}>✓</span>}
                                </div>
                                <span style={{ fontSize:16, color:addon.sold_out?T.muted:T.text, flex:1, minWidth:0 }}>{addon.name}</span>
                              </div>
                              <span style={{ fontSize:14, color:T.brown, fontWeight:"bold", flexShrink:0, marginLeft:8, whiteSpace:"nowrap" }}>
                                {(() => {
                                  const raw = parseFloat(addon.price||0);
                                  const eff = effAddonPrice(addon, item, isVip, vipGroupSlug);
                                  if (eff === raw) return raw > 0 ? `+RM ${raw.toFixed(2)}` : "";
                                  return <span><span style={{ textDecoration:"line-through", opacity:0.5, fontSize:11, marginRight:4 }}>+RM {raw.toFixed(2)}</span><span style={{ color:"#e65100" }}>+RM {eff.toFixed(2)}</span></span>;
                                })()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Note to restaurant */}
                    <div style={{ marginBottom:16 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ fontSize:16, fontWeight:"bold", color:T.text }}>📝 Note to restaurant</div>
                        <span style={{ background:"#f0f0f0", color:T.muted, fontSize:12, borderRadius:6, padding:"2px 8px" }}>Optional</span>
                      </div>
                      <textarea value={itemModal.note} onChange={e => setItemModal(m=>({...m, note:e.target.value}))}
                        placeholder="e.g. no sugar, less ice, extra spicy..."
                        rows={2}
                        style={{ width:"100%", border:`1.5px solid ${T.border}`, borderRadius:10, padding:"12px 14px", fontSize:16, fontFamily:"Georgia,serif", color:T.text, resize:"none", boxSizing:"border-box", outline:"none" }} />
                    </div>
                  </div>

                  {/* Bouncing scroll hint — auto-hides at bottom */}
                  <div style={{
                    position:"absolute", left:"50%", transform:"translateX(-50%)",
                    bottom:90, pointerEvents:"none", zIndex:5,
                    opacity: showScrollHint ? 1 : 0,
                    transition:"opacity 0.25s ease",
                  }}>
                    <div style={{
                      width:38, height:38, borderRadius:"50%",
                      background:"rgba(255,255,255,0.92)", boxShadow:"0 2px 10px rgba(0,0,0,0.18)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      animation:"hlBounce 1.2s ease-in-out infinite",
                    }}>
                      <span style={{ fontSize:20, color:T.brown, lineHeight:1 }}>⌄</span>
                    </div>
                  </div>
                  <style>{`@keyframes hlBounce {0%,100%{transform:translateY(0)}50%{transform:translateY(7px)}}`}</style>

                  {/* Qty + Add button sticky bottom - never moves */}
                  <div style={{ padding:"16px 20px", paddingBottom:"max(20px, calc(12px + env(safe-area-inset-bottom)))", borderTop:`1px solid ${T.border}`, background:"#fff", flexShrink:0, display:"flex", alignItems:"center", gap:16 }}>
                    {/* Qty controls */}
                    <div style={{ display:"flex", alignItems:"center", gap:0, border:`2px solid ${T.border}`, borderRadius:50, overflow:"hidden" }}>
                      <button onClick={() => {
                        if (itemModal.qty <= 1) { setItemModal(null); return; }
                        setItemModal(m=>({...m, qty:m.qty-1}));
                      }}
                        style={{ background:"#fff", border:"none", color:T.brown, width:46, height:46, fontSize:26, fontWeight:"bold", cursor:"pointer", fontFamily:"Georgia,serif" }}>−</button>
                      <span style={{ width:42, textAlign:"center", fontSize:20, fontWeight:"bold", color:T.text, fontFamily:"Georgia,serif" }}>{itemModal.qty}</span>
                      <button onClick={() => setItemModal(m=>({...m, qty:m.qty+1}))}
                        style={{ background:T.brown, border:"none", color:"#fff", width:46, height:46, fontSize:26, fontWeight:"bold", cursor:"pointer", fontFamily:"Georgia,serif" }}>+</button>
                    </div>
                    {/* Add to order button */}
                    <button onClick={() => {
                      if (!canAdd) return;
                      document.activeElement?.blur();
                      setTimeout(() => {
                        addToCart(item, itemModal.freeDrink||null, itemModal.selectedAddons, itemModal.note, itemModal.qty);
                        setItemModal(null);
                      }, 80);
                    }} disabled={!canAdd}
                      style={{ flex:1, background:canAdd?"linear-gradient(135deg,#c8973a,#a07020)":"#e6e0d6", border:"none", color:canAdd?"#1a1208":"#9a9083", padding:"13px 0", fontSize:17, fontWeight:"bold", borderRadius:50, cursor:canAdd?"pointer":"not-allowed", fontFamily:"Georgia,serif", boxShadow:canAdd?"0 4px 12px rgba(138,90,0,0.35)":"none" }}>
                      {!canAdd && item.addon_required ? t.pleaseSelect : `Add to Order — RM ${totalPrice.toFixed(2)}`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Add-ons Modal */}
          {addonModal && (
            <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
              <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", padding:24, width:"100%", maxWidth:500, maxHeight:"80vh", overflowY:"auto" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <div style={{ fontSize:18, fontWeight:"bold", color:T.brown }}>{addonModal.item.name}</div>
                  <button onClick={() => setAddonModal(null)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"transparent", border:"none", fontSize:24, color:T.muted }}>×</button>
                </div>
                <div style={{ fontSize:13, color:T.muted, marginBottom:12 }}>
                  {addonModal.item.addon_required ? t.selectOne : t.addExtras}
                </div>
                {addonModal.item.addons.map((addon, ai) => {
                  const selected = addonModal.selectedAddons.some(a => a.name === addon.name);
                  const isRequired = addonModal.item.addon_required;
                  return (
                    <div key={ai} onClick={() => { if (addon.sold_out) return; setAddonModal(m => ({
                      ...m,
                      selectedAddons: isRequired ? [addon] : selected
                        ? m.selectedAddons.filter(a => a.name !== addon.name)
                        : [...m.selectedAddons, addon]
                    }));}} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", marginBottom:8, borderRadius:12, border:`2px solid ${addon.sold_out?"#eee":selected?T.brown:T.border}`, background:addon.sold_out?"#f9f9f9":selected?"#fff8f0":"#fff", cursor:addon.sold_out?"not-allowed":"pointer", opacity:addon.sold_out?0.5:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:24, height:24, borderRadius:isRequired?12:6, border:`2px solid ${selected?T.brown:T.border}`, background:selected?T.brown:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {selected && <span style={{ color:"#fff", fontSize:14, fontWeight:"bold" }}>✓</span>}
                        </div>
                        <span style={{ fontSize:15, color:addon.sold_out?T.muted:T.text }}>{addon.name}{addon.sold_out && <span style={{ fontSize:11, color:T.red, marginLeft:6, fontWeight:"bold" }}>SOLD OUT</span>}</span>
                      </div>
                      <span style={{ fontSize:14, color:T.brown, fontWeight:"bold", textAlign:"right" }}>
                        {(() => {
                          const raw = parseFloat(addon.price||0);
                          const eff = effAddonPrice(addon, addonModal.item, isVip, vipGroupSlug);
                          if (eff === raw) return raw > 0 ? `RM ${raw.toFixed(2)}` : "";
                          return (
                            <span>
                              <span style={{ textDecoration:"line-through", opacity:0.5, fontSize:11, marginRight:4 }}>RM {raw.toFixed(2)}</span>
                              <span style={{ color:"#e65100" }}>RM {eff.toFixed(2)}</span>
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                  );
                })}
                {addonModal.freeDrink !== null && addonModal.item.promo_drinks && addonModal.item.promo_drinks.length > 0 && (
                  <div style={{ marginTop:12, background:"#fff8e1", borderRadius:10, padding:"10px 14px", marginBottom:8 }}>
                    <div style={{ fontSize:13, fontWeight:"bold", color:"#e65100", marginBottom:8 }}>🎁 Choose a free drink:</div>
                    {addonModal.item.promo_drinks.map((drink, di) => (
                      <div key={di} onClick={() => setAddonModal(m=>({...m, freeDrink:drink}))}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", marginBottom:6, borderRadius:10, border:`2px solid ${addonModal.freeDrink===drink?T.brown:T.border}`, background:addonModal.freeDrink===drink?"#fff8f0":"#fff", cursor:"pointer" }}>
                        <span style={{ fontSize:14, color:T.text }}>☕ {drink}</span>
                        <span style={{ fontSize:13, color:T.green, fontWeight:"bold" }}>{t.free}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop:16 }}>
                  <button onClick={() => {
                    if (addonModal.item.addon_required && addonModal.selectedAddons.length===0) return;
                    addToCart(addonModal.item, addonModal.freeDrink||null, addonModal.selectedAddons);
                    setAddonModal(null);
                  }} style={{ fontFamily:"Georgia,serif", cursor:(addonModal.item.addon_required && addonModal.selectedAddons.length===0)?"not-allowed":"pointer", width:"100%", background:(addonModal.item.addon_required && addonModal.selectedAddons.length===0)?"#ccc":T.brown, border:"none", color:"#fff", padding:"16px 0", fontSize:17, fontWeight:"bold", borderRadius:12 }}>
                    {addonModal.item.addon_required && addonModal.selectedAddons.length===0 ? t.pleaseSelect : t.addToOrder}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Promo / Free Drink Modal */}
          {promoModal && (
            <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
              <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", padding:24, width:"100%", maxWidth:500 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ fontSize:18, fontWeight:"bold", color:T.brown }}>{promoModal.item.name}</div>
                  <button onClick={() => setPromoModal(null)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"transparent", border:"none", fontSize:24, color:T.muted }}>×</button>
                </div>
                <div style={{ background:"#fff8e1", borderRadius:10, padding:"10px 14px", marginBottom:16 }}>
                  <div style={{ fontSize:14, fontWeight:"bold", color:"#e65100" }}>🎉 Breakfast Promo!</div>
                  <div style={{ fontSize:13, color:"#5a3a00" }}>Choose a free drink with your order</div>
                </div>
                {promoModal.item.promo_drinks.map((drink, di) => (
                  <div key={di} onClick={() => setPromoModal(m=>({...m, selectedDrink:drink}))}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", marginBottom:8, borderRadius:12, border:`2px solid ${promoModal.selectedDrink===drink?T.brown:T.border}`, background:promoModal.selectedDrink===drink?"#fff8f0":"#fff", cursor:"pointer" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:24, height:24, borderRadius:12, border:`2px solid ${promoModal.selectedDrink===drink?T.brown:T.border}`, background:promoModal.selectedDrink===drink?T.brown:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {promoModal.selectedDrink===drink && <span style={{ color:"#fff", fontSize:12 }}>✓</span>}
                      </div>
                      <span style={{ fontSize:15, color:T.text }}>☕ {drink}</span>
                    </div>
                    <span style={{ fontSize:14, color:T.green, fontWeight:"bold" }}>{t.free}</span>
                  </div>
                ))}
                <div style={{ marginTop:16, display:"flex", gap:10 }}>
                  <button onClick={() => { addToCart(promoModal.item, promoModal.selectedDrink||null); setPromoModal(null); }}
                    style={{ fontFamily:"Georgia,serif", cursor:"pointer", flex:1, background:T.brown, border:"none", color:"#fff", padding:"16px 0", fontSize:17, fontWeight:"bold", borderRadius:12 }}>
                    {promoModal.selectedDrink ? `Add + Free ${promoModal.selectedDrink} ✓` : t.addWithoutFree}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Cart Button */}
          {cartItems.length > 0 && (
            <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:500, padding:"12px 16px", paddingBottom:"max(24px, calc(12px + env(safe-area-inset-bottom)))", background:"linear-gradient(to top, rgba(26,8,8,1) 60%, rgba(26,8,8,0))" }}>
              <button onClick={() => setView("cart")}
                style={{ width:"100%", maxWidth:500, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", background:"linear-gradient(135deg,#c8973a,#a07020)", border:"none", color:"#1a1208", padding:"16px 20px", fontSize:17, fontWeight:"bold", borderRadius:16, cursor:"pointer", fontFamily:"Georgia,serif", boxShadow:"0 4px 20px rgba(200,151,58,0.5)" }}>
                <span style={{ background:"rgba(255,255,255,0.25)", borderRadius:8, padding:"2px 10px", fontSize:16 }}>{cartItems.reduce((s,i)=>s+i.qty,0)}</span>
                <span>View Cart</span>
                <span>RM {total.toFixed(2)}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* CART VIEW */}
      {view === "cart" && (
        <div style={{ flex:1, overflowY:"auto", background:T.bg }}>
          {/* Header */}
          <div style={{ background:"#fff", padding:"16px 16px 12px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={() => setView("menu")} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"transparent", border:"none", fontSize:26, color:T.brown, padding:0 }}>←</button>
            <div style={{ fontSize:20, fontWeight:"bold", color:T.text }}>Your Order</div>
            <span style={{ background:cartItems.length>0?T.green:"#ccc", color:"#fff", borderRadius:20, padding:"2px 10px", fontSize:14, fontWeight:"bold" }}>{cartItems.reduce((s,i)=>s+i.qty,0)} items</span>
          </div>

          <div style={{ padding:"16px 16px 140px" }}>
            {/* Empty cart state */}
            {cartItems.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 20px" }}>
                <div style={{ fontSize:60, marginBottom:16 }}>🛒</div>
                <div style={{ fontSize:18, color:T.muted, marginBottom:20 }}>Your cart is empty</div>
                <button onClick={() => setView("menu")} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:T.brown, border:"none", color:"#fff", padding:"14px 32px", fontSize:17, fontWeight:"bold", borderRadius:12 }}>← Browse Menu</button>
              </div>
            )}

            {/* Cart items */}
            {cartItems.map(item => (
              <div key={item.cartKey||item.id} style={{ background:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:10, boxShadow:T.shadow }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ flex:1, paddingRight:10 }}>
                    <div style={{ fontSize:16, fontWeight:"bold", color:T.text }}>{item.name}</div>
                    <div style={{ fontSize:14, color:T.brown, fontWeight:"bold", marginTop:2 }}>RM {(item.price*item.qty).toFixed(2)}</div>
                    {item.note
                      ? <div onClick={() => setCartEditModal({ cartKey:item.cartKey||item.id, note:item.note, name:item.name })}
                          style={{ fontSize:13, color:T.orange, marginTop:4, cursor:"pointer" }}>📝 {item.note} <span style={{ fontSize:11, color:T.brown }}>✏️ edit</span></div>
                      : <div onClick={() => setCartEditModal({ cartKey:item.cartKey||item.id, note:"", name:item.name })}
                          style={{ fontSize:12, color:T.muted, marginTop:4, cursor:"pointer" }}>✏️ Add note</div>
                    }
                    <div onClick={() => setCart(p => ({ ...p, [item.cartKey||item.id]: { ...p[item.cartKey||item.id], is_takeaway: !p[item.cartKey||item.id]?.is_takeaway } }))}
                      style={{ display:"flex", alignItems:"center", gap:10, marginTop:10, cursor:"pointer", userSelect:"none", background:item.is_takeaway?"#fff3ee":"#f8f8f8", border:`2px solid ${item.is_takeaway?"#e65100":"#ddd"}`, borderRadius:10, padding:"10px 14px", transition:"all 0.15s" }}>
                      <div style={{ width:26, height:26, borderRadius:8, border:`2px solid ${item.is_takeaway?"#e65100":"#ccc"}`, background:item.is_takeaway?"#e65100":"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {item.is_takeaway && <span style={{ color:"#fff", fontSize:15, fontWeight:"bold" }}>✓</span>}
                      </div>
                      <span style={{ fontSize:15, color:item.is_takeaway?"#e65100":T.muted, fontWeight:item.is_takeaway?"bold":"normal", lineHeight:1.3 }}>🥡 Pack as takeaway</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:0, border:`2px solid ${T.border}`, borderRadius:50, overflow:"hidden" }}>
                    <button onClick={() => removeFromCart(item.cartKey||item.id)}
                      style={{ background:"#fff", border:"none", color:T.brown, width:38, height:38, fontSize:22, fontWeight:"bold", cursor:"pointer", fontFamily:"Georgia,serif" }}>−</button>
                    <span style={{ width:36, textAlign:"center", fontSize:17, fontWeight:"bold", color:T.text, fontFamily:"Georgia,serif" }}>{item.qty}</span>
                    <button onClick={() => setCart(p => ({ ...p, [item.cartKey||item.id]: { ...p[item.cartKey||item.id], qty:p[item.cartKey||item.id].qty+1 } }))}
                      style={{ background:T.brown, border:"none", color:"#fff", width:38, height:38, fontSize:22, fontWeight:"bold", cursor:"pointer", fontFamily:"Georgia,serif" }}>+</button>
                  </div>
                </div>
              </div>
            ))}

            {/* Total */}
            <div style={{ background:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:10, boxShadow:T.shadow }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:18, fontWeight:"bold", color:T.text }}>
                <span>{t.total}</span>
                <span style={{ color:T.brown }}>RM {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Sticky Place Order button */}
          <div style={{ position:"fixed", bottom:0, left:0, right:0, padding:"12px 16px", paddingBottom:"max(28px, calc(12px + env(safe-area-inset-bottom)))", background:"linear-gradient(to top, rgba(245,245,245,1) 60%, rgba(245,245,245,0))" }}>
            <button onClick={placeOrder} disabled={isSubmitting || cartItems.length === 0}
              style={{ width:"100%", maxWidth:500, display:"block", margin:"0 auto", background:cartItems.length===0?"#e6e0d6":isSubmitting?"#a0836a":"linear-gradient(135deg,#c8973a,#a07020)", border:"none", color:cartItems.length===0?"#9a9083":"#1a1208", padding:"15px 0", fontSize:18, fontWeight:"bold", borderRadius:16, cursor:(isSubmitting||cartItems.length===0)?"not-allowed":"pointer", fontFamily:"Georgia,serif", boxShadow:cartItems.length>0?"0 4px 20px rgba(138,90,0,0.4)":"none" }}>
              {cartItems.length===0 ? "Add items to order" : isSubmitting ? t.placing : `✓ ${t.placeOrder} · RM ${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}

      {/* Cart Item Note Edit Modal — global */}
      {cartEditModal && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:3000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", padding:24, width:"100%", maxWidth:500 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <div style={{ fontSize:17, fontWeight:"bold", color:T.brown }}>📝 Note for this item</div>
              <button onClick={() => setCartEditModal(null)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"transparent", border:"none", fontSize:24, color:T.muted }}>×</button>
            </div>
            <div style={{ fontSize:13, color:T.muted, marginBottom:12 }}>{cartEditModal.name}</div>
            <textarea
              value={cartEditModal.note}
              onChange={e => setCartEditModal(m => ({...m, note:e.target.value}))}
              placeholder="e.g. no sugar, less ice, extra shot, less spicy..."
              rows={3} autoFocus
              style={{ width:"100%", border:`1.5px solid ${T.border}`, borderRadius:10, padding:"12px 14px", fontSize:16, fontFamily:"Georgia,serif", color:T.text, resize:"none", boxSizing:"border-box", outline:"none", marginBottom:16 }}
            />
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setCartEditModal(null)}
                style={{ flex:1, background:"#f5f5f5", border:`1px solid ${T.border}`, color:T.muted, padding:"14px 0", fontSize:15, borderRadius:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>Cancel</button>
              <button onClick={() => {
                const key = cartEditModal.cartKey;
                setCart(p => ({ ...p, [key]: { ...p[key], note: cartEditModal.note.trim() } }));
                setCartEditModal(null);
              }}
                style={{ flex:2, background:T.brown, border:"none", color:"#fff", padding:"14px 0", fontSize:15, fontWeight:"bold", borderRadius:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>
                ✓ Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Modal — global */}
      {editRequestModal && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:3000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", padding:24, width:"100%", maxWidth:500 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:18, fontWeight:"bold", color:T.brown }}>📝 Special Request</div>
              <button onClick={() => setEditRequestModal(null)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"transparent", border:"none", fontSize:24, color:T.muted }}>×</button>
            </div>
            <div style={{ fontSize:13, color:T.muted, marginBottom:12 }}>e.g. change cold to hot, less sugar, no ice, extra spicy...</div>
            <textarea
              value={editRequestModal.request}
              onChange={e => setEditRequestModal(m => ({...m, request:e.target.value}))}
              placeholder="Type your request here..."
              rows={3} autoFocus
              style={{ width:"100%", border:`1.5px solid ${T.border}`, borderRadius:10, padding:"12px 14px", fontSize:16, fontFamily:"Georgia,serif", color:T.text, resize:"none", boxSizing:"border-box", outline:"none", marginBottom:16 }}
            />
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setEditRequestModal(null)}
                style={{ flex:1, background:"#f5f5f5", border:`1px solid ${T.border}`, color:T.muted, padding:"14px 0", fontSize:15, borderRadius:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>
                Cancel
              </button>
              <button onClick={async () => {
                await supabase.from("orders").update({ special_request: editRequestModal.request.trim()||null }).eq("id", editRequestModal.orderId);
                setEditRequestModal(null);
              }}
                style={{ flex:2, background:T.brown, border:"none", color:"#fff", padding:"14px 0", fontSize:15, fontWeight:"bold", borderRadius:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>
                ✓ Save Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QRScreen({ goHome }) {
  const baseUrl = window.location.href.split("?")[0];

  const printOne = (t) => {
    const url = `${baseUrl}?table=${t}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=10`;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Table ${t} QR</title>
      <style>
        body { margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:Georgia,serif; }
        h2 { font-size:28px; margin-bottom:8px; }
        p { font-size:12px; color:#666; margin-bottom:16px; }
        @media print { button { display:none; } }
      </style></head>
      <body>
        <h2>☕ HOTO LOUNGE</h2>
        <h2>TABLE ${t}</h2>
        <img src="${qrSrc}" style="width:280px;height:280px;" />
        <p>${url}</p>
        <p>Scan to order</p>
        <button onclick="window.print()" style="margin-top:16px;padding:10px 24px;font-size:16px;cursor:pointer;">🖨️ Print</button>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 16px rgba(57,76,118,0.25)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="grid" size={18} color="#fff" /></div>
          <div className="hl-title" style={{ fontSize:20, color:"#fff", fontWeight:700, letterSpacing:0.3 }}>QR Codes for Tables</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => window.print()} style={btn({ background:"#fff", border:"none", color:"#394c76", padding:"8px 16px", fontSize:13, fontWeight:"bold" })}>Print All</button>
          <button onClick={goHome} style={btn({ background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", padding:"8px 16px", fontSize:13 })}>← Back</button>
        </div>
      </div>
      <div style={{ padding:20 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:16 }}>
          {TABLES.map(tnum => (
            <div key={tnum} style={{ background:C.panel, border:`1px solid ${C.gold}`, borderRadius:14, padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:16, fontWeight:"bold", color:C.goldLight }}>TABLE {tnum}</div>
              <QRCode url={`${baseUrl}?table=${tnum}`} size={140} />
              <div style={{ fontSize:10, color:C.muted, textAlign:"center", fontFamily:"monospace", wordBreak:"break-all" }}>{baseUrl}?table={tnum}</div>
              <button onClick={() => printOne(tnum)} style={btn({ background:C.goldGrad, border:"none", color:"#fff", padding:"7px 20px", fontSize:13, fontWeight:"bold", width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:7 })}><Icon name="printer" size={15} color="#fff" /> Print</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KitchenScreen({ goHome }) {
  const [orders, setOrders] = useState([]);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem("k_sound") !== "off");
  const [voiceOn, setVoiceOn] = useState(() => localStorage.getItem("k_voice") === "on");
  const [voiceLang, setVoiceLang] = useState(() => localStorage.getItem("k_voice_lang") || "en");
  const [kitchenDetailModal, setKitchenDetailModal] = useState(null); // order ID only
  const printedIdsRef = useRef(new Set(JSON.parse(localStorage.getItem("k_printed_ids")||"[]")));
  const soundOnRef = useRef(localStorage.getItem("k_sound") !== "off");
  const voiceOnRef = useRef(localStorage.getItem("k_voice") === "on");
  const voiceLangRef = useRef(localStorage.getItem("k_voice_lang") || "en");
  const autoPrintRef = useRef(false);
  const [printBlocked, setPrintBlocked] = useState(false);
  useEffect(() => {
    const load = () => supabase.from("app_settings").select("auto_print_enabled").eq("id", 1).maybeSingle()
      .then(({ data }) => { if (data) autoPrintRef.current = data.auto_print_enabled; });
    load();
    const ch = supabase.channel("app-settings-kitchen-watch")
      .on("postgres_changes", { event:"*", schema:"public", table:"app_settings" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const toggleSound = () => {
    setSoundOn(s => {
      const next = !s;
      soundOnRef.current = next;
      localStorage.setItem("k_sound", next ? "on" : "off");
      return next;
    });
  };
  const toggleVoice = () => {
    setVoiceOn(v => {
      const next = !v;
      voiceOnRef.current = next;
      localStorage.setItem("k_voice", next ? "on" : "off");
      return next;
    });
  };
  const toggleVoiceLang = () => {
    setVoiceLang(l => {
      const next = l === "en" ? "zh" : "en";
      voiceLangRef.current = next;
      localStorage.setItem("k_voice_lang", next);
      return next;
    });
  };

  const audioCtxRef = useRef(null);
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  useEffect(() => {
    const unlock = () => { try { getAudioCtx(); } catch(e) {} };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => { window.removeEventListener("click", unlock); window.removeEventListener("touchstart", unlock); };
  }, []);

  const speak = (tableNo) => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance();
      const isTW = isTakeaway(tableNo);
      if (voiceLangRef.current === "zh") {
        u.lang = "zh-TW";
        u.text = isTW ? `新订单，${tableNo}` : `新订单，${tableNo}号桌`;
      } else {
        u.lang = "en-US";
        const label = isTW ? takeawayLabel(tableNo) : `Table ${tableNo}`;
        u.text = `New order, ${label}`;
      }
      u.rate = 0.95; u.pitch = 1.1; u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch(e) {}
  };

  const playAlert = (tableNo) => {
    if (soundOnRef.current) {
      try {
        const ctx = getAudioCtx();
        [0, 200, 400].forEach(delay => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = 880; osc.type = "sine";
          gain.gain.setValueAtTime(1.0, ctx.currentTime + delay / 1000);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.5);
          osc.start(ctx.currentTime + delay / 1000);
          osc.stop(ctx.currentTime + delay / 1000 + 0.5);
        });
      } catch(e) {}
    }
    if (voiceOnRef.current && tableNo) speak(tableNo);
  };

  const printKitchenTicket = (order) => {
    const now = new Date();
    const dateStr = now.toLocaleString("en-MY",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Asia/Kuala_Lumpur"});
    const serviceArea = isTakeaway(order.table_no) ? takeawayLabel(order.table_no) : `Table ${order.table_no}`;
    const itemRows = order.items.map(i => `
      <div class="item-row"><span class="qty">${i.qty}x</span><span class="name">${i.item_no?`<b>${i.item_no}</b> `:""}${i.name}${i.is_takeaway?' <span class="tw">(TAKEAWAY)</span>':""}</span></div>
      ${i.note ? `<div class="note">${i.note}</div>` : ""}`).join("");
    const foodReq = getFoodReq(order.special_request);
    const win = window.open("","_blank","width=380,height=600");
    if (!win || win.closed) return false;
    win.document.write(`<!DOCTYPE html><html><head><title>Kitchen Ticket</title><style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:"Courier New",monospace;font-size:15px;width:290px;margin:0 auto;padding:12px 8px;}
      .center{text-align:center;}
      .logo{font-size:18px;font-weight:bold;letter-spacing:1px;}
      .divider{border-top:1px dashed #000;margin:6px 0;}
      .big{font-size:22px;font-weight:bold;}
      .item-row{display:flex;gap:8px;margin:6px 0;}
      .qty{font-weight:bold;min-width:32px;}
      .name{font-weight:bold;}
      .tw{font-weight:normal;}
      .note{margin:2px 0 2px 40px;font-size:13px;}
      .btn-row{display:flex;gap:8px;margin-top:14px;}
      .btn-row button{flex:1;padding:12px;font-size:15px;cursor:pointer;font-family:monospace;border:none;border-radius:6px;}
      @media print{.no-print{display:none;}}
    </style></head><body>
    <div class="center">
      <div class="logo">KITCHEN TICKET</div>
      ${order.order_seq ? `<div>Order #${order.order_seq}</div>` : ""}
    </div>
    <div class="divider"></div>
    <div class="big center">${serviceArea}</div>
    <div class="center" style="font-size:12px;">${dateStr}</div>
    <div class="divider"></div>
    ${itemRows}
    ${foodReq ? `<div class="divider"></div><div class="note" style="margin-left:0;font-weight:bold;">${foodReq}</div>` : ""}
    <div class="divider"></div>
    <div class="btn-row no-print">
      <button onclick="window.close()" style="background:#eee;color:#333;">✕ Close</button>
      <button onclick="window.print()" style="background:#333;color:#fff;">🖨️ Print</button>
    </div>
    <script>window.onload = function(){ window.print(); };</script>
    </body></html>`);
    win.document.close();
    return true;
  };

  const fetchAll = async () => {
    const { data:o } = await supabase.from("orders").select("*").order("created_at", { ascending:true });
    const newOrders = o||[];
    const filtered = newOrders.map(order => ({
      ...order,
      items: order.items.filter(item => FOOD_CATEGORIES.includes(item.category))
    })).filter(order => order.items.length > 0);
    const pendingList = filtered.filter(x => x.status==="pending");
    const pendingIds = new Set(pendingList.map(o => o.id));
    // Forget ids that are no longer pending (done/paid/cancelled) so the stored set doesn't grow forever
    for (const id of [...printedIdsRef.current]) { if (!pendingIds.has(id)) printedIdsRef.current.delete(id); }
    const newlyArrived = pendingList.filter(o => !printedIdsRef.current.has(o.id));
    if ((soundOnRef.current || voiceOnRef.current) && newlyArrived.length > 0) {
      playAlert(newlyArrived[0]?.table_no);
    }
    if (autoPrintRef.current && newlyArrived.length > 0) {
      // Delay so the print popup doesn't steal window focus and cut off the voice/sound alert
      setTimeout(() => {
        const results = newlyArrived.map(printKitchenTicket);
        setPrintBlocked(results.some(ok => !ok));
      }, 1200);
    }
    newlyArrived.forEach(o => printedIdsRef.current.add(o.id));
    localStorage.setItem("k_printed_ids", JSON.stringify([...printedIdsRef.current]));
    setOrders(filtered);
  };

  useEffect(() => {
    fetchAll();
    const ch1 = supabase.channel("orders-ch").on("postgres_changes", { event:"*", schema:"public", table:"orders" }, fetchAll).subscribe();
    return () => { supabase.removeChannel(ch1); };
  }, []);

  const handleItemDone = (order, itemIndex) => markItemDone(order, itemIndex).then(fetchAll);
  const clearFinished = () => supabase.from("orders").delete().in("status", ["cancelled"]).then(fetchAll);

  const pending   = orders.filter(o => o.status==="pending");
  const done      = orders.filter(o => o.status==="done");
  const cancelled = orders.filter(o => o.status==="cancelled");

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 16px rgba(57,76,118,0.25)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="hat" size={19} color="#fff" /></div>
          <div>
            <div className="hl-title" style={{ fontSize:19, color:"#fff", fontWeight:700, letterSpacing:0.3 }}>Kitchen Screen</div>
            <div style={{ fontSize:11, color:"#aeb8cc", display:"flex", alignItems:"center", gap:5 }}><span style={{ width:7, height:7, borderRadius:"50%", background:"#ffffff", display:"inline-block" }} /> Live — updates instantly</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={toggleSound} style={btn({ background:soundOn?"#fff":"rgba(255,255,255,0.1)", border:soundOn?"none":"1px solid rgba(255,255,255,0.28)", color:soundOn?"#394c76":"rgba(255,255,255,0.8)", padding:"7px 13px", fontSize:12, fontWeight:soundOn?"bold":"normal" })}>
            {soundOn ? "Sound On" : "Sound Off"}
          </button>
          <button onClick={toggleVoice} style={btn({ background:voiceOn?"#fff":"rgba(255,255,255,0.1)", border:voiceOn?"none":"1px solid rgba(255,255,255,0.28)", color:voiceOn?"#394c76":"rgba(255,255,255,0.8)", padding:"7px 13px", fontSize:12, fontWeight:voiceOn?"bold":"normal" })}>
            {voiceOn ? "Voice On" : "Voice Off"}
          </button>
          {voiceOn && (
            <button onClick={toggleVoiceLang} style={btn({ background:"rgba(255,255,255,0.16)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", padding:"7px 12px", fontSize:12, fontWeight:"bold" })}>
              {voiceLang === "en" ? "EN" : "中文"}
            </button>
          )}
          {cancelled.length>0 && <button onClick={clearFinished} style={btn({ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.28)", color:"rgba(255,255,255,0.8)", padding:"7px 12px", fontSize:12 })}>Clear Cancelled</button>}
          <button onClick={goHome} style={btn({ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.28)", color:"#fff", padding:"7px 12px", fontSize:14 })}>✕</button>
        </div>
      </div>
      {printBlocked && (
        <div style={{ background:"#c0392b", color:"#fff", padding:"10px 20px", fontSize:13, fontWeight:"bold", textAlign:"center" }}>
          ⚠️ Auto-print was blocked by the browser — allow pop-ups for this site in the browser's settings to fix this permanently
        </div>
      )}
      <div style={{ flex:1, padding:16, overflowY:"auto" }}>
        <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10, fontWeight:700 }}>Pending Food ({pending.length})</div>
        {pending.length===0 && <div style={{ color:C.muted, textAlign:"center", padding:40 }}>All clear!</div>}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:14, marginBottom:24 }}>
          {pending.map(order => (
            <div key={order.id} onClick={() => setKitchenDetailModal(order.id)}
              style={{ background:C.panel, border:`1.5px solid ${C.gold}`, borderRadius:14, padding:16, display:"flex", flexDirection:"column", cursor:"pointer" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {order.order_seq && <span style={{ background:C.gold, color:C.dark, borderRadius:6, padding:"2px 8px", fontSize:13, fontWeight:"bold" }}>#{order.order_seq}</span>}
                  <div style={{ fontSize:20, fontWeight:"bold", color:C.goldLight }}>{isTakeaway(order.table_no) ? takeawayLabel(order.table_no) : `Table ${order.table_no}`}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ fontSize:11, color:C.muted }}>{order.time}</div>
                  <span style={{ color:C.muted, fontSize:14 }}>↗</span>
                </div>
              </div>
              <div style={{ flex:1 }}>
                {order.items.map((item,i) => {
                  const done = itemDone(order, item);
                  return (
                  <div key={i} style={{ marginBottom:8, opacity:done?0.5:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:14, gap:8 }}>
                      <span style={{ textDecoration:done?"line-through":"none" }}>{done?"✅ ":""}{item.emoji||"🍽️"} {item.item_no && <span style={{ color:C.gold, fontWeight:"bold", marginRight:4 }}>{item.item_no}</span>}{item.name}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                        <span style={{ color:C.gold, fontWeight:"bold" }}>×{item.qty}</span>
                        {!done && (
                          <button onClick={e => { e.stopPropagation(); handleItemDone(order, i); }}
                            style={btn({ background:C.goldGrad, border:"none", color:C.dark, padding:"6px 14px", fontSize:12, fontWeight:"bold" })}>Done</button>
                        )}
                      </div>
                    </div>
                    {item.is_takeaway && <div style={{ display:"inline-block", background:"#394c76", color:"#fff", borderRadius:6, padding:"3px 8px", marginTop:3, fontSize:11, fontWeight:"bold", letterSpacing:0.5 }}>TAKEAWAY</div>}
                    {item.note && <div style={{ fontSize:12, color:"#394c76", background:"#eef1f6", borderRadius:6, padding:"4px 8px", marginTop:3 }}>{item.note}</div>}
                  </div>
                  );
                })}
                {getFoodReq(order.special_request) && (
                  <div style={{ background:"#eef1f6", border:"1px solid #394c7633", borderRadius:6, padding:"6px 10px", marginTop:6, fontSize:12, color:C.gold }}>{getFoodReq(order.special_request)}</div>
                )}
              </div>
              <div style={{ borderTop:`1px solid ${C.border}`, marginTop:10, paddingTop:10, display:"flex", justifyContent:"flex-end", gap:8 }}>
                <button onClick={e => { e.stopPropagation(); printKitchenTicket(order); }} style={btn({ background:"#eef1f6", border:`1px solid ${C.border}`, color:"#394c76", padding:"8px 14px", fontSize:14, fontWeight:"bold", display:"flex", alignItems:"center", gap:6 })}><Icon name="printer" size={14} color="#394c76" /> Reprint</button>
              </div>
            </div>
          ))}
        </div>
        {done.length>0 && <>
          <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10, fontWeight:700 }}>Done ({done.length})</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:10, marginBottom:20 }}>
            {done.map(o => (
              <div key={o.id} style={{ background:"#eef1f6", border:"1px solid #cbe3cb", borderRadius:12, padding:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span style={{ color:"#394c76", fontWeight:"bold" }}>Table {o.table_no}</span><span style={{ fontSize:11, color:C.muted }}>{o.time}</span></div>
                {o.items.map((item,i) => <div key={i} style={{ fontSize:12, color:C.muted, marginBottom:3 }}>{item.emoji||"🍽️"} {item.item_no && <span style={{ color:"#394c76", fontWeight:"bold", marginRight:3 }}>{item.item_no}</span>}{item.name} ×{item.qty}</div>)}
                <div style={{ marginTop:8, display:"flex", justifyContent:"flex-end" }}>
                  <button onClick={() => printKitchenTicket(o)} style={btn({ background:"#fff", border:`1px solid ${C.border}`, color:"#394c76", padding:"6px 12px", fontSize:12, fontWeight:"bold", display:"flex", alignItems:"center", gap:5 })}><Icon name="printer" size={12} color="#394c76" /> Reprint</button>
                </div>
              </div>
            ))}
          </div>
        </>}
        {cancelled.length>0 && <>
          <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10, fontWeight:700 }}>Cancelled ({cancelled.length})</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:10, marginBottom:20 }}>
            {cancelled.map(o => (
              <div key={o.id} style={{ background:"#fbeaea", border:"1px solid #eecaca", borderRadius:12, padding:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span style={{ color:"#c62828", fontWeight:"bold" }}>Table {o.table_no}</span><span style={{ fontSize:11, color:C.muted }}>{o.time}</span></div>
                {o.items.map((item,i) => <div key={i} style={{ fontSize:12, color:C.muted, marginBottom:3 }}>{item.emoji||"🍽️"} {item.item_no && <span style={{ color:"#c62828", fontWeight:"bold", marginRight:3 }}>{item.item_no}</span>}{item.name} ×{item.qty}</div>)}
              </div>
            ))}
          </div>
        </>}
      </div>

      {/* Kitchen Order Detail Modal — live sync */}
      {kitchenDetailModal && (() => {
        const liveOrder = [...pending, ...done, ...cancelled].find(o => o.id === kitchenDetailModal);
        if (!liveOrder) return null;
        return (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:C.bg, zIndex:9000, display:"flex", flexDirection:"column" }}>
          {/* Header */}
          <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, boxShadow:"0 4px 16px rgba(57,76,118,0.25)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="hat" size={20} color="#fff" /></div>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {liveOrder.order_seq && <span style={{ background:"rgba(255,255,255,0.9)", color:"#394c76", borderRadius:6, padding:"2px 9px", fontSize:14, fontWeight:"bold" }}>#{liveOrder.order_seq}</span>}
                  <div className="hl-title" style={{ fontSize:24, fontWeight:800, color:"#fff" }}>{isTakeaway(liveOrder.table_no) ? takeawayLabel(liveOrder.table_no) : `Table ${liveOrder.table_no}`}</div>
                </div>
                <div style={{ fontSize:12, color:"#aeb8cc", marginTop:2 }}>Food Order · {liveOrder.time}</div>
              </div>
            </div>
            <button onClick={() => setKitchenDetailModal(null)}
              style={btn({ background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", width:44, height:44, fontSize:20, borderRadius:50 })}>✕</button>
          </div>

          {/* Items */}
          <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
            {liveOrder.items.map((item, i) => {
              const done = itemDone(liveOrder, item);
              return (
              <div key={i} style={{ marginBottom:16, padding:"16px", background:done?"#eef1f6":C.panel, borderRadius:14, border:`1px solid ${done?"#cbd5e6":C.border}`, opacity:done?0.6:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                  <div style={{ fontSize:22, fontWeight:"bold", color:C.goldLight, textDecoration:done?"line-through":"none" }}>
                    {done?"✅ ":""}{item.emoji||"🍽️"} {item.item_no && <span style={{ color:C.gold, marginRight:6 }}>{item.item_no}</span>}{item.name}
                  </div>
                  <div style={{ fontSize:28, fontWeight:"bold", color:C.gold, flexShrink:0 }}>×{item.qty}</div>
                </div>
                {item.is_takeaway && (
                  <div style={{ display:"inline-block", background:"#394c76", color:"#fff", borderRadius:10, padding:"8px 16px", marginTop:10, fontSize:16, fontWeight:"bold", letterSpacing:1 }}>TAKEAWAY — Pack separately</div>
                )}
                {item.note && (
                  <div style={{ fontSize:16, color:"#394c76", background:"#eef1f6", borderRadius:8, padding:"10px 14px", marginTop:10 }}>{item.note}</div>
                )}
                {!done && (
                  <button onClick={() => handleItemDone(liveOrder, i)}
                    style={btn({ width:"100%", background:C.goldGrad, border:"none", color:"#fff", padding:"14px 0", fontSize:17, fontWeight:"bold", borderRadius:12, marginTop:12 })}>
                    ✓ Mark This Item Done
                  </button>
                )}
              </div>
              );
            })}
            {getFoodReq(liveOrder.special_request) && (
              <div style={{ fontSize:16, color:C.gold, background:"#eef1f6", borderRadius:10, padding:"12px 16px", marginTop:8 }}>{getFoodReq(liveOrder.special_request)}</div>
            )}
          </div>

          {/* Status footer */}
          <div style={{ padding:"16px 20px", background:C.panel, borderTop:`1px solid ${C.border}`, flexShrink:0, boxShadow:"0 -4px 16px rgba(70,52,22,0.08)" }}>
            {liveOrder.status === "pending" ? (
              <div style={{ textAlign:"center", color:C.muted, fontSize:14 }}>Mark each item done as it's ready</div>
            ) : (
              <div style={{ textAlign:"center", color:"#394c76", fontSize:18, fontWeight:"bold", padding:"14px 0" }}>Already Done</div>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

function exportExcel(orders, rangeLabel, charge) {
  const subtotal = orders.reduce((s,o)=>s+o.total,0);
  const chargeAmt = +(subtotal*charge/100).toFixed(2);
  // Sum per-bill rounded amounts (matches what was actually collected)
  const grandTotal = +orders.reduce((s,o)=>{
    const bc=+(o.total*charge/100).toFixed(2);
    return s + +(Math.round((o.total+bc)*20)/20).toFixed(2);
  },0).toFixed(2);
  const rows = [];
  rows.push(["Order ID","Date","Table","Time","Item","Category","Qty","Unit Price","Item Total","Special Request"]);
  orders.forEach(o => {
    const date = new Date(o.created_at).toLocaleDateString("en-MY",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Kuala_Lumpur"});
    const time = o.time || new Date(o.created_at).toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Asia/Kuala_Lumpur"});
    o.items.forEach(item => {
      rows.push([o.id, date, isTakeaway(o.table_no)?takeawayLabel(o.table_no):"Table "+o.table_no, time, item.name, item.category||"", item.qty, item.price.toFixed(2), (item.price*item.qty).toFixed(2), o.special_request||""]);
    });
  });
  rows.push([]);
  rows.push(["","","","","","","","Subtotal",subtotal.toFixed(2)]);
  if(charge>0) rows.push(["","","","","","","",charge+"% Service Charge",chargeAmt.toFixed(2)]);
  rows.push(["","","","","","","","Grand Total",grandTotal.toFixed(2)]);
  const escape = v => { const s=String(v!=null?v:""); return s.includes(",")||s.includes("\n")||s.includes('"') ? '"'+s.replace(/"/g,'\\"')+ '"' : s; };
  const csv = rows.map(r=>r.map(escape).join(",")).join("\r\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom+csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download="Sales_"+rangeLabel+".csv"; a.click();
  URL.revokeObjectURL(url);
}

function SalesScreen({ goHome }) {
  const SALES_PW = "hotolounge2026";
  const [pinOk, setPinOk] = useState(false);
  const [pinVal, setPinVal] = useState("");
  const [pinErr, setPinErr] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const todayMYT = new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kuala_Lumpur"});
  const [rangeStart, setRangeStart] = useState(todayMYT);
  const [rangeEnd, setRangeEnd] = useState(todayMYT);
  const [pickingEnd, setPickingEnd] = useState(false); // false = next click starts a new range, true = next click sets the end
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(todayMYT.slice(0,7)); // "YYYY-MM" shown in the popup
  const [serviceCharge, setServiceCharge] = useState(10);
  useEffect(() => {
    const load = () => supabase.from("app_settings").select("service_charge").eq("id", 1).maybeSingle()
      .then(({ data }) => { if (data) setServiceCharge(data.service_charge); });
    load();
    const ch = supabase.channel("app-settings-sales-watch")
      .on("postgres_changes", { event:"*", schema:"public", table:"app_settings" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // Mon-first day grid for the popup calendar; null = blank leading cell
  const buildCalendarDays = (yearMonth) => {
    const [y,m] = yearMonth.split("-").map(Number);
    const startWeekday = (new Date(y, m-1, 1).getDay()+6)%7; // Mon=0..Sun=6
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells = Array(startWeekday).fill(null);
    for (let d=1; d<=daysInMonth; d++) cells.push(d);
    return cells;
  };
  const shiftCalendarMonth = (delta) => {
    const [y,m] = calendarMonth.split("-").map(Number);
    const d = new Date(y, m-1+delta, 1);
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  };
  // Hotel-booking style: 1st click picks the start, 2nd click picks the end (or restarts if it's earlier)
  const pickDay = (ds) => {
    if (!pickingEnd) { setRangeStart(ds); setRangeEnd(ds); setPickingEnd(true); }
    else if (ds < rangeStart) { setRangeStart(ds); setRangeEnd(ds); }
    else { setRangeEnd(ds); setPickingEnd(false); setCalendarOpen(false); }
  };
  const isCurrentPeriod = rangeStart===todayMYT && rangeEnd===todayMYT;
  const periodLabel = rangeStart===rangeEnd
    ? new Date(rangeStart+"T00:00:00").toLocaleDateString("en-MY",{day:"2-digit",month:"short",year:"numeric"})
    : `${new Date(rangeStart+"T00:00:00").toLocaleDateString("en-MY",{day:"2-digit",month:"short"})} – ${new Date(rangeEnd+"T00:00:00").toLocaleDateString("en-MY",{day:"2-digit",month:"short",year:"numeric"})}`;
  const goToday = () => { setRangeStart(todayMYT); setRangeEnd(todayMYT); setPickingEnd(false); setCalendarOpen(false); };

  useEffect(() => {
    if (!pinOk) return;
    const fetchSales = async () => {
      setLoading(true);
      const { data } = await supabase.from("orders").select("*").eq("status","paid").order("created_at",{ascending:true});
      const filtered = (data||[]).filter(o => {
        const ds = new Date(o.created_at).toLocaleDateString("en-CA",{timeZone:"Asia/Kuala_Lumpur"});
        return ds >= rangeStart && ds <= rangeEnd;
      });
      setOrders(filtered); setLoading(false);
    };
    fetchSales();
  }, [rangeStart, rangeEnd, pinOk]);

  if (!pinOk) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif" }}>
      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:18, padding:32, width:"100%", maxWidth:320, textAlign:"center", boxShadow:C.shadow }}>
        <div style={{ width:56, height:56, margin:"0 auto 14px", borderRadius:16, background:"#eef1f6", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="lock" size={26} color="#394c76" /></div>
        <div className="hl-title" style={{ fontSize:18, color:C.text, fontWeight:700, marginBottom:6 }}>Sales Access</div>
        <div style={{ fontSize:13, color:C.muted, marginBottom:20 }}>Enter password to view sales</div>
        <input type="password" value={pinVal} autoFocus
          onChange={e=>{setPinVal(e.target.value);setPinErr(false);}}
          onKeyDown={e=>e.key==="Enter"&&(pinVal===SALES_PW?setPinOk(true):setPinErr(true))}
          placeholder="Enter password"
          style={{ width:"100%", background:C.bg, border:`2px solid ${pinErr?"#cc4444":C.gold}`, color:C.text, padding:"12px 16px", borderRadius:10, fontSize:16, fontFamily:"Georgia,serif", textAlign:"center", boxSizing:"border-box", marginBottom:8 }} />
        {pinErr && <div style={{ color:"#ff7777", fontSize:13, marginBottom:8 }}>Wrong password</div>}
        <button onClick={()=>pinVal===SALES_PW?setPinOk(true):setPinErr(true)}
          style={btn({ width:"100%", background:C.goldGrad, border:"none", color:C.dark, padding:14, fontSize:15, fontWeight:"bold", marginTop:8 })}>
          Unlock ✓
        </button>
        <button onClick={goHome} style={btn({ width:"100%", background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:10, fontSize:13, marginTop:10 })}>← Back</button>
      </div>
    </div>
  );



  const charge = serviceCharge;
  const subtotalRevenue = orders.reduce((s,o) => s+o.total, 0);
  const chargeRevenue = +(subtotalRevenue * charge / 100).toFixed(2);
  // Apply Malaysian rounding (nearest 0.05) per bill — same as what cashier actually collected
  const totalRevenue = +orders.reduce((s,o) => {
    const billSubtotal = o.total;
    const billCharge = +(billSubtotal * charge / 100).toFixed(2);
    const billGrand = +(billSubtotal + billCharge).toFixed(2);
    const billRounded = +(Math.round(billGrand * 20) / 20).toFixed(2);
    return s + billRounded;
  }, 0).toFixed(2);
  const totalOrders  = orders.length;
  const itemCount = {};
  orders.forEach(o => o.items.forEach(item => {
    if (!itemCount[item.name]) itemCount[item.name] = { name:item.name, emoji:item.emoji||"🍽️", qty:0, revenue:0 };
    itemCount[item.name].qty += item.qty; itemCount[item.name].revenue += item.price*item.qty;
  }));
  const topItems = Object.values(itemCount).sort((a,b) => b.qty-a.qty);
  const byTable = {};
  orders.forEach(o => { if (!byTable[o.table_no]) byTable[o.table_no]={count:0,total:0}; byTable[o.table_no].count++; byTable[o.table_no].total+=o.total; });

  // Category breakdown
  const drinkRevenue = orders.reduce((s,o) => s+o.items.filter(i=>DRINK_CATEGORIES.includes(i.category)).reduce((ss,i)=>ss+i.price*i.qty,0), 0);
  const foodRevenue = orders.reduce((s,o) => s+o.items.filter(i=>FOOD_CATEGORIES.includes(i.category)).reduce((ss,i)=>ss+i.price*i.qty,0), 0);

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 16px rgba(57,76,118,0.25)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="chart" size={18} color="#fff" /></div>
          <div className="hl-title" style={{ fontSize:20, color:"#fff", fontWeight:700, letterSpacing:0.3 }}>Sales Summary</div>
        </div>
        <button onClick={goHome} style={btn({ background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", padding:"8px 16px", fontSize:13 })}>← Back</button>
      </div>
      <div style={{ padding:16, overflowY:"auto", flex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          <div style={{ position:"relative" }}>
            <button onClick={() => { setCalendarMonth(rangeStart.slice(0,7)); setPickingEnd(false); setCalendarOpen(o => !o); }}
              style={btn({ background:C.panel, border:`2px solid ${C.gold}`, borderRadius:8, padding:"8px 16px", fontSize:14, color:C.goldLight, fontWeight:"bold", fontFamily:"Georgia,serif", userSelect:"none", minWidth:190, display:"flex", alignItems:"center", justifyContent:"center", gap:8 })}>
              <Icon name="calendar" size={14} color={C.goldLight} /> {periodLabel}
            </button>
            {calendarOpen && <>
              <div style={{ position:"fixed", inset:0, zIndex:3000 }} onClick={() => setCalendarOpen(false)} />
              <div onClick={e => e.stopPropagation()}
                style={{ position:"absolute", top:"calc(100% + 8px)", left:0, background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, boxShadow:"0 16px 40px rgba(43,51,70,0.28)", padding:14, width:250, zIndex:3001 }}>
                <div style={{ fontSize:11, color:C.muted, textAlign:"center", marginBottom:8 }}>
                  {pickingEnd ? "Pick check-out / end date" : "Pick check-in / start date"}
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <button onClick={() => shiftCalendarMonth(-1)} style={btn({ background:"transparent", border:"none", color:C.muted, fontSize:16, padding:"2px 10px" })}>‹</button>
                  <div style={{ fontSize:14, fontWeight:"bold", color:C.text }}>
                    {new Date(calendarMonth+"-01T00:00:00").toLocaleDateString("en-MY",{month:"long",year:"numeric"})}
                  </div>
                  <button onClick={() => shiftCalendarMonth(1)} style={btn({ background:"transparent", border:"none", color:C.muted, fontSize:16, padding:"2px 10px" })}>›</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
                  {["M","T","W","T","F","S","S"].map((d,i) => <div key={i} style={{ fontSize:11, color:C.muted, textAlign:"center", fontWeight:"bold" }}>{d}</div>)}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                  {buildCalendarDays(calendarMonth).map((day,i) => {
                    if (day===null) return <div key={i} />;
                    const ds = `${calendarMonth}-${String(day).padStart(2,"0")}`;
                    const isStart = ds===rangeStart;
                    const isEnd = ds===rangeEnd;
                    const inRange = ds>rangeStart && ds<rangeEnd;
                    const isToday = ds===todayMYT;
                    return (
                      <button key={i} onClick={() => pickDay(ds)}
                        style={btn({
                          background: (isStart||isEnd) ? C.goldGrad : inRange ? "#eef1f6" : "transparent",
                          border: isToday && !isStart && !isEnd ? `1px solid ${C.gold}` : "1px solid transparent",
                          color: (isStart||isEnd) ? "#fff" : C.text,
                          borderRadius: (isStart||isEnd) ? 8 : 0,
                          padding:"6px 0", fontSize:13, fontWeight:(isStart||isEnd)?"bold":"normal"
                        })}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>}
          </div>
          <button onClick={goToday}
            style={btn({ background:isCurrentPeriod?"#e3e7f0":"transparent", border:`1px solid ${C.gold}`, color:C.goldLight, padding:"8px 14px", fontSize:13, fontWeight:"bold" })}>Today</button>
          {orders.length > 0 && (
            <button onClick={() => exportExcel(orders, rangeStart===rangeEnd?rangeStart:`${rangeStart}_to_${rangeEnd}`, charge)}
              style={btn({ background:"#eef1f6", border:`1px solid #394c76`, color:"#394c76", padding:"8px 16px", fontSize:13, fontWeight:"bold", marginLeft:"auto", display:"flex", alignItems:"center", gap:7 })}>
              <Icon name="chart" size={14} color="#394c76" /> Export Excel
            </button>
          )}
        </div>
        {loading ? <div style={{ color:C.muted, textAlign:"center", padding:40 }}>Loading...</div> : <>
          {/* Revenue summary cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px,1fr))", gap:12, marginBottom:16 }}>
            {[
              ["RM "+totalRevenue.toFixed(2), charge>0?"Total (incl. "+charge+"% charge)":"Total Revenue", C.gold],
              [""+totalOrders, "Orders Completed", C.border],
              ["RM "+(totalOrders>0?(totalRevenue/totalOrders).toFixed(2):"0.00"), "Avg per Bill", C.border]
            ].map(([val,label,border]) => (
              <div key={label} style={{ background:C.panel, border:`1px solid ${border}`, borderRadius:12, padding:16, textAlign:"center" }}>
                <div style={{ fontSize:22, color:C.goldLight, fontWeight:"bold" }}>{val}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Revenue breakdown */}
          {orders.length > 0 && charge > 0 && (
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 16px", marginBottom:20 }}>
              <div style={{ fontSize:11, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10, fontWeight:"bold" }}>Revenue Breakdown</div>
              {[
                ["Food Sales", "RM "+foodRevenue.toFixed(2)],
                ["Drink Sales", "RM "+drinkRevenue.toFixed(2)],
                ["Subtotal (before charge)", "RM "+subtotalRevenue.toFixed(2)],
                [charge+"% Service Charge", "RM "+chargeRevenue.toFixed(2)],
              ].map(([label,val]) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6, color:C.text }}>
                  <span style={{ color:C.muted }}>{label}</span>
                  <span style={{ color:C.goldLight, fontWeight:"bold" }}>{val}</span>
                </div>
              ))}
              <div style={{ borderTop:`1px solid ${C.border}`, marginTop:8, paddingTop:8, display:"flex", justifyContent:"space-between", fontSize:15, fontWeight:"bold" }}>
                <span style={{ color:C.gold }}>Grand Total</span>
                <span style={{ color:C.goldLight }}>RM {totalRevenue.toFixed(2)}</span>
              </div>
            </div>
          )}

          {orders.length===0 ? <div style={{ color:C.muted, textAlign:"center", padding:40 }}>No completed orders for this period</div> : <>
            <div style={{ fontSize:13, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:12, fontWeight:700 }}>Top Selling Items</div>
            <div style={{ background:C.panel, borderRadius:12, overflow:"hidden", marginBottom:24 }}>
              {topItems.map((item,i) => (
                <div key={item.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderBottom:i<topItems.length-1?`1px solid ${C.border}`:"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:13, minWidth:24, textAlign:"center", fontWeight:700, color:i<3?"#394c76":"#8c8c8c" }}>{i+1}</span>
                    <span style={{ fontSize:13 }}>{item.name}</span>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:13, color:C.goldLight, fontWeight:"bold" }}>{item.qty} sold</div>
                    <div style={{ fontSize:11, color:C.muted }}>RM {item.revenue.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:13, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:12, fontWeight:700 }}>Sales by Table</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px,1fr))", gap:10, marginBottom:24 }}>
              {Object.entries(byTable).sort((a,b) => {
                const aNum = parseInt(a[0]); const bNum = parseInt(b[0]);
                return isNaN(aNum)||isNaN(bNum) ? String(a[0]).localeCompare(String(b[0])) : aNum-bNum;
              }).map(([tno,tdata]) => (
                <div key={tno} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:12, textAlign:"center" }}>
                  <div style={{ fontSize:14, color:C.goldLight, fontWeight:"bold", marginBottom:4 }}>{isTakeaway(tno)?takeawayLabel(tno):`Table ${tno}`}</div>
                  <div style={{ fontSize:13, color:C.gold, fontWeight:"bold" }}>RM {tdata.total.toFixed(2)}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{tdata.count} order{tdata.count>1?"s":""}</div>
                </div>
              ))}
            </div>
          </>}
        </>}
      </div>
    </div>
  );
}

function TableCard({ tableNo, data, paying, markPaid, onItemDone, cancelOrder, cardTab, setCardTab, printReceipt, setPayModal, setTableDetailModal, onSplitBill, onUndoSplit, selectMode, isSelected, onToggleSelect }) {
  const hasPending = data.pending.length>0;
  // Most recently placed order first, regardless of pending/done status
  const allOrders = [...data.done, ...data.pending].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  const drinkOrders = allOrders.filter(o => o.items.some(i => DRINK_CATEGORIES.includes(i.category)));
  const foodOrders = allOrders.filter(o => o.items.some(i => FOOD_CATEGORIES.includes(i.category)));

  return (
    <div style={{ background:C.panel, border:`2px solid ${hasPending?"#394c76":"#394c76"}`, borderRadius:14, overflow:"hidden" }}>

      {/* Header — tap to open full detail */}
      <div onClick={() => selectMode ? onToggleSelect(tableNo) : setTableDetailModal(tableNo)}
        style={{ background:hasPending?"#eef1f6":"#eef1f6", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
        <div className="hl-title" style={{ fontSize:20, fontWeight:800, color:hasPending?C.goldLight:"#394c76" }}>{isTakeaway(tableNo) ? takeawayLabel(tableNo) : `Table ${tableNo}`}</div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {data.pending.length>0 && <span style={{ background:"#e3e7f0", color:C.goldLight, borderRadius:6, padding:"3px 10px", fontSize:12, fontWeight:700 }}>{data.pending.length} pending</span>}
          {data.done.length>0 && <span style={{ background:"#eef1f6", color:"#394c76", borderRadius:6, padding:"3px 10px", fontSize:12, fontWeight:700 }}>{data.done.length} done</span>}
          <span style={{ color:C.muted, fontSize:16, marginLeft:4 }}>↗</span>
          {selectMode && (
            <input type="checkbox" checked={isSelected} readOnly
              style={{ width:22, height:22, marginLeft:4, pointerEvents:"none" }} />
          )}
        </div>
      </div>

      {/* Card tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:"#f4f6f9" }}>
        {[["drinks",`Drinks (${drinkOrders.length})`],["food",`Food (${foodOrders.length})`],["all","All"]].map(([key, label]) => (
          <button key={key} onClick={() => setCardTab(key)}
            style={btn({ flex:1, background:cardTab===key?(key==="drinks"?"#eef1f6":key==="food"?"#eef1f6":"#eef1f6"):"transparent",
              border:"none", borderBottom:cardTab===key?`3px solid ${key==="drinks"?"#394c76":key==="food"?C.gold:"#9a9083"}`:"3px solid transparent",
              color:cardTab===key?(key==="drinks"?"#394c76":key==="food"?C.goldLight:C.text):C.muted,
              padding:"13px 8px", fontSize:13, fontWeight:cardTab===key?"bold":"normal", borderRadius:0 })}>
            {label}
          </button>
        ))}
      </div>

      {/* DRINKS */}
      {(cardTab==="drinks" || cardTab==="all") && (
        <div style={{ padding:"14px 16px", borderBottom: cardTab==="all" ? `2px solid ${C.border}` : "none" }}>
          {cardTab==="all" && <div style={{ fontSize:11, color:"#394c76", fontWeight:"bold", letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Drinks</div>}
          {drinkOrders.length===0
            ? <div style={{ fontSize:13, color:C.border, fontStyle:"italic", padding:"8px 0" }}>No drinks ordered</div>
            : drinkOrders.map((order, oi) => {
                const isPending = order.status==="pending";
                return (
                  <div key={oi} style={{ marginBottom:12, paddingBottom:12, borderBottom: oi < drinkOrders.length-1 ? `1px solid #e3e7f0` : "none" }}>
                    {order.order_seq && <div style={{ marginBottom:6 }}><span style={{ background:C.gold, color:C.dark, borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:"bold" }}>#{order.order_seq}</span></div>}
                    {order.items.map((item, ii) => {
                      if (!DRINK_CATEGORIES.includes(item.category)) return null;
                      const done = itemDone(order, item);
                      return (
                      <div key={ii} style={{ padding:"8px 0", borderTop: ii>0 ? `1px solid #f0e9db` : "none", opacity:done?0.5:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                          <span style={{ color:done?"#394c76":C.text, fontSize:15, textDecoration:done?"line-through":"none" }}>
                            {done?"✅ ":""}{item.item_no && <span style={{ color:"#394c76", fontWeight:"bold", marginRight:5 }}>{item.item_no}</span>}
                            {item.name} <span style={{ color:C.gold, fontWeight:"bold", marginLeft:6 }}>×{item.qty}</span>
                          </span>
                          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                            <span style={{ color:"#394c76", fontWeight:"bold", fontSize:14, whiteSpace:"nowrap" }}>RM {(item.price*item.qty).toFixed(2)}</span>
                            {isPending && !done && (
                              <button onClick={() => onItemDone(order, ii)} style={btn({ background:"#394c76", border:"none", color:"#fff", padding:"8px 14px", fontSize:13, fontWeight:"bold" })}>Done</button>
                            )}
                          </div>
                        </div>
                        {item.is_takeaway && <div style={{ display:"inline-block", background:"#394c76", color:"#fff", borderRadius:6, padding:"3px 8px", marginTop:3, fontSize:11, fontWeight:"bold" }}>TAKEAWAY</div>}
                        {item.note && <div style={{ fontSize:12, color:"#394c76", background:"#eef1f6", borderRadius:6, padding:"3px 8px", marginTop:3 }}>{item.note}</div>}
                      </div>
                      );
                    })}
                    {getDrinkReq(order.special_request) && <div style={{ fontSize:13, color:C.gold, background:"#eef1f6", borderRadius:6, padding:"6px 10px", marginTop:6 }}>{getDrinkReq(order.special_request)}</div>}
                    <div style={{ display:"flex", gap:10, marginTop:10, alignItems:"center" }}>
                      <span style={{ fontSize:13, color:isPending?C.gold:"#394c76", fontWeight:"bold", flex:1 }}>{isPending?"Pending":"Served"} · {order.time}</span>
                      {isPending && (
                        <button onClick={() => cancelOrder(order.id)} style={btn({ background:"#fbeaea", border:"1px solid #e6c3c3", color:"#c0392b", padding:"12px 16px", fontSize:15, fontWeight:"bold", minHeight:50, minWidth:90 })}>✕ Cancel</button>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* FOOD */}
      {(cardTab==="food" || cardTab==="all") && (
        <div style={{ padding:"14px 16px", background:"#faf8f3", borderBottom:`1px solid ${C.border}` }}>
          {cardTab==="all" && <div style={{ fontSize:11, color:C.muted, fontWeight:"bold", letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Food (Kitchen)</div>}
          {foodOrders.length===0
            ? <div style={{ fontSize:13, color:C.border, fontStyle:"italic", padding:"8px 0" }}>No food ordered</div>
            : foodOrders.map((order, oi) => {
                const isPending = order.status==="pending";
                return (
                  <div key={oi} style={{ marginBottom:12, paddingBottom:12, borderBottom: oi < foodOrders.length-1 ? `1px solid #f0e9db` : "none" }}>
                    {order.items.map((item, ii) => {
                      if (!FOOD_CATEGORIES.includes(item.category)) return null;
                      const done = itemDone(order, item);
                      return (
                      <div key={ii} style={{ padding:"8px 0", borderTop: ii>0 ? `1px solid #f0e9db` : "none", opacity:done?0.5:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                          <span style={{ color:done?"#394c76":(isPending?C.muted:"#394c76"), fontSize:15, textDecoration:done?"line-through":"none" }}>
                            {done?"✅ ":""}{item.item_no && <span style={{ color:isPending?C.gold:"#394c76", fontWeight:"bold", marginRight:5 }}>{item.item_no}</span>}
                            {item.name} <span style={{ color:isPending?C.gold:"#394c76", marginLeft:6 }}>×{item.qty}</span>
                          </span>
                          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                            <span style={{ color:isPending?C.muted:"#394c76", fontSize:14, whiteSpace:"nowrap" }}>RM {(item.price*item.qty).toFixed(2)}</span>
                            {isPending && !done && (
                              <button onClick={() => onItemDone(order, ii)} style={btn({ background:"#394c76", border:"none", color:"#fff", padding:"8px 14px", fontSize:13, fontWeight:"bold" })}>Done</button>
                            )}
                          </div>
                        </div>
                        {item.is_takeaway && <div style={{ display:"inline-block", background:"#394c76", color:"#fff", borderRadius:6, padding:"3px 8px", marginTop:3, fontSize:11, fontWeight:"bold" }}>TAKEAWAY</div>}
                        {item.note && <div style={{ fontSize:12, color:"#394c76", background:"#eef1f6", borderRadius:6, padding:"3px 8px", marginTop:3 }}>{item.note}</div>}
                      </div>
                      );
                    })}
                    {getFoodReq(order.special_request) && <div style={{ fontSize:13, color:C.gold, background:"#eef1f6", borderRadius:6, padding:"6px 10px", marginTop:6 }}>{getFoodReq(order.special_request)}</div>}
                    <div style={{ display:"flex", gap:10, marginTop:10, alignItems:"center" }}>
                      <span style={{ fontSize:13, color:isPending?C.gold:"#394c76", fontWeight:"bold", flex:1 }}>{isPending?"Kitchen preparing":"Served"} · {order.time}</span>
                      {isPending && (
                        <button onClick={() => cancelOrder(order.id)} style={btn({ background:"#fbeaea", border:"1px solid #e6c3c3", color:"#c0392b", padding:"12px 16px", fontSize:15, fontWeight:"bold", minHeight:50, minWidth:90 })}>✕ Cancel</button>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* Footer */}
      <div style={{ background:"#f4f6f9", padding:"12px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:18, color:C.goldLight, fontWeight:"bold", marginBottom:12 }}>
          <span>TOTAL</span><span>RM {data.total.toFixed(2)}</span>
        </div>
        {!selectMode && (
          <>
            <button onClick={() => setPayModal({tableNo, data, method:"QR DuitNow", cashReceived:""})} disabled={paying===tableNo}
              style={btn({ width:"100%", background:"linear-gradient(150deg,#394c76,#2c3b5e)", border:"none", color:"#fff", padding:"15px 0", fontSize:16, fontWeight:"bold", cursor:"pointer", marginBottom:8, borderRadius:10, boxShadow:"0 4px 12px rgba(57,76,118,0.3)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 })}>
              <Icon name="card" size={17} color="#fff" /> Collect Payment
            </button>
            <button onClick={() => printReceipt(tableNo, data, null, null, null)}
              style={btn({ width:"100%", background:"#eef1f6", border:`1px solid ${C.border}`, color:C.text, padding:"10px 0", fontSize:13, fontWeight:"bold", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 })}>
              <Icon name="printer" size={15} color="#394c76" /> Print Bill (Preview)
            </button>
            {data.done.length > 0 && (
              <button onClick={() => onSplitBill(tableNo)}
                style={btn({ width:"100%", background:"#eef1f6", border:`1px solid ${C.border}`, color:"#394c76", padding:"10px 0", fontSize:13, fontWeight:"bold", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:8 })}>
                <Icon name="grid" size={15} color="#394c76" /> Split Bill
              </button>
            )}
            {/·B\d+$/.test(String(tableNo)) && (
              <button onClick={() => onUndoSplit(tableNo)}
                style={btn({ width:"100%", background:"#fbeaea", border:"1px solid #e6c3c3", color:"#c0392b", padding:"10px 0", fontSize:13, fontWeight:"bold", cursor:"pointer", marginTop:8 })}>
                ↩ Undo Split
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DetailModal({ tableNo, hasPending, pending, done, allOrders, drinkOrders, foodOrders, total, liveData, onItemDone, cancelOrder, printReceipt, setPayModal, setTableDetailModal }) {
  const [detailTab, setDetailTab] = useState("drinks");
  const ordersToShow = detailTab === "drinks" ? drinkOrders : detailTab === "food" ? foodOrders : allOrders;
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:C.bg, zIndex:9000, display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, boxShadow:"0 4px 16px rgba(57,76,118,0.25)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name={isTakeaway(tableNo)?"bag":"utensils"} size={19} color="#fff" /></div>
          <div>
            <div className="hl-title" style={{ fontSize:22, fontWeight:800, color:"#fff" }}>{isTakeaway(tableNo) ? takeawayLabel(tableNo) : `Table ${tableNo}`}</div>
            <div style={{ fontSize:12, color:"#aeb8cc", marginTop:2 }}>
              {pending.length > 0 && <span style={{ marginRight:12 }}>{pending.length} pending</span>}
              {done.length > 0 && <span>{done.length} done</span>}
            </div>
          </div>
        </div>
        <button onClick={() => setTableDetailModal(null)}
          style={btn({ background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", width:44, height:44, fontSize:20, borderRadius:50 })}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"#f4f6f9", borderBottom:`2px solid ${C.border}`, flexShrink:0 }}>
        {[["all","All"],["drinks",`Drinks (${drinkOrders.length})`],["food",`Food (${foodOrders.length})`]].map(([key,label]) => (
          <button key={key} onClick={() => setDetailTab(key)}
            style={btn({ flex:1, background:"transparent", border:"none", borderBottom:detailTab===key?`3px solid ${C.gold}`:"3px solid transparent", color:detailTab===key?C.goldLight:C.muted, padding:"12px 8px", fontSize:13, fontWeight:detailTab===key?"bold":"normal", borderRadius:0 })}>
            {label}
          </button>
        ))}
      </div>

      {/* Orders */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px" }}>
        {ordersToShow.length === 0
          ? <div style={{ textAlign:"center", color:C.muted, padding:40, fontSize:16 }}>No orders</div>
          : ordersToShow.map((order) => {
            const isPending = order.status === "pending";
            const isDrink = order.items.every(i => DRINK_CATEGORIES.includes(i.category));
            return (
              <div key={order.id} style={{ background:isPending?"#eef1f6":"#eef1f6", border:`2px solid ${isPending?C.gold:"#394c76"}`, borderRadius:14, padding:"14px 16px", marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {order.order_seq && <span style={{ background:C.gold, color:C.dark, borderRadius:6, padding:"2px 8px", fontSize:13, fontWeight:"bold" }}>#{order.order_seq}</span>}
                    <span style={{ color:C.muted, fontSize:13, display:"flex", alignItems:"center", gap:6 }}><Icon name={isDrink?"coffee":"hat"} size={13} color={C.muted} /> {order.time}</span>
                  </div>
                  <span style={{ background:isPending?"#394c76":"#394c76", color:"#fff", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:"bold" }}>
                    {isPending?"Pending":"Served"}
                  </span>
                </div>
                {order.items.map((item, ii) => {
                  const itemIsDone = itemDone(order, item);
                  return (
                  <div key={ii} style={{ marginBottom:8, opacity:itemIsDone?0.5:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:18, gap:8 }}>
                      <span style={{ color:itemIsDone?"#394c76":C.goldLight, fontWeight:"bold", textDecoration:itemIsDone?"line-through":"none" }}>
                        {itemIsDone?"✅ ":""}{item.item_no && <span style={{ color:C.gold, marginRight:6 }}>{item.item_no}</span>}
                        {item.name}
                      </span>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                        <span style={{ color:C.gold, fontWeight:"bold" }}>×{item.qty}</span>
                        {isPending && !itemIsDone && (
                          <button onClick={() => onItemDone(order, ii)}
                            style={btn({ background:"#394c76", border:"none", color:"#fff", padding:"10px 16px", fontSize:14, fontWeight:"bold" })}>Done</button>
                        )}
                      </div>
                    </div>
                    <div style={{ color:"#394c76", fontSize:15, marginTop:2 }}>RM {(item.price*item.qty).toFixed(2)}</div>
                    {item.is_takeaway && <div style={{ display:"inline-block", background:"#394c76", color:"#fff", borderRadius:6, padding:"3px 8px", marginTop:4, fontSize:12, fontWeight:"bold" }}>TAKEAWAY</div>}
                    {item.note && <div style={{ fontSize:13, color:"#394c76", background:"#eef1f6", borderRadius:8, padding:"5px 10px", marginTop:5 }}>{item.note}</div>}
                  </div>
                  );
                })}
                {order.special_request && (
                  <div style={{ fontSize:13, color:C.gold, background:"#eef1f6", borderRadius:8, padding:"7px 10px", marginTop:6 }}>{order.special_request}</div>
                )}
                {isPending && (
                  <div style={{ display:"flex", gap:10, marginTop:12 }}>
                    <button onClick={() => cancelOrder(order.id)}
                      style={btn({ flex:1, background:"#fbeaea", border:"1px solid #e6c3c3", color:"#c0392b", padding:"14px 0", fontSize:16, fontWeight:"bold" })}>✕ Cancel</button>
                  </div>
                )}
              </div>
            );
          })
        }
      </div>

      {/* Footer */}
      <div style={{ background:"#f4f6f9", padding:"14px 16px", borderTop:`2px solid ${C.border}`, flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:22, color:C.goldLight, fontWeight:"bold", marginBottom:12 }}>
          <span>TOTAL</span><span>RM {total.toFixed(2)}</span>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => printReceipt(tableNo, liveData, null, null, null)}
            style={btn({ flex:1, background:"#eef1f6", border:`1px solid ${C.border}`, color:C.text, padding:"14px 0", fontSize:14, fontWeight:"bold", display:"flex", alignItems:"center", justifyContent:"center", gap:7 })}>
            <Icon name="printer" size={15} color="#394c76" /> Print Bill
          </button>
          <button onClick={() => { setTableDetailModal(null); setPayModal({tableNo, data:liveData, method:"QR DuitNow", cashReceived:""}); }}
            style={btn({ flex:2, background:"linear-gradient(150deg,#394c76,#2c3b5e)", border:"none", color:"#fff", padding:"14px 0", fontSize:16, fontWeight:"bold", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", gap:8 })}>
            <Icon name="card" size={17} color="#fff" /> Collect Payment
          </button>
        </div>
      </div>
    </div>
  );
}

function SplitBillModal({ tableNo, tableOrders, allTableNos, onClose, onSplitOff }) {
  const doneOrders = tableOrders.filter(o => o.status === "done");
  const pendingOrders = tableOrders.filter(o => o.status === "pending");
  const masterItems = doneOrders.flatMap(o => o.items.map((item, itemIdx) => ({ key:`${o.id}_${itemIdx}`, ...item })));

  const [buckets, setBuckets] = useState([{ label:"Bill A", assigned:{} }, { label:"Bill B", assigned:{} }]);
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);

  const assignedElsewhere = (key) => buckets.reduce((s,b) => s + (b.assigned[key]||0), 0);
  const remaining = (item) => item.qty - assignedElsewhere(item.key);

  const adjust = (bucketIdx, item, delta) => {
    if (delta > 0 && remaining(item) <= 0) return;
    setBuckets(prev => prev.map((b, i) => {
      if (i !== bucketIdx) return b;
      const current = b.assigned[item.key] || 0;
      const next = current + delta;
      if (next < 0) return b;
      const assigned = { ...b.assigned };
      if (next === 0) delete assigned[item.key]; else assigned[item.key] = next;
      return { ...b, assigned };
    }));
  };

  const bucketTotal = (bucket) => masterItems.reduce((s,item) => s + (bucket.assigned[item.key]||0)*item.price, 0);
  const anyAssigned = buckets.some(b => Object.values(b.assigned).some(q => q > 0));
  const addBucket = () => setBuckets(prev => [...prev, { label:`Bill ${String.fromCharCode(65+prev.length)}`, assigned:{} }]);
  const removeBucket = (idx) => {
    if (buckets.length <= 2) return;
    setBuckets(prev => prev.filter((_, i) => i !== idx).map((b, i) => ({ ...b, label:`Bill ${String.fromCharCode(65+i)}` })));
    setActiveTab(prev => Math.min(prev > idx ? prev - 1 : prev, buckets.length - 2));
  };

  const finalize = async () => {
    if (!anyAssigned || saving) return;
    setSaving(true);
    const assignBuckets = buckets.map(b => ({
      label: b.label,
      assigned: Object.fromEntries(Object.entries(b.assigned).filter(([,q]) => q>0)),
    }));
    await finalizeSplit({ tableNo, doneOrders, buckets: assignBuckets, allTableNos });
    setSaving(false);
    setBuckets([{ label:"Bill A", assigned:{} }, { label:"Bill B", assigned:{} }]);
    onSplitOff();
  };

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:C.bg, zIndex:9500, display:"flex", flexDirection:"column" }}>
      <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div className="hl-title" style={{ fontSize:20, fontWeight:800, color:"#fff" }}>Split Bill — {isTakeaway(tableNo) ? takeawayLabel(tableNo) : `Table ${tableNo}`}</div>
        <button onClick={onClose} style={btn({ background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", width:40, height:40, fontSize:18, borderRadius:50 })}>✕</button>
      </div>

      {pendingOrders.length > 0 && (
        <div style={{ background:"#fbeaea", color:"#c0392b", padding:"8px 20px", fontSize:12, flexShrink:0 }}>
          {pendingOrders.flatMap(o=>o.items).length} item(s) still waiting on the kitchen — only served items can be split.
        </div>
      )}

      <div className="hl-split-tabs" style={{ background:"#f4f6f9", borderBottom:`2px solid ${C.border}`, flexShrink:0 }}>
        {buckets.map((b, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            style={btn({ flex:1, background:"transparent", border:"none", borderBottom:activeTab===i?`3px solid ${C.gold}`:"3px solid transparent", color:activeTab===i?"#394c76":C.muted, padding:"12px 8px", fontSize:13, fontWeight:activeTab===i?"bold":"normal" })}>
            {b.label} · RM {bucketTotal(b).toFixed(2)}
          </button>
        ))}
      </div>

      <div className="hl-split-buckets" style={{ flex:1, display:"flex", flexDirection:"row", gap:12, padding:16, overflow:"auto" }}>
        {buckets.map((bucket, bi) => (
          <div key={bi} className={`hl-split-bucket-col${bi===activeTab?" is-active":""}`} style={{ flex:"1 1 260px", display:"flex", flexDirection:"column", background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden", minWidth:240 }}>
            <div style={{ background:"#eef1f6", padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
              <span style={{ fontWeight:"bold", color:"#394c76" }}>{bucket.label}</span>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontWeight:"bold", color:C.goldLight }}>RM {bucketTotal(bucket).toFixed(2)}</span>
                <button onClick={() => removeBucket(bi)} disabled={buckets.length <= 2} title="Remove this bill"
                  style={btn({ width:40, height:40, borderRadius:50, border:"none", background:buckets.length<=2?"#ddd":"#f6d3d3", color:buckets.length<=2?"#999":"#c0392b", fontSize:18, fontWeight:"bold", cursor:buckets.length<=2?"default":"pointer", padding:0, lineHeight:"40px" })}>✕</button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"10px 14px" }}>
              {masterItems.length === 0 && <div style={{ color:C.muted, fontSize:13, fontStyle:"italic" }}>No served items yet to split</div>}
              {masterItems.map(item => {
                const assignedQty = bucket.assigned[item.key] || 0;
                const canAdd = remaining(item) > 0;
                return (
                  <div key={item.key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f0f0f0" }}>
                    <div>
                      <div style={{ fontSize:14, color:"#2b3346" }}>{item.name}</div>
                      <div style={{ fontSize:11, color:C.muted }}>RM {item.price.toFixed(2)} · {remaining(item)} unassigned of {item.qty}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <button onClick={() => adjust(bi, item, -1)} disabled={assignedQty===0}
                        style={btn({ width:30, height:30, borderRadius:8, border:`1px solid ${C.border}`, background:"#fff", color:"#394c76", fontSize:16, cursor:assignedQty===0?"default":"pointer", opacity:assignedQty===0?0.4:1 })}>−</button>
                      <span style={{ minWidth:18, textAlign:"center", fontWeight:"bold" }}>{assignedQty}</span>
                      <button onClick={() => adjust(bi, item, 1)} disabled={!canAdd}
                        style={btn({ width:30, height:30, borderRadius:8, border:"none", background:canAdd?"#394c76":"#ddd", color:"#fff", fontSize:16, cursor:canAdd?"pointer":"default" })}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background:"#f4f6f9", padding:"14px 16px", borderTop:`2px solid ${C.border}`, flexShrink:0, display:"flex", gap:10 }}>
        <button onClick={addBucket} style={btn({ background:"#eef1f6", border:`1px solid ${C.border}`, color:"#394c76", padding:"14px 18px", fontSize:14, fontWeight:"bold" })}>+ Add Bill</button>
        <button onClick={finalize} disabled={!anyAssigned || saving}
          style={btn({ flex:1, background:anyAssigned && !saving ? "linear-gradient(150deg,#394c76,#2c3b5e)" : "#ccc", border:"none", color:"#fff", padding:"14px 0", fontSize:16, fontWeight:"bold", borderRadius:10, cursor:anyAssigned && !saving ? "pointer" : "default" })}>
          {saving ? "Splitting…" : "Finalize Split"}
        </button>
      </div>
    </div>
  );
}

// Returns the next unused "<tableNo>·B{n}" suffix (n starts at 2) so a
// table can be split more than once without colliding with an existing,
// still-unpaid sub-bill.
function nextSplitSuffix(tableNo, allTableNos) {
  const prefix = `${tableNo}·B`;
  let max = 1;
  allTableNos.forEach(t => {
    if (String(t).startsWith(prefix)) {
      const n = parseInt(String(t).slice(prefix.length));
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return `${prefix}${max + 1}`;
}

// Splits `doneOrders` (a table's served-only order rows) into one new
// `orders` row per bucket that has at least one assigned unit, and shrinks
// or deletes the source rows accordingly. `buckets` is
// [{ label, assigned: { "<orderId>_<itemIdx>": qty, ... } }, ...].
// Returns the new table_no created for each active bucket, in order.
async function finalizeSplit({ tableNo, doneOrders, buckets, allTableNos }) {
  const activeBuckets = buckets.filter(b => Object.values(b.assigned).some(q => q > 0));
  if (activeBuckets.length === 0) return [];

  const removedByKey = {};
  activeBuckets.forEach(b => {
    Object.entries(b.assigned).forEach(([key, qty]) => {
      if (qty > 0) removedByKey[key] = (removedByKey[key] || 0) + qty;
    });
  });

  for (const order of doneOrders) {
    let changed = false;
    const newItems = [];
    order.items.forEach((item, itemIdx) => {
      const key = `${order.id}_${itemIdx}`;
      const removedQty = removedByKey[key] || 0;
      if (removedQty > 0) changed = true;
      const remainingQty = item.qty - removedQty;
      if (remainingQty > 0) newItems.push({ ...item, qty: remainingQty });
    });
    if (!changed) continue;
    if (newItems.length === 0) {
      await supabase.from("orders").delete().eq("id", order.id);
    } else {
      const newTotal = newItems.reduce((s, i) => s + i.price * i.qty, 0);
      await supabase.from("orders").update({ items: newItems, total: newTotal, subtotal: newTotal }).eq("id", order.id);
    }
  }

  const newTableNos = [];
  let usedTableNos = [...allTableNos];
  for (const bucket of activeBuckets) {
    const bucketItems = doneOrders.flatMap(order => order.items.map((item, itemIdx) => {
      const qty = bucket.assigned[`${order.id}_${itemIdx}`] || 0;
      return qty > 0 ? { ...item, qty } : null;
    }).filter(Boolean));
    const bucketTotal = bucketItems.reduce((s, i) => s + i.price * i.qty, 0);
    const newTableNo = nextSplitSuffix(tableNo, usedTableNos);
    usedTableNos = [...usedTableNos, newTableNo];
    const now = new Date();
    const time = now.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
    await supabase.from("orders").insert({
      table_no: newTableNo, items: bucketItems, subtotal: bucketTotal, tax: 0,
      total: bucketTotal, status: "done", special_request: null, time, order_seq: null,
    });
    newTableNos.push(newTableNo);
  }
  return newTableNos;
}

// Reverses a split: re-inserts each of a sub-bill's order rows under the
// original table_no, then deletes the sub-bill rows. `rows` are the
// sub-bill's own order rows (already in memory from `byTable`), so this
// takes no extra round trip to read them back.
async function undoSplit(subTableNo, rows) {
  const originalTableNo = String(subTableNo).split("·")[0];
  for (const row of rows) {
    await supabase.from("orders").insert({
      table_no: originalTableNo, items: row.items, subtotal: row.subtotal, tax: row.tax || 0,
      total: row.total, status: row.status, special_request: row.special_request,
      time: row.time, order_seq: row.order_seq,
    });
    await supabase.from("orders").delete().eq("id", row.id);
  }
}

const itemDone = (order, item) => order.status === "done" || item.done === true;

async function markItemDone(order, itemIndex) {
  const items = order.items.map((it, i) => i === itemIndex ? { ...it, done: true } : it);
  const allDone = items.every(it => it.done === true);
  await supabase.from("orders").update({
    items,
    status: allDone ? "done" : order.status,
  }).eq("id", order.id);
}

function CashierScreen({ goHome }) {
  const [orders, setOrders] = useState([]);
  const [serviceCharge, setServiceCharge] = useState(10);
  const [pointsEarnRate, setPointsEarnRate] = useState(1);
  const [pointsEarnBasis, setPointsEarnBasis] = useState("final_total");
  useEffect(() => {
    const load = () => supabase.from("app_settings").select("service_charge,points_earn_rate,points_earn_basis").eq("id", 1).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setServiceCharge(data.service_charge);
        setPointsEarnRate(data.points_earn_rate ?? 1);
        setPointsEarnBasis(data.points_earn_basis || "final_total");
      });
    load();
    const ch = supabase.channel("app-settings-cashier-watch")
      .on("postgres_changes", { event:"*", schema:"public", table:"app_settings" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);
  // Rewards Catalog — what a member can redeem points for at checkout
  const [rewards, setRewards] = useState([]);
  useEffect(() => {
    const load = () => supabase.from("rewards").select("*").eq("is_active", true).order("points_cost",{ ascending:true })
      .then(({ data }) => setRewards(data||[]));
    load();
    const ch = supabase.channel("rewards-cashier-watch")
      .on("postgres_changes", { event:"*", schema:"public", table:"rewards" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);
  // Loyalty member attached to the bill currently being paid — reset whenever payModal closes/reopens
  const [payMember, setPayMember] = useState(null); // {id, name, phone, points}
  const [showMemberSearchModal, setShowMemberSearchModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [memberLookupMsg, setMemberLookupMsg] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState(null);
  const [showJoinQR, setShowJoinQR] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberPhoneCountry, setNewMemberPhoneCountry] = useState("MY");
  const [payModal, setPayModalRaw] = useState(null);
  const setPayModal = (v) => {
    setPayModalRaw(v);
    if (!v) {
      setPayMember(null); setShowMemberSearchModal(false); setMemberSearchQuery(""); setMemberSearchResults([]); setMemberLookupMsg("");
      setSelectedRewardId(null); setShowJoinQR(false); setNewMemberName(""); setNewMemberPhone("");
    } else {
      // Pre-fill whatever the customer already identified/picked on their own phone —
      // cashier can still remove/change either before confirming.
      supabase.from("table_sessions").select("member_id, pending_reward_id").eq("table_no", String(v.tableNo)).maybeSingle()
        .then(({ data }) => {
          if (data?.member_id) {
            supabase.from("members").select("*").eq("id", data.member_id).maybeSingle()
              .then(({ data:m }) => { if (m) setPayMember(m); });
          }
          if (data?.pending_reward_id) setSelectedRewardId(data.pending_reward_id);
        });
    }
  };
  // Live search as the cashier types — matches partial name OR partial phone,
  // so there's no need to type a full number (or worry about how it was
  // formatted at signup). Two separate queries merged client-side, rather
  // than one .or() filter, so the typed text never has to be escaped for
  // PostgREST's filter syntax.
  useEffect(() => {
    if (!showMemberSearchModal) return;
    const q = memberSearchQuery.trim();
    if (!q) { setMemberSearchResults([]); return; }
    const phoneDigits = q.replace(/\D/g,"").replace(/^0+/,"");
    const tasks = [supabase.from("members").select("*").ilike("name", `%${q}%`).limit(20)];
    if (phoneDigits) tasks.push(supabase.from("members").select("*").ilike("phone", `%${phoneDigits}%`).limit(20));
    Promise.all(tasks).then(results => {
      const merged = {};
      results.forEach(r => (r.data||[]).forEach(m => { merged[m.id] = m; }));
      setMemberSearchResults(Object.values(merged));
    });
  }, [memberSearchQuery, showMemberSearchModal]);
  const selectMember = (m) => {
    setPayMember(m); setShowMemberSearchModal(false); setMemberSearchQuery(""); setMemberSearchResults([]);
  };
  const addNewMember = async () => {
    const dial = PHONE_COUNTRIES.find(c=>c.code===newMemberPhoneCountry).dial;
    const name = newMemberName.trim(), phone = composePhone(newMemberPhone, dial);
    if (name.length < 2 || phone.length < 6) { setMemberLookupMsg("Enter a valid name and phone."); return; }
    const { data, error } = await supabase.from("members").insert({ name, phone }).select().maybeSingle();
    if (error) { setMemberLookupMsg(error.code === "23505" ? "This phone is already a member — search instead." : "Could not add member."); return; }
    setPayMember(data); setNewMemberName(""); setNewMemberPhone(""); setMemberLookupMsg(""); setShowJoinQR(false);
  };
  const printJoinSlip = () => {
    const url = `${window.location.origin}${window.location.pathname}?joinMember=1`;
    const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=10`;
    const win = window.open("","_blank","width=380,height=520");
    if (!win || win.closed) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Join as Member</title><style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:"Courier New",monospace;text-align:center;padding:24px 16px;}
      img{width:250px;height:250px;margin:14px auto;display:block;}
      h2{font-size:17px;letter-spacing:2px;margin-bottom:8px;}
      p{font-size:12px;color:#333;margin:0 auto 6px;max-width:260px;}
      .close-btn{position:fixed;top:12px;right:12px;background:#c0392b;color:#fff;border:none;border-radius:50%;width:40px;height:40px;font-size:18px;cursor:pointer;}
      @media print{.no-print{display:none;}body{padding:0;}}
    </style></head><body>
    <button class="close-btn no-print" onclick="window.close()">✕</button>
    <h2>HOTO LOUNGE</h2>
    <p>Scan to join as a member — earn &amp; redeem points on every visit!</p>
    <img src="${qrImg}" alt="Join QR" />
    <div class="no-print" style="margin-top:16px;"><button onclick="window.print()" style="padding:10px 20px;font-size:14px;cursor:pointer;">🖨️ Print</button></div>
    </body></html>`);
    win.document.close();
  };
  const [waiterCalls, setWaiterCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [splitBillModal, setSplitBillModal] = useState(null); // tableNo, or null
  const [selectMode, setSelectMode] = useState(false);
  const [selectedForCombine, setSelectedForCombine] = useState([]);
  const [combineModal, setCombineModal] = useState(null); // { tableNos, method, cashReceived }
  const toggleSelectForCombine = (tableNo) => {
    setSelectedForCombine(prev => prev.includes(tableNo) ? prev.filter(t => t!==tableNo) : [...prev, tableNo]);
  };

  const [tableDetailModal, setTableDetailModal] = useState(null); // tableNo only — reads live orders
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem("c_sound") !== "off");
  const [filterTab, setFilterTab] = useState("all");
  const [selectedTable, setSelectedTable] = useState(null);
  const [cardTabs, setCardTabs] = useState({});
  const prevDrinkCount = useRef(0);
  const prevOrderIds = useRef(new Set());
  const prevWaiterCount = useRef(0);
  const soundOnRef = useRef(localStorage.getItem("c_sound") !== "off");

  const [voiceOn, setVoiceOn] = useState(() => localStorage.getItem("c_voice") === "on");
  const [voiceLang, setVoiceLang] = useState(() => localStorage.getItem("c_voice_lang") || "en");
  const voiceOnRef = useRef(localStorage.getItem("c_voice") === "on");
  const voiceLangRef = useRef(localStorage.getItem("c_voice_lang") || "en");

  const toggleVoice = () => {
    setVoiceOn(v => {
      const next = !v;
      voiceOnRef.current = next;
      localStorage.setItem("c_voice", next ? "on" : "off");
      return next;
    });
  };
  const toggleVoiceLang = () => {
    setVoiceLang(l => {
      const next = l === "en" ? "zh" : "en";
      voiceLangRef.current = next;
      localStorage.setItem("c_voice_lang", next);
      return next;
    });
  };

  const audioCtxRef = useRef(null);
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Unlock AudioContext on first user interaction
  useEffect(() => {
    const unlock = () => { try { getAudioCtx(); } catch(e) {} };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => { window.removeEventListener("click", unlock); window.removeEventListener("touchstart", unlock); };
  }, []);

  const speak = (tableNo, type = "drink") => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance();
      const isTW = isTakeaway(tableNo);
      if (voiceLangRef.current === "zh") {
        u.lang = "zh-TW";
        const loc = isTW ? tableNo : `${tableNo}号桌`;
        u.text = type === "waiter" ? `${loc}，需要服务员` : `新饮料订单，${loc}`;
      } else {
        u.lang = "en-US";
        const loc = isTW ? takeawayLabel(tableNo) : `Table ${tableNo}`;
        u.text = type === "waiter" ? `Waiter requested, ${loc}` : `New drink order, ${loc}`;
      }
      u.rate = 0.95; u.pitch = 1.1; u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch(e) {}
  };

  const playBeep = (freqs, delays) => {
    try {
      const ctx = getAudioCtx();
      delays.forEach((delay, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freqs[i % freqs.length]; osc.type = "sine";
        gain.gain.setValueAtTime(1.0, ctx.currentTime + delay / 1000);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.5);
        osc.start(ctx.currentTime + delay / 1000);
        osc.stop(ctx.currentTime + delay / 1000 + 0.5);
      });
    } catch(e) {}
  };

  const playAlert = (tableNo) => {
    if (soundOnRef.current) playBeep([660], [0, 200, 400]);
    if (voiceOnRef.current && tableNo) speak(tableNo, "drink");
  };

  const playWaiterAlert = (tableNo) => {
    if (soundOnRef.current) playBeep([880, 550], [0, 250, 500, 750]);
    if (voiceOnRef.current && tableNo) speak(tableNo, "waiter");
  };

  const fetchAll = async () => {
    const { data } = await supabase.from("orders").select("*").in("status",["pending","done"]).order("created_at",{ascending:true});
    const { data:w } = await supabase.from("waiter_calls").select("*");
    const newOrders = data||[];
    const newWaiters = w||[];
    setWaiterCalls(newWaiters);

    // Find truly NEW pending drink orders (not seen before)
    const pendingDrinkOrders = newOrders.filter(o => o.status==="pending" && o.items.some(i => DRINK_CATEGORIES.includes(i.category)));
    const newPendingDrinks = pendingDrinkOrders.filter(o => !prevOrderIds.current.has(o.id));
    if ((soundOnRef.current || voiceOnRef.current) && newPendingDrinks.length > 0) {
      // Announce the actual new order's table
      playAlert(newPendingDrinks[newPendingDrinks.length-1].table_no);
    }

    // Waiter calls
    if ((soundOnRef.current || voiceOnRef.current) && newWaiters.length > prevWaiterCount.current) {
      const newWaiter = newWaiters[newWaiters.length-1];
      playWaiterAlert(newWaiter?.table_no);
    }

    // Update tracked IDs
    prevOrderIds.current = new Set(newOrders.map(o => o.id));
    prevDrinkCount.current = pendingDrinkOrders.length;
    prevWaiterCount.current = newWaiters.length;
    setOrders(newOrders);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch1 = supabase.channel("cashier-ch").on("postgres_changes",{event:"*",schema:"public",table:"orders"},fetchAll).subscribe();
    const ch2 = supabase.channel("cashier-waiter-ch").on("postgres_changes",{event:"*",schema:"public",table:"waiter_calls"},fetchAll).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, []);

  const byTable = {};
  orders.forEach(o => {
    if (!byTable[o.table_no]) byTable[o.table_no]={pending:[],done:[],total:0};
    byTable[o.table_no][o.status].push(o);
    byTable[o.table_no].total+=o.total;
  });
  const activeTables = Object.entries(byTable).sort((a,b) => {
    const aLatest = Math.max(...[...a[1].pending,...a[1].done].map(o => new Date(o.created_at||0).getTime()));
    const bLatest = Math.max(...[...b[1].pending,...b[1].done].map(o => new Date(o.created_at||0).getTime()));
    return bLatest - aLatest;
  });
  // Auto-clear selectedTable if it's no longer active
  useEffect(() => {
    if (selectedTable && !byTable[selectedTable]) setSelectedTable(null);
  }, [orders]);
  const pendingTables = activeTables.filter(([,tbl]) => tbl.pending.length > 0);
  const doneTables = activeTables.filter(([,tbl]) => tbl.pending.length === 0);
  const tabFiltered = filterTab==="pending" ? pendingTables : filterTab==="done" ? doneTables : activeTables;
  const displayTables = selectedTable ? tabFiltered.filter(([tno]) => String(tno)===String(selectedTable)) : tabFiltered;

  const markPaid = async (tableNo, paymentMethod="Cash", memberId=null) => {
    setPaying(tableNo);
    const sessionId = "paid_" + Date.now();
    const paidAt = new Date().toISOString();
    // Only update status — paid_session_id/paid_at columns may not exist in DB
    await supabase.from("orders").update({status:"paid", member_id:memberId}).eq("table_no",tableNo).in("status",["pending","done"]);
    // member_id/pending_reward_id reset to null so the next customer at this table doesn't inherit this one's identity/pick
    await supabase.from("table_sessions").upsert({table_no:String(tableNo), session_id:sessionId, updated_at:paidAt, member_id:null, pending_reward_id:null});
    setPaying(null); fetchAll();
  };

  const markPaidMulti = async (tableNos, paymentMethod="Cash", memberId=null) => {
    setPaying("combine");
    const paidAt = new Date().toISOString();
    for (const tno of tableNos) {
      const sessionId = "paid_" + Date.now();
      await supabase.from("orders").update({status:"paid", member_id:memberId}).eq("table_no",tno).in("status",["pending","done"]);
      await supabase.from("table_sessions").upsert({table_no:String(tno), session_id:sessionId, updated_at:paidAt, member_id:null, pending_reward_id:null});
    }
    setPaying(null); fetchAll();
  };

  const printReceipt = (tableNo, data, paymentMethod=null, cashReceived=null, changeAmt=null, discount=0, rewardName=null) => {
    const charge = serviceCharge;
    const subtotal = data.total;
    const chargeAmt = +(subtotal * charge / 100).toFixed(2);
    const grandTotal = +(subtotal + chargeAmt).toFixed(2);
    const netTotal = +(grandTotal - (discount||0)).toFixed(2);
    // Malaysian rounding to nearest 0.05
    const rounded = +(Math.round(netTotal * 20) / 20).toFixed(2);
    const allOrders = [...(data.pending||[]), ...(data.done||[])];
    const allItems = allOrders.flatMap(o => o.items);
    const now = new Date();
    const dateStr = now.toLocaleString("en-MY",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Asia/Kuala_Lumpur"});
    const receiptNo = "#"+now.getFullYear().toString().slice(-2)+String(now.getMonth()+1).padStart(2,"0")+Date.now().toString().slice(-5);
    const isTW = String(tableNo).startsWith("TW-");
    const isST = String(tableNo).startsWith("ST-");
    const orderType = isTW ? "Takeaway (Pack & Go)" : isST ? "Takeaway (Eat Here)" : "Dine In";
    const serviceArea = isTW ? `Takeaway #${tableNo}` : isST ? `Eat Here #${tableNo}` : `Table ${tableNo}`;
    const itemRows = allItems.map(i=>`
      <div class="item-name">${i.name}</div>
      <div class="row"><span>${parseFloat(i.price).toFixed(2)}</span><span>${i.qty}</span><span>${(i.price*i.qty).toFixed(2)}</span></div>
      <div class="divider"></div>`).join("");
    const win = window.open("","_blank","width=380,height=750");
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:"Courier New",monospace;font-size:12px;width:290px;margin:0 auto;padding:12px 8px;}
      .center{text-align:center;}.bold{font-weight:bold;font-size:13px;}
      .logo{font-size:17px;font-weight:bold;letter-spacing:2px;}
      .divider{border-top:1px dashed #000;margin:5px 0;}
      .row{display:flex;justify-content:space-between;margin:2px 0;}
      .grand{font-size:14px;font-weight:bold;}
      .item-name{font-weight:bold;margin-top:4px;}
      .close-btn{position:fixed;top:12px;right:12px;background:#c0392b;color:#fff;border:none;border-radius:50%;width:44px;height:44px;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);z-index:999;}
      .btn-row{display:flex;gap:8px;margin-top:12px;}
      .btn-row button{flex:1;padding:12px;font-size:15px;cursor:pointer;font-family:monospace;border:none;border-radius:6px;}
      @media print{.no-print{display:none;}body{width:100%;}.close-btn{display:none;}}
    </style></head><body>
    <button class="close-btn no-print" onclick="window.close()">✕</button>
    <div class="center">
      <div class="logo">HOTO LOUNGE</div>
      <div style="font-size:10px;">CAFE · BAR · LOUNGE</div>
      <div>20, Jalan Ambong Kiri 1, Kepong</div>
      <div>Baru 52100 Kuala Lumpur</div>
      <div>TIN: C60634413060</div>
      <div>+60182868126</div>
    </div>
    <div class="divider"></div>
    <div>Receipt: ${receiptNo}</div>
    <div>Service area: ${serviceArea}</div>
    <div>Order type: ${orderType}</div>
    <div>Date: ${dateStr}</div>
    ${paymentMethod ? `<div>Payment type: ${paymentMethod}</div>` : ""}
    <div class="divider"></div>
    <div class="row bold"><span>Item &amp; Price</span><span>Qty</span><span>Total(MYR)</span></div>
    <div class="divider"></div>
    ${itemRows}
    <div class="row bold"><span>Subtotal</span><span></span><span>${subtotal.toFixed(2)}</span></div>
    <div class="divider"></div>
    ${charge>0?`<div class="row"><span>+Service Charge, ${charge}%</span><span></span><span>${chargeAmt.toFixed(2)}</span></div><div class="divider"></div>`:""}
    ${rewardName?`<div class="row"><span>Redeemed: ${rewardName}</span><span></span><span>${discount>0?"-"+discount.toFixed(2):"FREE"}</span></div><div class="divider"></div>`:discount>0?`<div class="row"><span>-Loyalty Discount</span><span></span><span>${discount.toFixed(2)}</span></div><div class="divider"></div>`:""}
    <div class="row grand"><span>Grand total</span><span></span><span>${parseFloat(rounded).toFixed(2)}</span></div>
    <div class="divider"></div>
    ${paymentMethod ? `
      <div class="row"><span>${paymentMethod}</span><span></span><span>${cashReceived ? parseFloat(cashReceived).toFixed(2) : parseFloat(rounded).toFixed(2)}</span></div>
      ${changeAmt !== null && changeAmt >= 0 ? `<div class="row bold"><span>Change</span><span></span><span>${parseFloat(changeAmt).toFixed(2)}</span></div>` : ""}
      <div class="divider"></div>
    ` : ""}
    <div class="center">
      <div>Goods Sold Are Not Returnable</div>
      <div>Thank You and Come Again!</div>
    </div>
    <br/>
    <div class="btn-row no-print">
      <button onclick="window.close()" style="background:#eee;color:#333;">✕ Close</button>
      <button onclick="window.print()" style="background:#333;color:#fff;">🖨️ Print</button>
    </div>
    </body></html>`);
    win.document.close();
  };

  const cancelOrder = async (orderId) => {
    await supabase.from("orders").update({status:"cancelled"}).eq("id",orderId);
    fetchAll();
  };

  const handleItemDone = async (order, itemIndex) => {
    await markItemDone(order, itemIndex);
    fetchAll();
  };

  const dismissWaiter = async (tableNo) => {
    await supabase.from("waiter_calls").delete().eq("table_no", tableNo);
    fetchAll();
  };

  const handleUndoSplit = async (tableNo) => {
    const rows = [...(byTable[tableNo]?.pending||[]), ...(byTable[tableNo]?.done||[])];
    await undoSplit(tableNo, rows);
    fetchAll();
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      {payModal && (() => {
        const charge = serviceCharge;
        const subtotal = payModal.data.total;
        const chargeAmt = +(subtotal * charge / 100).toFixed(2);
        const grandTotal = +(subtotal + chargeAmt).toFixed(2);
        const selectedReward = payMember ? rewards.find(r => r.id === selectedRewardId) || null : null;
        const discount = selectedReward && selectedReward.reward_type === "discount" ? Math.min(parseFloat(selectedReward.discount_amount)||0, grandTotal) : 0;
        const netTotal = +(grandTotal - discount).toFixed(2);
        const rounded = +(Math.round(netTotal * 20) / 20).toFixed(2);
        const roundingDiff = +(rounded - netTotal).toFixed(2);
        const cash = parseFloat(payModal.cashReceived)||0;
        const change = +(cash - rounded).toFixed(2);
        const canConfirm = payModal.method!=="Cash" || (!!payModal.cashReceived && cash >= rounded);
        const tableLabel = isTakeaway(payModal.tableNo) ? takeawayLabel(payModal.tableNo) : `Table ${payModal.tableNo}`;
        const orderType = String(payModal.tableNo).startsWith("TW-") ? "Takeaway (Pack & Go)" : String(payModal.tableNo).startsWith("ST-") ? "Takeaway (Eat Here)" : "Dine In";
        return (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
            <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:420, color:"#1a1a1a", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.5)", margin:"auto" }}>

              {/* Header */}
              <div style={{ background:"linear-gradient(135deg,#394c76,#2c3b5e)", padding:"20px 24px" }}>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.75)", fontFamily:"Georgia,serif" }}>{orderType}</div>
                <div style={{ fontSize:22, fontWeight:"bold", color:"#fff", fontFamily:"Georgia,serif", marginTop:2 }}>💳 {tableLabel}</div>
                <div style={{ fontSize:32, fontWeight:"bold", color:"#fff", marginTop:6, fontFamily:"Georgia,serif" }}>RM {parseFloat(rounded).toFixed(2)}</div>
              </div>

              <div style={{ padding:"20px 24px" }}>
                {/* Payment method selector */}
                <div style={{ fontSize:11, color:"#888", marginBottom:10, fontFamily:"Georgia,serif", fontWeight:"bold", letterSpacing:1 }}>SELECT PAYMENT METHOD</div>
                <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                  {[["💵","Cash"],["📱","QR DuitNow"],["💳","Credit Card"]].map(([icon,method]) => {
                    const active = payModal.method===method;
                    return (
                    <button key={method} onClick={() => setPayModal(m=>({...m, method, cashReceived:""}))}
                      style={{ flex:1, background:active?"#eef1f6":"#f7f8fa", border:`2px solid ${active?"#394c76":"#e4e7ec"}`, color:active?"#394c76":"#9aa0ac", padding:"12px 4px", fontSize:11, fontWeight:"bold", borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", lineHeight:1.6, transition:"all 0.15s" }}>
                      <div style={{ fontSize:22 }}>{icon}</div>{method}
                    </button>
                    );
                  })}
                </div>

                {/* Member / Loyalty */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:13, color:"#394c76", marginBottom:8, fontFamily:"Georgia,serif", fontWeight:"bold" }}>🎉 Ask: Is the customer a member?</div>
                  {!payMember ? (
                    <>
                      <button onClick={() => setShowMemberSearchModal(true)}
                        style={{ width:"100%", display:"flex", alignItems:"center", gap:8, background:"#f7f8fa", border:"1px solid #e4e7ec", color:"#888", borderRadius:8, padding:"10px 12px", fontSize:14, fontFamily:"Georgia,serif", cursor:"pointer", textAlign:"left" }}>
                        🔍 Search by name or phone…
                      </button>
                      <button onClick={() => setShowJoinQR(true)}
                        style={{ marginTop:8, width:"100%", background:"#f7f8fa", border:"1px solid #e4e7ec", color:"#394c76", fontSize:13, fontWeight:"bold", borderRadius:8, padding:"9px 0", cursor:"pointer", fontFamily:"Georgia,serif" }}>
                        Not a member yet? Sign them up
                      </button>
                    </>
                  ) : (
                    <div style={{ background:"#eef1f6", borderRadius:10, padding:"10px 14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:"bold", color:"#394c76", fontFamily:"Georgia,serif" }}>{payMember.name}</div>
                          <div style={{ fontSize:12, color:"#666", fontFamily:"Georgia,serif" }}>{payMember.points} points</div>
                        </div>
                        <button onClick={async () => { setPayMember(null); setSelectedRewardId(null); await supabase.from("table_sessions").upsert({ table_no:String(payModal.tableNo), member_id:null, pending_reward_id:null }); }} style={{ background:"transparent", border:"none", color:"#c0392b", fontSize:13, cursor:"pointer", fontFamily:"Georgia,serif" }}>Remove</button>
                      </div>
                      {rewards.filter(r => r.reward_type === "discount").length > 0 && (
                        <div style={{ marginTop:10 }}>
                          <div style={{ fontSize:11, color:"#888", marginBottom:6, fontFamily:"Georgia,serif" }}>Redeem cash off this bill</div>
                          {rewards.filter(r => r.reward_type === "discount").map(r => {
                            const affordable = payMember.points >= r.points_cost;
                            const selected = selectedRewardId === r.id;
                            return (
                              <button key={r.id} disabled={!affordable}
                                onClick={() => setSelectedRewardId(selected ? null : r.id)}
                                style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:selected?"#394c76":"#fff", border:`1.5px solid ${selected?"#394c76":"#ddd"}`, color:selected?"#fff":affordable?"#1a1a1a":"#bbb", borderRadius:8, padding:"9px 12px", fontSize:13, fontFamily:"Georgia,serif", cursor:affordable?"pointer":"not-allowed", marginBottom:6 }}>
                                <span>{r.name} — RM{parseFloat(r.discount_amount||0).toFixed(2)} off</span>
                                <span style={{ fontWeight:"bold" }}>{r.points_cost} pts{!affordable?" (not enough)":""}</span>
                              </button>
                            );
                          })}
                          <div style={{ fontSize:11, color:"#aaa", marginTop:2, fontFamily:"Georgia,serif" }}>Free-item rewards are redeemed on the customer's own phone during their visit, so the kitchen gets it in time.</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div style={{ background:"#f9f9f9", borderRadius:10, padding:"10px 14px", marginBottom:12, maxHeight:180, overflowY:"auto" }}>
                  {[...(payModal.data.pending||[]),...(payModal.data.done||[])].flatMap(o=>o.items).map((item,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5, fontFamily:"Georgia,serif" }}>
                      <span style={{ color:"#333" }}>{item.name} ×{item.qty}</span>
                      <span style={{ color:"#333", fontWeight:"bold" }}>{(item.price*item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div style={{ borderTop:"1px solid #eee", paddingTop:10, marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#666", marginBottom:4, fontFamily:"Georgia,serif" }}>
                    <span>Subtotal</span><span>{subtotal.toFixed(2)}</span>
                  </div>
                  {charge>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#666", marginBottom:4, fontFamily:"Georgia,serif" }}>
                    <span>Service Charge ({charge}%)</span><span>{chargeAmt.toFixed(2)}</span>
                  </div>}
                  {selectedReward && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#2e7d32", marginBottom:4, fontFamily:"Georgia,serif" }}>
                    <span>Redeemed: {selectedReward.name} ({selectedReward.points_cost} pts)</span><span>{discount>0?`-${discount.toFixed(2)}`:"FREE"}</span>
                  </div>}
                  {roundingDiff!==0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#aaa", marginBottom:4, fontFamily:"Georgia,serif" }}>
                    <span>Rounding</span><span>{roundingDiff>0?"+":""}{roundingDiff.toFixed(2)}</span>
                  </div>}
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:20, fontWeight:"bold", color:"#394c76", marginTop:8, paddingTop:8, borderTop:"2px solid #eee", fontFamily:"Georgia,serif" }}>
                    <span>TOTAL</span><span>RM {parseFloat(rounded).toFixed(2)}</span>
                  </div>
                </div>

                {/* Cash input */}
                {payModal.method==="Cash" && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"Georgia,serif" }}>Cash Received (RM)</div>
                    <input type="number" step="0.05" min="0" autoFocus value={payModal.cashReceived}
                      onChange={e => setPayModal(m=>({...m, cashReceived:e.target.value}))}
                      placeholder={`e.g. ${Math.ceil(rounded/5)*5}.00`}
                      style={{ width:"100%", border:"2px solid #394c76", borderRadius:8, padding:"10px 14px", fontSize:22, textAlign:"right", boxSizing:"border-box", color:"#1a1a1a" }} />
                    {cash >= rounded && (
                      <div style={{ marginTop:8, background:"#eef1f6", borderRadius:8, padding:"10px 14px", display:"flex", justifyContent:"space-between" }}>
                        <span style={{ color:"#394c76", fontSize:14, fontWeight:"bold", fontFamily:"Georgia,serif" }}>Change</span>
                        <span style={{ color:"#394c76", fontSize:22, fontWeight:"bold", fontFamily:"Georgia,serif" }}>RM {change.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display:"flex", gap:8, flexDirection:"column" }}>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => setPayModal(null)}
                      style={{ flex:1, background:"#f5f5f5", border:"1px solid #ddd", color:"#555", padding:"12px 0", fontSize:13, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif" }}>✕ Cancel</button>
                    <button onClick={() => { printReceipt(payModal.tableNo, payModal.data, payModal.method, payModal.cashReceived||null, payModal.method==="Cash"&&change>=0?change:null, discount, selectedReward?.name||null); }}
                      style={{ flex:2, background:"#555", border:"none", color:"#fff", padding:"12px 0", fontSize:13, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold" }}>
                      🖨️ Preview Receipt
                    </button>
                  </div>
                  <button onClick={() => {
                    if (!canConfirm) return;
                    setConfirmModal({ tableNo:payModal.tableNo, data:payModal.data, method:payModal.method, cashReceived:payModal.cashReceived||null, change:payModal.method==="Cash"&&change>=0?change:null, rounded, subtotal, discount, reward:selectedReward, member:payMember });
                  }} disabled={!canConfirm}
                    style={{ width:"100%", background:canConfirm?"linear-gradient(135deg,#394c76,#2c3b5e)":"#ccc", border:"none", color:"#fff", padding:"16px 0", fontSize:16, borderRadius:10, cursor:canConfirm?"pointer":"not-allowed", fontFamily:"Georgia,serif", fontWeight:"bold", boxShadow:canConfirm?"0 4px 12px rgba(25,118,210,0.4)":"none" }}>
                    {payModal.method==="Cash"&&!canConfirm?"Enter Cash Amount Above ↑":`✅ Print & Clear Table — RM ${parseFloat(rounded).toFixed(2)}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Search Member — type partial name or phone, tap to select */}
      {showMemberSearchModal && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.85)", zIndex:10001, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
          <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:380, maxHeight:"80vh", color:"#1a1a1a", boxShadow:"0 20px 60px rgba(0,0,0,0.5)", margin:"auto", display:"flex", flexDirection:"column" }}>
            <div style={{ background:"linear-gradient(135deg,#394c76,#2c3b5e)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:"bold", color:"#fff", fontFamily:"Georgia,serif" }}>🔍 Find Member</div>
              <button onClick={() => { setShowMemberSearchModal(false); setMemberSearchQuery(""); setMemberSearchResults([]); }}
                style={{ background:"rgba(255,255,255,0.14)", border:"none", color:"#fff", width:30, height:30, borderRadius:8, fontSize:16, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ padding:"16px 20px", flexShrink:0 }}>
              <input value={memberSearchQuery} onChange={e=>setMemberSearchQuery(e.target.value)} autoFocus
                placeholder="Name or phone — no need to type it all"
                style={{ width:"100%", border:"1px solid #ddd", borderRadius:10, padding:"12px 14px", fontSize:15, fontFamily:"Georgia,serif", color:"#1a1a1a", boxSizing:"border-box" }} />
            </div>
            <div style={{ padding:"0 20px 20px", overflowY:"auto", flex:1 }}>
              {!memberSearchQuery.trim() ? (
                <div style={{ textAlign:"center", color:"#aaa", fontSize:13, padding:"20px 0", fontFamily:"Georgia,serif" }}>Start typing to search…</div>
              ) : memberSearchResults.length === 0 ? (
                <div style={{ textAlign:"center", color:"#aaa", fontSize:13, padding:"20px 0", fontFamily:"Georgia,serif" }}>No members match "{memberSearchQuery}"</div>
              ) : memberSearchResults.map(m => (
                <button key={m.id} onClick={() => selectMember(m)}
                  style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f9f9f9", border:"1px solid #eee", borderRadius:10, padding:"12px 14px", marginBottom:8, cursor:"pointer", fontFamily:"Georgia,serif", textAlign:"left" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:"bold", color:"#1a1a1a" }}>{m.name}</div>
                    <div style={{ fontSize:12, color:"#888" }}>{m.phone}</div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:"bold", color:"#394c76" }}>{m.points} pts</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sign Up New Member — its own modal so it has room to breathe on top of the pay modal */}
      {showJoinQR && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.85)", zIndex:10001, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
          <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:360, color:"#1a1a1a", boxShadow:"0 20px 60px rgba(0,0,0,0.5)", margin:"auto" }}>
            <div style={{ background:"linear-gradient(135deg,#394c76,#2c3b5e)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:16, fontWeight:"bold", color:"#fff", fontFamily:"Georgia,serif" }}>🎉 Sign Up New Member</div>
              <button onClick={() => { setShowJoinQR(false); setNewMemberName(""); setNewMemberPhone(""); setMemberLookupMsg(""); }}
                style={{ background:"rgba(255,255,255,0.14)", border:"none", color:"#fff", width:30, height:30, borderRadius:8, fontSize:16, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ padding:"20px 24px", textAlign:"center" }}>
              <QRCode url={`${window.location.origin}${window.location.pathname}?joinMember=1`} size={180} />
              <div style={{ fontSize:12, color:"#888", marginTop:10, fontFamily:"Georgia,serif" }}>Scan to join on their own phone, or print a slip to hand over</div>
              <button onClick={printJoinSlip} style={{ marginTop:10, background:"#555", color:"#fff", border:"none", borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:"bold", cursor:"pointer" }}>🖨️ Print QR</button>

              <div style={{ display:"flex", alignItems:"center", gap:10, margin:"20px 0" }}>
                <div style={{ flex:1, height:1, background:"#eee" }} />
                <div style={{ fontSize:11, color:"#aaa", fontFamily:"Georgia,serif" }}>OR ENTER MANUALLY</div>
                <div style={{ flex:1, height:1, background:"#eee" }} />
              </div>

              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:11, color:"#888", marginBottom:5, fontFamily:"Georgia,serif" }}>Name</div>
                <input value={newMemberName} onChange={e=>setNewMemberName(e.target.value)} placeholder="Customer's name"
                  style={{ width:"100%", border:"1px solid #ddd", borderRadius:8, padding:"12px 14px", fontSize:15, fontFamily:"Georgia,serif", color:"#1a1a1a", boxSizing:"border-box", marginBottom:12 }} />
                <div style={{ fontSize:11, color:"#888", marginBottom:5, fontFamily:"Georgia,serif" }}>Phone</div>
                <div style={{ display:"flex", gap:6 }}>
                  <select value={newMemberPhoneCountry} onChange={e=>setNewMemberPhoneCountry(e.target.value)}
                    style={{ border:"1px solid #ddd", borderRadius:8, padding:"0 8px", fontSize:15, fontFamily:"Georgia,serif", color:"#1a1a1a", background:"#fff" }}>
                    {PHONE_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name} +{c.dial}</option>)}
                  </select>
                  <input value={newMemberPhone} onChange={e=>setNewMemberPhone(e.target.value)} placeholder="Phone number" type="tel"
                    style={{ flex:1, minWidth:0, border:"1px solid #ddd", borderRadius:8, padding:"12px 14px", fontSize:15, fontFamily:"Georgia,serif", color:"#1a1a1a", boxSizing:"border-box" }} />
                </div>
                {memberLookupMsg && <div style={{ fontSize:12, color:"#c0392b", marginTop:8, fontFamily:"Georgia,serif" }}>{memberLookupMsg}</div>}
              </div>
              <button onClick={addNewMember} style={{ marginTop:16, width:"100%", background:"linear-gradient(135deg,#394c76,#2c3b5e)", color:"#fff", border:"none", borderRadius:10, padding:"13px 0", fontSize:15, fontWeight:"bold", cursor:"pointer", fontFamily:"Georgia,serif" }}>Add Member</button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Table Detail Modal — live, with tabs, stays open */}
      {tableDetailModal && (() => {
        const tableNo = tableDetailModal;
        const tableOrders = orders.filter(o => String(o.table_no) === String(tableNo));
        const pending = tableOrders.filter(o => o.status === "pending");
        const done = tableOrders.filter(o => o.status === "done");
        const total = tableOrders.flatMap(o=>o.items).reduce((s,i) => s+i.price*i.qty, 0);
        const liveData = { pending, done, total };
        const hasPending = pending.length > 0;
        // Most recently placed order first, regardless of pending/done status
        const allOrders = [...pending, ...done].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        const drinkOrders = allOrders.filter(o => o.items.some(i => DRINK_CATEGORIES.includes(i.category)));
        const foodOrders = allOrders.filter(o => o.items.some(i => FOOD_CATEGORIES.includes(i.category)));
        return (
          <DetailModal tableNo={tableNo} hasPending={hasPending} pending={pending} done={done}
            allOrders={allOrders} drinkOrders={drinkOrders} foodOrders={foodOrders}
            total={total} liveData={liveData}
            onItemDone={handleItemDone} cancelOrder={cancelOrder}
            printReceipt={printReceipt} setPayModal={setPayModal}
            setTableDetailModal={setTableDetailModal} />
        );
      })()}

      {splitBillModal && (() => {
        const tableOrders = orders.filter(o => String(o.table_no) === String(splitBillModal));
        return (
          <SplitBillModal tableNo={splitBillModal} tableOrders={tableOrders} allTableNos={Object.keys(byTable)}
            onClose={() => setSplitBillModal(null)}
            onSplitOff={() => fetchAll()} />
        );
      })()}

      {selectMode && selectedForCombine.length >= 2 && (() => {
        const combinedTotal = selectedForCombine.reduce((s,tno) => s + (byTable[tno]?.total||0), 0);
        return (
          <div style={{ position:"fixed", left:0, right:0, bottom:0, background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 -4px 16px rgba(0,0,0,0.25)", zIndex:5000 }}>
            <div style={{ color:"#fff", fontFamily:"Georgia,serif" }}>
              <div style={{ fontSize:12, opacity:0.85 }}>{selectedForCombine.length} bills selected</div>
              <div style={{ fontSize:20, fontWeight:"bold" }}>RM {combinedTotal.toFixed(2)}</div>
            </div>
            <button onClick={() => setCombineModal({ tableNos:selectedForCombine, method:"QR DuitNow", cashReceived:"" })}
              style={btn({ background:"#fff", border:"none", color:"#394c76", padding:"12px 20px", fontSize:14, fontWeight:"bold" })}>
              Combine &amp; Pay
            </button>
          </div>
        );
      })()}

      {combineModal && (() => {
        const charge = serviceCharge;
        const mergedOrders = combineModal.tableNos.flatMap(tno => [...(byTable[tno]?.pending||[]), ...(byTable[tno]?.done||[])]);
        const subtotal = combineModal.tableNos.reduce((s,tno) => s + (byTable[tno]?.total||0), 0);
        const chargeAmt = +(subtotal * charge / 100).toFixed(2);
        const grandTotal = +(subtotal + chargeAmt).toFixed(2);
        const rounded = +(Math.round(grandTotal * 20) / 20).toFixed(2);
        const cash = parseFloat(combineModal.cashReceived)||0;
        const change = +(cash - rounded).toFixed(2);
        const canConfirm = combineModal.method!=="Cash" || (!!combineModal.cashReceived && cash >= rounded);
        const label = combineModal.tableNos.join(" + ");
        const mergedData = { pending: mergedOrders.filter(o=>o.status==="pending"), done: mergedOrders.filter(o=>o.status==="done"), total:subtotal };
        return (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
            <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:420, color:"#1a1a1a", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.5)", margin:"auto" }}>
              <div style={{ background:"linear-gradient(135deg,#394c76,#2c3b5e)", padding:"20px 24px" }}>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.75)", fontFamily:"Georgia,serif" }}>Combined Payment</div>
                <div style={{ fontSize:18, fontWeight:"bold", color:"#fff", fontFamily:"Georgia,serif", marginTop:2 }}>💳 Table {label}</div>
                <div style={{ fontSize:32, fontWeight:"bold", color:"#fff", marginTop:6, fontFamily:"Georgia,serif" }}>RM {parseFloat(rounded).toFixed(2)}</div>
              </div>
              <div style={{ padding:"20px 24px" }}>
                <div style={{ fontSize:11, color:"#888", marginBottom:10, fontFamily:"Georgia,serif", fontWeight:"bold", letterSpacing:1 }}>SELECT PAYMENT METHOD</div>
                <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                  {[["💵","Cash"],["📱","QR DuitNow"],["💳","Credit Card"]].map(([icon,method]) => {
                    const active = combineModal.method===method;
                    return (
                      <button key={method} onClick={() => setCombineModal(m=>({...m, method, cashReceived:""}))}
                        style={{ flex:1, background:active?"#eef1f6":"#f7f8fa", border:`2px solid ${active?"#394c76":"#e4e7ec"}`, color:active?"#394c76":"#9aa0ac", padding:"12px 4px", fontSize:11, fontWeight:"bold", borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", lineHeight:1.6 }}>
                        <div style={{ fontSize:22 }}>{icon}</div>{method}
                      </button>
                    );
                  })}
                </div>
                <div style={{ borderTop:"1px solid #eee", paddingTop:10, marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#666", marginBottom:4, fontFamily:"Georgia,serif" }}>
                    <span>Subtotal ({combineModal.tableNos.length} bills)</span><span>{subtotal.toFixed(2)}</span>
                  </div>
                  {charge>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#666", marginBottom:4, fontFamily:"Georgia,serif" }}>
                    <span>Service Charge ({charge}%)</span><span>{chargeAmt.toFixed(2)}</span>
                  </div>}
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:20, fontWeight:"bold", color:"#394c76", marginTop:8, paddingTop:8, borderTop:"2px solid #eee", fontFamily:"Georgia,serif" }}>
                    <span>TOTAL</span><span>RM {parseFloat(rounded).toFixed(2)}</span>
                  </div>
                </div>
                {combineModal.method==="Cash" && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"Georgia,serif" }}>Cash Received (RM)</div>
                    <input type="number" step="0.05" min="0" autoFocus value={combineModal.cashReceived}
                      onChange={e => setCombineModal(m=>({...m, cashReceived:e.target.value}))}
                      style={{ width:"100%", border:"2px solid #394c76", borderRadius:8, padding:"10px 14px", fontSize:22, textAlign:"right", boxSizing:"border-box", color:"#1a1a1a" }} />
                    {cash >= rounded && (
                      <div style={{ marginTop:8, background:"#eef1f6", borderRadius:8, padding:"10px 14px", display:"flex", justifyContent:"space-between" }}>
                        <span style={{ color:"#394c76", fontSize:14, fontWeight:"bold", fontFamily:"Georgia,serif" }}>Change</span>
                        <span style={{ color:"#394c76", fontSize:22, fontWeight:"bold", fontFamily:"Georgia,serif" }}>RM {change.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display:"flex", gap:8, flexDirection:"column" }}>
                  <button onClick={() => setCombineModal(null)}
                    style={{ background:"#f5f5f5", border:"1px solid #ddd", color:"#555", padding:"12px 0", fontSize:13, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif" }}>✕ Cancel</button>
                  <button onClick={() => {
                    if (!canConfirm) return;
                    setConfirmModal({ tableNo:label, tableNos:combineModal.tableNos, data:mergedData, method:combineModal.method, cashReceived:combineModal.cashReceived||null, change:combineModal.method==="Cash"&&change>=0?change:null, rounded });
                  }} disabled={!canConfirm}
                    style={{ width:"100%", background:canConfirm?"linear-gradient(135deg,#394c76,#2c3b5e)":"#ccc", border:"none", color:"#fff", padding:"16px 0", fontSize:16, borderRadius:10, cursor:canConfirm?"pointer":"not-allowed", fontFamily:"Georgia,serif", fontWeight:"bold" }}>
                    {combineModal.method==="Cash"&&!canConfirm?"Enter Cash Amount Above ↑":`✅ Print & Clear ${combineModal.tableNos.length} Bills — RM ${parseFloat(rounded).toFixed(2)}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Custom Confirm Payment Modal */}
      {confirmModal && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.75)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:340, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>

            {/* Header */}
            <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"20px 24px", textAlign:"center" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}><Icon name="card" size={30} color="#fff" /></div>
              <div className="hl-title" style={{ fontSize:18, fontWeight:700, color:"#fff" }}>Confirm Payment</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:4, fontFamily:"Georgia,serif" }}>
                {isTakeaway(confirmModal.tableNo) ? takeawayLabel(confirmModal.tableNo) : `Table ${confirmModal.tableNo}`}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding:"20px 24px" }}>
              {/* Payment method */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, padding:"10px 14px", background:"#f5f5f5", borderRadius:10 }}>
                <span style={{ fontSize:13, color:"#666", fontFamily:"Georgia,serif" }}>Payment Method</span>
                <span style={{ fontSize:14, fontWeight:"bold", color:"#1a1a1a", fontFamily:"Georgia,serif" }}>
                  {confirmModal.method==="Cash"?"💵":confirmModal.method==="QR DuitNow"?"📱":"💳"} {confirmModal.method}
                </span>
              </div>

              {/* Amount */}
              <div style={{ textAlign:"center", padding:"14px 0", borderTop:"1px solid #eee", borderBottom:"1px solid #eee", marginBottom:12 }}>
                <div style={{ fontSize:12, color:"#999", fontFamily:"Georgia,serif", marginBottom:4 }}>Total Amount</div>
                <div style={{ fontSize:32, fontWeight:"bold", color:"#394c76", fontFamily:"Georgia,serif" }}>RM {parseFloat(confirmModal.rounded).toFixed(2)}</div>
                {confirmModal.change !== null && confirmModal.change >= 0 && (
                  <div style={{ marginTop:6, fontSize:13, color:"#2e7d32", fontWeight:"bold", fontFamily:"Georgia,serif" }}>Change: RM {parseFloat(confirmModal.change).toFixed(2)}</div>
                )}
                {confirmModal.member && (
                  <div style={{ marginTop:8, fontSize:12, color:"#394c76", fontFamily:"Georgia,serif" }}>
                    Member: {confirmModal.member.name}{confirmModal.reward?` · redeeming ${confirmModal.reward.name} (${confirmModal.reward.points_cost} pts)`:""}
                  </div>
                )}
              </div>

              {/* Warning */}
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"#eef1f6", borderRadius:10, marginBottom:16, border:"1px solid #d6dbe2" }}>
                <span style={{ fontSize:12, color:"#394c76", fontFamily:"Georgia,serif", lineHeight:1.4 }}>This will print the receipt and <strong>clear the table</strong>. Cannot be undone!</span>
              </div>

              {/* Buttons */}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setConfirmModal(null)}
                  style={{ flex:1, background:"#f5f5f5", border:"1px solid #ddd", color:"#555", padding:"13px 0", fontSize:14, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold" }}>
                  ✕ Cancel
                </button>
                <button onClick={async () => {
                  printReceipt(confirmModal.tableNo, confirmModal.data, confirmModal.method, confirmModal.cashReceived, confirmModal.change, confirmModal.discount||0, confirmModal.reward?.name||null);
                  if (confirmModal.tableNos) markPaidMulti(confirmModal.tableNos, confirmModal.method, confirmModal.member?.id||null);
                  else markPaid(confirmModal.tableNo, confirmModal.method, confirmModal.member?.id||null);
                  if (confirmModal.member) {
                    const earnBasisAmount = pointsEarnBasis === "subtotal" ? confirmModal.subtotal : confirmModal.rounded;
                    const earned = Math.floor(earnBasisAmount * pointsEarnRate);
                    const redeemed = confirmModal.reward ? confirmModal.reward.points_cost : 0;
                    const newPoints = Math.max(0, confirmModal.member.points - redeemed + earned);
                    const newSpent = parseFloat(confirmModal.member.total_spent||0) + confirmModal.rounded;
                    const { error: ptsErr } = await supabase.from("members").update({ points:newPoints, total_spent:newSpent }).eq("id", confirmModal.member.id);
                    if (ptsErr) alert(`Bill was paid, but points could not be saved for ${confirmModal.member.name} (${ptsErr.message}). Use Members > Adjust Points to fix manually: +${earned} pts.`);
                  }
                  setConfirmModal(null);
                  setPayModal(null);
                  setCombineModal(null);
                  setSelectMode(false);
                  setSelectedForCombine([]);
                }}
                  style={{ flex:2, background:"linear-gradient(135deg,#394c76,#2c3b5e)", border:"none", color:"#fff", padding:"13px 0", fontSize:14, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold", boxShadow:"0 4px 12px rgba(25,118,210,0.4)" }}>
                  ✅ Confirm & Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ background:"linear-gradient(150deg,#394c76,#2c3b5e)", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, boxShadow:"0 4px 16px rgba(57,76,118,0.25)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.14)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="card" size={19} color="#fff" /></div>
          <div>
            <div className="hl-title" style={{ fontSize:18, color:"#fff", fontWeight:700, letterSpacing:0.3 }}>Cashier</div>
            <div style={{ fontSize:11, color:"#aeb8cc", display:"flex", alignItems:"center", gap:5 }}><span style={{ width:7, height:7, borderRadius:"50%", background:"#ffffff", display:"inline-block" }} /> Live — updates instantly</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <button onClick={() => setSoundOn(s => {
            const next = !s;
            soundOnRef.current = next;
            localStorage.setItem("c_sound", next ? "on" : "off");
            return next;
          })} style={btn({ background:soundOn?"#fff":"rgba(255,255,255,0.1)", border:soundOn?"none":"1px solid rgba(255,255,255,0.28)", color:soundOn?"#394c76":"rgba(255,255,255,0.8)", padding:"7px 12px", fontSize:11, fontWeight:soundOn?"bold":"normal" })}>Sound</button>
          <button onClick={toggleVoice} style={btn({ background:voiceOn?"#fff":"rgba(255,255,255,0.1)", border:voiceOn?"none":"1px solid rgba(255,255,255,0.28)", color:voiceOn?"#394c76":"rgba(255,255,255,0.8)", padding:"7px 12px", fontSize:11, fontWeight:voiceOn?"bold":"normal" })}>Voice</button>
          {voiceOn && (
            <button onClick={toggleVoiceLang} style={btn({ background:"rgba(255,255,255,0.16)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", padding:"7px 12px", fontSize:11, fontWeight:"bold" })}>{voiceLang === "en" ? "中文" : "EN"}</button>
          )}
          <button onClick={() => { setSelectMode(s => !s); setSelectedForCombine([]); }}
            style={btn({ background:selectMode?"#fff":"rgba(255,255,255,0.1)", border:selectMode?"none":"1px solid rgba(255,255,255,0.28)", color:selectMode?"#394c76":"rgba(255,255,255,0.8)", padding:"7px 12px", fontSize:11, fontWeight:selectMode?"bold":"normal" })}>
            {selectMode ? "Cancel Select" : "Select"}
          </button>
          <button onClick={goHome} style={btn({ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.28)", color:"#fff", padding:"7px 12px", fontSize:11 })}>← Back</button>
        </div>
      </div>
      <div style={{ background:C.panel, borderBottom:`1px solid ${C.border}`, padding:"0 16px", display:"flex", gap:0 }}>
        {[["all",`All (${activeTables.length})`],["pending",`Pending (${pendingTables.length})`],["done",`Served (${doneTables.length})`]].map(([key,label]) => (
          <button key={key} onClick={() => { setFilterTab(key); setSelectedTable(null); }}
            style={btn({ background:"transparent", border:"none", borderBottom:filterTab===key?`3px solid ${key==="pending"?C.gold:"#394c76"}`:"3px solid transparent",
              color:filterTab===key?(key==="pending"?C.goldLight:"#394c76"):C.muted,
              padding:"14px 20px", fontSize:14, fontWeight:filterTab===key?"bold":"normal", borderRadius:0 })}>
            {label}
          </button>
        ))}
      </div>
      {activeTables.length > 0 && (
        <div style={{ background:"#eef1f6", borderBottom:`1px solid ${C.border}`, padding:"10px 16px", display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:12, color:C.muted, marginRight:4, fontWeight:"bold" }}>TABLE:</span>
          <button onClick={() => setSelectedTable(null)}
            style={btn({ background:selectedTable===null?"#e3e7f0":"transparent", border:`2px solid ${selectedTable===null?C.gold:C.border}`,
              color:selectedTable===null?C.goldLight:C.muted, padding:"10px 18px", fontSize:14, fontWeight:selectedTable===null?"bold":"normal", minHeight:44 })}>
            All
          </button>
          {tabFiltered.map(([tno, data]) => {
            const hasPend = data.pending.length > 0;
            const isSelected = String(selectedTable)===String(tno);
            return (
              <button key={tno} onClick={() => setSelectedTable(isSelected ? null : tno)}
                style={btn({ background:isSelected?(hasPend?"#e3e7f0":"#eef1f6"):"transparent",
                  border:`2px solid ${isSelected?(hasPend?C.gold:"#394c76"):(hasPend?"#5a4a20":"#2a4a2a")}`,
                  color:isSelected?(hasPend?C.goldLight:"#394c76"):(hasPend?C.muted:"#394c76"),
                  padding:"10px 18px", fontSize:14, fontWeight:isSelected?"bold":"normal", minHeight:44 })}>
                T{tno} <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:hasPend?"#c8973a":"#394c76", marginLeft:2, verticalAlign:"middle" }} />
              </button>
            );
          })}
        </div>
      )}
      <div style={{ flex:1, padding:16, overflowY:"auto" }}>
        {loading ? <div style={{ color:C.muted, textAlign:"center", padding:40 }}>Loading...</div>
          : (
          <>
            {waiterCalls.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, color:"#394c76", letterSpacing:2, textTransform:"uppercase", marginBottom:10, fontWeight:"bold", display:"flex", alignItems:"center", gap:8 }}><Icon name="bell" size={15} color="#394c76" /> Waiter Called</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                  {waiterCalls.map(c => (
                    <div key={c.table_no} style={{ background:"#eef1f6", border:"1.5px solid #394c76", borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:12 }}>
                      <div><div style={{ fontWeight:"bold", color:"#394c76", fontSize:15 }}>Table {c.table_no}</div><div style={{ fontSize:11, color:C.muted }}>{c.time}</div></div>
                      <button onClick={() => dismissWaiter(c.table_no)} style={btn({ background:"#394c76", border:"none", color:"#fff", padding:"6px 12px", fontSize:12, fontWeight:"bold" })}>Done</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {displayTables.length===0 ? (
            <div style={{ textAlign:"center", color:C.muted, padding:60 }}>
              <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
              <div style={{ fontSize:18, color:"#394c76", fontWeight:"bold" }}>All Clear!</div>
              <div style={{ fontSize:14, marginTop:8 }}>No active tables right now</div>
            </div>
          ) : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px,1fr))", gap:10, marginBottom:20 }}>
                <div style={{ background:C.panel, border:`1px solid #394c76`, borderRadius:10, padding:12, textAlign:"center" }}>
                  <div style={{ fontSize:22, color:"#394c76", fontWeight:"bold" }}>{activeTables.length}</div>
                  <div style={{ fontSize:11, color:C.muted }}>Active Tables</div>
                </div>
                <div style={{ background:C.panel, border:`1px solid ${C.gold}`, borderRadius:10, padding:12, textAlign:"center" }}>
                  <div style={{ fontSize:22, color:C.goldLight, fontWeight:"bold" }}>RM {activeTables.reduce((s,[,tbl]) => s+tbl.total,0).toFixed(2)}</div>
                  <div style={{ fontSize:11, color:C.muted }}>Total Outstanding</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(340px,100%),1fr))", gap:14 }}>
                {displayTables.map(([tableNo, data]) => (
                  <TableCard key={tableNo} tableNo={tableNo} data={data} paying={paying} markPaid={markPaid} onItemDone={handleItemDone} cancelOrder={cancelOrder} cardTab={cardTabs[tableNo]||"drinks"} setCardTab={(tab) => setCardTabs(prev => ({...prev, [tableNo]:tab}))} printReceipt={printReceipt} setPayModal={setPayModal} setTableDetailModal={setTableDetailModal} onSplitBill={setSplitBillModal} onUndoSplit={handleUndoSplit} selectMode={selectMode} isSelected={selectedForCombine.includes(tableNo)} onToggleSelect={toggleSelectForCombine} />
                ))}
              </div>
            </>
          )}
          </>
        )}
      </div>
    </div>
  );
}
