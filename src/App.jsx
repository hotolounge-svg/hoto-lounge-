import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qjbfoooshpvjlqiepxxb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmZvb29zaHB2amxxaWVweHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTIxNDAsImV4cCI6MjA5NjEyODE0MH0.5psVFUbii5Wi5MHhoR3FVVs4C8UPMwgt2K1Tzb6VTxQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASSWORD = "hotolounge2024";
const TABLES = [1,2,3,4,5,6,7,8,9,10];
const TAX_RATE = 0.06;
const CAFE_NAME = "HOTO LOUNGE";
const CATEGORIES = ["Coffee & Drinks", "Food & Snacks", "Desserts"];

const C = { bg:"#1a1208", panel:"#2c1a0e", border:"#3d2d1a", gold:"#c8973a", goldLight:"#e8c77a", muted:"#a07840", text:"#f5ede0", dark:"#1a1208" };
const btn = (x={}) => ({ fontFamily:"Georgia,serif", cursor:"pointer", borderRadius:8, transition:"all 0.2s", ...x });

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
      {screen === "tablet"  && <TabletScreen  tableNo={tableNo} goHome={() => setScreen("home")} />}
      {screen === "kitchen" && <KitchenScreen goHome={() => setScreen("home")} />}
      {screen === "qrcodes" && <QRScreen      goHome={() => setScreen("home")} />}
      {screen === "admin"   && <AdminScreen   goHome={() => setScreen("home")} />}
      {screen === "sales"   && <SalesScreen   goHome={() => setScreen("home")} />}
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
        <button onClick={() => setScreen("kitchen")}
          style={btn({ width:"100%", background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:14, fontSize:16, fontWeight:"bold" })}>
          🍳 Kitchen / Orders Screen
        </button>
        <button onClick={() => setScreen("qrcodes")}
          style={btn({ width:"100%", background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:14, fontSize:15 })}>
          📱 View & Print QR Codes
        </button>
        <button onClick={() => setScreen("admin")}
          style={btn({ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.muted, padding:12, fontSize:13 })}>
          ⚙️ Admin — Manage Menu
        </button>
        <button onClick={() => setScreen("sales")}
          style={btn({ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.muted, padding:12, fontSize:13 })}>
          💰 Daily Sales Summary
        </button>
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
  const [form, setForm] = useState({ item_no:"", name:"", category:CATEGORIES[0], price:"", description:"", emoji:"🍽️", image_url:"", is_available:true });
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
    setForm({ item_no:"", name:"", category:CATEGORIES[0], price:"", description:"", emoji:"🍽️", image_url:"", is_available:true });
    setEditItem(null);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setForm({
      item_no: item.item_no,
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description || "",
      emoji: item.emoji || "🍽️",
      image_url: item.image_url || "",
      is_available: item.is_available !== false,
    });
    setEditItem(item);
    setShowForm(true);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `menu/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, file, { upsert:true });
    if (!error) {
      const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
      setForm(f => ({ ...f, image_url: data.publicUrl }));
    }
    setUploading(false);
  };

  const handleSave = async () => {
    const payload = {
      item_no: parseInt(form.item_no),
      name: form.name,
      category: form.category,
      price: parseFloat(form.price),
      description: form.description,
      emoji: form.emoji,
      image_url: form.image_url,
      is_available: form.is_available,
    };
    if (editItem) {
      await supabase.from("menu_items").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("menu_items").insert(payload);
    }
    setShowForm(false);
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    fetchItems();
  };

  const toggleAvailable = async (item) => {
    await supabase.from("menu_items").update({ is_available: item.is_available === false }).eq("id", item.id);
    fetchItems();
  };

  if (!authed) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", gap:20 }}>
      <div style={{ fontSize:32 }}>⚙️</div>
      <div style={{ fontSize:20, color:C.goldLight, fontWeight:"bold" }}>Admin Login</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:320 }}>
        <input type="password" placeholder="Enter password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
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
            <div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Item No.</div>
              <input value={form.item_no} onChange={e => setForm(f => ({ ...f, item_no: e.target.value }))} placeholder="e.g. 1"
                style={{ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box" }} />
            </div>
            <div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Item Name</div>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Latte"
                style={{ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box" }} />
            </div>
            <div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Category</div>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box" }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Price (RM)</div>
              <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 8.00" type="number" step="0.10"
                style={{ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box" }} />
            </div>
            <div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Emoji (if no image)</div>
              <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="e.g. ☕"
                style={{ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box" }} />
            </div>
            <div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Description</div>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description"
                style={{ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif", boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:11, color:C.muted }}>Availability</div>
              <button onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
                style={btn({ background: form.is_available ? "#2d6a2d" : "#6a2d2d", border:`1px solid ${form.is_available ? "#5aaa5a" : "#cc4444"}`, color: form.is_available ? "#aaffaa" : "#ff7777", padding:"6px 16px", fontSize:13, fontWeight:"bold" })}>
                {form.is_available ? "✅ Available" : "❌ Sold Out"}
              </button>
            </div>
          </div>

          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Food Image</div>
            <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
              {form.image_url && <img src={form.image_url} alt="preview" style={{ width:80, height:80, objectFit:"cover", borderRadius:10, border:`1px solid ${C.gold}` }} />}
              <button onClick={() => fileRef.current.click()} style={btn({ background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:"8px 16px", fontSize:13 })}>
                {uploading ? "Uploading..." : "📷 Upload Image"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleUpload} />
              {form.image_url && <button onClick={() => setForm(f => ({ ...f, image_url:"" }))} style={btn({ background:"transparent", border:"1px solid #cc4444", color:"#ff7777", padding:"8px 12px", fontSize:12 })}>Remove</button>}
            </div>
          </div>

          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button onClick={() => setShowForm(false)} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"10px 20px", fontSize:13 })}>Cancel</button>
            <button onClick={handleSave} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"10px 28px", fontSize:14, fontWeight:"bold" })}>
              {editItem ? "Save Changes" : "Add Item"} ✓
            </button>
          </div>
        </div>
      )}

      <div style={{ flex:1, padding:16, overflowY:"auto" }}>
        {loading ? <div style={{ color:C.muted, textAlign:"center", padding:40 }}>Loading...</div> :
          CATEGORIES.map(cat => {
            const catItems = items.filter(i => i.category === cat);
            return (
              <div key={cat} style={{ marginBottom:24 }}>
                <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>{cat} ({catItems.length})</div>
                {catItems.length === 0 && <div style={{ color:C.border, fontSize:13 }}>No items yet</div>}
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {catItems.map(item => (
                    <div key={item.id} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:14 }}>
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} style={{ width:56, height:56, objectFit:"cover", borderRadius:8, flexShrink:0 }} />
                        : <div style={{ width:56, height:56, background:"#241508", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0 }}>{item.emoji}</div>
                      }
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <span style={{ background:C.gold, color:C.dark, borderRadius:4, padding:"1px 7px", fontSize:11, fontWeight:"bold" }}>#{item.item_no}</span>
                          <span style={{ fontWeight:"bold", fontSize:14 }}>{item.name}</span>
                          {item.is_available === false && <span style={{ background:"#6a2d2d", color:"#ff7777", borderRadius:4, padding:"1px 7px", fontSize:11, fontWeight:"bold" }}>SOLD OUT</span>}
                        </div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{item.description}</div>
                        <div style={{ fontSize:14, color:C.gold, fontWeight:"bold", marginTop:2 }}>RM {parseFloat(item.price).toFixed(2)}</div>
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                        <button onClick={() => toggleAvailable(item)}
                          style={btn({ background: item.is_available !== false ? "#2d6a2d" : "#6a2d2d", border:`1px solid ${item.is_available !== false ? "#5aaa5a" : "#cc4444"}`, color: item.is_available !== false ? "#aaffaa" : "#ff7777", padding:"5px 10px", fontSize:11, fontWeight:"bold" })}>
                          {item.is_available !== false ? "✅ Available" : "❌ Sold Out"}
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

function TabletScreen({ tableNo, goHome }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [cart, setCart] = useState({});
  const [view, setView] = useState("menu");
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [menu, setMenu] = useState({});
  const [menuLoading, setMenuLoading] = useState(true);
  const [myOrders, setMyOrders] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [specialRequest, setSpecialRequest] = useState("");

  // Get or create session for this table
  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.from("table_sessions").select("session_id").eq("table_no", tableNo).single();
      if (data) {
        const stored = sessionStorage.getItem(`session_table_${tableNo}`);
        if (stored && stored !== data.session_id) {
          // Session changed — old customer
          setSessionExpired(true);
          return;
        }
        if (!stored) {
          // New customer — save current session
          sessionStorage.setItem(`session_table_${tableNo}`, data.session_id);
        }
        setSessionId(data.session_id);
      } else {
        // No session yet — create one
        const newSession = Date.now().toString();
        await supabase.from("table_sessions").upsert({ table_no: tableNo, session_id: newSession, updated_at: new Date().toISOString() });
        sessionStorage.setItem(`session_table_${tableNo}`, newSession);
        setSessionId(newSession);
      }
    };
    initSession();

    // Listen for session changes (table cleared)
    const ch = supabase.channel(`session-${tableNo}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"table_sessions", filter:`table_no=eq.${tableNo}` }, (payload) => {
        const stored = sessionStorage.getItem(`session_table_${tableNo}`);
        if (payload.new?.session_id && stored && payload.new.session_id !== stored) {
          setSessionExpired(true);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [tableNo]);

  // Fetch menu
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
  }, []);

  // Live order tracking for this table
  useEffect(() => {
    const fetchMyOrders = async () => {
      const { data } = await supabase.from("orders")
        .select("*")
        .eq("table_no", tableNo)
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending:true });
      setMyOrders(data || []);
    };
    fetchMyOrders();
    const ch = supabase.channel(`table-${tableNo}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"orders", filter:`table_no=eq.${tableNo}` }, fetchMyOrders)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [tableNo]);

  const addToCart = (item) => setCart(p => ({ ...p, [item.id]: { ...item, qty:(p[item.id]?.qty||0)+1 } }));
  const removeFromCart = (id) => setCart(p => {
    const u = {...p};
    if (!u[id]) return u;
    if (u[id].qty > 1) u[id] = {...u[id], qty: u[id].qty - 1};
    else delete u[id];
    return u;
  });
  const clearItem = (id) => setCart(p => { const u = {...p}; delete u[id]; return u; });

  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce((s,i) => s+i.price*i.qty, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const placeOrder = async () => {
    const { data } = await supabase.from("orders").insert({
      table_no: tableNo, items: cartItems,
      subtotal, tax, total, status:"pending",
      special_request: specialRequest.trim() || null,
      time: new Date().toLocaleTimeString("en-MY", { hour:"2-digit", minute:"2-digit" }),
    }).select().single();
    setCart({});
    setSpecialRequest("");
    setView("orders");
  };

  const cancelOrder = async (id) => {
    setCancelling(id);
    await supabase.from("orders").delete().eq("id", id);
    setCancelling(null);
  };

  const callWaiter = async () => {
    await supabase.from("waiter_calls").upsert({ table_no: tableNo, time: new Date().toLocaleTimeString("en-MY", { hour:"2-digit", minute:"2-digit" }) });
    setWaiterCalled(true);
    setTimeout(() => setWaiterCalled(false), 3000);
  };

  const pendingOrders = myOrders.filter(o => o.status === "pending");
  const doneOrders = myOrders.filter(o => o.status === "done");
  const currentMenuItems = menu[activeCategory] || [];
  const hasOrders = myOrders.length > 0;

  // Session expired screen
  if (sessionExpired) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", gap:20, padding:24, textAlign:"center" }}>
      <div style={{ fontSize:60 }}>🔒</div>
      <div style={{ fontSize:22, color:C.goldLight, fontWeight:"bold" }}>Session Ended</div>
      <div style={{ color:C.muted, fontSize:14, lineHeight:1.6 }}>This table has been reset for the next customer. Thank you for visiting {CAFE_NAME}! 😊</div>
      <div style={{ marginTop:10, fontSize:13, color:C.border }}>Please ask staff if you need assistance.</div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ background:C.panel, borderBottom:`2px solid ${C.gold}`, padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:"bold", color:C.goldLight }}>☕ {CAFE_NAME}</div>
          <div style={{ fontSize:12, color:C.gold, fontWeight:"bold" }}>TABLE {tableNo}</div>
        </div>
        <button onClick={callWaiter} style={btn({ background:waiterCalled?"#2d6a2d":C.panel, border:`1px solid ${waiterCalled?"#5aaa5a":C.gold}`, color:waiterCalled?"#aaffaa":C.goldLight, padding:"7px 14px", fontSize:13 })}>
          {waiterCalled ? "✅ Coming!" : "🔔 Call Waiter"}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", background:C.panel, borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <button onClick={() => setView("menu")} style={btn({ flex:1, background:"transparent", border:"none", borderBottom:view==="menu"?`3px solid ${C.gold}`:"3px solid transparent", color:view==="menu"?C.goldLight:C.muted, padding:"10px 0", fontSize:13, fontWeight:view==="menu"?"bold":"normal" })}>
          🍽️ Menu
        </button>
        <button onClick={() => setView("orders")} style={btn({ flex:1, background:"transparent", border:"none", borderBottom:view==="orders"?`3px solid ${C.gold}`:"3px solid transparent", color:view==="orders"?C.goldLight:C.muted, padding:"10px 0", fontSize:13, fontWeight:view==="orders"?"bold":"normal", position:"relative" })}>
          📋 My Orders {hasOrders && <span style={{ background:pendingOrders.length>0?"#c8973a":"#2d6a2d", color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:11, marginLeft:4 }}>{myOrders.length}</span>}
        </button>
      </div>

      {/* MY ORDERS VIEW */}
      {view === "orders" && (
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>
          {myOrders.length === 0 ? (
            <div style={{ textAlign:"center", color:C.muted, marginTop:60 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🍽️</div>
              <div>No orders yet — browse the menu to order!</div>
              <button onClick={() => setView("menu")} style={btn({ marginTop:16, background:C.gold, border:"none", color:C.dark, padding:"10px 24px", fontSize:14, fontWeight:"bold" })}>Browse Menu</button>
            </div>
          ) : (
            <>
              {pendingOrders.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>🟡 Being Prepared</div>
                  {pendingOrders.map(order => (
                    <div key={order.id} style={{ background:C.panel, border:`1.5px solid ${C.gold}`, borderRadius:12, padding:14, marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontSize:12, color:C.muted }}>{order.time}</span>
                        <span style={{ background:"#3d2a00", color:C.gold, borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:"bold" }}>🍳 Preparing...</span>
                      </div>
                      {order.items.map(item => (
                        <div key={item.id} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
                          <span>{item.emoji || "🍽️"} {item.name}</span>
                          <span style={{ color:C.gold }}>×{item.qty}</span>
                        </div>
                      ))}
                      <div style={{ borderTop:`1px solid ${C.border}`, marginTop:8, paddingTop:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ color:C.goldLight, fontWeight:"bold" }}>RM {order.total.toFixed(2)}</span>
                        <button onClick={() => cancelOrder(order.id)} disabled={cancelling===order.id}
                          style={btn({ background:"transparent", border:"1px solid #cc4444", color:"#ff7777", padding:"5px 12px", fontSize:12 })}>
                          {cancelling===order.id ? "..." : "❌ Cancel"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {doneOrders.length > 0 && (
                <div>
                  <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>✅ Served & Complete</div>
                  {doneOrders.map(order => (
                    <div key={order.id} style={{ background:"#1a2c1a", border:"1px solid #3a6a3a", borderRadius:12, padding:14, marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontSize:12, color:C.muted }}>{order.time}</span>
                        <span style={{ background:"#1a3a1a", color:"#5aaa5a", borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:"bold" }}>✅ Served!</span>
                      </div>
                      {order.items.map(item => (
                        <div key={item.id} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4, color:C.muted }}>
                          <span>{item.emoji || "🍽️"} {item.name}</span>
                          <span>×{item.qty}</span>
                        </div>
                      ))}
                      <div style={{ borderTop:`1px solid #2d4a2d`, marginTop:8, paddingTop:8 }}>
                        <span style={{ color:"#5aaa5a", fontWeight:"bold" }}>RM {order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setView("menu")} style={btn({ width:"100%", marginTop:10, background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:"12px 0", fontSize:14 })}>
                + Add More Items
              </button>
            </>
          )}
        </div>
      )}

      {/* MENU VIEW */}
      {view === "menu" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Category tabs - horizontal scrollable */}
          <div style={{ display:"flex", background:C.panel, borderBottom:`1px solid ${C.border}`, overflowX:"auto", flexShrink:0, WebkitOverflowScrolling:"touch" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={btn({ background:activeCategory===cat?`linear-gradient(135deg,${C.gold},#a07020)`:"transparent", border:"none", borderBottom:activeCategory===cat?`3px solid ${C.goldLight}`:"3px solid transparent", color:activeCategory===cat?C.dark:C.muted, padding:"10px 18px", fontSize:13, fontWeight:activeCategory===cat?"bold":"normal", whiteSpace:"nowrap", flexShrink:0 })}>
                {cat==="Coffee & Drinks"?"☕ Drinks":cat==="Food & Snacks"?"🍽️ Food":"🍰 Desserts"}
              </button>
            ))}
          </div>

          {/* Menu items scrollable */}
          <div style={{ flex:1, overflowY:"auto", padding:10 }}>
            {menuLoading ? (
              <div style={{ color:C.muted, textAlign:"center", padding:40 }}>Loading menu...</div>
            ) : currentMenuItems.length === 0 ? (
              <div style={{ color:C.muted, textAlign:"center", padding:40 }}>No items yet</div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {currentMenuItems.map(item => {
                  const qty = cart[item.id]?.qty || 0;
                  const soldOut = item.is_available === false;
                  return (
                    <div key={item.id} style={{ background:`linear-gradient(145deg,${C.panel},#241508)`, border:soldOut?`1px solid ${C.border}`:qty>0?`1.5px solid ${C.gold}`:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden", position:"relative", opacity:soldOut?0.6:1 }}>
                      <div style={{ position:"absolute", top:5, left:5, background:"rgba(0,0,0,0.7)", color:C.gold, borderRadius:4, padding:"1px 5px", fontSize:9, fontWeight:"bold", zIndex:1 }}>#{item.item_no}</div>
                      {soldOut && <div style={{ position:"absolute", top:5, right:5, background:"#6a2d2d", color:"#ff7777", borderRadius:4, padding:"1px 5px", fontSize:9, fontWeight:"bold", zIndex:1 }}>SOLD OUT</div>}
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} style={{ width:"100%", height:90, objectFit:"cover", filter:soldOut?"grayscale(80%)":"none" }} />
                        : <div style={{ height:70, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>{item.emoji}</div>
                      }
                      <div style={{ padding:"6px 8px 8px" }}>
                        <div style={{ fontWeight:"bold", fontSize:11, marginBottom:1 }}>{item.name}</div>
                        <div style={{ color:C.gold, fontWeight:"bold", fontSize:12, marginBottom:6 }}>RM {parseFloat(item.price).toFixed(2)}</div>
                        {soldOut ? (
                          <div style={{ textAlign:"center", color:"#ff7777", fontSize:11, fontWeight:"bold", padding:"4px 0" }}>Sold Out</div>
                        ) : qty === 0 ? (
                          <button onClick={() => addToCart(item)} style={btn({ width:"100%", background:C.gold, border:"none", color:C.dark, padding:"5px 0", fontSize:12, fontWeight:"bold" })}>+ Add</button>
                        ) : (
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            <button onClick={() => removeFromCart(item.id)} style={btn({ background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, width:28, height:28, fontSize:16, fontWeight:"bold" })}>−</button>
                            <span style={{ color:C.goldLight, fontWeight:"bold", fontSize:15 }}>{qty}</span>
                            <button onClick={() => addToCart(item)} style={btn({ background:C.gold, border:"none", color:C.dark, width:28, height:28, fontSize:16, fontWeight:"bold" })}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order summary bar at bottom */}
          {cartItems.length > 0 && (
            <div style={{ background:"#0f0a04", borderTop:`2px solid ${C.gold}`, flexShrink:0 }}>
              {/* Items list */}
              <div style={{ maxHeight:120, overflowY:"auto", padding:"6px 12px" }}>
                {cartItems.map(item => (
                  <div key={item.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:12, color:C.text, flex:1 }}>{item.name}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <button onClick={() => removeFromCart(item.id)} style={btn({ background:"#1a1208", border:`1px solid ${C.border}`, color:C.goldLight, width:22, height:22, fontSize:14 })}>−</button>
                      <span style={{ fontSize:12, color:C.goldLight, fontWeight:"bold", minWidth:16, textAlign:"center" }}>{item.qty}</span>
                      <button onClick={() => addToCart(item)} style={btn({ background:C.gold, border:"none", color:C.dark, width:22, height:22, fontSize:14, fontWeight:"bold" })}>+</button>
                      <button onClick={() => clearItem(item.id)} style={btn({ background:"transparent", border:"none", color:"#cc4444", fontSize:16, padding:"0 2px" })}>×</button>
                      <span style={{ fontSize:11, color:C.gold, fontWeight:"bold", minWidth:50, textAlign:"right" }}>RM {(item.price*item.qty).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Total + button */}
              <div style={{ padding:"8px 12px", borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Special Request (optional)</div>
                  <input value={specialRequest} onChange={e => setSpecialRequest(e.target.value)}
                    placeholder="e.g. no sugar, extra ice..."
                    style={{ width:"100%", background:C.panel, border:`1px solid ${C.border}`, color:C.text, padding:"6px 10px", borderRadius:6, fontSize:12, fontFamily:"Georgia,serif", boxSizing:"border-box", marginBottom:8 }} />
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:11, color:C.muted }}>Total (incl. 6% tax)</div>
                      <div style={{ fontSize:16, color:C.goldLight, fontWeight:"bold" }}>RM {total.toFixed(2)}</div>
                    </div>
                    <button onClick={async () => { await placeOrder(); }} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"10px 20px", fontSize:14, fontWeight:"bold", borderRadius:10 })}>
                      Place Order ✓
                    </button>
                  </div>
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
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.panel, borderBottom:`2px solid ${C.gold}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:18, color:C.goldLight, fontWeight:"bold" }}>📱 QR Codes for Tables</div>
        <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 14px", fontSize:13 })}>← Back</button>
      </div>
      <div style={{ padding:20 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:16 }}>
          {TABLES.map(t => (
            <div key={t} style={{ background:C.panel, border:`1px solid ${C.gold}`, borderRadius:14, padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:16, fontWeight:"bold", color:C.goldLight }}>TABLE {t}</div>
              <QRCode url={`${baseUrl}?table=${t}`} size={140} />
              <div style={{ fontSize:10, color:C.muted, textAlign:"center", fontFamily:"monospace", wordBreak:"break-all" }}>{baseUrl}?table={t}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:24, background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px" }}>
          <div style={{ fontSize:13, color:C.goldLight, fontWeight:"bold", marginBottom:6 }}>🍳 Kitchen Screen QR</div>
          <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
            <QRCode url={`${baseUrl}?screen=kitchen`} size={120} />
            <div style={{ fontSize:12, color:C.muted }}><span style={{ fontFamily:"monospace", color:C.gold, fontSize:11 }}>{baseUrl}?screen=kitchen</span></div>
          </div>
        </div>
        <div style={{ marginTop:16, textAlign:"center" }}>
          <button onClick={() => window.print()} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"12px 28px", fontSize:15, fontWeight:"bold" })}>🖨️ Print This Page</button>
        </div>
      </div>
    </div>
  );
}

function KitchenScreen({ goHome }) {
  const [orders, setOrders] = useState([]);
  const [waiterCalls, setWaiterCalls] = useState([]);
  const [soundOn, setSoundOn] = useState(true);
  const prevPendingCount = useRef(0);

  const playAlert = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 150, 300].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.4, ctx.currentTime + delay/1000);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay/1000 + 0.3);
        osc.start(ctx.currentTime + delay/1000);
        osc.stop(ctx.currentTime + delay/1000 + 0.3);
      });
    } catch(e) {}
  };

  const fetchAll = async () => {
    const { data:o } = await supabase.from("orders").select("*").order("created_at", { ascending:true });
    const { data:w } = await supabase.from("waiter_calls").select("*");
    const newOrders = o || [];
    const newPending = newOrders.filter(x => x.status === "pending").length;
    if (soundOn && newPending > prevPendingCount.current) playAlert();
    prevPendingCount.current = newPending;
    setOrders(newOrders);
    setWaiterCalls(w || []);
  };

  useEffect(() => {
    fetchAll();
    const ch1 = supabase.channel("orders-ch").on("postgres_changes", { event:"*", schema:"public", table:"orders" }, fetchAll).subscribe();
    const ch2 = supabase.channel("waiter-ch").on("postgres_changes", { event:"*", schema:"public", table:"waiter_calls" }, fetchAll).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, []);

  const markDone      = (id) => supabase.from("orders").update({ status:"done" }).eq("id", id).then(fetchAll);
  const cancelOrder   = (id) => supabase.from("orders").update({ status:"cancelled" }).eq("id", id).then(fetchAll);
  const dismissWaiter = (t)  => supabase.from("waiter_calls").delete().eq("table_no", t).then(fetchAll);
  const clearFinished = ()   => supabase.from("orders").delete().in("status", ["done","cancelled"]).then(fetchAll);
  const clearTable = async (t) => {
    await supabase.from("orders").delete().eq("table_no", t);
    // Generate new session ID — invalidates old customer browsers
    const newSession = Date.now().toString();
    await supabase.from("table_sessions").upsert({ table_no: parseInt(t), session_id: newSession, updated_at: new Date().toISOString() });
    fetchAll();
  };

  const pending   = orders.filter(o => o.status === "pending");
  const done      = orders.filter(o => o.status === "done");
  const cancelled = orders.filter(o => o.status === "cancelled");

  // Group done orders by table for bill summary
  const doneByTable = {};
  done.forEach(o => {
    if (!doneByTable[o.table_no]) doneByTable[o.table_no] = [];
    doneByTable[o.table_no].push(o);
  });

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.panel, borderBottom:`2px solid ${C.gold}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:18, color:C.goldLight, fontWeight:"bold" }}>🍳 Kitchen Screen</div>
          <div style={{ fontSize:11, color:"#ff4444" }}>🔴 Live — updates instantly</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => setSoundOn(s => !s)} style={btn({ background: soundOn?"#2d6a2d":"transparent", border:`1px solid ${soundOn?"#5aaa5a":C.border}`, color:soundOn?"#aaffaa":C.muted, padding:"7px 12px", fontSize:12 })}>
            {soundOn ? "🔔 Sound On" : "🔕 Sound Off"}
          </button>
          {(done.length > 0 || cancelled.length > 0) && <button onClick={clearFinished} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 12px", fontSize:12 })}>Clear Finished</button>}
          <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 10px", fontSize:12 })}>✕</button>
        </div>
      </div>
      <div style={{ flex:1, padding:16, overflowY:"auto" }}>
        {waiterCalls.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>🔔 Waiter Called</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              {waiterCalls.map(c => (
                <div key={c.table_no} style={{ background:"#3d1a0e", border:"1.5px solid #ff6b35", borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:12 }}>
                  <div><div style={{ fontWeight:"bold", color:"#ff6b35" }}>Table {c.table_no}</div><div style={{ fontSize:11, color:C.muted }}>{c.time}</div></div>
                  <button onClick={() => dismissWaiter(c.table_no)} style={btn({ background:"#ff6b35", border:"none", color:"#fff", padding:"5px 10px", fontSize:12 })}>Done ✓</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>🟡 Pending ({pending.length})</div>
        {pending.length === 0 && <div style={{ color:C.muted, textAlign:"center", padding:40 }}>All clear! ✅</div>}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:14, marginBottom:24 }}>
          {pending.map(order => (
            <div key={order.id} style={{ background:C.panel, border:`1.5px solid ${C.gold}`, borderRadius:14, padding:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontSize:20, fontWeight:"bold", color:C.goldLight }}>Table {order.table_no}</div>
                <div style={{ fontSize:11, color:C.muted }}>{order.time}</div>
              </div>
              {order.items.map(item => (
                <div key={item.id} style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:14 }}>
                  <span>{item.emoji || "🍽️"} {item.name}</span>
                  <span style={{ color:C.gold, fontWeight:"bold" }}>×{item.qty}</span>
                </div>
              ))}
              {order.special_request && (
                <div style={{ background:"#2a1a00", border:"1px solid #c8973a44", borderRadius:6, padding:"6px 10px", marginTop:6, fontSize:12, color:C.gold }}>
                  📝 {order.special_request}
                </div>
              )}
              <div style={{ borderTop:`1px solid ${C.border}`, marginTop:10, paddingTop:10, display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                <span style={{ color:C.muted, fontSize:13 }}>RM {order.total.toFixed(2)}</span>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => cancelOrder(order.id)} style={btn({ background:"transparent", border:"1px solid #cc4444", color:"#ff7777", padding:"6px 12px", fontSize:12 })}>❌ Cancel</button>
                  <button onClick={() => markDone(order.id)} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"7px 14px", fontSize:13, fontWeight:"bold" })}>Done ✓</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {cancelled.length > 0 && <>
          <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>❌ Cancelled ({cancelled.length})</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:10, marginBottom:20 }}>
            {cancelled.map(o => (
              <div key={o.id} style={{ background:"#2a1a1a", border:"1px solid #5a2a2a", borderRadius:12, padding:12, opacity:0.7 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span style={{ color:"#ff7777", fontWeight:"bold" }}>Table {o.table_no}</span><span style={{ fontSize:11, color:C.muted }}>{o.time}</span></div>
                {o.items.map(item => <div key={item.id} style={{ fontSize:12, color:C.muted, marginBottom:3 }}>{item.emoji || "🍽️"} {item.name} ×{item.qty}</div>)}
              </div>
            ))}
          </div>
        </>}

        {/* Clear Table section - grouped by table */}
        {Object.keys(doneByTable).length > 0 && <>
          <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10, marginTop:10 }}>💳 Ready to Clear Table</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px,1fr))", gap:12 }}>
            {Object.entries(doneByTable).map(([tableNum, tableOrders]) => {
              const tableTotal = tableOrders.reduce((s,o) => s + o.total, 0);
              const allItems = tableOrders.flatMap(o => o.items);
              return (
                <div key={tableNum} style={{ background:"#1a2c1a", border:"1.5px solid #3a6a3a", borderRadius:14, padding:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <span style={{ fontSize:18, fontWeight:"bold", color:"#5aaa5a" }}>Table {tableNum}</span>
                    <span style={{ fontSize:14, color:C.goldLight, fontWeight:"bold" }}>RM {tableTotal.toFixed(2)}</span>
                  </div>
                  {allItems.map((item, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.muted, marginBottom:3 }}>
                      <span>{item.emoji || "🍽️"} {item.name}</span>
                      <span>×{item.qty}</span>
                    </div>
                  ))}
                  <button onClick={() => { if(confirm(`Clear Table ${tableNum}? This will reset the table for the next customer.`)) clearTable(tableNum); }}
                    style={btn({ width:"100%", marginTop:12, background:"linear-gradient(135deg,#2d6a2d,#1a4a1a)", border:"1px solid #5aaa5a", color:"#aaffaa", padding:"10px 0", fontSize:13, fontWeight:"bold" })}>
                    ✅ Paid — Clear Table {tableNum}
                  </button>
                </div>
              );
            })}
          </div>
        </>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
function SalesScreen({ goHome }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      const start = `${selectedDate}T00:00:00`;
      const end   = `${selectedDate}T23:59:59`;
      const { data } = await supabase.from("orders")
        .select("*")
        .eq("status", "done")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending:true });
      setOrders(data || []);
      setLoading(false);
    };
    fetchSales();
  }, [selectedDate]);

  const totalRevenue = orders.reduce((s,o) => s + o.total, 0);
  const totalTax     = orders.reduce((s,o) => s + o.tax, 0);
  const totalOrders  = orders.length;

  // Top selling items
  const itemCount = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      if (!itemCount[item.name]) itemCount[item.name] = { name:item.name, emoji:item.emoji||"🍽️", qty:0, revenue:0 };
      itemCount[item.name].qty += item.qty;
      itemCount[item.name].revenue += item.price * item.qty;
    });
  });
  const topItems = Object.values(itemCount).sort((a,b) => b.qty - a.qty);

  // Sales by table
  const byTable = {};
  orders.forEach(o => {
    if (!byTable[o.table_no]) byTable[o.table_no] = { count:0, total:0 };
    byTable[o.table_no].count++;
    byTable[o.table_no].total += o.total;
  });

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.panel, borderBottom:`2px solid ${C.gold}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:18, color:C.goldLight, fontWeight:"bold" }}>💰 Daily Sales Summary</div>
        <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 14px", fontSize:13 })}>← Back</button>
      </div>

      <div style={{ padding:16, overflowY:"auto", flex:1 }}>
        {/* Date picker */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ fontSize:13, color:C.muted }}>Date:</div>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ background:C.panel, border:`1px solid ${C.gold}`, color:C.text, padding:"8px 12px", borderRadius:8, fontSize:14, fontFamily:"Georgia,serif" }} />
        </div>

        {loading ? <div style={{ color:C.muted, textAlign:"center", padding:40 }}>Loading...</div> : <>

          {/* Summary cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px,1fr))", gap:12, marginBottom:24 }}>
            <div style={{ background:C.panel, border:`1px solid ${C.gold}`, borderRadius:12, padding:16, textAlign:"center" }}>
              <div style={{ fontSize:28, color:C.goldLight, fontWeight:"bold" }}>RM {totalRevenue.toFixed(2)}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Total Revenue</div>
            </div>
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:16, textAlign:"center" }}>
              <div style={{ fontSize:28, color:C.goldLight, fontWeight:"bold" }}>{totalOrders}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Orders Completed</div>
            </div>
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:16, textAlign:"center" }}>
              <div style={{ fontSize:28, color:C.goldLight, fontWeight:"bold" }}>RM {totalTax.toFixed(2)}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Tax Collected (6%)</div>
            </div>
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:16, textAlign:"center" }}>
              <div style={{ fontSize:28, color:C.goldLight, fontWeight:"bold" }}>RM {totalOrders > 0 ? (totalRevenue/totalOrders).toFixed(2) : "0.00"}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Avg Order Value</div>
            </div>
          </div>

          {orders.length === 0 ? (
            <div style={{ color:C.muted, textAlign:"center", padding:40 }}>No completed orders for this date</div>
          ) : <>
            {/* Top selling items */}
            <div style={{ fontSize:13, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>🏆 Top Selling Items</div>
            <div style={{ background:C.panel, borderRadius:12, overflow:"hidden", marginBottom:24 }}>
              {topItems.map((item, i) => (
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

            {/* Sales by table */}
            <div style={{ fontSize:13, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>🪑 Sales by Table</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px,1fr))", gap:10, marginBottom:24 }}>
              {Object.entries(byTable).sort((a,b) => b[1].total - a[1].total).map(([t, data]) => (
                <div key={t} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:12, textAlign:"center" }}>
                  <div style={{ fontSize:14, color:C.goldLight, fontWeight:"bold", marginBottom:4 }}>Table {t}</div>
                  <div style={{ fontSize:13, color:C.gold, fontWeight:"bold" }}>RM {data.total.toFixed(2)}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{data.count} order{data.count>1?"s":""}</div>
                </div>
              ))}
            </div>

            {/* Order list */}
            <div style={{ fontSize:13, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>📋 All Orders</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {orders.map(order => (
                <div key={order.id} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ color:C.goldLight, fontWeight:"bold" }}>Table {order.table_no}</span>
                    <span style={{ fontSize:12, color:C.muted }}>{order.time}</span>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:6 }}>
                    {order.items.map((item,i) => (
                      <span key={i} style={{ background:"#241508", borderRadius:4, padding:"2px 8px", fontSize:11, color:C.muted }}>{item.emoji||"🍽️"} {item.name} ×{item.qty}</span>
                    ))}
                  </div>
                  {order.special_request && <div style={{ fontSize:11, color:C.gold, marginBottom:4 }}>📝 {order.special_request}</div>}
                  <div style={{ fontSize:13, color:C.gold, fontWeight:"bold", textAlign:"right" }}>RM {order.total.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </>}
        </>}
      </div>
    </div>
  );
}
