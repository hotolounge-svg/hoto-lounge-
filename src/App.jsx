import { useState, useEffect, useRef } from "react";

const DEFAULT_MENU = {
  "Coffee & Drinks": [
    { id: 1, name: "Espresso", price: 5.50, emoji: "☕", desc: "Rich & bold single shot" },
    { id: 2, name: "Latte", price: 8.00, emoji: "🥛", desc: "Smooth espresso with steamed milk" },
    { id: 3, name: "Cappuccino", price: 8.00, emoji: "☕", desc: "Frothy & creamy classic" },
    { id: 4, name: "Cold Brew", price: 9.50, emoji: "🧊", desc: "12-hour steeped, served iced" },
    { id: 5, name: "Matcha Latte", price: 10.00, emoji: "🍵", desc: "Japanese grade matcha & oat milk" },
    { id: 6, name: "Sparkling Lemonade", price: 7.00, emoji: "🍋", desc: "Fresh squeezed with soda" },
  ],
  "Food & Snacks": [
    { id: 7, name: "Avocado Toast", price: 14.00, emoji: "🥑", desc: "Sourdough, smashed avo, chili flakes" },
    { id: 8, name: "Croissant", price: 6.50, emoji: "🥐", desc: "Buttery & flaky, baked fresh" },
    { id: 9, name: "Club Sandwich", price: 16.00, emoji: "🥪", desc: "Chicken, egg, lettuce, tomato" },
    { id: 10, name: "Granola Bowl", price: 12.00, emoji: "🍓", desc: "Yogurt, honey, fresh berries" },
    { id: 11, name: "Cheese Toastie", price: 9.00, emoji: "🧀", desc: "Three-cheese melt on white bread" },
    { id: 12, name: "Fries", price: 7.00, emoji: "🍟", desc: "Crispy shoestring with dipping sauce" },
  ],
  "Desserts": [
    { id: 13, name: "Tiramisu", price: 13.00, emoji: "🍰", desc: "Classic Italian, dusted cocoa" },
    { id: 14, name: "Chocolate Lava Cake", price: 14.00, emoji: "🍫", desc: "Warm & gooey with ice cream" },
    { id: 15, name: "Cheesecake Slice", price: 12.00, emoji: "🎂", desc: "New York style, berry compote" },
    { id: 16, name: "Waffles", price: 13.00, emoji: "🧇", desc: "Belgian style, maple syrup & butter" },
    { id: 17, name: "Crème Brûlée", price: 14.00, emoji: "🍮", desc: "Torched vanilla custard" },
    { id: 18, name: "Ice Cream (2 scoops)", price: 8.00, emoji: "🍦", desc: "Vanilla, choc, or strawberry" },
  ],
};

const TABLES = [1,2,3,4,5,6,7,8,9,10];
const TAX_RATE = 0.06;
const CAFE_NAME = "HOTO LOUNGE";

// ─── Storage ────────────────────────────────────────────────────
async function loadOrders() {
  try { const r = await window.storage.get("cafe-orders"); return r ? JSON.parse(r.value) : []; } catch { return []; }
}
async function saveOrders(o) {
  try { await window.storage.set("cafe-orders", JSON.stringify(o), true); } catch {}
}
async function loadWaiterCalls() {
  try { const r = await window.storage.get("cafe-waiter-calls"); return r ? JSON.parse(r.value) : []; } catch { return []; }
}
async function saveWaiterCalls(c) {
  try { await window.storage.set("cafe-waiter-calls", JSON.stringify(c), true); } catch {}
}

// ─── Colours ────────────────────────────────────────────────────
const C = { bg:"#1a1208", panel:"#2c1a0e", border:"#3d2d1a", gold:"#c8973a", goldLight:"#e8c77a", muted:"#a07840", text:"#f5ede0", dark:"#1a1208" };
const btn = (x={}) => ({ fontFamily:"Georgia,serif", cursor:"pointer", borderRadius:8, transition:"all 0.2s", ...x });

