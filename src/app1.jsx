import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qjbfoooshpvjlqiepxxb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmZvb29zaHB2amxxaWVweHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTIxNDAsImV4cCI6MjA5NjEyODE0MH0.5psVFUbii5Wi5MHhoR3FVVs4C8UPMwgt2K1Tzb6VTxQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASSWORD = localStorage.getItem("admin_pw") || "hotolounge2026";
const CAFE_ADDRESS1 = "20, Jalan Ambong Kiri 1, Kepong";
const CAFE_ADDRESS2 = "Baru 52100 Kuala Lumpur";
const CAFE_TIN = "C60634413060";
const CAFE_PHONE = "+60182868126";
const TABLES = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
const TW_SLOTS = Array.from({length:20},(_,i)=>`TW-${String(i+1).padStart(2,"0")}`); // 🥡 Go Takeaway
const ST_SLOTS = Array.from({length:10},(_,i)=>`ST-${String(i+1).padStart(2,"0")}`); // 🪑 Eat Here Takeaway
const isTakeaway = (t) => String(t).startsWith("TW-") || String(t).startsWith("ST-");
const takeawayLabel = (t) => String(t).startsWith("TW-") ? `🥡 Takeaway ${t}` : `🪑 Eat Here ${t}`;
const CAFE_NAME = "HOTO LOUNGE";
const CATEGORIES = ["Beverage", "Food & Snacks", "Desserts", "Add-ons"];
const DRINK_CATEGORIES = ["Beverage", "Desserts"];
const FOOD_CATEGORIES = ["Food & Snacks", "Promo", "Add-ons"];

// Staff dark theme
const C = { bg:"#2a1f10", panel:"#3d2c18", border:"#5a4020", gold:"#c8973a", goldLight:"#e8c77a", muted:"#c0a060", text:"#fff8ee", dark:"#1a1208" };
const btn = (x={}) => ({ fontFamily:"Georgia,serif", cursor:"pointer", borderRadius:8, transition:"all 0.2s", ...x });

// Customer bright theme
const T = {
  bg:"#f5f0eb", panel:"#ffffff", border:"#e0d8d0",
  brown:"#c8973a", text:"#1a1a1a", muted:"#888888",
  green:"#c8973a", greenBg:"#fff8ed", red:"#c62828",
  orange:"#e65100", shadow:"0 2px 8px rgba(0,0,0,0.1)"
};

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
  if (!item.promo_start || !item.promo_end) return false;
  // Valid if has free drinks, item promo_price, OR addon-level promo_price
  const hasDrinks = item.promo_drinks && item.promo_drinks.length > 0;
  const hasItemPromo = item.promo_price && parseFloat(item.promo_price) > 0;
  const hasAddonPromo = item.addons && item.addons.some(a => a.promo_price && parseFloat(a.promo_price) > 0);
  if (!hasDrinks && !hasItemPromo && !hasAddonPromo) return false;
  const myt = new Date(new Date().toLocaleString("en-US", { timeZone:"Asia/Kuala_Lumpur" }));
  const cur = myt.getHours() * 60 + myt.getMinutes();
  const [sh, sm] = item.promo_start.split(":").map(Number);
  const [eh, em] = item.promo_end.split(":").map(Number);
  return cur >= sh * 60 + sm && cur < eh * 60 + em;
};

function QRCode({ url, size=160 }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=2c1a0e&color=e8c77a&margin=10`;
  return <img src={src} alt="QR" style={{ width:size, height:size, borderRadius:8 }} />;
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [tableNo, setTableNo] = useState(null);
  const STAFF_PIN = localStorage.getItem("staff_pin") || "Jack@126";
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const submitPin = () => {
    if (pinInput === STAFF_PIN) { setPinUnlocked(true); }
    else { setPinError(true); setPinInput(""); }
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = parseInt(params.get("table"));
    if (t && TABLES.includes(t)) { setTableNo(t); setScreen("tablet"); }
    if (params.get("screen") === "kitchen") setScreen("kitchen");
    if (params.get("screen") === "admin") setScreen("admin");
  }, []);
  return (
    <div style={{ fontFamily:"Georgia,serif", background:C.bg, minHeight:"100vh", color:C.text }}>
      {screen === "home" && !pinUnlocked && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.panel, border:`2px solid ${C.gold}`, borderRadius:16, padding:32, width:"100%", maxWidth:320, textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🔐</div>
            <div style={{ fontSize:18, color:C.goldLight, fontWeight:"bold", marginBottom:20 }}>Staff Access</div>
            <input type="password" value={pinInput} onChange={e => { setPinInput(e.target.value); setPinError(false); }} onKeyDown={e => e.key==="Enter" && submitPin()}
              placeholder="Enter PIN" autoFocus
              style={{ width:"100%", background:C.bg, border:`2px solid ${pinError?"#cc4444":C.gold}`, color:C.text, padding:"12px 16px", borderRadius:10, fontSize:20, fontFamily:"Georgia,serif", textAlign:"center", letterSpacing:4, boxSizing:"border-box", marginBottom:8 }} />
            {pinError && <div style={{ color:"#ff7777", fontSize:13, marginBottom:8 }}>Wrong PIN</div>}
            <button onClick={submitPin} style={btn({ width:"100%", background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:14, fontSize:15, fontWeight:"bold", marginTop:8 })}>Unlock ✓</button>
          </div>
        </div>
      )}
      {screen === "home"    && <HomeScreen    setScreen={setScreen} setTableNo={setTableNo} />}
      {screen === "tablet"  && <TabletScreen  tableNo={tableNo} isStaff={tableNo !== null && !window.location.search.includes("table=")} goHome={() => setScreen("home")} />}
      {screen === "takeaway" && <TakeawayScreen setScreen={setScreen} setTableNo={setTableNo} goHome={() => setScreen("home")} />}
      {screen === "kitchen" && <KitchenScreen goHome={() => setScreen("home")} />}
      {screen === "qrcodes" && <QRScreen      goHome={() => setScreen("home")} />}
      {screen === "admin"   && <AdminScreen   goHome={() => setScreen("home")} />}
      {screen === "sales"   && <SalesScreen   goHome={() => setScreen("home")} />}
      {screen === "cashier" && <CashierScreen goHome={() => setScreen("home")} />}
    </div>
  );
}

function HomeScreen({ setScreen, setTableNo }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", gap:28, padding:24 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:52 }}>☕</div>
        <div style={{ fontSize:28, color:C.goldLight, fontWeight:"bold", letterSpacing:2 }}>{CAFE_NAME}</div>
        <div style={{ fontSize:12, color:C.muted, letterSpacing:4, textTransform:"uppercase", marginTop:4 }}>Ordering System</div>
      </div>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ fontSize:11, color:C.muted, letterSpacing:3, textTransform:"uppercase", marginBottom:10, textAlign:"center" }}>— Customer Tablet —</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
          {TABLES.map(tnum => (
            <button key={tnum} onClick={() => { setTableNo(tnum); setScreen("tablet"); }}
              style={btn({ background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:"14px 0", fontSize:15, fontWeight:"bold" })}>
              T{tnum}
            </button>
          ))}
        </div>
        <div style={{ marginTop:12, display:"flex", gap:10 }}>
          <button onClick={() => setScreen("takeaway")}
            style={btn({ flex:1, background:"linear-gradient(135deg,#1a3a4a,#0d2030)", border:`1px solid #5a9aaa`, color:"#aaddff", padding:"14px 0", fontSize:15, fontWeight:"bold" })}>
            🥡 Takeaway Orders
          </button>
        </div>
      </div>
      <div style={{ width:"100%", maxWidth:420, display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ fontSize:11, color:C.muted, letterSpacing:3, textTransform:"uppercase", marginBottom:2, textAlign:"center" }}>— Staff —</div>
        <button onClick={() => setScreen("kitchen")} style={btn({ width:"100%", background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:14, fontSize:16, fontWeight:"bold" })}>🍳 Kitchen Screen (Food)</button>
        <button onClick={() => setScreen("cashier")} style={btn({ width:"100%", background:`linear-gradient(135deg,#2d6a2d,#1a4a1a)`, border:"none", color:"#aaffaa", padding:14, fontSize:16, fontWeight:"bold" })}>💳 Cashier Screen (Drinks + Payment)</button>
        <button onClick={() => setScreen("qrcodes")} style={btn({ width:"100%", background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:14, fontSize:15 })}>📱 View & Print QR Codes</button>
        <button onClick={() => setScreen("admin")} style={btn({ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.muted, padding:12, fontSize:13 })}>⚙️ Admin — Manage Menu</button>
        <button onClick={() => setScreen("sales")} style={btn({ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.muted, padding:12, fontSize:13 })}>💰 Daily Sales Summary</button>
      </div>
    </div>
  );
}

function TakeawayScreen({ setScreen, setTableNo, goHome }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", gap:28, padding:24 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48 }}>🥡</div>
        <div style={{ fontSize:24, color:C.goldLight, fontWeight:"bold", letterSpacing:2 }}>Takeaway Orders</div>
        <div style={{ fontSize:12, color:C.muted, letterSpacing:3, textTransform:"uppercase", marginTop:4 }}>Select order type & slot</div>
      </div>

      {/* Eat Here / Sitting Takeaway */}
      <div style={{ width:"100%", maxWidth:460 }}>
        <div style={{ fontSize:12, color:"#aaddff", letterSpacing:3, textTransform:"uppercase", marginBottom:10, textAlign:"center" }}>🪑 Eat Here (Takeaway Box)</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
          {ST_SLOTS.map(slot => (
            <button key={slot} onClick={() => { setTableNo(slot); setScreen("tablet"); }}
              style={btn({ background:"#1a2a3a", border:`1px solid #5a7aaa`, color:"#aaccff", padding:"12px 0", fontSize:13, fontWeight:"bold" })}>
              {slot.replace("ST-","")}
            </button>
          ))}
        </div>
      </div>

      {/* Go Takeaway */}
      <div style={{ width:"100%", maxWidth:460 }}>
        <div style={{ fontSize:12, color:"#aaffcc", letterSpacing:3, textTransform:"uppercase", marginBottom:10, textAlign:"center" }}>🥡 Pack & Go (Takeaway)</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
          {TW_SLOTS.map(slot => (
            <button key={slot} onClick={() => { setTableNo(slot); setScreen("tablet"); }}
              style={btn({ background:"#1a3a2a", border:`1px solid #5aaa7a`, color:"#aaffcc", padding:"12px 0", fontSize:13, fontWeight:"bold" })}>
              {slot.replace("TW-","")}
            </button>
          ))}
        </div>
      </div>

      <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"10px 28px", fontSize:13 })}>← Back</button>
    </div>
  );
}

