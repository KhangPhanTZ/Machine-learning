import numpy as np, pandas as pd, torch, torch.nn as nn
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import average_precision_score
rng = np.random.default_rng(3); torch.manual_seed(3)

# 1) Cảm biến mô phỏng: 40 máy × 365 ngày; trước khi hỏng, độ rung và nhiệt tăng dần trong ~2–3 tuần
rows = []
for m in range(40):
    base_v, base_t = rng.uniform(2, 4), rng.uniform(55, 65)
    fail_days = np.sort(rng.choice(np.arange(40, 360), size=rng.integers(1, 4), replace=False))
    for d in range(365):
        nxt = fail_days[fail_days >= d]
        until = (nxt[0] - d) if len(nxt) else 999
        wear = max(0, 20 - until) / 20 if until < 999 else 0                 # 0 → 1 trong 20 ngày trước hỏng
        rows.append({"machine": m, "day": d,
                     "vibration": base_v * (1 + 0.3 * wear ** 2) + rng.normal(0, 0.5),
                     "temperature": base_t + 3 * wear ** 1.5 + rng.normal(0, 2.0),
                     "current": 10 + 0.5 * wear + rng.normal(0, 0.6),
                     "days_to_failure": until})
df = pd.DataFrame(rows)
df["fail_in_7d"] = (df.days_to_failure <= 7).astype(int)                     # nhãn: hỏng trong 7 ngày tới

# 2) Đặc trưng cửa sổ trượt 7 ngày cho từng máy (chỉ dùng quá khứ)
g = df.groupby("machine")
for c in ["vibration", "temperature", "current"]:
    df[f"{c}_mean7"] = g[c].transform(lambda s: s.rolling(7).mean())
    df[f"{c}_std7"] = g[c].transform(lambda s: s.rolling(7).std())
    df[f"{c}_slope7"] = g[c].transform(lambda s: s.diff(7) / 7)            # xu hướng tuần qua
    df[f"{c}_vs_base"] = df[c] / g[c].transform(lambda s: s.iloc[:30].mean())   # so với “bình thường” của chính máy đó
df = df.dropna().reset_index(drop=True)
FEATS = [c for c in df.columns if c.endswith(("mean7", "std7", "slope7", "vs_base"))]

# 3) Chia THEO MÁY: máy dùng để kiểm tra chưa từng xuất hiện khi huấn luyện
val_m, test_m = set(range(25, 30)), set(range(30, 40))
tr = df.machine < 25; va = df.machine.isin(val_m); te = df.machine.isin(test_m)
print(f"tỉ lệ ngày 'sắp hỏng': {df.fail_in_7d.mean():.1%}")

# 4a) Có giám sát: gradient boosting
gb = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.05, class_weight="balanced", random_state=0)
gb.fit(df.loc[tr, FEATS], df.fail_in_7d[tr])
p_gb = gb.predict_proba(df.loc[te, FEATS])[:, 1]
print(f"Gradient boosting  PR-AUC {average_precision_score(df.fail_in_7d[te], p_gb):.3f}")

# 4b) Không cần nhãn hỏng: autoencoder học trạng thái “khoẻ” (chương 28)
healthy = tr & (df.days_to_failure > 30)
mu, sd = df.loc[healthy, FEATS].mean(), df.loc[healthy, FEATS].std()
Xh = torch.tensor(((df.loc[healthy, FEATS] - mu) / sd).values, dtype=torch.float32)
ae = nn.Sequential(nn.Linear(len(FEATS), 16), nn.ReLU(), nn.Linear(16, 4), nn.ReLU(), nn.Linear(4, 16), nn.ReLU(), nn.Linear(16, len(FEATS)))
opt = torch.optim.Adam(ae.parameters(), lr=1e-3)
for epoch in range(30):
    for xb, in torch.utils.data.DataLoader(torch.utils.data.TensorDataset(Xh), batch_size=256, shuffle=True):
        opt.zero_grad(); loss = ((ae(xb) - xb) ** 2).mean(); loss.backward(); opt.step()
with torch.no_grad():
    Xte = torch.tensor(((df.loc[te, FEATS] - mu) / sd).values, dtype=torch.float32)
    p_ae = ((ae(Xte) - Xte) ** 2).mean(1).numpy()                          # sai số tái tạo = điểm bất thường
print(f"Autoencoder        PR-AUC {average_precision_score(df.fail_in_7d[te], p_ae):.3f}  (không dùng nhãn hỏng khi huấn luyện)")

# 5) Thước đo vận hành: bắt được bao nhiêu lần hỏng, báo trước mấy ngày, báo nhầm bao nhiêu lần/máy/tháng
def ops_metrics(mask, scores, t):
    d = df.loc[mask, ["machine", "day", "days_to_failure"]].copy(); d["alarm"] = scores >= t
    lead = []
    for _, e in d[d.days_to_failure == 0].iterrows():                       # mỗi lần hỏng
        w = d[(d.machine == e.machine) & (d.day < e.day) & (d.day >= e.day - 14) & d.alarm]
        lead.append(e.day - w.day.min() if len(w) else 0)
    lead = np.array(lead)
    months = d.machine.nunique() * d.day.nunique() / 30
    false_alarms = (d.alarm & (d.days_to_failure > 14)).sum() / months
    return (lead > 0).mean(), np.median(lead[lead > 0]) if (lead > 0).any() else 0, false_alarms

# chọn ngưỡng trên các máy VALIDATION: báo nhầm tối đa 0.2 lần/máy/tháng (đội bảo trì chịu được)
p_va = gb.predict_proba(df.loc[va, FEATS])[:, 1]
for t in np.linspace(0.5, 0.99, 50):
    if ops_metrics(va, p_va, t)[2] <= 0.2:
        break
for name, thr in [("ngưỡng 0.5", 0.5), (f"ngưỡng {t:.2f} (chọn trên val)", t)]:
    c, lead, fa = ops_metrics(te, p_gb, thr)
    print(f"{name:28s} bắt {c:.0%} lần hỏng, báo trước trung vị {lead:.0f} ngày, báo nhầm {fa:.2f} lần/máy/tháng")