// ─── QR Code via Google Charts API ──────────────────────────────
function QRCode({ url, size = 160 }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=2c1a0e&color=e8c77a&margin=10`;
  return <img src={src} alt="QR Code" style={{ width: size, height: size, borderRadius: 8 }} />;
}

// ════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("home");
  const [tableNo, setTableNo] = useState(null);

  // ── Detect ?table=N in URL ──────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = parseInt(params.get("table"));
    if (t && TABLES.includes(t)) {
      setTableNo(t);
      setScreen("tablet");
    }
    const s = params.get("screen");
    if (s === "kitchen") setScreen("kitchen");
  }, []);

  return (
    <div style={{ fontFamily:"Georgia,serif", background:C.bg, minHeight:"100vh", color:C.text }}>
      {screen === "home"    && <HomeScreen    setScreen={setScreen} setTableNo={setTableNo} />}
      {screen === "tablet"  && <TabletScreen  tableNo={tableNo} goHome={() => setScreen("home")} />}
      {screen === "kitchen" && <KitchenScreen goHome={() => setScreen("home")} />}
      {screen === "qrcodes" && <QRScreen      goHome={() => setScreen("home")} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HOME
function HomeScreen({ setScreen, setTableNo }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", gap:28, padding:24 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:52 }}>☕</div>
        <div style={{ fontSize:28, color:C.goldLight, fontWeight:"bold", letterSpacing:2 }}>{CAFE_NAME}</div>
        <div style={{ fontSize:12, color:C.muted, letterSpacing:4, textTransform:"uppercase", marginTop:4 }}>Ordering System</div>
      </div>

      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ fontSize:11, color:C.muted, letterSpacing:3, textTransform:"uppercase", marginBottom:10, textAlign:"center" }}>— Customer Tablet (fixed per table) —</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
          {TABLES.map(t => (
            <button key={t} onClick={() => { setTableNo(t); setScreen("tablet"); }}
              style={btn({ background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:"14px 0", fontSize:15, fontWeight:"bold" })}>
              T{t}
            </button>
          ))}
        </div>
        <div style={{ fontSize:11, color:C.muted, textAlign:"center", marginTop:8 }}>Simulate a customer tablet for any table</div>
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
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// QR CODE SCREEN
function QRScreen({ goHome }) {
  const baseUrl = window.location.href.split("?")[0];

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.panel, borderBottom:`2px solid ${C.gold}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:18, color:C.goldLight, fontWeight:"bold" }}>📱 QR Codes for Tables</div>
          <div style={{ fontSize:11, color:C.muted }}>Print & laminate one per table</div>
        </div>
        <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 14px", fontSize:13 })}>← Back</button>
      </div>

      <div style={{ padding:20 }}>
        <div style={{ background:"#1e2a1e", border:"1px solid #3a5a3a", borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:13, color:"#8aba8a" }}>
          💡 <strong>How to use:</strong> Once you host this app online (e.g. Vercel), each QR code below will link directly to that table's ordering page. Customers scan → menu opens instantly, no selection needed!
        </div>

        <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 16px", marginBottom:20, fontSize:12, color:C.muted }}>
          <strong style={{ color:C.goldLight }}>Your app URL:</strong> <span style={{ fontFamily:"monospace", color:C.gold }}>{baseUrl}</span>
          <br />
          <span style={{ fontSize:11 }}>Table links will be: <span style={{ fontFamily:"monospace" }}>{baseUrl}?table=1</span>, <span style={{ fontFamily:"monospace" }}>{baseUrl}?table=2</span> etc.</span>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:16 }}>
          {TABLES.map(t => (
            <div key={t} style={{ background:C.panel, border:`1px solid ${C.gold}`, borderRadius:14, padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:16, fontWeight:"bold", color:C.goldLight }}>TABLE {t}</div>
              <QRCode url={`${baseUrl}?table=${t}`} size={140} />
              <div style={{ fontSize:10, color:C.muted, textAlign:"center", fontFamily:"monospace", wordBreak:"break-all" }}>
                {baseUrl}?table={t}
              </div>
              <div style={{ fontSize:11, color:C.muted, textAlign:"center" }}>
                ☕ Scan to order
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:24, background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px" }}>
          <div style={{ fontSize:13, color:C.goldLight, fontWeight:"bold", marginBottom:6 }}>🍳 Kitchen Screen QR</div>
          <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
            <QRCode url={`${baseUrl}?screen=kitchen`} size={120} />
            <div style={{ fontSize:12, color:C.muted }}>
              Scan this on your kitchen/counter device to open the staff orders screen.<br />
              <span style={{ fontFamily:"monospace", color:C.gold, fontSize:11 }}>{baseUrl}?screen=kitchen</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop:16, textAlign:"center" }}>
          <button onClick={() => window.print()} style={btn({ background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:"12px 28px", fontSize:15, fontWeight:"bold" })}>
            🖨️ Print This Page
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TABLET — customer ordering
function TabletScreen({ tableNo, goHome }) {
  const [activeCategory, setActiveCategory] = useState(Object.keys(DEFAULT_MENU)[0]);
  const [cart, setCart] = useState({});
  const [view, setView] = useState("menu");
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const addToCart = (item) => setCart(p => ({ ...p, [item.id]: { ...item, qty:(p[item.id]?.qty||0)+1 } }));
  const removeFromCart = (id) => setCart(p => {
    const u = {...p};
    if (u[id].qty > 1) u[id] = {...u[id], qty: u[id].qty-1};
    else delete u[id];
    return u;
  });

  const cartItems = Object.values(cart);
  const totalItems = cartItems.reduce((s,i) => s+i.qty, 0);
  const subtotal   = cartItems.reduce((s,i) => s+i.price*i.qty, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const placeOrder = async () => {
    const orders = await loadOrders();
    const newId = Date.now();
    await saveOrders([...orders, {
      id: newId, tableNo, items: cartItems,
      subtotal, tax, total, status:"pending",
      time: new Date().toLocaleTimeString("en-MY", { hour:"2-digit", minute:"2-digit" }),
    }]);
    setLastOrderId(newId);
    setView("success");
    setCart({});
    setTimeout(() => { setView("menu"); setLastOrderId(null); }, 8000);
  };

  const cancelOrder = async () => {
    if (!lastOrderId) return;
    setCancelling(true);
    const orders = await loadOrders();
    await saveOrders(orders.filter(o => o.id !== lastOrderId));
    setCancelling(false);
    setLastOrderId(null);
    setView("menu");
  };

  const callWaiter = async () => {
    const calls = await loadWaiterCalls();
    const updated = calls.filter(c => c.tableNo !== tableNo);
    await saveWaiterCalls([...updated, { tableNo, time: new Date().toLocaleTimeString("en-MY", { hour:"2-digit", minute:"2-digit" }) }]);
    setWaiterCalled(true);
    setTimeout(() => setWaiterCalled(false), 3000);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh" }}>
      {/* Header */}
      <div style={{ background:C.panel, borderBottom:`2px solid ${C.gold}`, padding:"12px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:18, fontWeight:"bold", color:C.goldLight }}>☕ {CAFE_NAME}</div>
          <div style={{ fontSize:13, color:C.gold, fontWeight:"bold" }}>TABLE {tableNo}</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={callWaiter} style={btn({ background: waiterCalled?"#2d6a2d":C.panel, border:`1px solid ${waiterCalled?"#5aaa5a":C.gold}`, color: waiterCalled?"#aaffaa":C.goldLight, padding:"7px 12px", fontSize:12 })}>
            {waiterCalled ? "✅ Coming!" : "🔔 Waiter"}
          </button>
          <button onClick={() => setView(view==="cart"?"menu":"cart")} style={btn({ background:C.gold, border:"none", color:C.dark, padding:"7px 14px", fontSize:13, fontWeight:"bold" })}>
            🛒 {totalItems > 0 ? `(${totalItems})` : "Cart"}
          </button>
        </div>
      </div>

      {/* Success */}
      {view === "success" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
          <div style={{ fontSize:70 }}>✅</div>
          <div style={{ fontSize:24, color:C.goldLight, fontWeight:"bold" }}>Order Sent!</div>
          <div style={{ color:C.muted }}>Table {tableNo} — your order is being prepared 🍳</div>
          <div style={{ marginTop:10, textAlign:"center" }}>
            <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>Made a mistake? You can cancel within a short time.</div>
            <button onClick={cancelOrder} disabled={cancelling} style={btn({ background:"transparent", border:"1.5px solid #cc4444", color:"#ff7777", padding:"10px 24px", fontSize:14 })}>
              {cancelling ? "Cancelling..." : "❌ Cancel This Order"}
            </button>
          </div>
        </div>
      )}

      {/* Cart */}
      {view === "cart" && (
        <div style={{ flex:1, padding:18, maxWidth:560, margin:"0 auto", width:"100%" }}>
          <div style={{ fontSize:18, color:C.goldLight, marginBottom:16, fontWeight:"bold" }}>Table {tableNo} — Your Order</div>
          {cartItems.length === 0 ? (
            <div style={{ color:C.muted, textAlign:"center", marginTop:60 }}>
              Cart is empty.
              <br />
              <button onClick={() => setView("menu")} style={btn({ marginTop:14, background:"none", border:`1px solid ${C.gold}`, color:C.goldLight, padding:"8px 20px" })}>Browse Menu</button>
            </div>
          ) : (
            <>
              {cartItems.map(item => (
                <div key={item.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:24 }}>{item.emoji}</span>
                    <div>
                      <div style={{ fontWeight:"bold", fontSize:14 }}>{item.name}</div>
                      <div style={{ fontSize:11, color:C.muted }}>RM {item.price.toFixed(2)}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <button onClick={() => removeFromCart(item.id)} style={btn({ background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, width:28, height:28, fontSize:16 })}>−</button>
                    <span style={{ minWidth:18, textAlign:"center", fontWeight:"bold", color:C.goldLight }}>{item.qty}</span>
                    <button onClick={() => addToCart(item)} style={btn({ background:C.gold, border:"none", color:C.dark, width:28, height:28, fontSize:16, fontWeight:"bold" })}>+</button>
                    <span style={{ minWidth:55, textAlign:"right", color:C.goldLight, fontWeight:"bold" }}>RM {(item.price*item.qty).toFixed(2)}</span>
                  </div>
                </div>
              ))}
              <div style={{ background:C.panel, border:`1px solid ${C.gold}`, borderRadius:10, padding:14, marginTop:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", color:C.muted, marginBottom:6 }}><span>Subtotal</span><span>RM {subtotal.toFixed(2)}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", color:C.muted, marginBottom:10 }}><span>Tax (6%)</span><span>RM {tax.toFixed(2)}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", color:C.goldLight, fontWeight:"bold", fontSize:17, borderTop:`1px solid ${C.border}`, paddingTop:10 }}><span>Total</span><span>RM {total.toFixed(2)}</span></div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:14 }}>
                <button onClick={() => setView("menu")} style={btn({ flex:1, background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:12, fontSize:13 })}>← Back</button>
                <button onClick={placeOrder} style={btn({ flex:2, background:`linear-gradient(135deg,${C.gold},#a07020)`, border:"none", color:C.dark, padding:12, fontSize:16, fontWeight:"bold" })}>Place Order ✓</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Menu */}
      {view === "menu" && (
        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
          <div style={{ width:110, background:C.panel, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:4, padding:8, flexShrink:0 }}>
            {Object.keys(DEFAULT_MENU).map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={btn({ background: activeCategory===cat ? `linear-gradient(135deg,${C.gold},#a07020)` : "transparent", border: activeCategory===cat ? "none" : `1px solid ${C.border}`, color: activeCategory===cat ? C.dark : C.muted, padding:"12px 6px", fontSize:11, fontWeight: activeCategory===cat ? "bold" : "normal", textAlign:"center", lineHeight:1.4 })}>
                {cat==="Coffee & Drinks" ? "☕\nCoffee &\nDrinks" : cat==="Food & Snacks" ? "🍽️\nFood &\nSnacks" : "🍰\nDesserts"}
              </button>
            ))}
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:14 }}>
            <div style={{ fontSize:11, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>{activeCategory}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(155px,1fr))", gap:10 }}>
              {DEFAULT_MENU[activeCategory].map(item => {
                const qty = cart[item.id]?.qty || 0;
                return (
                  <div key={item.id} onClick={() => addToCart(item)} style={{ background:`linear-gradient(145deg,${C.panel},#241508)`, border: qty>0 ? `1.5px solid ${C.gold}` : `1px solid ${C.border}`, borderRadius:12, padding:12, cursor:"pointer", position:"relative", boxShadow: qty>0 ? `0 0 10px rgba(200,151,58,0.15)` : "none", transition:"all 0.2s" }}>
                    {qty > 0 && <div style={{ position:"absolute", top:7, right:7, background:C.gold, color:C.dark, borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:"bold" }}>{qty}</div>}
                    <div style={{ fontSize:34, marginBottom:6 }}>{item.emoji}</div>
                    <div style={{ fontWeight:"bold", fontSize:13, marginBottom:3 }}>{item.name}</div>
                    <div style={{ fontSize:10, color:"#7a5a30", marginBottom:8, lineHeight:1.4 }}>{item.desc}</div>
                    <div style={{ color:C.gold, fontWeight:"bold", fontSize:15 }}>RM {item.price.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view === "menu" && totalItems > 0 && (
        <div onClick={() => setView("cart")} style={{ background:`linear-gradient(135deg,${C.gold},#a07020)`, padding:"12px 20px", display:"flex", justifyContent:"space-between", cursor:"pointer" }}>
          <span style={{ color:C.dark, fontWeight:"bold" }}>{totalItems} item{totalItems>1?"s":""}</span>
          <span style={{ color:C.dark, fontWeight:"bold" }}>RM {subtotal.toFixed(2)} → View Order</span>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// KITCHEN SCREEN
function KitchenScreen({ goHome }) {
  const [orders, setOrders] = useState([]);
  const [waiterCalls, setWaiterCalls] = useState([]);

  const refresh = async () => {
    setOrders(await loadOrders());
    setWaiterCalls(await loadWaiterCalls());
  };

  useEffect(() => { refresh(); const t = setInterval(refresh, 3000); return () => clearInterval(t); }, []);

  const markDone = async (id) => {
    const updated = orders.map(o => o.id===id ? {...o, status:"done"} : o);
    await saveOrders(updated); setOrders(updated);
  };
  const cancelOrder = async (id) => {
    const updated = orders.map(o => o.id===id ? {...o, status:"cancelled"} : o);
    await saveOrders(updated); setOrders(updated);
  };
  const dismissWaiter = async (tableNo) => {
    const updated = waiterCalls.filter(c => c.tableNo!==tableNo);
    await saveWaiterCalls(updated); setWaiterCalls(updated);
  };
  const clearDone = async () => {
    const updated = orders.filter(o => o.status!=="done");
    await saveOrders(updated); setOrders(updated);
  };

  const pending   = orders.filter(o => o.status==="pending");
  const done      = orders.filter(o => o.status==="done");
  const cancelled = orders.filter(o => o.status==="cancelled");

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.panel, borderBottom:`2px solid ${C.gold}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:18, color:C.goldLight, fontWeight:"bold" }}>🍳 Kitchen Screen</div>
          <div style={{ fontSize:11, color:C.muted }}>Auto-refreshes every 3 seconds</div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {done.length > 0 && <button onClick={clearDone} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 12px", fontSize:12 })}>Clear Done ({done.length})</button>}
          <button onClick={refresh} style={btn({ background:C.panel, border:`1px solid ${C.gold}`, color:C.goldLight, padding:"7px 12px", fontSize:12 })}>🔄 Refresh</button>
          <button onClick={goHome} style={btn({ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 10px", fontSize:12 })}>✕</button>
        </div>
      </div>

      <div style={{ flex:1, padding:16, overflowY:"auto" }}>
        {waiterCalls.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>🔔 Waiter Called</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              {waiterCalls.map(c => (
                <div key={c.tableNo} style={{ background:"#3d1a0e", border:"1.5px solid #ff6b35", borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:12 }}>
                  <div>
                    <div style={{ fontWeight:"bold", color:"#ff6b35" }}>Table {c.tableNo}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{c.time}</div>
                  </div>
                  <button onClick={() => dismissWaiter(c.tableNo)} style={btn({ background:"#ff6b35", border:"none", color:"#fff", padding:"5px 10px", fontSize:12 })}>Done ✓</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>🟡 Pending Orders ({pending.length})</div>
        {pending.length === 0 && <div style={{ color:C.muted, textAlign:"center", padding:40, fontSize:15 }}>No pending orders — all clear! ✅</div>}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:14, marginBottom:24 }}>
          {pending.map(order => (
            <div key={order.id} style={{ background:C.panel, border:`1.5px solid ${C.gold}`, borderRadius:14, padding:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontSize:20, fontWeight:"bold", color:C.goldLight }}>Table {order.tableNo}</div>
                <div style={{ fontSize:11, color:C.muted }}>{order.time}</div>
              </div>
              {order.items.map(item => (
                <div key={item.id} style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:14 }}>
                  <span>{item.emoji} {item.name}</span>
                  <span style={{ color:C.gold, fontWeight:"bold" }}>×{item.qty}</span>
                </div>
              ))}
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

        {cancelled.length > 0 && (
          <>
            <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10, marginTop:10 }}>❌ Cancelled ({cancelled.length})</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:10, marginBottom:20 }}>
              {cancelled.map(order => (
                <div key={order.id} style={{ background:"#2a1a1a", border:"1px solid #5a2a2a", borderRadius:12, padding:12, opacity:0.7 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ color:"#ff7777", fontWeight:"bold" }}>Table {order.tableNo}</span>
                    <span style={{ fontSize:11, color:C.muted }}>{order.time}</span>
                  </div>
                  {order.items.map(item => (
                    <div key={item.id} style={{ fontSize:12, color:C.muted, marginBottom:3 }}>{item.emoji} {item.name} ×{item.qty}</div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {done.length > 0 && (
          <>
            <div style={{ fontSize:12, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>✅ Completed ({done.length})</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:10 }}>
              {done.map(order => (
                <div key={order.id} style={{ background:"#1a2c1a", border:"1px solid #2d4a2d", borderRadius:12, padding:12, opacity:0.7 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ color:"#5aaa5a", fontWeight:"bold" }}>Table {order.tableNo}</span>
                    <span style={{ fontSize:11, color:C.muted }}>{order.time}</span>
                  </div>
                  {order.items.map(item => (
                    <div key={item.id} style={{ fontSize:12, color:C.muted, marginBottom:3 }}>{item.emoji} {item.name} ×{item.qty}</div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
