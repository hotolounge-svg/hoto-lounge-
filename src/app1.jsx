import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qjbfoooshpvjlqiepxxb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmZvb29zaHB2amxxaWVweHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTIxNDAsImV4cCI6MjA5NjEyODE0MH0.5psVFUbii5Wi5MHhoR3FVVs4C8UPMwgt2K1Tzb6VTxQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASSWORD = "hotolounge2024";
const TABLES = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
const CAFE_NAME = "HOTO LOUNGE";
const CATEGORIES = ["Beverage", "Food & Snacks", "Desserts"];
const DRINK_CATEGORIES = ["Beverage"];
const FOOD_CATEGORIES = ["Food & Snacks", "Desserts"];

// Staff dark theme
const C = { bg:"#1a1208", panel:"#2c1a0e", border:"#3d2d1a", gold:"#c8973a", goldLight:"#e8c77a", muted:"#a07840", text:"#f5ede0", dark:"#1a1208" };
const btn = (x={}) => ({ fontFamily:"Georgia,serif", cursor:"pointer", borderRadius:8, transition:"all 0.2s", ...x });

// Customer bright theme
const T = {
  bg:"#f5f5f5", panel:"#ffffff", border:"#e0e0e0",
  brown:"#8a5a00", text:"#1a1a1a", muted:"#666666",
  green:"#2e7d32", greenBg:"#e8f5e9", red:"#c62828",
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

// Check if promo time is currently active
const isPromoActive = (item) => {
  if (item.category !== "Promo") return true;
  if (!item.promo_start || !item.promo_end) return true;
  const now = new Date();
  const [sh, sm] = item.promo_start.split(":").map(Number);
  const [eh, em] = item.promo_end.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= start && cur <= end;
};
// Get effective price (happy hour price if active)
const getEffectivePrice = (item, now=new Date()) => {
  if (!item.promo_price || !item.promo_start || !item.promo_end) return item.price;
  const [sh, sm] = item.promo_start.split(":").map(Number);
  const [eh, em] = item.promo_end.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const cur = now.getHours() * 60 + now.getMinutes();
  return (cur >= start && cur <= end) ? item.promo_price : item.price;
};
// Check if item is in happy hour right now
const isHappyHour = (item, now=new Date()) => {
  if (!item.promo_start || !item.promo_end) return false;
  if (!item.promo_price && (!item.promo_drinks || item.promo_drinks.length === 0)) return false;
  const [sh, sm] = item.promo_start.split(":").map(Number);
  const [eh, em] = item.promo_end.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= start && cur <= end;
};

function QRCode({ url, size=160 }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=2c1a0e&color=e8c77a&margin=10`;
  return <img src={src} alt="QR" style={{ width:size, height:size, borderRadius:8 }} />;
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [tableNo, setTableNo] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = parseInt(params.get("table"));
    if (t && TABLES.includes(t)) { setTableNo(t); setScreen("tablet"); }
    if (params.get("screen") === "kitchen") setScreen("kitchen");
    if (params.get("screen") === "admin") setScreen("admin");
  }, []);
  return (
    <div style={{ fontFamily:"Georgia,serif", background:C.bg, minHeight:"100vh", color:C.text }}>
      {screen === "home"    && <HomeScreen    setScreen={setScreen} setTableNo={setTableNo} />}
      {screen === "tablet"  && <TabletScreen  tableNo={tableNo} isStaff={tableNo !== null && !window.location.search.includes("table=")} goHome={() => setScreen("home")} />}
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
          {TABLES.map(t => (
            <button key={t} onClick={() => { setTableNo(t); setScreen("tablet"); }}
              style={btn({ background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:"14px 0", fontSize:15, fontWeight:"bold" })}>
              T{t}
            </button>
          ))}
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

function AdminScreen({ goHome }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item_no:"", name:"", category:CATEGORIES[0], price:"", description:"", emoji:"🍽️", image_url:"", is_available:true, addons:[], promo_start:"", promo_end:"", promo_price:"", promo_drinks:[] });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from("menu_items").select("*").order("item_no", { ascending:true });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { if (authed) fetchItems(); }, [authed]);

  const handleLogin = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(false); }
    else setPwError(true);
  };
  const openAdd = () => {
    setForm({ item_no:"", name:"", category:CATEGORIES[0], price:"", description:"", emoji:"🍽️", image_url:"", is_available:true, addons:[], promo_start:"", promo_end:"", promo_price:"", promo_drinks:[] });
    setEditItem(null); setShowForm(true);
  };
  const openEdit = (item) => {
    setForm({ item_no:item.item_no, name:item.name, category:item.category, price:item.price, description:item.description||"", emoji:item.emoji||"🍽️", image_url:item.image_url||"", is_available:item.is_available!==false, addons:item.addons||[], promo_start:item.promo_start||"", promo_end:item.promo_end||"", promo_price:item.promo_price||"", promo_drinks:item.promo_drinks||[] });
    setEditItem(item); setShowForm(true);
  };
  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const path = `menu/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, file, { upsert:true });
    if (error) { alert("Upload failed: " + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
    setForm(f => ({ ...f, image_url:data.publicUrl }));
    setUploading(false);
  };
  const handleSave = async () => {
    const p = { item_no:form.item_no, name:form.name, category:form.category, price:parseFloat(form.price), description:form.description, emoji:form.emoji, image_url:form.image_url, is_available:form.is_available, addons:form.addons||[], promo_start:form.promo_start||null, promo_end:form.promo_end||null, promo_price:form.promo_price?parseFloat(form.promo_price):null, promo_drinks:form.promo_drinks||[] };
    if (editItem) await supabase.from("menu_items").update(p).eq("id", editItem.id);
    else await supabase.from("menu_items").insert(p);
    setShowForm(false); fetchItems();
  };
  const handleDelete = async (id) => { if (!confirm("Delete this item?")) return; await supabase.from("menu_items").delete().eq("id", id); fetchItems(); };
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
      <div style={{ background:C.panel, borderBottom:`2px solid ${C.gold}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:18, color:C.goldLight, fontWeight:"bold" }}>⚙️ Menu Management</div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={openAdd} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"8px 16px", fontSize:13, fontWeight:"bold" })}>+ Add Item</button>
          <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"8px 12px", fontSize:13 })}>← Back</button>
        </div>
      </div>
      {showForm && (
        <div style={{ background:"#0a0804", borderBottom:`2px solid ${C.gold}`, padding:20 }}>
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
              <div key={ai} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                <input value={addon.name} onChange={e => { const u=[...form.addons]; u[ai]={...u[ai],name:e.target.value}; setForm(f=>({...f,addons:u})); }} placeholder="e.g. Extra Egg"
                  style={{ flex:1, background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"7px 12px", borderRadius:8, fontSize:13, fontFamily:"Georgia,serif" }} />
                <input value={addon.price} onChange={e => { const u=[...form.addons]; u[ai]={...u[ai],price:e.target.value}; setForm(f=>({...f,addons:u})); }} placeholder="RM" type="number" step="0.50"
                  style={{ width:80, background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"7px 10px", borderRadius:8, fontSize:13, fontFamily:"Georgia,serif" }} />
                <button onClick={() => setForm(f=>({...f,addons:f.addons.filter((_,i)=>i!==ai)}))}
                  style={btn({ background:"transparent", border:"1px solid #cc4444", color:"#ff7777", padding:"6px 10px", fontSize:13 })}>✕</button>
              </div>
            ))}
            <button onClick={() => setForm(f=>({...f,addons:[...(f.addons||[]),{name:"",price:""}]}))}
              style={btn({ background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:"7px 16px", fontSize:13 })}>+ Add Option</button>
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
      )}
      <div style={{ flex:1, padding:16, overflowY:"auto" }}>
        {loading ? <div style={{ color:C.muted, textAlign:"center", padding:40 }}>Loading...</div> :
          CATEGORIES.map(cat => {
            const catItems = items.filter(i => i.category===cat);
            return (
              <div key={cat} style={{ marginBottom:24 }}>
                <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>
                  {cat} ({catItems.length}) — {DRINK_CATEGORIES.includes(cat) ? "☕ Cashier (Beverage)" : "🍳 Kitchen prepares"}
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
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [cart, setCart] = useState({});
  const [view, setView] = useState("menu");
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [menu, setMenu] = useState({});
  const [menuLoading, setMenuLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Tick every 10s so promo time checks (isHappyHour/getEffectivePrice) stay current
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);
  const [myOrders, setMyOrders] = useState([]);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [drinkRequest, setDrinkRequest] = useState("");
  const [foodRequest, setFoodRequest] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [promoModal, setPromoModal] = useState(null); // {item, selectedDrink:""}
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const addToCart = (item, freeDrink=null) => {
    const effectivePrice = getEffectivePrice(item,now);
    const itemToAdd = { ...item, price: effectivePrice };
    setCart(p => ({ ...p, [item.id]: { ...itemToAdd, qty:(p[item.id]?.qty||0)+1 } }));
    // If free drink selected, add it to cart at RM 0
    if (freeDrink) {
      const drinkKey = `free_${item.id}`;
      const freeItem = { id:drinkKey, name:`${freeDrink} (Free)`, price:0, qty:1, category:"Beverage", emoji:"☕", item_no:"" };
      setCart(p => ({ ...p, [drinkKey]: { ...freeItem, qty:1 } }));
    }
  };
  const handleAddItem = (item) => {
    if (isHappyHour(item,now) && item.promo_drinks && item.promo_drinks.length > 0) {
      setPromoModal({ item, selectedDrink:"" });
    } else {
      addToCart(item);
    }
  };
  const removeFromCart = (id) => setCart(p => { const u={...p}; if (!u[id]) return u; if (u[id].qty>1) u[id]={...u[id],qty:u[id].qty-1}; else delete u[id]; return u; });
  const clearItem = (id) => setCart(p => { const u={...p}; delete u[id]; return u; });

  const cartItems = Object.values(cart);
  const total = cartItems.reduce((s,i) => s+i.price*i.qty, 0);

  const placeOrder = async () => {
    if (isSubmitting) return; // Block duplicate taps
    setIsSubmitting(true);
    try {
      const drinkReq = drinkRequest.trim() || null;
      const foodReq = foodRequest.trim() || null;
      const time = new Date().toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit"});

      // Clean cart items for storage (remove internal keys)
      const cleanItems = (items) => items.map(i => { const {cartKey, basePrice, ...rest} = i; return rest; });
      const drinkItems = cleanItems(cartItems.filter(i => DRINK_CATEGORIES.includes(i.category)));
      const foodItems = cleanItems(cartItems.filter(i => FOOD_CATEGORIES.includes(i.category)));

      const ordersToInsert = [];

      if (drinkItems.length > 0) {
        const drinkTotal = drinkItems.reduce((s,i) => s+i.price*i.qty, 0);
        ordersToInsert.push({
          table_no:tableNo, items:drinkItems, subtotal:drinkTotal, tax:0,
          total:drinkTotal, status:"pending",
          special_request:drinkReq, time
        });
      }

      if (foodItems.length > 0) {
        const foodTotal = foodItems.reduce((s,i) => s+i.price*i.qty, 0);
        ordersToInsert.push({
          table_no:tableNo, items:foodItems, subtotal:foodTotal, tax:0,
          total:foodTotal, status:"pending",
          special_request:foodReq, time
        });
      }

      await supabase.from("orders").insert(ordersToInsert);
      setCart({}); setDrinkRequest(""); setFoodRequest(""); setView("orders");
    } finally {
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
      <div style={{ color:T.muted, fontSize:18, lineHeight:1.8 }}>Thank you for visiting {CAFE_NAME}! 😊<br/><br/><span style={{ fontSize:15 }}>Please scan the QR code on your table to place a new order.</span></div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", background:T.bg, fontFamily:"Georgia,serif" }}>
      {/* Header */}
      <div style={{ background:T.brown, padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {isStaff && <button onClick={goHome} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.4)", color:"#fff", borderRadius:8, padding:"6px 12px", fontSize:13 }}>← Back</button>}
          <div>
            <div style={{ fontSize:18, fontWeight:"bold", color:"#fff" }}>☕ {CAFE_NAME}</div>
            <div style={{ fontSize:13, color:"#ffe099" }}>TABLE {tableNo}</div>
          </div>
        </div>
        <button onClick={callWaiter} style={{ fontFamily:"Georgia,serif", cursor:"pointer", borderRadius:10, background:waiterCalled?"#2e7d32":"#fff", border:"none", color:waiterCalled?"#fff":T.brown, padding:"10px 14px", fontSize:14, fontWeight:"bold" }}>
          {waiterCalled ? "✅ Coming!" : "🔔 Call Waiter"}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", background:"#fff", borderBottom:`2px solid ${T.border}`, flexShrink:0 }}>
        <button onClick={() => setView("menu")} style={{ fontFamily:"Georgia,serif", cursor:"pointer", flex:1, background:"transparent", border:"none", borderBottom:view==="menu"?`3px solid ${T.brown}`:"3px solid transparent", color:view==="menu"?T.brown:T.muted, padding:"14px 0", fontSize:17, fontWeight:view==="menu"?"bold":"normal" }}>
          🍽️ Menu
        </button>
        <button onClick={() => setView("orders")} style={{ fontFamily:"Georgia,serif", cursor:"pointer", flex:1, background:"transparent", border:"none", borderBottom:view==="orders"?`3px solid ${T.brown}`:"3px solid transparent", color:view==="orders"?T.brown:T.muted, padding:"14px 0", fontSize:17, fontWeight:view==="orders"?"bold":"normal" }}>
          📋 My Orders {hasOrders && <span style={{ background:pendingOrders.length>0?T.orange:T.green, color:"#fff", borderRadius:12, padding:"2px 9px", fontSize:13, marginLeft:6 }}>{myOrders.length}</span>}
        </button>
      </div>

      {/* MY ORDERS */}
      {view === "orders" && (
        <div style={{ flex:1, overflowY:"auto", padding:16, background:T.bg }}>
          {myOrders.length === 0 ? (
            <div style={{ textAlign:"center", color:T.muted, marginTop:60 }}>
              <div style={{ fontSize:52, marginBottom:16 }}>🍽️</div>
              <div style={{ fontSize:18 }}>No orders yet — browse the menu!</div>
              <button onClick={() => setView("menu")} style={{ fontFamily:"Georgia,serif", cursor:"pointer", marginTop:20, background:T.brown, border:"none", color:"#fff", padding:"14px 32px", fontSize:18, fontWeight:"bold", borderRadius:12 }}>Browse Menu</button>
            </div>
          ) : (
            <>
              {myOrders.map(order => {
                const isPending = order.status === "pending";
                const isDrinkOrder = order.items.every(i => DRINK_CATEGORIES.includes(i.category));
                const isFoodOrder = order.items.every(i => FOOD_CATEGORIES.includes(i.category));
                const label = isDrinkOrder ? "☕ Drinks" : isFoodOrder ? "🍳 Food" : "🍽️ Order";
                const borderColor = isPending ? T.orange : T.green;
                const bgColor = isPending ? "#fff" : T.greenBg;
                const statusText = isPending
                  ? (isDrinkOrder ? "⏳ Preparing" : "⏳ Kitchen preparing")
                  : "✅ Served";
                const statusBg = isPending ? T.orange : T.green;
                return (
                  <div key={order.id} style={{ background:bgColor, border:`2px solid ${borderColor}`, borderRadius:14, padding:16, marginBottom:12, boxShadow:T.shadow }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
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
              <button onClick={() => setView("menu")} style={{ fontFamily:"Georgia,serif", cursor:"pointer", width:"100%", marginTop:10, background:"#fff", border:`2px solid ${T.brown}`, color:T.brown, padding:"14px 0", fontSize:17, fontWeight:"bold", borderRadius:12 }}>+ Add More Items</button>
            </>
          )}
          )}
        </div>
      )}

      {/* MENU */}
      {view === "menu" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:T.bg }}>
          {/* Search bar */}
          <div style={{ padding:"10px 12px", background:"#fff", borderBottom:`1px solid ${T.border}` }}>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:18, color:T.muted }}>🔍</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search menu..."
                style={{ width:"100%", background:"#f5f5f5", border:`1px solid ${T.border}`, color:T.text, padding:"10px 12px 10px 40px", borderRadius:10, fontSize:16, fontFamily:"Georgia,serif", boxSizing:"border-box" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", fontSize:20, color:T.muted, cursor:"pointer" }}>×</button>
              )}
            </div>
          </div>


          {/* Category tabs — hidden when searching */}
          {!searchQuery && (
            <div style={{ display:"flex", background:"#fff", borderBottom:`1px solid ${T.border}`, overflowX:"auto", flexShrink:0 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:activeCategory===cat?T.brown:"#fff", border:"none", color:activeCategory===cat?"#fff":T.muted, padding:"14px 18px", fontSize:15, fontWeight:activeCategory===cat?"bold":"normal", whiteSpace:"nowrap", flexShrink:0, borderBottom:activeCategory===cat?`3px solid #5a3a00`:"3px solid transparent" }}>
                  {cat==="Beverage"?"☕ Beverage":cat==="Food & Snacks"?"🍽️ Food":"🍰 Desserts"}
                </button>
              ))}
            </div>
          )}

          {/* Items grid — Zeoniq style */}
          <div style={{ flex:1, overflowY:"auto", padding:"10px 14px" }}>
            {menuLoading ? <div style={{ color:T.muted, textAlign:"center", padding:40, fontSize:18 }}>Loading menu...</div>
              : currentMenuItems.length===0 ? <div style={{ color:T.muted, textAlign:"center", padding:40, fontSize:18 }}>{searchQuery ? `No results for "${searchQuery}"` : "No items yet"}</div>
              : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(160px, 45%), 1fr))", gap:10 }}>
                  {currentMenuItems.map(item => {
                    const qty = cart[item.id]?.qty || 0;
                    const soldOut = item.is_available===false;
                    return (
                      <div key={item.id} style={{ background:"#fff", border:qty>0?`2px solid ${T.brown}`:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden", position:"relative", opacity:soldOut?0.5:1, boxShadow:T.shadow, display:"flex", flexDirection:"column" }}>
                        {/* Price badge top right */}
                        <div style={{ position:"absolute", top:8, right:8, background:isHappyHour(item,now)?"#e65100":"rgba(0,0,0,0.7)", color:"#fff", borderRadius:6, padding:"3px 8px", fontSize:13, fontWeight:"bold", zIndex:1 }}>
                          {isHappyHour(item,now) && <span style={{ textDecoration:"line-through", opacity:0.7, marginRight:4, fontSize:11 }}>RM {parseFloat(item.price).toFixed(2)}</span>}
                          RM {parseFloat(getEffectivePrice(item,now)).toFixed(2)}
                          {isHappyHour(item,now) && <span style={{ fontSize:10, display:"block", textAlign:"center" }}>🍺 Happy Hour</span>}
                        </div>
                        {soldOut && <div style={{ position:"absolute", top:8, left:8, background:T.red, color:"#fff", borderRadius:6, padding:"2px 7px", fontSize:11, fontWeight:"bold", zIndex:1 }}>SOLD OUT</div>}
                        {item.image_url
                          ? <img src={item.image_url} alt={item.name} style={{ width:"100%", height:80, objectFit:"cover", filter:soldOut?"grayscale(80%)":"none" }} />
                          : <div style={{ height:80, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, background:"#f9f9f9" }}>{item.emoji}</div>
                        }
                        <div style={{ padding:"10px 10px 12px", flex:1, display:"flex", flexDirection:"column" }}>
                          <div style={{ fontWeight:"bold", fontSize:14, marginBottom:8, color:T.text, lineHeight:1.3, flex:1 }}>
                            {item.item_no && <span style={{ color:T.brown, marginRight:6 }}>{item.item_no}</span>}{item.name}
                          </div>
                          {soldOut ? (
                            <div style={{ textAlign:"center", color:T.red, fontSize:13, fontWeight:"bold", padding:"8px 0", background:"#fff0f0", borderRadius:8 }}>Sold Out</div>
                          ) : qty===0 ? (
                            <div>
                              {item.promo_active && item.promo_drinks && item.promo_drinks.length > 0 && (
                                <div style={{ textAlign:"center", fontSize:11, color:T.green, fontWeight:"bold", marginBottom:4 }}>🎁 with free drinks</div>
                              )}
                              <button onClick={() => handleAddItem(item)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", width:"100%", background:T.brown, border:"none", color:"#fff", padding:"10px 0", fontSize:15, fontWeight:"bold", borderRadius:8 }}>+ Add</button>
                            </div>
                          ) : (
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                              <button onClick={() => removeFromCart(item.id)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"#fff", border:`2px solid ${T.brown}`, color:T.brown, width:40, height:40, fontSize:24, fontWeight:"bold", borderRadius:8 }}>−</button>
                              <span style={{ color:T.brown, fontWeight:"bold", fontSize:22 }}>{qty}</span>
                              <button onClick={() => addToCart(item)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:T.brown, border:"none", color:"#fff", width:40, height:40, fontSize:24, fontWeight:"bold", borderRadius:8 }}>+</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>

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
                    <span style={{ fontSize:14, color:T.green, fontWeight:"bold" }}>FREE</span>
                  </div>
                ))}
                <div style={{ marginTop:16, display:"flex", gap:10 }}>
                  <button onClick={() => { addToCart(promoModal.item, promoModal.selectedDrink||null); setPromoModal(null); }}
                    style={{ fontFamily:"Georgia,serif", cursor:"pointer", flex:1, background:T.brown, border:"none", color:"#fff", padding:"16px 0", fontSize:17, fontWeight:"bold", borderRadius:12 }}>
                    {promoModal.selectedDrink ? `Add + Free ${promoModal.selectedDrink} ✓` : "Add without free drink"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cart bar */}
          {cartItems.length > 0 && (
            <div style={{ background:"#fff", borderTop:`2px solid ${T.brown}`, flexShrink:0, boxShadow:"0 -2px 10px rgba(0,0,0,0.08)" }}>
              <div style={{ maxHeight:130, overflowY:"auto", padding:"8px 14px" }}>
                {cartItems.map(item => (
                  <div key={item.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:15, color:T.text }}>{item.name}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <button onClick={() => removeFromCart(item.id)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"#f5f5f5", border:`1px solid ${T.border}`, color:T.brown, width:28, height:28, fontSize:16, borderRadius:6 }}>−</button>
                      <span style={{ fontSize:15, color:T.brown, fontWeight:"bold", minWidth:20, textAlign:"center" }}>{item.qty}</span>
                      <button onClick={() => addToCart(item)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:T.brown, border:"none", color:"#fff", width:28, height:28, fontSize:16, fontWeight:"bold", borderRadius:6 }}>+</button>
                      <button onClick={() => clearItem(item.id)} style={{ fontFamily:"Georgia,serif", cursor:"pointer", background:"transparent", border:"none", color:T.red, fontSize:20, padding:"0 2px" }}>×</button>
                      <span style={{ fontSize:14, color:T.brown, fontWeight:"bold", minWidth:55, textAlign:"right" }}>RM {(item.price*item.qty).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding:"10px 14px", borderTop:`1px solid ${T.border}` }}>
                {cartItems.some(i => DRINK_CATEGORIES.includes(i.category)) && (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:13, color:T.muted, marginBottom:4 }}>☕ Drinks Special Request</div>
                    <input value={drinkRequest} onChange={e => setDrinkRequest(e.target.value)} placeholder="e.g. no sugar, extra ice..."
                      style={{ width:"100%", background:"#f9f9f9", border:`1px solid ${T.border}`, color:T.text, padding:"8px 12px", borderRadius:8, fontSize:15, fontFamily:"Georgia,serif", boxSizing:"border-box" }} />
                  </div>
                )}
                {cartItems.some(i => FOOD_CATEGORIES.includes(i.category)) && (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:13, color:T.muted, marginBottom:4 }}>🍳 Food Special Request</div>
                    <input value={foodRequest} onChange={e => setFoodRequest(e.target.value)} placeholder="e.g. no sauce, extra spicy..."
                      style={{ width:"100%", background:"#f9f9f9", border:`1px solid ${T.border}`, color:T.text, padding:"8px 12px", borderRadius:8, fontSize:15, fontFamily:"Georgia,serif", boxSizing:"border-box" }} />
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:13, color:T.muted }}>Total</div>
                    <div style={{ fontSize:24, color:T.brown, fontWeight:"bold" }}>RM {total.toFixed(2)}</div>
                  </div>
                  <button onClick={placeOrder} disabled={isSubmitting} style={{ fontFamily:"Georgia,serif", cursor:isSubmitting?"not-allowed":"pointer", background:isSubmitting?"#a0836a":T.brown, border:"none", color:"#fff", padding:"14px 28px", fontSize:18, fontWeight:"bold", borderRadius:12, opacity:isSubmitting?0.7:1, transition:"all 0.2s" }}>
                    {isSubmitting ? "Placing…" : "Place Order ✓"}
                  </button>
                </div>
              </div>
            </div>
          )}
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
          {TABLES.map(t => (
            <div key={t} style={{ background:C.panel, border:`1px solid ${C.gold}`, borderRadius:14, padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:16, fontWeight:"bold", color:C.goldLight }}>TABLE {t}</div>
              <QRCode url={`${baseUrl}?table=${t}`} size={140} />
              <div style={{ fontSize:10, color:C.muted, textAlign:"center", fontFamily:"monospace", wordBreak:"break-all" }}>{baseUrl}?table={t}</div>
              <button onClick={() => printOne(t)} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"7px 20px", fontSize:13, fontWeight:"bold", width:"100%" })}>🖨️ Print</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KitchenScreen({ goHome }) {
  const [orders, setOrders] = useState([]);
  const [soundOn, setSoundOn] = useState(true);
  const prevPendingCount = useRef(0);
  const soundOnRef = useRef(true);

  const toggleSound = () => {
    setSoundOn(s => { soundOnRef.current = !s; return !s; });
  };

  const playAlert = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0,200,400].forEach(delay => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; osc.type = "sine";
        gain.gain.setValueAtTime(1.0, ctx.currentTime+delay/1000);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+delay/1000+0.5);
        osc.start(ctx.currentTime+delay/1000); osc.stop(ctx.currentTime+delay/1000+0.5);
      });
    } catch(e) {}
  };

  const fetchAll = async () => {
    const { data:o } = await supabase.from("orders").select("*").order("created_at", { ascending:true });
    const newOrders = o||[];
    const filtered = newOrders.map(order => ({
      ...order,
      items: order.items.filter(item => FOOD_CATEGORIES.includes(item.category))
    })).filter(order => order.items.length > 0);
    const newPending = filtered.filter(x => x.status==="pending").length;
    if (soundOnRef.current && newPending > prevPendingCount.current) playAlert();
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
          {cancelled.length>0 && <button onClick={clearFinished} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 12px", fontSize:12 })}>Clear Cancelled</button>}
          <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 10px", fontSize:12 })}>✕</button>
        </div>
      </div>
      <div style={{ flex:1, padding:16, overflowY:"auto" }}>
        <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>🟡 Pending Food ({pending.length})</div>
        {pending.length===0 && <div style={{ color:C.muted, textAlign:"center", padding:40 }}>All clear! ✅</div>}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:14, marginBottom:24 }}>
          {pending.map(order => (
            <div key={order.id} style={{ background:C.panel, border:`1.5px solid ${C.gold}`, borderRadius:14, padding:16, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontSize:20, fontWeight:"bold", color:C.goldLight }}>Table {order.table_no}</div>
                <div style={{ fontSize:11, color:C.muted }}>{order.time}</div>
              </div>
              <div style={{ flex:1 }}>
                {order.items.map((item,i) => (
                  <div key={i} style={{ marginBottom:6 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:14 }}>
                      <span>{item.emoji||"🍽️"} {item.item_no && <span style={{ color:C.gold, fontWeight:"bold", marginRight:4 }}>{item.item_no}</span>}{item.name}</span>
                      <span style={{ color:C.gold, fontWeight:"bold" }}>×{item.qty}</span>
                    </div>

                  </div>
                ))}
                {getFoodReq(order.special_request) && (
                  <div style={{ background:"#2a1a00", border:"1px solid #c8973a44", borderRadius:6, padding:"6px 10px", marginTop:6, fontSize:12, color:C.gold }}>📝 {getFoodReq(order.special_request)}</div>
                )}
              </div>
              <div style={{ borderTop:`1px solid ${C.border}`, marginTop:10, paddingTop:10, display:"flex", justifyContent:"flex-end" }}>
                <button onClick={() => markDone(order.id)} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"8px 20px", fontSize:14, fontWeight:"bold" })}>Done ✓</button>
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
              {Object.entries(byTable).sort((a,b) => parseInt(a[0])-parseInt(b[0])).map(([t,data]) => (
                <div key={t} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:12, textAlign:"center" }}>
                  <div style={{ fontSize:14, color:C.goldLight, fontWeight:"bold", marginBottom:4 }}>Table {t}</div>
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

function TableCard({ tableNo, data, paying, markPaid, markOrderDone, cancelOrder, cardTab, setCardTab }) {
  const hasPending = data.pending.length>0;
  const allOrders = [...data.done, ...data.pending];
  const drinkOrders = allOrders.filter(o => o.items.some(i => DRINK_CATEGORIES.includes(i.category)));
  const foodOrders = allOrders.filter(o => o.items.some(i => FOOD_CATEGORIES.includes(i.category)));

  return (
    <div style={{ background:C.panel, border:`2px solid ${hasPending?"#c8973a":"#5aaa5a"}`, borderRadius:14, overflow:"hidden" }}>

      {/* Header */}
      <div style={{ background:hasPending?"#2c1a0e":"#1a2c1a", padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:22, fontWeight:"bold", color:hasPending?C.goldLight:"#aaffaa" }}>Table {tableNo}</div>
        <div style={{ display:"flex", gap:6 }}>
          {data.pending.length>0 && <span style={{ background:"#3d2a00", color:C.gold, borderRadius:6, padding:"3px 10px", fontSize:12 }}>⏳ {data.pending.length} pending</span>}
          {data.done.length>0 && <span style={{ background:"#1a3a1a", color:"#5aaa5a", borderRadius:6, padding:"3px 10px", fontSize:12 }}>✅ {data.done.length} done</span>}
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
                    {drinkItems.map((item, ii) => (
                      <div key={ii} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderTop: ii>0 ? `1px solid #2a1a08` : "none" }}>
                        <span style={{ color:isPending?"#eee":"#5aaa5a", fontSize:15 }}>
                          {item.item_no && <span style={{ color:"#5aaa5a", fontWeight:"bold", marginRight:5 }}>{item.item_no}</span>}
                          {item.name} <span style={{ color:C.gold, fontWeight:"bold", marginLeft:6 }}>×{item.qty}</span>
                        </span>
                        <span style={{ color:"#5aaa5a", fontWeight:"bold", fontSize:14, whiteSpace:"nowrap", marginLeft:8 }}>RM {(item.price*item.qty).toFixed(2)}</span>
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
        <button onClick={() => { if(confirm(`Table ${tableNo} paid RM ${data.total.toFixed(2)}? This will clear the table.`)) markPaid(tableNo); }}
          disabled={paying===tableNo}
          style={btn({ width:"100%", background:"linear-gradient(135deg,#2d6a2d,#1a4a1a)", border:"1px solid #5aaa5a", color:"#aaffaa", padding:"16px 0", fontSize:16, fontWeight:"bold", cursor:"pointer", minHeight:54 })}>
          {paying===tableNo ? "Processing..." : "✅ Mark as Paid & Clear Table"}
        </button>
      </div>
    </div>
  );
}

function CashierScreen({ goHome }) {
  const [orders, setOrders] = useState([]);
  const [waiterCalls, setWaiterCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [filterTab, setFilterTab] = useState("all");
  const [selectedTable, setSelectedTable] = useState(null);
  const [cardTabs, setCardTabs] = useState({});
  const prevDrinkCount = useRef(0);
  const prevWaiterCount = useRef(0);

  const playAlert = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0,200,400].forEach(delay => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 660; osc.type = "sine";
        gain.gain.setValueAtTime(1.0, ctx.currentTime+delay/1000);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+delay/1000+0.5);
        osc.start(ctx.currentTime+delay/1000); osc.stop(ctx.currentTime+delay/1000+0.5);
      });
    } catch(e) {}
  };

  const playWaiterAlert = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0,250,500,750].forEach((delay,i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = i%2===0?880:550; osc.type = "sine";
        gain.gain.setValueAtTime(1.0, ctx.currentTime+delay/1000);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+delay/1000+0.5);
        osc.start(ctx.currentTime+delay/1000); osc.stop(ctx.currentTime+delay/1000+0.5);
      });
    } catch(e) {}
  };

  const fetchAll = async () => {
    const { data } = await supabase.from("orders").select("*").in("status",["pending","done"]).order("created_at",{ascending:true});
    const { data:w } = await supabase.from("waiter_calls").select("*");
    const newOrders = data||[];
    const newWaiters = w||[];
    setWaiterCalls(newWaiters);
    const drinkPending = newOrders.filter(o => o.status==="pending")
      .reduce((s,o) => s + o.items.filter(i => DRINK_CATEGORIES.includes(i.category)).length, 0);
    if (soundOn && drinkPending > prevDrinkCount.current) playAlert();
    if (soundOn && newWaiters.length > prevWaiterCount.current) playWaiterAlert();
    prevDrinkCount.current = drinkPending;
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
  const pendingTables = activeTables.filter(([,t]) => t.pending.length > 0);
  const doneTables = activeTables.filter(([,t]) => t.pending.length === 0);
  const tabFiltered = filterTab==="pending" ? pendingTables : filterTab==="done" ? doneTables : activeTables;
  const displayTables = selectedTable ? tabFiltered.filter(([t]) => String(t)===String(selectedTable)) : tabFiltered;

  const markPaid = async (tableNo) => {
    setPaying(tableNo);
    await supabase.from("orders").update({status:"paid"}).eq("table_no",tableNo).in("status",["pending","done"]);
    // Mark session as paid — triggers realtime on customer screen immediately
    // "paid_" prefix tells the system this table needs a fresh QR scan
    await supabase.from("table_sessions").upsert({table_no:parseInt(tableNo), session_id:"paid_"+Date.now(), updated_at:new Date().toISOString()});
    setPaying(null); fetchAll();
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
      <div style={{ background:C.panel, borderBottom:`2px solid #5aaa5a`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:18, color:"#aaffaa", fontWeight:"bold" }}>💳 Cashier — Drinks & Payment</div>
          <div style={{ fontSize:11, color:"#5aaa5a" }}>🔴 Live — updates instantly</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => setSoundOn(s => !s)} style={btn({ background:soundOn?"#2d6a2d":"transparent", border:`1px solid ${soundOn?"#5aaa5a":C.border}`, color:soundOn?"#aaffaa":C.muted, padding:"7px 12px", fontSize:12 })}>
            {soundOn ? "🔔 Sound On" : "🔕 Sound Off"}
          </button>
          <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 14px", fontSize:13 })}>← Back</button>
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
          {tabFiltered.map(([t, data]) => {
            const hasPend = data.pending.length > 0;
            const isSelected = String(selectedTable)===String(t);
            return (
              <button key={t} onClick={() => setSelectedTable(isSelected ? null : t)}
                style={btn({ background:isSelected?(hasPend?"#3d2a00":"#1a3a1a"):"transparent",
                  border:`2px solid ${isSelected?(hasPend?C.gold:"#5aaa5a"):(hasPend?"#5a4a20":"#2a4a2a")}`,
                  color:isSelected?(hasPend?C.goldLight:"#aaffaa"):(hasPend?C.muted:"#5aaa5a"),
                  padding:"10px 18px", fontSize:14, fontWeight:isSelected?"bold":"normal", minHeight:44 })}>
                T{t} {hasPend?"⏳":"✅"}
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
                  <div style={{ fontSize:22, color:C.goldLight, fontWeight:"bold" }}>RM {activeTables.reduce((s,[,t]) => s+t.total,0).toFixed(2)}</div>
                  <div style={{ fontSize:11, color:C.muted }}>Total Outstanding</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(340px,1fr))", gap:14 }}>
                {displayTables.map(([tableNo, data]) => (
                  <TableCard key={tableNo} tableNo={tableNo} data={data} paying={paying} markPaid={markPaid} markOrderDone={markOrderDone} cancelOrder={cancelOrder} cardTab={cardTabs[tableNo]||"drinks"} setCardTab={(tab) => setCardTabs(prev => ({...prev, [tableNo]:tab}))} />
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