function AdminScreen({ goHome }) {
  const [authed, setAuthed] = useState(false);
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
  const [form, setForm] = useState({ item_no:"", name:"", category:CATEGORIES[0], price:"", description:"", emoji:"🍽️", image_url:"", is_available:true, addons:[], addon_required:false, promo_start:"", promo_end:"", promo_price:"", promo_drinks:[] });
  const [uploading, setUploading] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [chargeVal, setChargeVal] = useState(parseFloat(localStorage.getItem("service_charge")||"10"));
  const [newStaffPin, setNewStaffPin] = useState("");
  const [newAdminPw, setNewAdminPw] = useState("");
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
  useEffect(() => { if (authed) fetchItems(); }, [authed]);

  const handleLogin = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(false); }
    else setPwError(true);
  };
  const openAdd = () => {
    setForm({ item_no:"", name:"", category:CATEGORIES[0], price:"", description:"", emoji:"🍽️", image_url:"", is_available:true, is_best_seller:false, addons:[], addon_required:false, promo_start:"", promo_end:"", promo_price:"", promo_drinks:[] });
    setEditItem(null); setShowForm(true);
  };
  const openEdit = (item) => {
    setForm({ item_no:item.item_no, name:item.name, category:item.category, price:item.price, description:item.description||"", emoji:item.emoji||"🍽️", image_url:item.image_url||"", is_available:item.is_available!==false, is_best_seller:item.is_best_seller||false, addons:item.addons||[], addon_required:item.addon_required||false, promo_start:item.promo_start||"", promo_end:item.promo_end||"", promo_price:item.promo_price||"", promo_drinks:item.promo_drinks||[] });
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
    const p = { item_no:form.item_no, name:form.name, category:form.category, price:parseFloat(form.price), description:form.description, emoji:form.emoji, image_url:form.image_url, is_available:form.is_available, is_best_seller:form.is_best_seller||false, addons:form.addons||[], addon_required:form.addon_required||false, promo_start:form.promo_start||null, promo_end:form.promo_end||null, promo_price:form.promo_price?parseFloat(form.promo_price):null, promo_drinks:form.promo_drinks||[], promo_active };
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

  if (!authed) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", gap:20 }}>
      <div style={{ fontSize:32 }}>⚙️</div>
      <div style={{ fontSize:20, color:C.goldLight, fontWeight:"bold" }}>Admin Login</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:320 }}>
        <input type="password" placeholder="Enter password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()}
          style={{ background:C.panel, border:`1px solid ${pwError?"#cc4444":C.gold}`, color:C.text, padding:"12px 16px", borderRadius:8, fontSize:15, fontFamily:"Georgia,serif" }} />
        {pwError && <div style={{ color:"#ff7777", fontSize:12, textAlign:"center" }}>Wrong password</div>}
        <button onClick={handleLogin} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:14, fontSize:15, fontWeight:"bold" })}>Login</button>
        <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:10, fontSize:13 })}>← Back</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      {toast && (
        <div style={{ position:"fixed", top:24, left:"50%", transform:"translateX(-50%)", zIndex:99999, background:toast.type==="error"?"#c62828":"#2e7d32", color:"#fff", padding:"14px 28px", borderRadius:12, fontSize:14, fontFamily:"Georgia,serif", fontWeight:"bold", boxShadow:"0 4px 20px rgba(0,0,0,0.4)", display:"flex", alignItems:"center", gap:10, minWidth:280, textAlign:"center", justifyContent:"center" }}>
          {toast.type==="error" ? "❌" : "✅"} {toast.msg}
        </div>
      )}
      {deleteModal && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.75)", zIndex:99998, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:320, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ background:"linear-gradient(135deg,#c62828,#8b0000)", padding:"20px 24px", textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:6 }}>🗑️</div>
              <div style={{ fontSize:18, fontWeight:"bold", color:"#fff", fontFamily:"Georgia,serif" }}>Delete Item?</div>
            </div>
            <div style={{ padding:"20px 24px" }}>
              <div style={{ fontSize:14, color:"#333", fontFamily:"Georgia,serif", textAlign:"center", marginBottom:6 }}>
                Are you sure you want to delete:
              </div>
              <div style={{ fontSize:15, fontWeight:"bold", color:"#c62828", fontFamily:"Georgia,serif", textAlign:"center", marginBottom:16, padding:"10px 14px", background:"#fff3f3", borderRadius:10 }}>
                {deleteModal.name}
              </div>
              <div style={{ fontSize:12, color:"#999", textAlign:"center", marginBottom:20, fontFamily:"Georgia,serif" }}>
                ⚠️ This cannot be undone!
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setDeleteModal(null)}
                  style={{ flex:1, background:"#f5f5f5", border:"1px solid #ddd", color:"#555", padding:"13px 0", fontSize:14, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold" }}>
                  Cancel
                </button>
                <button onClick={confirmDelete}
                  style={{ flex:1, background:"linear-gradient(135deg,#c62828,#8b0000)", border:"none", color:"#fff", padding:"13px 0", fontSize:14, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold", boxShadow:"0 4px 12px rgba(198,40,40,0.4)" }}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ background:C.panel, borderBottom:`2px solid ${C.gold}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:18, color:C.goldLight, fontWeight:"bold" }}>⚙️ Menu Management</div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={openAdd} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"8px 16px", fontSize:13, fontWeight:"bold" })}>+ Add Item</button>
          <button onClick={() => setShowPwForm(s=>!s)} style={btn({ background:showPwForm?"#2d6a2d":"transparent", border:`1px solid ${showPwForm?"#5aaa5a":C.border}`, color:showPwForm?"#aaffaa":C.muted, padding:"8px 12px", fontSize:13 })}>🔑 Passwords</button>
          <button onClick={() => setShowChargeForm(s=>!s)} style={btn({ background:showChargeForm?"#4a3010":"transparent", border:`1px solid ${showChargeForm?C.gold:C.border}`, color:showChargeForm?C.goldLight:C.muted, padding:"8px 12px", fontSize:13 })}>💰 Charges</button>
          <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"8px 12px", fontSize:13 })}>← Back</button>
        </div>
      </div>
      {showForm && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.75)", zIndex:2000, display:"flex", alignItems:"flex-start", justifyContent:"center", overflowY:"auto", padding:"20px 0" }}>
        <div style={{ background:"#0a0804", border:`2px solid ${C.gold}`, borderRadius:16, padding:20, width:"100%", maxWidth:900, margin:"auto", position:"relative" }}>
          <button onClick={() => setShowForm(false)} style={{ position:"absolute", top:12, right:12, background:"transparent", border:"none", color:C.muted, fontSize:24, cursor:"pointer", fontFamily:"Georgia,serif" }}>✕</button>
          <div style={{ fontSize:16, color:C.goldLight, fontWeight:"bold", marginBottom:16 }}>{editItem ? "Edit Item" : "Add New Item"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:12 }}>
            {[["Item No.","item_no","e.g. A1"],["Item Name","name","e.g. Latte"],["Price (RM)","price","e.g. 8.00"],["Emoji","emoji","e.g. ☕"],["Description","description","Short description"]].map(([label,key,ph]) => (
              <div key={key}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{label}</div>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]:e.target.value }))} placeholder={ph} type={key==="price"?"number":"text"} step={key==="price"?"0.10":undefined}
                  style={{ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box" }} />
              </div>
            ))}
            <div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Category</div>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category:e.target.value }))}
                style={{ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box" }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:11, color:C.muted }}>Availability</div>
              <button onClick={() => setForm(f => ({ ...f, is_available:!f.is_available }))}
                style={btn({ background:form.is_available?"#2d6a2d":"#6a2d2d", border:`1px solid ${form.is_available?"#5aaa5a":"#cc4444"}`, color:form.is_available?"#aaffaa":"#ff7777", padding:"6px 16px", fontSize:13, fontWeight:"bold" })}>
                {form.is_available ? "✅ Available" : "❌ Sold Out"}
              </button>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:11, color:C.muted }}>Best Seller</div>
              <button onClick={() => setForm(f => ({ ...f, is_best_seller:!f.is_best_seller }))}
                style={btn({ background:form.is_best_seller?"#8a0008":"transparent", border:`1px solid ${form.is_best_seller?"#e8000d":C.border}`, color:form.is_best_seller?"#fff":C.muted, padding:"6px 16px", fontSize:13, fontWeight:"bold" })}>
                {form.is_best_seller ? "👍 BEST SELLER ON" : "⬜ Best Seller OFF"}
              </button>
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Food Image</div>
            <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
              {form.image_url && <img src={form.image_url} alt="preview" style={{ width:80, height:80, objectFit:"cover", borderRadius:10, border:`1px solid ${C.gold}` }} />}
              <button onClick={() => fileRef.current.click()} style={btn({ background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:"8px 16px", fontSize:13 })}>{uploading ? "Uploading..." : "📷 Upload Image"}</button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleUpload} />
              {form.image_url && <button onClick={() => setForm(f => ({ ...f, image_url:"" }))} style={btn({ background:"transparent", border:"1px solid #cc4444", color:"#ff7777", padding:"8px 12px", fontSize:12 })}>Remove</button>}
            </div>
          </div>
          {/* Add-ons section */}
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:13, color:C.muted, marginBottom:8, fontWeight:"bold" }}>➕ Add-ons (optional extras customer can select)</div>
            {(form.addons||[]).map((addon, ai) => (
              <div key={ai} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                <input value={addon.name} onChange={e => { const u=[...form.addons]; u[ai]={...u[ai],name:e.target.value}; setForm(f=>({...f,addons:u})); }} placeholder="e.g. Tiger Beer"
                  style={{ flex:2, minWidth:120, background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"7px 12px", borderRadius:8, fontSize:13, fontFamily:"Georgia,serif" }} />
                <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                  <div style={{ fontSize:10, color:C.muted }}>Normal Price</div>
                  <input value={addon.price} onChange={e => { const u=[...form.addons]; u[ai]={...u[ai],price:e.target.value}; setForm(f=>({...f,addons:u})); }} placeholder="RM" type="number" step="0.50"
                    style={{ width:90, background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"7px 10px", borderRadius:8, fontSize:13, fontFamily:"Georgia,serif" }} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                  <div style={{ fontSize:10, color:"#e8c77a" }}>Happy Hour Price</div>
                  <input value={addon.promo_price||""} onChange={e => { const u=[...form.addons]; u[ai]={...u[ai],promo_price:e.target.value}; setForm(f=>({...f,addons:u})); }} placeholder="optional" type="number" step="0.50"
                    style={{ width:90, background:"#1a1208", border:`1px solid ${C.gold}`, color:C.goldLight, padding:"7px 10px", borderRadius:8, fontSize:13, fontFamily:"Georgia,serif" }} />
                </div>
                <button onClick={() => setForm(f=>({...f,addons:f.addons.map((a,i)=>i===ai?{...a,sold_out:!a.sold_out}:a)}))}
                  style={btn({ background:addon.sold_out?"#6a2d2d":"transparent", border:`1px solid ${addon.sold_out?"#cc4444":C.border}`, color:addon.sold_out?"#ff7777":C.muted, padding:"6px 10px", fontSize:12, fontWeight:"bold" })}>
                  {addon.sold_out?"❌ Out":"✅"}
                </button>
                <button onClick={() => setForm(f=>({...f,addons:f.addons.filter((_,i)=>i!==ai)}))}
                  style={btn({ background:"transparent", border:"1px solid #cc4444", color:"#ff7777", padding:"6px 10px", fontSize:13 })}>✕</button>
              </div>
            ))}
            <button onClick={() => setForm(f=>({...f,addons:[...(f.addons||[]),{name:"",price:""}]}))}
              style={btn({ background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:"7px 16px", fontSize:13 })}>+ Add Option</button>
            {(form.addons||[]).length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10 }}>
                <button onClick={() => setForm(f=>({...f, addon_required:!f.addon_required}))}
                  style={btn({ background:form.addon_required?"#2d6a2d":"transparent", border:`1px solid ${form.addon_required?"#5aaa5a":C.border}`, color:form.addon_required?"#aaffaa":C.muted, padding:"6px 14px", fontSize:12, fontWeight:"bold" })}>
                  {form.addon_required ? "✅ Must Select One" : "⬜ Optional (multi-select)"}
                </button>
                <span style={{ fontSize:11, color:C.muted }}>e.g. beer brand = Must Select One</span>
              </div>
            )}
          </div>
          <div style={{ marginTop:16, background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
            <div style={{ fontSize:13, color:C.goldLight, marginBottom:12, fontWeight:"bold" }}>⏰ Time-Based Promo (optional)</div>
            <div style={{ display:"flex", gap:12, alignItems:"flex-end", flexWrap:"wrap", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Promo Start</div>
                <input type="time" value={form.promo_start} onChange={e => setForm(f=>({...f, promo_start:e.target.value}))}
                  style={{ background:"#1a1208", border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif" }} />
              </div>
              <div>
                <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Promo End</div>
                <input type="time" value={form.promo_end} onChange={e => setForm(f=>({...f, promo_end:e.target.value}))}
                  style={{ background:"#1a1208", border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif" }} />
              </div>
              <div>
                <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Happy Hour Price (RM)</div>
                <input type="number" step="0.50" placeholder="e.g. 10.00" value={form.promo_price} onChange={e => setForm(f=>({...f, promo_price:e.target.value}))}
                  style={{ width:120, background:"#1a1208", border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif" }} />
              </div>
            </div>
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Free Drink Options (e.g. for breakfast promo — customer picks one)</div>
              {(form.promo_drinks||[]).map((drink, di) => (
                <div key={di} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                  <input value={drink} onChange={e => { const u=[...form.promo_drinks]; u[di]=e.target.value; setForm(f=>({...f,promo_drinks:u})); }} placeholder="e.g. Coffee"
                    style={{ flex:1, background:"#1a1208", border:`1px solid ${C.border}`, color:C.text, padding:"7px 12px", borderRadius:8, fontSize:13, fontFamily:"Georgia,serif" }} />
                  <button onClick={() => setForm(f=>({...f,promo_drinks:f.promo_drinks.filter((_,i)=>i!==di)}))}
                    style={btn({ background:"transparent", border:"1px solid #cc4444", color:"#ff7777", padding:"6px 10px", fontSize:13 })}>✕</button>
                </div>
              ))}
              <button onClick={() => setForm(f=>({...f,promo_drinks:[...(f.promo_drinks||[]),""]}))}
                style={btn({ background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:"6px 14px", fontSize:12 })}>+ Add Free Drink Option</button>
            </div>
            <div style={{ fontSize:11, color:C.muted }}>
              💡 Happy Hour Price: auto-switches price during promo time · Free Drinks: customer picks a free drink when adding this item
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button onClick={() => setShowForm(false)} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"10px 20px", fontSize:13 })}>Cancel</button>
            <button onClick={handleSave} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"10px 28px", fontSize:14, fontWeight:"bold" })}>{editItem ? "Save Changes" : "Add Item"} ✓</button>
          </div>
        </div>
        </div>
      )}
      <div ref={scrollRef} style={{ flex:1, padding:16, overflowY:"auto" }}>
        {showChargeForm && (
          <div style={{ background:C.panel, border:`1px solid ${C.gold}`, borderRadius:12, padding:20, marginBottom:20 }}>
            <div style={{ fontSize:15, color:C.goldLight, fontWeight:"bold", marginBottom:16 }}>💰 Service Charge Settings</div>
            <div style={{ display:"flex", gap:16, alignItems:"flex-end", flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Service Charge (%)</div>
                <input type="number" step="0.5" min="0" max="20" value={chargeVal}
                  onChange={e => setChargeVal(e.target.value)}
                  style={{ width:100, background:C.bg, border:`1px solid ${C.gold}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:16, fontFamily:"Georgia,serif" }} />
              </div>
              <button onClick={() => { localStorage.setItem("service_charge", chargeVal); setShowChargeForm(false); }}
                style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"10px 24px", fontSize:13, fontWeight:"bold" })}>Save ✓</button>
              <button onClick={() => setShowChargeForm(false)}
                style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"10px 20px", fontSize:13 })}>Cancel</button>
            </div>
            <div style={{ fontSize:11, color:C.muted, marginTop:10 }}>💡 Set to 0 for no service charge. Current: {parseFloat(localStorage.getItem("service_charge")||"10")}%</div>
          </div>
        )}
        {showPwForm && (
          <div style={{ background:C.panel, border:`1px solid ${C.gold}`, borderRadius:12, padding:20, marginBottom:20 }}>
            <div style={{ fontSize:15, color:C.goldLight, fontWeight:"bold", marginBottom:16 }}>🔑 Change Passwords</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:16 }}>
              <div style={{ background:"#1a1208", borderRadius:10, padding:16 }}>
                <div style={{ fontSize:13, color:C.muted, marginBottom:10, fontWeight:"bold" }}>🔐 Staff Home PIN</div>
                <input type="password" placeholder="New PIN" value={newStaffPin} onChange={e=>setNewStaffPin(e.target.value)}
                  style={{ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box", marginBottom:8 }} />
                <button onClick={() => { if(newStaffPin){ localStorage.setItem("staff_pin", newStaffPin); setNewStaffPin(""); showToast("Staff PIN updated! Reload page to apply."); }}}
                  style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"8px 16px", fontSize:13, fontWeight:"bold" })}>Save PIN</button>
              </div>
              <div style={{ background:"#1a1208", borderRadius:10, padding:16 }}>
                <div style={{ fontSize:13, color:C.muted, marginBottom:10, fontWeight:"bold" }}>⚙️ Admin Password</div>
                <input type="password" placeholder="New Password" value={newAdminPw} onChange={e=>setNewAdminPw(e.target.value)}
                  style={{ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box", marginBottom:8 }} />
                <button onClick={() => { if(newAdminPw){ localStorage.setItem("admin_pw", newAdminPw); setNewAdminPw(""); showToast("Admin password updated! Reload page to apply."); }}}
                  style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"8px 16px", fontSize:13, fontWeight:"bold" })}>Save Password</button>
              </div>
            </div>
            <div style={{ fontSize:11, color:C.muted, marginTop:12 }}>💡 Passwords saved on this device. Reload page after changing.</div>
          </div>
        )}
        {loading ? <div style={{ color:C.muted, textAlign:"center", padding:40 }}>Loading...</div> :
          CATEGORIES.map(cat => {
            const catItems = items.filter(i => i.category===cat);
            return (
              <div key={cat} style={{ marginBottom:24 }}>
                <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>
                  {cat} ({catItems.length}) — {DRINK_CATEGORIES.includes(cat) ? "☕ Cashier serves" : "🍳 Kitchen prepares"}
                </div>
                {catItems.length===0 && <div style={{ color:C.border, fontSize:13 }}>No items yet</div>}
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {catItems.map(item => (
                    <div key={item.id} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:14 }}>
                      {item.image_url ? <img src={item.image_url} alt={item.name} style={{ width:56, height:56, objectFit:"cover", borderRadius:8, flexShrink:0 }} />
                        : <div style={{ width:56, height:56, background:"#241508", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0 }}>{item.emoji}</div>}
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <span style={{ background:C.gold, color:C.dark, borderRadius:4, padding:"1px 7px", fontSize:11, fontWeight:"bold" }}>#{item.item_no}</span>
                          <span style={{ fontWeight:"bold", fontSize:14 }}>{item.name}</span>
                          {item.is_available===false && <span style={{ background:"#6a2d2d", color:"#ff7777", borderRadius:4, padding:"1px 7px", fontSize:11, fontWeight:"bold" }}>SOLD OUT</span>}
                        </div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{item.description}</div>
                        <div style={{ fontSize:14, color:C.gold, fontWeight:"bold", marginTop:2 }}>RM {parseFloat(item.price).toFixed(2)}</div>
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                        <button onClick={() => toggleAvailable(item)} style={btn({ background:item.is_available!==false?"#2d6a2d":"#6a2d2d", border:`1px solid ${item.is_available!==false?"#5aaa5a":"#cc4444"}`, color:item.is_available!==false?"#aaffaa":"#ff7777", padding:"5px 10px", fontSize:11, fontWeight:"bold" })}>
                          {item.is_available!==false ? "✅ Available" : "❌ Sold Out"}
                        </button>
                        <button onClick={() => supabase.from("menu_items").update({ is_best_seller:!item.is_best_seller }).eq("id", item.id).then(fetchItems)}
                          style={btn({ background:item.is_best_seller?"#8a0008":"transparent", border:`1px solid ${item.is_best_seller?"#e8000d":C.border}`, color:item.is_best_seller?"#fff":C.muted, padding:"5px 10px", fontSize:11, fontWeight:"bold" })}>
                          {item.is_best_seller ? "👍 Best Seller" : "⬜ Best Seller"}
                        </button>
                        <button onClick={() => openEdit(item)} style={btn({ background:"transparent", border:`1px solid ${C.gold}`, color:C.goldLight, padding:"6px 12px", fontSize:12 })}>✏️ Edit</button>
                        <button onClick={() => handleDelete(item.id)} style={btn({ background:"transparent", border:"1px solid #cc4444", color:"#ff7777", padding:"6px 12px", fontSize:12 })}>🗑️</button>
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
  const [editRequestModal, setEditRequestModal] = useState(null); // {orderId, request}
  const [cartEditModal, setCartEditModal] = useState(null); // {cartKey, note, name}
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.from("table_sessions").select("session_id").eq("table_no", tableNo).single();

      if (!data) {
        // No server session — first ever QR scan for this table
        const s = Date.now().toString();
        await supabase.from("table_sessions").upsert({ table_no:tableNo, session_id:s, updated_at:new Date().toISOString() });
        sessionStorage.setItem(`ss_table_${tableNo}`, s);
        return;
      }

      const session_id = data.session_id;

      if (session_id.startsWith("paid_")) {
        // Server says table was paid
        // Check sessionStorage — it survives refresh but clears on browser close
        const ss = sessionStorage.getItem(`ss_table_${tableNo}`);
        if (ss) {
          // sessionStorage exists = this is a REFRESH after seeing paid screen
          // Keep showing expired
          setSessionExpired(true); return;
        }
        // sessionStorage empty = either:
        // A) Fresh QR scan (new customer) → allow ordering
        // B) Close & reopen browser → also looks same as A
        // 
        // To distinguish A from B: check performance.navigation
        // Fresh QR scan = navigate type (0 or "navigate")
        // Close & reopen = also navigate type unfortunately...
        //
        // SOLUTION: When we show expired screen, set a sessionStorage flag
        // If customer closes browser, sessionStorage clears
        // If customer scans QR fresh, no sessionStorage → allow
        // If customer reopens browser (no scan), no sessionStorage → BUT server still "paid_"
        // → We allow them in (can't distinguish from fresh scan)
        // This is acceptable — they still see an empty table with no previous orders
        const s = Date.now().toString();
        await supabase.from("table_sessions").upsert({ table_no:tableNo, session_id:s, updated_at:new Date().toISOString() });
        sessionStorage.setItem(`ss_table_${tableNo}`, s);
        return;
      }

      // Active session on server
      const ss = sessionStorage.getItem(`ss_table_${tableNo}`);
      if (!ss) {
        // No sessionStorage — browser was closed and reopened while session was active
        // Server session still valid, store in sessionStorage and allow
        sessionStorage.setItem(`ss_table_${tableNo}`, session_id);
      }
      // Allow ordering
    };
    initSession();
    const ch = supabase.channel(`session-${tableNo}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"table_sessions", filter:`table_no=eq.${tableNo}` }, (payload) => {
        if (payload.new?.session_id?.startsWith("paid_")) {
          // Mark in sessionStorage so refresh also shows expired
          sessionStorage.setItem(`ss_table_${tableNo}`, "expired");
          setSessionExpired(true);
        }
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [tableNo]);

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
    const fetchMyOrders = async () => {
      const { data } = await supabase.from("orders").select("*").eq("table_no", tableNo)
        .not("status", "in", '("cancelled","paid")').order("created_at", { ascending:true });
      setMyOrders(data || []);
    };
    fetchMyOrders();
    const ch = supabase.channel(`table-${tableNo}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"orders", filter:`table_no=eq.${tableNo}` }, fetchMyOrders).subscribe();
    return () => supabase.removeChannel(ch);
  }, [tableNo]);

  const addToCart = (item, freeDrink=null, selectedAddons=[], note="", qty=1) => {
    const addonPrice = selectedAddons.reduce((s,a) => {
      const usePromo = isPromoNow(item) && a.promo_price && parseFloat(a.promo_price) > 0;
      return s + parseFloat(usePromo ? a.promo_price : (a.price||0));
    }, 0);
    const basePrice = item.addon_required ? 0 : parseFloat(item.price);
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
    try {
      const drinkReq = drinkRequest.trim() || null;
      const foodReq = foodRequest.trim() || null;
      const time = new Date().toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit"});
      // Get today's order count for sequence number
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase.from("orders").select("*", { count:"exact", head:true })
        .gte("created_at", today + "T00:00:00").lt("created_at", today + "T23:59:59");
      const seq = String((count || 0) + 1).padStart(3, "0");

      const cleanItems = (items) => items.map(i => { const {cartKey, basePrice, ...rest} = i; return rest; });
      const drinkItems = cleanItems(cartItems.filter(i => DRINK_CATEGORIES.includes(i.category)));
      const foodItems = cleanItems(cartItems.filter(i => FOOD_CATEGORIES.includes(i.category)));

      const ordersToInsert = [];

      if (drinkItems.length > 0) {
        const drinkTotal = drinkItems.reduce((s,i) => s+i.price*i.qty, 0);
        ordersToInsert.push({
          table_no:tableNo, items:drinkItems, subtotal:drinkTotal, tax:0,
          total:drinkTotal, status:"pending",
          special_request:drinkReq, time, order_seq:seq
        });
      }

      if (foodItems.length > 0) {
        const foodTotal = foodItems.reduce((s,i) => s+i.price*i.qty, 0);
        ordersToInsert.push({
          table_no:tableNo, items:foodItems, subtotal:foodTotal, tax:0,
          total:foodTotal, status:"pending",
          special_request:foodReq, time, order_seq:seq
        });
      }

      await supabase.from("orders").insert(ordersToInsert);
      setCart({}); setDrinkRequest(""); setFoodRequest(""); setView("orders");
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
      <div style={{ background:"linear-gradient(135deg, #2a1010, #1a0808)", padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, borderBottom:"2px solid #c8973a" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {isStaff && <button onClick={goHome} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.4)", color:"#fff", borderRadius:8, padding:"6px 12px", fontSize:13 }}>← Back</button>}
          <div>
            <div style={{ fontSize:18, fontWeight:"bold", color:"#fff" }}>☕ {CAFE_NAME}</div>
            <div style={{ fontSize:13, color:"#ffe099" }}>{isTakeaway(tableNo) ? takeawayLabel(tableNo).toUpperCase() : `TABLE ${tableNo}`}</div>
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
      </div>

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
                    {order.items.map((item,i) => (
                      <div key={i} style={{ marginBottom:6 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:16 }}>
                          <span style={{ color:isPending?T.text:T.muted }}>
                            {item.item_no && <span style={{ color:T.brown, fontWeight:"bold", marginRight:4 }}>{item.item_no}</span>}
                            {item.name}
                          </span>
                          <span style={{ color:T.brown, fontWeight:"bold" }}>×{item.qty}</span>
                        </div>

                      </div>
                    ))}
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
            <div style={{ display:"flex", background:"#1a1208", borderBottom:"1px solid #4a2020", overflowX:"auto", flexShrink:0 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:activeCategory===cat?"#c8973a":"transparent", border:"none", color:activeCategory===cat?"#1a1208":"#a07060", padding:"14px 18px", fontSize:15, fontWeight:activeCategory===cat?"bold":"normal", whiteSpace:"nowrap", flexShrink:0, borderBottom:activeCategory===cat?"3px solid #a07020":"3px solid transparent" }}>
                  {cat==="Beverage"?t.beverage:cat==="Food & Snacks"?t.food:cat==="Desserts"?t.desserts:t.addons}
                </button>
              ))}
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
                        style={{ background:"#fff", border:qty>0?`2px solid ${T.brown}`:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden", position:"relative", opacity:soldOut?0.5:1, boxShadow:T.shadow, display:"flex", flexDirection:"column", cursor:soldOut?"default":"pointer" }}>

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
                          <div style={{ fontWeight:"bold", fontSize:13, marginBottom:6, color:T.text, lineHeight:1.3, flex:1 }}>
                            {item.item_no && <span style={{ color:T.brown, marginRight:4, fontSize:12 }}>{item.item_no}</span>}{item.name}
                          </div>

                          {/* Price + button row */}
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"auto" }}>
                            {/* Price */}
                            <div style={{ fontSize:13, fontWeight:"bold", color:T.brown, flexShrink:0 }}>
                              {item.addon_required && item.addons && item.addons.length > 0
                                ? `RM ${Math.min(...item.addons.map(a=>parseFloat(a.price||0))).toFixed(2)}+`
                                : `RM ${parseFloat(item.price).toFixed(2)}`}
                            </div>

                            {soldOut ? null : qty === 0 ? (
                              /* + button */
                              <button onClick={e => { e.stopPropagation(); handleAddItem(item); }}
                                style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:T.brown, border:"none", color:"#fff", width:34, height:34, fontSize:22, fontWeight:"bold", borderRadius:50, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 2px 6px rgba(138,90,0,0.3)" }}>+</button>
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

                          {/* Promo badges */}
                          {isPromoNow(item) && item.promo_drinks && item.promo_drinks.length > 0 && (
                            <div style={{ fontSize:10, color:T.green, fontWeight:"bold", marginTop:4 }}>{t.withFreeDrinks}</div>
                          )}
                          {isPromoNow(item) && item.addons && item.addons.some(a => a.promo_price && parseFloat(a.promo_price) > 0) && (
                            <div style={{ fontSize:10, color:"#e65100", fontWeight:"bold", marginTop:4 }}>{t.happyHour}</div>
                          )}
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
            const addonPrice = itemModal.selectedAddons.reduce((s,a) => {
              const usePromo = isPromoNow(item) && a.promo_price && parseFloat(a.promo_price) > 0;
              return s + parseFloat(usePromo ? a.promo_price : (a.price||0));
            }, 0);
            const basePrice = item.addon_required ? 0 : parseFloat(item.price);
            const unitPrice = basePrice + addonPrice;
            const totalPrice = unitPrice * itemModal.qty;
            const canAdd = !soldOut && (!item.addon_required || itemModal.selectedAddons.length > 0);
            return (
              <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.65)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={() => setItemModal(null)}>
                <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:520, height:"min(92vh, 680px)", display:"flex", flexDirection:"column", overflow:"hidden" }}>

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
                  <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 0", WebkitOverflowScrolling:"touch" }}>
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
                        <div style={{ fontSize:14, fontWeight:"bold", color:"#e65100" }}>🎉 {t.breakfastPromo}</div>
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
                                {parseFloat(addon.price||0) > 0 ? `+RM ${parseFloat(addon.price||0).toFixed(2)}` : ""}
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
                      style={{ flex:1, background:canAdd?"linear-gradient(135deg,#c8973a,#a07020)":"#ccc", border:"none", color:canAdd?"#1a1208":"#fff", padding:"14px 0", fontSize:17, fontWeight:"bold", borderRadius:50, cursor:canAdd?"pointer":"not-allowed", fontFamily:"Georgia,serif", boxShadow:canAdd?"0 4px 12px rgba(138,90,0,0.35)":"none" }}>
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
                        {isPromoNow(addonModal.item) && addon.promo_price && parseFloat(addon.promo_price) > 0 ? (
                          <span>
                            <span style={{ textDecoration:"line-through", opacity:0.5, fontSize:11, marginRight:4 }}>RM {parseFloat(addon.price||0).toFixed(2)}</span>
                            <span style={{ color:"#e65100" }}>RM {parseFloat(addon.promo_price).toFixed(2)}</span>
                          </span>
                        ) : (
                          parseFloat(addon.price||0) > 0 ? `RM ${parseFloat(addon.price||0).toFixed(2)}` : ""
                        )}
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
              style={{ width:"100%", maxWidth:500, display:"block", margin:"0 auto", background:cartItems.length===0?"#ccc":isSubmitting?"#a0836a":"linear-gradient(135deg,#c8973a,#a07020)", border:"none", color:"#1a1208", padding:"18px 0", fontSize:19, fontWeight:"bold", borderRadius:16, cursor:(isSubmitting||cartItems.length===0)?"not-allowed":"pointer", fontFamily:"Georgia,serif", boxShadow:cartItems.length>0?"0 4px 20px rgba(138,90,0,0.4)":"none" }}>
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
      <div style={{ background:C.panel, borderBottom:`2px solid ${C.gold}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:18, color:C.goldLight, fontWeight:"bold" }}>📱 QR Codes for Tables</div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => window.print()} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"8px 16px", fontSize:13, fontWeight:"bold" })}>🖨️ Print All</button>
          <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 14px", fontSize:13 })}>← Back</button>
        </div>
      </div>
      <div style={{ padding:20 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:16 }}>
          {TABLES.map(tnum => (
            <div key={tnum} style={{ background:C.panel, border:`1px solid ${C.gold}`, borderRadius:14, padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:16, fontWeight:"bold", color:C.goldLight }}>TABLE {tnum}</div>
              <QRCode url={`${baseUrl}?table=${tnum}`} size={140} />
              <div style={{ fontSize:10, color:C.muted, textAlign:"center", fontFamily:"monospace", wordBreak:"break-all" }}>{baseUrl}?table={tnum}</div>
              <button onClick={() => printOne(tnum)} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"7px 20px", fontSize:13, fontWeight:"bold", width:"100%" })}>🖨️ Print</button>
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
  const prevPendingCount = useRef(0);
  const soundOnRef = useRef(localStorage.getItem("k_sound") !== "off");
  const voiceOnRef = useRef(localStorage.getItem("k_voice") === "on");
  const voiceLangRef = useRef(localStorage.getItem("k_voice_lang") || "en");

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

  const fetchAll = async () => {
    const { data:o } = await supabase.from("orders").select("*").order("created_at", { ascending:true });
    const newOrders = o||[];
    const filtered = newOrders.map(order => ({
      ...order,
      items: order.items.filter(item => FOOD_CATEGORIES.includes(item.category))
    })).filter(order => order.items.length > 0);
    const newPending = filtered.filter(x => x.status==="pending").length;
    if ((soundOnRef.current || voiceOnRef.current) && newPending > prevPendingCount.current) {
      const newOrders = filtered.filter(x => x.status==="pending").slice(prevPendingCount.current);
      const tableNo = newOrders[0]?.table_no;
      playAlert(tableNo);
    }
    prevPendingCount.current = newPending;
    setOrders(filtered);
  };

  useEffect(() => {
    fetchAll();
    const ch1 = supabase.channel("orders-ch").on("postgres_changes", { event:"*", schema:"public", table:"orders" }, fetchAll).subscribe();
    return () => { supabase.removeChannel(ch1); };
  }, []);

  const markDone = (id) => supabase.from("orders").update({ status:"done" }).eq("id", id).then(fetchAll);
  const clearFinished = () => supabase.from("orders").delete().in("status", ["cancelled"]).then(fetchAll);

  const pending   = orders.filter(o => o.status==="pending");
  const done      = orders.filter(o => o.status==="done");
  const cancelled = orders.filter(o => o.status==="cancelled");

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.panel, borderBottom:`2px solid ${C.gold}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:18, color:C.goldLight, fontWeight:"bold" }}>🍳 Kitchen Screen — Food Only</div>
          <div style={{ fontSize:11, color:"#ff4444" }}>🔴 Live — updates instantly</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={toggleSound} style={btn({ background:soundOn?"#2d6a2d":"transparent", border:`1px solid ${soundOn?"#5aaa5a":C.border}`, color:soundOn?"#aaffaa":C.muted, padding:"7px 12px", fontSize:12 })}>
            {soundOn ? "🔔 Sound On" : "🔕 Sound Off"}
          </button>
          <button onClick={toggleVoice} style={btn({ background:voiceOn?"#1a4a6a":"transparent", border:`1px solid ${voiceOn?"#5aaa5a":C.border}`, color:voiceOn?"#aaddff":C.muted, padding:"7px 12px", fontSize:12 })}>
            {voiceOn ? "🔊 Voice On" : "🔇 Voice Off"}
          </button>
          {voiceOn && (
            <button onClick={toggleVoiceLang} style={btn({ background:"#3a2a00", border:`1px solid ${C.gold}`, color:C.goldLight, padding:"7px 12px", fontSize:12, fontWeight:"bold" })}>
              {voiceLang === "en" ? "🇬🇧 EN" : "🇨🇳 中文"}
            </button>
          )}
          {cancelled.length>0 && <button onClick={clearFinished} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 12px", fontSize:12 })}>Clear Cancelled</button>}
          <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 10px", fontSize:12 })}>✕</button>
        </div>
      </div>
      <div style={{ flex:1, padding:16, overflowY:"auto" }}>
        <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>🟡 Pending Food ({pending.length})</div>
        {pending.length===0 && <div style={{ color:C.muted, textAlign:"center", padding:40 }}>All clear! ✅</div>}
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
                {order.items.map((item,i) => (
                  <div key={i} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:14 }}>
                      <span>{item.emoji||"🍽️"} {item.item_no && <span style={{ color:C.gold, fontWeight:"bold", marginRight:4 }}>{item.item_no}</span>}{item.name}</span>
                      <span style={{ color:C.gold, fontWeight:"bold" }}>×{item.qty}</span>
                    </div>
                    {item.note && <div style={{ fontSize:12, color:"#ffcc44", background:"#2a1a00", borderRadius:6, padding:"4px 8px", marginTop:3 }}>📝 {item.note}</div>}
                  </div>
                ))}
                {getFoodReq(order.special_request) && (
                  <div style={{ background:"#2a1a00", border:"1px solid #c8973a44", borderRadius:6, padding:"6px 10px", marginTop:6, fontSize:12, color:C.gold }}>📝 {getFoodReq(order.special_request)}</div>
                )}
              </div>
              <div style={{ borderTop:`1px solid ${C.border}`, marginTop:10, paddingTop:10, display:"flex", justifyContent:"flex-end" }}>
                <button onClick={e => { e.stopPropagation(); markDone(order.id); }} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"8px 20px", fontSize:14, fontWeight:"bold" })}>Done ✓</button>
              </div>
            </div>
          ))}
        </div>
        {done.length>0 && <>
          <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>✅ Done ({done.length})</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:10, marginBottom:20 }}>
            {done.map(o => (
              <div key={o.id} style={{ background:"#1a2c1a", border:"1px solid #3a6a3a", borderRadius:12, padding:12, opacity:0.8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span style={{ color:"#5aaa5a", fontWeight:"bold" }}>Table {o.table_no}</span><span style={{ fontSize:11, color:C.muted }}>{o.time}</span></div>
                {o.items.map((item,i) => <div key={i} style={{ fontSize:12, color:C.muted, marginBottom:3 }}>{item.emoji||"🍽️"} {item.item_no && <span style={{ color:"#5aaa5a", fontWeight:"bold", marginRight:3 }}>{item.item_no}</span>}{item.name} ×{item.qty}</div>)}
              </div>
            ))}
          </div>
        </>}
        {cancelled.length>0 && <>
          <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>❌ Cancelled ({cancelled.length})</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:10, marginBottom:20 }}>
            {cancelled.map(o => (
              <div key={o.id} style={{ background:"#2a1a1a", border:"1px solid #5a2a2a", borderRadius:12, padding:12, opacity:0.7 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span style={{ color:"#ff7777", fontWeight:"bold" }}>Table {o.table_no}</span><span style={{ fontSize:11, color:C.muted }}>{o.time}</span></div>
                {o.items.map((item,i) => <div key={i} style={{ fontSize:12, color:C.muted, marginBottom:3 }}>{item.emoji||"🍽️"} {item.item_no && <span style={{ color:"#ff7777", fontWeight:"bold", marginRight:3 }}>{item.item_no}</span>}{item.name} ×{item.qty}</div>)}
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
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.95)", zIndex:9000, display:"flex", flexDirection:"column" }}>
          {/* Header */}
          <div style={{ background:"#2c1a0e", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`2px solid ${C.gold}`, flexShrink:0 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                {liveOrder.order_seq && <span style={{ background:C.gold, color:C.dark, borderRadius:6, padding:"3px 10px", fontSize:16, fontWeight:"bold" }}>#{liveOrder.order_seq}</span>}
                <div style={{ fontSize:28, fontWeight:"bold", color:C.goldLight }}>{isTakeaway(liveOrder.table_no) ? takeawayLabel(liveOrder.table_no) : `Table ${liveOrder.table_no}`}</div>
              </div>
              <div style={{ fontSize:13, color:C.muted }}>🍳 Food Order · {liveOrder.time}</div>
            </div>
            <button onClick={() => setKitchenDetailModal(null)}
              style={btn({ background:"rgba(255,255,255,0.1)", border:`1px solid ${C.border}`, color:"#fff", width:46, height:46, fontSize:22, borderRadius:50 })}>✕</button>
          </div>

          {/* Items */}
          <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
            {liveOrder.items.map((item, i) => (
              <div key={i} style={{ marginBottom:16, padding:"16px", background:C.panel, borderRadius:14, border:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:22, fontWeight:"bold", color:C.goldLight }}>
                    {item.emoji||"🍽️"} {item.item_no && <span style={{ color:C.gold, marginRight:6 }}>{item.item_no}</span>}{item.name}
                  </div>
                  <div style={{ fontSize:28, fontWeight:"bold", color:C.gold }}>×{item.qty}</div>
                </div>
                {item.note && (
                  <div style={{ fontSize:16, color:"#ffcc44", background:"#2a1a00", borderRadius:8, padding:"10px 14px", marginTop:10 }}>📝 {item.note}</div>
                )}
              </div>
            ))}
            {getFoodReq(liveOrder.special_request) && (
              <div style={{ fontSize:16, color:C.gold, background:"#2a1a00", borderRadius:10, padding:"12px 16px", marginTop:8 }}>📝 {getFoodReq(liveOrder.special_request)}</div>
            )}
          </div>

          {/* Done button */}
          <div style={{ padding:"16px 20px", background:"#0f0a04", borderTop:`2px solid ${C.border}`, flexShrink:0 }}>
            {liveOrder.status === "pending" ? (
              <button onClick={() => { markDone(liveOrder.id); setKitchenDetailModal(null); }}
                style={btn({ width:"100%", background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"18px 0", fontSize:20, fontWeight:"bold", borderRadius:14 })}>
                ✓ Mark as Done
              </button>
            ) : (
              <div style={{ textAlign:"center", color:"#5aaa5a", fontSize:18, fontWeight:"bold", padding:"14px 0" }}>✅ Already Done</div>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

function SalesScreen({ goHome }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      const { data } = await supabase.from("orders").select("*").eq("status","paid").order("created_at",{ascending:true});
      const filtered = (data||[]).filter(o => new Date(o.created_at).toLocaleDateString("en-CA")===selectedDate);
      setOrders(filtered); setLoading(false);
    };
    fetchSales();
  }, [selectedDate]);

  const totalRevenue = orders.reduce((s,o) => s+o.total, 0);
  const totalOrders  = orders.length;
  const itemCount = {};
  orders.forEach(o => o.items.forEach(item => {
    if (!itemCount[item.name]) itemCount[item.name] = { name:item.name, emoji:item.emoji||"🍽️", qty:0, revenue:0 };
    itemCount[item.name].qty += item.qty; itemCount[item.name].revenue += item.price*item.qty;
  }));
  const topItems = Object.values(itemCount).sort((a,b) => b.qty-a.qty);
  const byTable = {};
  orders.forEach(o => { if (!byTable[o.table_no]) byTable[o.table_no]={count:0,total:0}; byTable[o.table_no].count++; byTable[o.table_no].total+=o.total; });

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.panel, borderBottom:`2px solid ${C.gold}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:18, color:C.goldLight, fontWeight:"bold" }}>💰 Daily Sales Summary</div>
        <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 14px", fontSize:13 })}>← Back</button>
      </div>
      <div style={{ padding:16, overflowY:"auto", flex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ fontSize:13, color:C.muted }}>Date:</div>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ background:C.panel, border:`1px solid ${C.gold}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif" }} />
        </div>
        {loading ? <div style={{ color:C.muted, textAlign:"center", padding:40 }}>Loading...</div> : <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px,1fr))", gap:12, marginBottom:24 }}>
            {[["RM "+totalRevenue.toFixed(2),"Total Revenue",C.gold],[""+totalOrders,"Orders Completed",C.border],["RM "+(totalOrders>0?(totalRevenue/totalOrders).toFixed(2):"0.00"),"Avg Order Value",C.border]].map(([val,label,border]) => (
              <div key={label} style={{ background:C.panel, border:`1px solid ${border}`, borderRadius:12, padding:16, textAlign:"center" }}>
                <div style={{ fontSize:22, color:C.goldLight, fontWeight:"bold" }}>{val}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>
          {orders.length===0 ? <div style={{ color:C.muted, textAlign:"center", padding:40 }}>No completed orders for this date</div> : <>
            <div style={{ fontSize:13, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>🏆 Top Selling Items</div>
            <div style={{ background:C.panel, borderRadius:12, overflow:"hidden", marginBottom:24 }}>
              {topItems.map((item,i) => (
                <div key={item.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderBottom:i<topItems.length-1?`1px solid ${C.border}`:"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:18, minWidth:24, textAlign:"center" }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":"  "}</span>
                    <span style={{ fontSize:13 }}>{item.emoji} {item.name}</span>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:13, color:C.goldLight, fontWeight:"bold" }}>{item.qty} sold</div>
                    <div style={{ fontSize:11, color:C.muted }}>RM {item.revenue.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:13, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>🪑 Sales by Table</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px,1fr))", gap:10, marginBottom:24 }}>
              {Object.entries(byTable).sort((a,b) => parseInt(a[0])-parseInt(b[0])).map(([tno,data]) => (
                <div key={tno} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:12, textAlign:"center" }}>
                  <div style={{ fontSize:14, color:C.goldLight, fontWeight:"bold", marginBottom:4 }}>Table {tno}</div>
                  <div style={{ fontSize:13, color:C.gold, fontWeight:"bold" }}>RM {data.total.toFixed(2)}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{data.count} order{data.count>1?"s":""}</div>
                </div>
              ))}
            </div>
          </>}
        </>}
      </div>
    </div>
  );
}

function TableCard({ tableNo, data, paying, markPaid, markOrderDone, cancelOrder, cardTab, setCardTab, printReceipt, setPayModal, setTableDetailModal }) {
  const hasPending = data.pending.length>0;
  const allOrders = [...data.done, ...data.pending];
  const drinkOrders = allOrders.filter(o => o.items.some(i => DRINK_CATEGORIES.includes(i.category)));
  const foodOrders = allOrders.filter(o => o.items.some(i => FOOD_CATEGORIES.includes(i.category)));

  return (
    <div style={{ background:C.panel, border:`2px solid ${hasPending?"#c8973a":"#5aaa5a"}`, borderRadius:14, overflow:"hidden" }}>

      {/* Header — tap to open full detail */}
      <div onClick={() => setTableDetailModal(tableNo)}
        style={{ background:hasPending?"#2c1a0e":"#1a2c1a", padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
        <div style={{ fontSize:22, fontWeight:"bold", color:hasPending?C.goldLight:"#aaffaa" }}>{isTakeaway(tableNo) ? takeawayLabel(tableNo) : `Table ${tableNo}`}</div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {data.pending.length>0 && <span style={{ background:"#3d2a00", color:C.gold, borderRadius:6, padding:"3px 10px", fontSize:12 }}>⏳ {data.pending.length} pending</span>}
          {data.done.length>0 && <span style={{ background:"#1a3a1a", color:"#5aaa5a", borderRadius:6, padding:"3px 10px", fontSize:12 }}>✅ {data.done.length} done</span>}
          <span style={{ color:C.muted, fontSize:16, marginLeft:4 }}>↗</span>
        </div>
      </div>

      {/* Card tabs */}
      <div style={{ display:"flex", borderBottom:`2px solid ${C.border}`, background:"#160e04" }}>
        {[["drinks",`☕ Drinks (${drinkOrders.length})`],["food",`🍳 Food (${foodOrders.length})`],["all","📋 All"]].map(([key, label]) => (
          <button key={key} onClick={() => setCardTab(key)}
            style={btn({ flex:1, background:cardTab===key?(key==="drinks"?"#0d2010":key==="food"?"#1a1208":"#1a1a0a"):"transparent",
              border:"none", borderBottom:cardTab===key?`3px solid ${key==="drinks"?"#5aaa5a":key==="food"?C.gold:"#aaa"}`:"3px solid transparent",
              color:cardTab===key?(key==="drinks"?"#aaffaa":key==="food"?C.goldLight:"#ddd"):C.muted,
              padding:"14px 8px", fontSize:13, fontWeight:cardTab===key?"bold":"normal", borderRadius:0 })}>
            {label}
          </button>
        ))}
      </div>

      {/* DRINKS */}
      {(cardTab==="drinks" || cardTab==="all") && (
        <div style={{ padding:"14px 16px", borderBottom: cardTab==="all" ? `2px solid ${C.border}` : "none" }}>
          {cardTab==="all" && <div style={{ fontSize:11, color:"#5aaa5a", fontWeight:"bold", letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>☕ Drinks</div>}
          {drinkOrders.length===0
            ? <div style={{ fontSize:13, color:C.border, fontStyle:"italic", padding:"8px 0" }}>No drinks ordered</div>
            : drinkOrders.map((order, oi) => {
                const drinkItems = order.items.filter(i => DRINK_CATEGORIES.includes(i.category));
                const isPending = order.status==="pending";
                return (
                  <div key={oi} style={{ marginBottom:12, paddingBottom:12, borderBottom: oi < drinkOrders.length-1 ? `1px solid #3a2a10` : "none" }}>
                    {order.order_seq && <div style={{ marginBottom:6 }}><span style={{ background:C.gold, color:C.dark, borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:"bold" }}>#{order.order_seq}</span></div>}
                    {drinkItems.map((item, ii) => (
                      <div key={ii} style={{ padding:"8px 0", borderTop: ii>0 ? `1px solid #2a1a08` : "none" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span style={{ color:isPending?"#eee":"#5aaa5a", fontSize:15 }}>
                            {item.item_no && <span style={{ color:"#5aaa5a", fontWeight:"bold", marginRight:5 }}>{item.item_no}</span>}
                            {item.name} <span style={{ color:C.gold, fontWeight:"bold", marginLeft:6 }}>×{item.qty}</span>
                          </span>
                          <span style={{ color:"#5aaa5a", fontWeight:"bold", fontSize:14, whiteSpace:"nowrap", marginLeft:8 }}>RM {(item.price*item.qty).toFixed(2)}</span>
                        </div>
                        {item.note && <div style={{ fontSize:12, color:"#ffcc44", background:"#2a1a00", borderRadius:6, padding:"3px 8px", marginTop:3 }}>📝 {item.note}</div>}
                      </div>
                    ))}
                    {getDrinkReq(order.special_request) && <div style={{ fontSize:13, color:C.gold, background:"#2a1a00", borderRadius:6, padding:"6px 10px", marginTop:6 }}>📝 {getDrinkReq(order.special_request)}</div>}
                    <div style={{ display:"flex", gap:10, marginTop:10, alignItems:"center" }}>
                      <span style={{ fontSize:13, color:isPending?C.gold:"#5aaa5a", fontWeight:"bold", flex:1 }}>{isPending?"⏳ Pending":"✅ Served"} · {order.time}</span>
                      {isPending && <>
                        <button onClick={() => markOrderDone(order.id)} style={btn({ background:"#2d6a2d", border:"none", color:"#aaffaa", padding:"12px 20px", fontSize:15, fontWeight:"bold", minHeight:50, minWidth:100 })}>✓ Done</button>
                        <button onClick={() => cancelOrder(order.id)} style={btn({ background:"#6a1a1a", border:"none", color:"#ff9999", padding:"12px 16px", fontSize:15, fontWeight:"bold", minHeight:50, minWidth:90 })}>✕ Cancel</button>
                      </>}
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* FOOD */}
      {(cardTab==="food" || cardTab==="all") && (
        <div style={{ padding:"14px 16px", background:"#1a1208", borderBottom:`1px solid ${C.border}` }}>
          {cardTab==="all" && <div style={{ fontSize:11, color:C.muted, fontWeight:"bold", letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>🍳 Food (Kitchen)</div>}
          {foodOrders.length===0
            ? <div style={{ fontSize:13, color:C.border, fontStyle:"italic", padding:"8px 0" }}>No food ordered</div>
            : foodOrders.map((order, oi) => {
                const foodItems = order.items.filter(i => FOOD_CATEGORIES.includes(i.category));
                const isPending = order.status==="pending";
                return (
                  <div key={oi} style={{ marginBottom:12, paddingBottom:12, borderBottom: oi < foodOrders.length-1 ? `1px solid #2d1a08` : "none" }}>
                    {foodItems.map((item, ii) => (
                      <div key={ii} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderTop: ii>0 ? `1px solid #2d1a08` : "none" }}>
                        <span style={{ color:isPending?C.muted:"#5aaa5a", fontSize:15 }}>
                          {item.item_no && <span style={{ color:isPending?C.gold:"#5aaa5a", fontWeight:"bold", marginRight:5 }}>{item.item_no}</span>}
                          {item.name} <span style={{ color:isPending?C.gold:"#5aaa5a", marginLeft:6 }}>×{item.qty}</span>
                        </span>
                        <span style={{ color:isPending?C.muted:"#5aaa5a", fontSize:14, whiteSpace:"nowrap", marginLeft:8 }}>RM {(item.price*item.qty).toFixed(2)}</span>
                      </div>

                    ))}
                    {getFoodReq(order.special_request) && <div style={{ fontSize:13, color:C.gold, background:"#2a1a00", borderRadius:6, padding:"6px 10px", marginTop:6 }}>📝 {getFoodReq(order.special_request)}</div>}
                    <div style={{ display:"flex", gap:10, marginTop:10, alignItems:"center" }}>
                      <span style={{ fontSize:13, color:isPending?C.gold:"#5aaa5a", fontWeight:"bold", flex:1 }}>{isPending?"⏳ Kitchen preparing":"✅ Served"} · {order.time}</span>
                      {isPending && (
                        <button onClick={() => cancelOrder(order.id)} style={btn({ background:"#6a1a1a", border:"none", color:"#ff9999", padding:"12px 20px", fontSize:15, fontWeight:"bold", minHeight:50, minWidth:110 })}>✕ Cancel</button>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* Footer */}
      <div style={{ background:"#0f0a04", padding:"12px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:18, color:C.goldLight, fontWeight:"bold", marginBottom:12 }}>
          <span>TOTAL</span><span>RM {data.total.toFixed(2)}</span>
        </div>
        <button onClick={() => setPayModal({tableNo, data, method:"QR DuitNow", cashReceived:""})} disabled={paying===tableNo}
          style={btn({ width:"100%", background:"linear-gradient(135deg,#1976d2,#0d47a1)", border:"none", color:"#fff", padding:"16px 0", fontSize:17, fontWeight:"bold", cursor:"pointer", marginBottom:8, borderRadius:10, boxShadow:"0 4px 12px rgba(25,118,210,0.35)" })}>
          💳 Collect Payment
        </button>
        <button onClick={() => printReceipt(tableNo, data, null, null, null)}
          style={btn({ width:"100%", background:"#3a2a10", border:`1px solid ${C.gold}`, color:C.goldLight, padding:"10px 0", fontSize:13, fontWeight:"bold", cursor:"pointer" })}>
          🖨️ Print Bill (Preview)
        </button>
      </div>
    </div>
  );
}

function DetailModal({ tableNo, hasPending, pending, done, allOrders, drinkOrders, foodOrders, total, liveData, markOrderDone, cancelOrder, printReceipt, setPayModal, setTableDetailModal }) {
  const [detailTab, setDetailTab] = useState("drinks");
  const ordersToShow = detailTab === "drinks" ? drinkOrders : detailTab === "food" ? foodOrders : allOrders;
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.95)", zIndex:9000, display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ background:hasPending?"#2c1a0e":"#1a2c1a", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`2px solid ${hasPending?C.gold:"#5aaa5a"}`, flexShrink:0 }}>
        <div>
          <div style={{ fontSize:26, fontWeight:"bold", color:hasPending?C.goldLight:"#aaffaa" }}>{isTakeaway(tableNo) ? takeawayLabel(tableNo) : `Table ${tableNo}`}</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>
            {pending.length > 0 && <span style={{ color:C.gold, marginRight:12 }}>⏳ {pending.length} pending</span>}
            {done.length > 0 && <span style={{ color:"#5aaa5a" }}>✅ {done.length} done</span>}
          </div>
        </div>
        <button onClick={() => setTableDetailModal(null)}
          style={btn({ background:"rgba(255,255,255,0.1)", border:`1px solid ${C.border}`, color:"#fff", width:46, height:46, fontSize:22, borderRadius:50 })}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"#160e04", borderBottom:`2px solid ${C.border}`, flexShrink:0 }}>
        {[["all","📋 All"],["drinks",`☕ Drinks (${drinkOrders.length})`],["food",`🍳 Food (${foodOrders.length})`]].map(([key,label]) => (
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
              <div key={order.id} style={{ background:isPending?"#2c1a0e":"#1a2c1a", border:`2px solid ${isPending?C.gold:"#5aaa5a"}`, borderRadius:14, padding:"14px 16px", marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {order.order_seq && <span style={{ background:C.gold, color:C.dark, borderRadius:6, padding:"2px 8px", fontSize:13, fontWeight:"bold" }}>#{order.order_seq}</span>}
                    <span style={{ color:C.muted, fontSize:13 }}>{isDrink?"☕":"🍳"} · {order.time}</span>
                  </div>
                  <span style={{ background:isPending?"#c8973a":"#2d6a2d", color:"#fff", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:"bold" }}>
                    {isPending?"⏳ Pending":"✅ Served"}
                  </span>
                </div>
                {order.items.map((item, ii) => (
                  <div key={ii} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:18 }}>
                      <span style={{ color:isPending?C.goldLight:"#aaffaa", fontWeight:"bold" }}>
                        {item.item_no && <span style={{ color:C.gold, marginRight:6 }}>{item.item_no}</span>}
                        {item.name}
                      </span>
                      <span style={{ color:C.gold, fontWeight:"bold" }}>×{item.qty}</span>
                    </div>
                    <div style={{ color:"#aaffaa", fontSize:15, marginTop:2 }}>RM {(item.price*item.qty).toFixed(2)}</div>
                    {item.note && <div style={{ fontSize:13, color:"#ffcc44", background:"#2a1a00", borderRadius:8, padding:"5px 10px", marginTop:5 }}>📝 {item.note}</div>}
                  </div>
                ))}
                {order.special_request && (
                  <div style={{ fontSize:13, color:C.gold, background:"#2a1a00", borderRadius:8, padding:"7px 10px", marginTop:6 }}>📝 {order.special_request}</div>
                )}
                {isPending && (
                  <div style={{ display:"flex", gap:10, marginTop:12 }}>
                    <button onClick={() => markOrderDone(order.id)}
                      style={btn({ flex:1, background:"#2d6a2d", border:"none", color:"#aaffaa", padding:"14px 0", fontSize:16, fontWeight:"bold" })}>✓ Mark Done</button>
                    <button onClick={() => cancelOrder(order.id)}
                      style={btn({ flex:1, background:"#6a1a1a", border:"none", color:"#ff9999", padding:"14px 0", fontSize:16, fontWeight:"bold" })}>✕ Cancel</button>
                  </div>
                )}
              </div>
            );
          })
        }
      </div>

      {/* Footer */}
      <div style={{ background:"#0f0a04", padding:"14px 16px", borderTop:`2px solid ${C.border}`, flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:22, color:C.goldLight, fontWeight:"bold", marginBottom:12 }}>
          <span>TOTAL</span><span>RM {total.toFixed(2)}</span>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => printReceipt(tableNo, liveData, null, null, null)}
            style={btn({ flex:1, background:"#3a2a10", border:`1px solid ${C.gold}`, color:C.goldLight, padding:"14px 0", fontSize:14, fontWeight:"bold" })}>
            🖨️ Print Bill
          </button>
          <button onClick={() => { setTableDetailModal(null); setPayModal({tableNo, data:liveData, method:"QR DuitNow", cashReceived:""}); }}
            style={btn({ flex:2, background:"linear-gradient(135deg,#1976d2,#0d47a1)", border:"none", color:"#fff", padding:"14px 0", fontSize:16, fontWeight:"bold", borderRadius:10 })}>
            💳 Collect Payment
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTableModal({ tableNo: initialTableNo, onClose, onSaved }) {
  const [step, setStep] = useState(initialTableNo === "pick" ? "pick" : "edit");
  const [pickedTable, setPickedTable] = useState(initialTableNo === "pick" ? null : initialTableNo);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [cart, setCart] = useState([]); // new items to add
  const [saving, setSaving] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]); // existing orders on table
  const [editTab, setEditTab] = useState("existing"); // "existing" | "add"
  const tableNo = pickedTable;

  const loadData = () => {
    if (!tableNo) return;
    setMenuLoading(true);
    Promise.all([
      supabase.from("menu_items").select("*").order("item_no", { ascending:true }),
      supabase.from("orders").select("*").in("status",["pending","done"]).eq("table_no", String(tableNo))
    ]).then(([{data:items},{data:orders}]) => {
      setMenuItems(items||[]);
      setActiveOrders(orders||[]);
      setMenuLoading(false);
    });
  };

  useEffect(() => { if (step === "edit" && tableNo) loadData(); }, [step, tableNo]);

  const filtered = menuItems.filter(m => m.name.toLowerCase().includes(searchQ.toLowerCase()));
  const cats = [...new Set(menuItems.map(m=>m.category))];
  const grouped = cats.reduce((acc, cat) => {
    const items = filtered.filter(m => m.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  const addToCart = (item) => setCart(prev => {
    const ex = prev.find(c=>c.name===item.name);
    if (ex) return prev.map(c=>c.name===item.name?{...c,qty:c.qty+1}:c);
    return [...prev,{name:item.name,price:parseFloat(item.price),qty:1,category:item.category||""}];
  });
  const removeFromCart = (name) => setCart(prev=>prev.map(c=>c.name===name?{...c,qty:c.qty-1}:c).filter(c=>c.qty>0));
  const cartTotal = cart.reduce((s,c)=>s+c.price*c.qty,0);

  // Update qty of an item in an existing order
  const updateExistingQty = async (order, itemIdx, delta) => {
    const newItems = order.items.map((it,i) => i===itemIdx ? {...it,qty:Math.max(0,it.qty+delta)} : it).filter(it=>it.qty>0);
    const newTotal = newItems.reduce((s,it)=>s+it.price*it.qty,0);
    if (newItems.length===0) {
      await supabase.from("orders").delete().eq("id",order.id);
    } else {
      await supabase.from("orders").update({items:newItems,total:newTotal}).eq("id",order.id);
    }
    loadData();
    onSaved();
  };

  const cancelExistingOrder = async (orderId) => {
    await supabase.from("orders").update({status:"cancelled"}).eq("id",orderId);
    loadData();
    onSaved();
  };

  const saveNewItems = async () => {
    if (!cart.length) return;
    setSaving(true);
    const maxSeq = activeOrders.reduce((m,o)=>Math.max(m,o.order_seq||0),0);
    const now = new Date();
    const timeStr = now.toLocaleString("en-MY",{hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Asia/Kuala_Lumpur"});
    await supabase.from("orders").insert({
      table_no: tableNo, items: cart, total: cartTotal,
      status:"pending", order_seq:maxSeq+1, time:timeStr, created_at:now.toISOString()
    });
    setCart([]);
    setSaving(false);
    loadData();
    onSaved();
  };

  // ── PICK TABLE ───────────────────────────────────────────────────────────
  if (step === "pick") {
    return (
      <div style={{ position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.9)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
        <div style={{ background:C.panel,border:`1px solid ${C.gold}`,borderRadius:20,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto" }}>
          <div style={{ background:"#2c1a0e",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:1 }}>
            <div style={{ fontSize:18,fontWeight:"bold",color:C.goldLight }}>✏️ Edit Table — Pick Table</div>
            <button onClick={onClose} style={btn({ background:"transparent",border:`1px solid ${C.border}`,color:C.muted,width:36,height:36,fontSize:18,borderRadius:50 })}>✕</button>
          </div>
          <div style={{ padding:20 }}>
            <div style={{ fontSize:12,color:C.muted,marginBottom:12,fontWeight:"bold" }}>DINE IN TABLES</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:10,marginBottom:20 }}>
              {TABLES.map(t=>(
                <button key={t} onClick={()=>{setPickedTable(t);setStep("edit");}}
                  style={btn({ background:"#2c1a0e",border:`2px solid ${C.gold}`,color:C.goldLight,padding:"14px 20px",fontSize:16,fontWeight:"bold",minWidth:60 })}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ fontSize:12,color:C.muted,marginBottom:8,fontWeight:"bold" }}>TAKEAWAY</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
              {TW_SLOTS.map(t=>(<button key={t} onClick={()=>{setPickedTable(t);setStep("edit");}} style={btn({ background:"#1a2c1a",border:`2px solid #5aaa5a`,color:"#aaffaa",padding:"10px 14px",fontSize:13,fontWeight:"bold" })}>{t}</button>))}
              {ST_SLOTS.map(t=>(<button key={t} onClick={()=>{setPickedTable(t);setStep("edit");}} style={btn({ background:"#1a1a2c",border:`2px solid #5a5aff`,color:"#aaaaff",padding:"10px 14px",fontSize:13,fontWeight:"bold" })}>{t}</button>))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── EDIT TABLE ───────────────────────────────────────────────────────────
  const tableLabel = isTakeaway(tableNo)?takeawayLabel(tableNo):`Table ${tableNo}`;
  return (
    <div style={{ position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.95)",zIndex:10000,display:"flex",flexDirection:"column" }}>
      {/* Header */}
      <div style={{ background:"#2c1a0e",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`2px solid ${C.gold}`,flexShrink:0 }}>
        <div>
          <div style={{ fontSize:18,fontWeight:"bold",color:C.goldLight }}>✏️ {tableLabel}</div>
          <div style={{ fontSize:12,color:C.muted }}>{activeOrders.length} order(s) on this table</div>
        </div>
        <button onClick={onClose} style={btn({ background:"transparent",border:`1px solid ${C.border}`,color:C.muted,width:40,height:40,fontSize:20,borderRadius:50 })}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",background:"#160e04",borderBottom:`2px solid ${C.border}`,flexShrink:0 }}>
        {[["existing","📋 Current Orders"],["add","➕ Add Items"]].map(([key,label])=>(
          <button key={key} onClick={()=>setEditTab(key)}
            style={btn({ flex:1,background:"transparent",border:"none",borderBottom:editTab===key?`3px solid ${C.gold}`:"3px solid transparent",
              color:editTab===key?C.goldLight:C.muted,padding:"12px 8px",fontSize:14,fontWeight:editTab===key?"bold":"normal",borderRadius:0 })}>
            {label}
          </button>
        ))}
      </div>

      {menuLoading ? (
        <div style={{ color:C.muted,textAlign:"center",padding:60,fontSize:16 }}>Loading…</div>
      ) : editTab==="existing" ? (
        /* ── EXISTING ORDERS TAB ── */
        <div style={{ flex:1,overflowY:"auto",padding:14 }}>
          {activeOrders.length===0
            ? <div style={{ color:C.muted,textAlign:"center",padding:40 }}>No current orders on this table</div>
            : activeOrders.map(order=>(
              <div key={order.id} style={{ background:order.status==="pending"?"#2c1a0e":"#1a2c1a",border:`2px solid ${order.status==="pending"?C.gold:"#5aaa5a"}`,borderRadius:14,padding:14,marginBottom:12 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <span style={{ background:order.status==="pending"?"#c8973a":"#2d6a2d",color:"#fff",borderRadius:8,padding:"3px 10px",fontSize:12,fontWeight:"bold" }}>
                    {order.status==="pending"?"⏳ Pending":"✅ Served"}
                  </span>
                  <button onClick={()=>cancelExistingOrder(order.id)}
                    style={btn({ background:"#6a1a1a",border:"none",color:"#ff9999",padding:"6px 12px",fontSize:12,fontWeight:"bold",borderRadius:8 })}>
                    🗑️ Remove Order
                  </button>
                </div>
                {order.items.map((item,ii)=>(
                  <div key={ii} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ flex:1 }}>
                      <div style={{ color:C.text,fontSize:14,fontWeight:"bold" }}>{item.name}</div>
                      <div style={{ color:C.gold,fontSize:13 }}>RM {parseFloat(item.price).toFixed(2)} each</div>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <button onClick={()=>updateExistingQty(order,ii,-1)}
                        style={btn({ background:"#6a1a1a",border:"none",color:"#ff9999",width:34,height:34,fontSize:20,borderRadius:8,fontWeight:"bold" })}>−</button>
                      <span style={{ color:C.goldLight,fontWeight:"bold",fontSize:16,minWidth:24,textAlign:"center" }}>{item.qty}</span>
                      <button onClick={()=>updateExistingQty(order,ii,+1)}
                        style={btn({ background:"#1a4a1a",border:"none",color:"#aaffaa",width:34,height:34,fontSize:20,borderRadius:8,fontWeight:"bold" })}>+</button>
                      <span style={{ color:"#aaffaa",fontWeight:"bold",fontSize:13,minWidth:60,textAlign:"right" }}>RM {(item.price*item.qty).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                <div style={{ textAlign:"right",marginTop:8,color:C.goldLight,fontWeight:"bold",fontSize:14 }}>
                  Order Total: RM {order.items.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2)}
                </div>
              </div>
            ))
          }
        </div>
      ) : (
        /* ── ADD ITEMS TAB — single column + floating cart ── */
        <div style={{ flex:1,overflowY:"auto",padding:"12px 12px 100px" }}>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Search menu..."
            style={{ width:"100%",background:C.bg,border:`1px solid ${C.border}`,color:C.text,padding:"10px 14px",borderRadius:10,fontSize:16,fontFamily:"Georgia,serif",boxSizing:"border-box",marginBottom:12 }} />
          {Object.keys(grouped).length===0
            ? <div style={{ color:C.muted,textAlign:"center",padding:40 }}>No menu items found</div>
            : Object.entries(grouped).map(([cat,items])=>(
              <div key={cat} style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,color:C.gold,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>{cat}</div>
                {items.map(item=>{
                  const inCart=cart.find(c=>c.name===item.name);
                  return (
                    <div key={item.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:inCart?"#2c1a0e":C.bg,border:`1px solid ${inCart?C.gold:C.border}`,borderRadius:10,marginBottom:8 }}>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ color:C.text,fontSize:14,fontWeight:inCart?"bold":"normal" }}>{item.name}</div>
                        <div style={{ color:C.gold,fontSize:13 }}>RM {parseFloat(item.price).toFixed(2)}</div>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
                        {inCart&&<button onClick={()=>removeFromCart(item.name)} style={btn({ background:"#6a1a1a",border:"none",color:"#ff9999",width:36,height:36,fontSize:20,borderRadius:8 })}>−</button>}
                        {inCart&&<span style={{ color:C.goldLight,fontWeight:"bold",minWidth:24,textAlign:"center",fontSize:16 }}>{inCart.qty}</span>}
                        <button onClick={()=>addToCart(item)} style={btn({ background:C.gold,border:"none",color:C.dark,width:36,height:36,fontSize:20,borderRadius:8,fontWeight:"bold" })}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          }
          {/* Floating Add to Bill button */}
          {cart.length > 0 && (
            <div style={{ position:"sticky",bottom:0,left:0,right:0,padding:"12px 0 4px",background:`linear-gradient(to top,${C.bg} 70%,transparent)` }}>
              <button onClick={saveNewItems} disabled={saving}
                style={btn({ width:"100%",background:`linear-gradient(135deg,${C.gold},#a07020)`,border:"none",color:C.dark,padding:"16px 0",fontSize:15,fontWeight:"bold",borderRadius:12 })}>
                {saving?"Saving…":`✅ Add to Bill — RM ${cartTotal.toFixed(2)} (${cart.reduce((s,i)=>s+i.qty,0)} items)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CashierScreen({ goHome }) {
  const [orders, setOrders] = useState([]);
  const [waiterCalls, setWaiterCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [editTableModal, setEditTableModal] = useState(null); // tableNo to edit

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

  const markPaid = async (tableNo, paymentMethod="Cash") => {
    setPaying(tableNo);
    const sessionId = "paid_" + Date.now();
    const paidAt = new Date().toISOString();
    // Only update status — paid_session_id/paid_at columns may not exist in DB
    await supabase.from("orders").update({status:"paid"}).eq("table_no",tableNo).in("status",["pending","done"]);
    await supabase.from("table_sessions").upsert({table_no:parseInt(tableNo), session_id:sessionId, updated_at:paidAt});
    setPaying(null); fetchAll();
  };

  const printReceipt = (tableNo, data, paymentMethod=null, cashReceived=null, changeAmt=null) => {
    const charge = parseFloat(localStorage.getItem("service_charge")||"10");
    const subtotal = data.total;
    const chargeAmt = +(subtotal * charge / 100).toFixed(2);
    const grandTotal = +(subtotal + chargeAmt).toFixed(2);
    // Malaysian rounding to nearest 0.05
    const rounded = +(Math.round(grandTotal * 20) / 20).toFixed(2);
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

  const markOrderDone = async (orderId) => {
    await supabase.from("orders").update({status:"done"}).eq("id",orderId);
    fetchAll();
  };

  const dismissWaiter = async (tableNo) => {
    await supabase.from("waiter_calls").delete().eq("table_no", tableNo);
    fetchAll();
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      {payModal && (() => {
        const charge = parseFloat(localStorage.getItem("service_charge")||"10");
        const subtotal = payModal.data.total;
        const chargeAmt = +(subtotal * charge / 100).toFixed(2);
        const grandTotal = +(subtotal + chargeAmt).toFixed(2);
        const rounded = +(Math.round(grandTotal * 20) / 20).toFixed(2);
        const roundingDiff = +(rounded - grandTotal).toFixed(2);
        const cash = parseFloat(payModal.cashReceived)||0;
        const change = +(cash - rounded).toFixed(2);
        const canConfirm = payModal.method!=="Cash" || (!!payModal.cashReceived && cash >= rounded);
        const tableLabel = isTakeaway(payModal.tableNo) ? takeawayLabel(payModal.tableNo) : `Table ${payModal.tableNo}`;
        const orderType = String(payModal.tableNo).startsWith("TW-") ? "Takeaway (Pack & Go)" : String(payModal.tableNo).startsWith("ST-") ? "Takeaway (Eat Here)" : "Dine In";
        return (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
            <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:420, color:"#1a1a1a", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.5)", margin:"auto" }}>

              {/* Header */}
              <div style={{ background:"linear-gradient(135deg,#1976d2,#0d47a1)", padding:"20px 24px" }}>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.75)", fontFamily:"Georgia,serif" }}>{orderType}</div>
                <div style={{ fontSize:22, fontWeight:"bold", color:"#fff", fontFamily:"Georgia,serif", marginTop:2 }}>💳 {tableLabel}</div>
                <div style={{ fontSize:32, fontWeight:"bold", color:"#fff", marginTop:6, fontFamily:"Georgia,serif" }}>RM {parseFloat(rounded).toFixed(2)}</div>
              </div>

              <div style={{ padding:"20px 24px" }}>
                {/* Payment method selector */}
                <div style={{ fontSize:11, color:"#888", marginBottom:10, fontFamily:"Georgia,serif", fontWeight:"bold", letterSpacing:1 }}>SELECT PAYMENT METHOD</div>
                <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                  {[["💵","Cash","#e8f5e9","#2e7d32"],["📱","QR DuitNow","#e3f2fd","#1565c0"],["💳","Credit Card","#fce4ec","#c62828"]].map(([icon,method,bg,color]) => (
                    <button key={method} onClick={() => setPayModal(m=>({...m, method, cashReceived:""}))}
                      style={{ flex:1, background:payModal.method===method?bg:"#f9f9f9", border:`2px solid ${payModal.method===method?color:"#eee"}`, color:payModal.method===method?color:"#aaa", padding:"12px 4px", fontSize:11, fontWeight:"bold", borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", lineHeight:1.6, transition:"all 0.15s" }}>
                      <div style={{ fontSize:22 }}>{icon}</div>{method}
                    </button>
                  ))}
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
                  {roundingDiff!==0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#aaa", marginBottom:4, fontFamily:"Georgia,serif" }}>
                    <span>Rounding</span><span>{roundingDiff>0?"+":""}{roundingDiff.toFixed(2)}</span>
                  </div>}
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:20, fontWeight:"bold", color:"#1976d2", marginTop:8, paddingTop:8, borderTop:"2px solid #eee", fontFamily:"Georgia,serif" }}>
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
                      style={{ width:"100%", border:"2px solid #1976d2", borderRadius:8, padding:"10px 14px", fontSize:22, textAlign:"right", boxSizing:"border-box", color:"#1a1a1a" }} />
                    {cash >= rounded && (
                      <div style={{ marginTop:8, background:"#e8f5e9", borderRadius:8, padding:"10px 14px", display:"flex", justifyContent:"space-between" }}>
                        <span style={{ color:"#2e7d32", fontSize:14, fontWeight:"bold", fontFamily:"Georgia,serif" }}>Change</span>
                        <span style={{ color:"#2e7d32", fontSize:22, fontWeight:"bold", fontFamily:"Georgia,serif" }}>RM {change.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display:"flex", gap:8, flexDirection:"column" }}>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => setPayModal(null)}
                      style={{ flex:1, background:"#f5f5f5", border:"1px solid #ddd", color:"#555", padding:"12px 0", fontSize:13, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif" }}>✕ Cancel</button>
                    <button onClick={() => { printReceipt(payModal.tableNo, payModal.data, payModal.method, payModal.cashReceived||null, payModal.method==="Cash"&&change>=0?change:null); }}
                      style={{ flex:2, background:"#555", border:"none", color:"#fff", padding:"12px 0", fontSize:13, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold" }}>
                      🖨️ Preview Receipt
                    </button>
                  </div>
                  <button onClick={() => {
                    if (!canConfirm) return;
                    setConfirmModal({ tableNo:payModal.tableNo, data:payModal.data, method:payModal.method, cashReceived:payModal.cashReceived||null, change:payModal.method==="Cash"&&change>=0?change:null, rounded });
                  }} disabled={!canConfirm}
                    style={{ width:"100%", background:canConfirm?"linear-gradient(135deg,#1976d2,#0d47a1)":"#ccc", border:"none", color:"#fff", padding:"16px 0", fontSize:16, borderRadius:10, cursor:canConfirm?"pointer":"not-allowed", fontFamily:"Georgia,serif", fontWeight:"bold", boxShadow:canConfirm?"0 4px 12px rgba(25,118,210,0.4)":"none" }}>
                    {payModal.method==="Cash"&&!canConfirm?"Enter Cash Amount Above ↑":`✅ Print & Clear Table — RM ${parseFloat(rounded).toFixed(2)}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Full Screen Table Detail Modal — live, with tabs, stays open */}
      {tableDetailModal && (() => {
        const tableNo = tableDetailModal;
        const tableOrders = orders.filter(o => String(o.table_no) === String(tableNo));
        const pending = tableOrders.filter(o => o.status === "pending");
        const done = tableOrders.filter(o => o.status === "done");
        const total = tableOrders.flatMap(o=>o.items).reduce((s,i) => s+i.price*i.qty, 0);
        const liveData = { pending, done, total };
        const hasPending = pending.length > 0;
        const allOrders = [...pending, ...done];
        const drinkOrders = allOrders.filter(o => o.items.some(i => DRINK_CATEGORIES.includes(i.category)));
        const foodOrders = allOrders.filter(o => o.items.some(i => FOOD_CATEGORIES.includes(i.category)));
        return (
          <DetailModal tableNo={tableNo} hasPending={hasPending} pending={pending} done={done}
            allOrders={allOrders} drinkOrders={drinkOrders} foodOrders={foodOrders}
            total={total} liveData={liveData}
            markOrderDone={markOrderDone} cancelOrder={cancelOrder}
            printReceipt={printReceipt} setPayModal={setPayModal}
            setTableDetailModal={setTableDetailModal} />
        );
      })()}

      {/* Edit Table Modal */}
      {editTableModal && (
        <EditTableModal tableNo={editTableModal} onClose={() => setEditTableModal(null)} onSaved={() => { setEditTableModal(null); fetchAll(); }} />
      )}

      {/* Custom Confirm Payment Modal */}
      {confirmModal && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.75)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:340, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>

            {/* Header */}
            <div style={{ background:"linear-gradient(135deg,#1976d2,#0d47a1)", padding:"20px 24px", textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:6 }}>🧾</div>
              <div style={{ fontSize:18, fontWeight:"bold", color:"#fff", fontFamily:"Georgia,serif" }}>Confirm Payment</div>
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
                <div style={{ fontSize:32, fontWeight:"bold", color:"#1976d2", fontFamily:"Georgia,serif" }}>RM {parseFloat(confirmModal.rounded).toFixed(2)}</div>
                {confirmModal.change !== null && confirmModal.change >= 0 && (
                  <div style={{ marginTop:6, fontSize:13, color:"#2e7d32", fontWeight:"bold", fontFamily:"Georgia,serif" }}>Change: RM {parseFloat(confirmModal.change).toFixed(2)}</div>
                )}
              </div>

              {/* Warning */}
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"#fff3e0", borderRadius:10, marginBottom:16 }}>
                <span style={{ fontSize:18 }}>⚠️</span>
                <span style={{ fontSize:12, color:"#e65100", fontFamily:"Georgia,serif", lineHeight:1.4 }}>This will print the receipt and <strong>clear the table</strong>. Cannot be undone!</span>
              </div>

              {/* Buttons */}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setConfirmModal(null)}
                  style={{ flex:1, background:"#f5f5f5", border:"1px solid #ddd", color:"#555", padding:"13px 0", fontSize:14, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold" }}>
                  ✕ Cancel
                </button>
                <button onClick={() => {
                  printReceipt(confirmModal.tableNo, confirmModal.data, confirmModal.method, confirmModal.cashReceived, confirmModal.change);
                  markPaid(confirmModal.tableNo, confirmModal.method);
                          setConfirmModal(null);
                  setPayModal(null);
                }}
                  style={{ flex:2, background:"linear-gradient(135deg,#1976d2,#0d47a1)", border:"none", color:"#fff", padding:"13px 0", fontSize:14, borderRadius:10, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold", boxShadow:"0 4px 12px rgba(25,118,210,0.4)" }}>
                  ✅ Confirm & Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ background:C.panel, borderBottom:`2px solid #5aaa5a`, padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:16, color:"#aaffaa", fontWeight:"bold" }}>💳 Cashier — Drinks & Payment</div>
          <div style={{ fontSize:11, color:"#5aaa5a" }}>🔴 Live — updates instantly</div>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <button onClick={() => setSoundOn(s => {
            const next = !s;
            soundOnRef.current = next;
            localStorage.setItem("c_sound", next ? "on" : "off");
            return next;
          })} style={btn({ background:soundOn?"#2d6a2d":"transparent", border:`1px solid ${soundOn?"#5aaa5a":C.border}`, color:soundOn?"#aaffaa":C.muted, padding:"6px 10px", fontSize:11 })}>
            {soundOn ? "🔔 Sound" : "🔕 Sound"}
          </button>
          <button onClick={toggleVoice} style={btn({ background:voiceOn?"#1a4a6a":"transparent", border:`1px solid ${voiceOn?"#5aaa5a":C.border}`, color:voiceOn?"#aaddff":C.muted, padding:"6px 10px", fontSize:11 })}>
            {voiceOn ? "🔊 Voice" : "🔇 Voice"}
          </button>
          {voiceOn && (
            <button onClick={toggleVoiceLang} style={btn({ background:"#3a2a00", border:`1px solid ${C.gold}`, color:C.goldLight, padding:"6px 10px", fontSize:11, fontWeight:"bold" })}>
              {voiceLang === "en" ? "CN 中文" : "🇬🇧 EN"}
            </button>
          )}
          <button onClick={() => setEditTableModal("pick")}
            style={btn({ background:"#1a2a3a", border:`1px solid #5aaaff`, color:"#99ccff", padding:"6px 10px", fontSize:11, fontWeight:"bold" })}>
            ✏️ Edit
          </button>
          <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"6px 10px", fontSize:11 })}>← Back</button>
        </div>
      </div>
      <div style={{ background:C.panel, borderBottom:`1px solid ${C.border}`, padding:"0 16px", display:"flex", gap:0 }}>
        {[["all",`All (${activeTables.length})`],["pending",`⏳ Pending (${pendingTables.length})`],["done",`✅ All Served (${doneTables.length})`]].map(([key,label]) => (
          <button key={key} onClick={() => { setFilterTab(key); setSelectedTable(null); }}
            style={btn({ background:"transparent", border:"none", borderBottom:filterTab===key?`3px solid ${key==="pending"?C.gold:"#5aaa5a"}`:"3px solid transparent",
              color:filterTab===key?(key==="pending"?C.goldLight:"#aaffaa"):C.muted,
              padding:"14px 20px", fontSize:14, fontWeight:filterTab===key?"bold":"normal", borderRadius:0 })}>
            {label}
          </button>
        ))}
      </div>
      {activeTables.length > 0 && (
        <div style={{ background:"#110d06", borderBottom:`1px solid ${C.border}`, padding:"10px 16px", display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:12, color:C.muted, marginRight:4, fontWeight:"bold" }}>TABLE:</span>
          <button onClick={() => setSelectedTable(null)}
            style={btn({ background:selectedTable===null?"#3d2a00":"transparent", border:`2px solid ${selectedTable===null?C.gold:C.border}`,
              color:selectedTable===null?C.goldLight:C.muted, padding:"10px 18px", fontSize:14, fontWeight:selectedTable===null?"bold":"normal", minHeight:44 })}>
            All
          </button>
          {tabFiltered.map(([tno, data]) => {
            const hasPend = data.pending.length > 0;
            const isSelected = String(selectedTable)===String(tno);
            return (
              <button key={tno} onClick={() => setSelectedTable(isSelected ? null : tno)}
                style={btn({ background:isSelected?(hasPend?"#3d2a00":"#1a3a1a"):"transparent",
                  border:`2px solid ${isSelected?(hasPend?C.gold:"#5aaa5a"):(hasPend?"#5a4a20":"#2a4a2a")}`,
                  color:isSelected?(hasPend?C.goldLight:"#aaffaa"):(hasPend?C.muted:"#5aaa5a"),
                  padding:"10px 18px", fontSize:14, fontWeight:isSelected?"bold":"normal", minHeight:44 })}>
                T{tno} {hasPend?"⏳":"✅"}
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
                <div style={{ fontSize:12, color:"#ff6b35", letterSpacing:2, textTransform:"uppercase", marginBottom:10, fontWeight:"bold" }}>🔔 Waiter Called</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                  {waiterCalls.map(c => (
                    <div key={c.table_no} style={{ background:"#3d1a0e", border:"1.5px solid #ff6b35", borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:12 }}>
                      <div><div style={{ fontWeight:"bold", color:"#ff6b35", fontSize:15 }}>Table {c.table_no}</div><div style={{ fontSize:11, color:C.muted }}>{c.time}</div></div>
                      <button onClick={() => dismissWaiter(c.table_no)} style={btn({ background:"#ff6b35", border:"none", color:"#fff", padding:"6px 12px", fontSize:12, fontWeight:"bold" })}>Done ✓</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {displayTables.length===0 ? (
            <div style={{ textAlign:"center", color:C.muted, padding:60 }}>
              <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
              <div style={{ fontSize:18, color:"#5aaa5a", fontWeight:"bold" }}>All Clear!</div>
              <div style={{ fontSize:14, marginTop:8 }}>No active tables right now</div>
            </div>
          ) : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px,1fr))", gap:10, marginBottom:20 }}>
                <div style={{ background:C.panel, border:`1px solid #5aaa5a`, borderRadius:10, padding:12, textAlign:"center" }}>
                  <div style={{ fontSize:22, color:"#aaffaa", fontWeight:"bold" }}>{activeTables.length}</div>
                  <div style={{ fontSize:11, color:C.muted }}>Active Tables</div>
                </div>
                <div style={{ background:C.panel, border:`1px solid ${C.gold}`, borderRadius:10, padding:12, textAlign:"center" }}>
                  <div style={{ fontSize:22, color:C.goldLight, fontWeight:"bold" }}>RM {activeTables.reduce((s,[,tbl]) => s+tbl.total,0).toFixed(2)}</div>
                  <div style={{ fontSize:11, color:C.muted }}>Total Outstanding</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(340px,100%),1fr))", gap:14 }}>
                {displayTables.map(([tableNo, data]) => (
                  <TableCard key={tableNo} tableNo={tableNo} data={data} paying={paying} markPaid={markPaid} markOrderDone={markOrderDone} cancelOrder={cancelOrder} cardTab={cardTabs[tableNo]||"drinks"} setCardTab={(tab) => setCardTabs(prev => ({...prev, [tableNo]:tab}))} printReceipt={printReceipt} setPayModal={setPayModal} setTableDetailModal={setTableDetailModal} />
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
