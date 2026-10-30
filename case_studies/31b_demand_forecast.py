import numpy as np, pandas as pd, torch, torch.nn as nn
from sklearn.ensemble import HistGradientBoostingRegressor
rng = np.random.default_rng(1); torch.manual_seed(1)

# 1) Doanh số mô phỏng: 20 cửa hàng × 2 năm, có xu hướng, mùa vụ tuần/năm, khuyến mãi, Tết
dates = pd.date_range("2024-01-01", "2025-12-31", freq="D")
tet = pd.to_datetime(["2024-02-10", "2025-01-29"])
rows = []
for s in range(20):
    base = rng.uniform(80, 300)
    promo = rng.random(len(dates)) < 0.08
    days_to_tet = np.min([np.abs((dates - t).days) for t in tet], axis=0)
    level = (base * (1 + 0.0004 * np.arange(len(dates)))                       # xu hướng tăng
             * (1 + 0.25 * (dates.day_of_week >= 5))                             # cuối tuần
             * (1 + 0.15 * np.sin(2 * np.pi * dates.day_of_year / 365))          # mùa trong năm
             * (1 + 0.6 * promo)                                               # khuyến mãi
             * np.where(days_to_tet <= 3, 0.3, np.where((days_to_tet > 3) & (days_to_tet <= 15), 1.5, 1.0)))
    rows.append(pd.DataFrame({"date": dates, "store": s, "promo": promo.astype(int),
                              "days_to_tet": days_to_tet, "sales": rng.poisson(level)}))
df = pd.concat(rows).sort_values(["store", "date"]).reset_index(drop=True)

# 2) Đặc trưng: lịch + độ trễ (lag) — chỉ dùng thông tin CÓ SẴN lúc dự báo (dự báo trước 7 ngày)
g = df.groupby("store")["sales"]
for lag in [7, 14, 28]:
    df[f"lag_{lag}"] = g.shift(lag)
df["roll_mean_28"] = g.transform(lambda s: s.shift(7).rolling(28).mean())
df["dow"] = df.date.dt.day_of_week; df["doy"] = df.date.dt.day_of_year; df["month"] = df.date.dt.month
df = df.dropna().reset_index(drop=True)
FEATS = ["store", "promo", "days_to_tet", "lag_7", "lag_14", "lag_28", "roll_mean_28", "dow", "doy", "month"]

# 3) Chia THEO THỜI GIAN: 3 tháng cuối làm test, 2 tháng trước đó làm validation
tr = df.date < "2025-08-01"; va = (df.date >= "2025-08-01") & (df.date < "2025-10-01"); te = df.date >= "2025-10-01"
def wape(y, p):                                             # sai số tuyệt đối có trọng số — dễ hiểu cho kinh doanh
    return np.abs(y - p).sum() / np.abs(y).sum()
y_te = df.sales[te].values

# 4) Baseline ngây thơ: bằng cùng thứ tuần trước
print(f"Baseline 'tuần trước'      WAPE {wape(y_te, df.lag_7[te].values):.1%}")
print(f"Baseline 'TB 28 ngày'      WAPE {wape(y_te, df.roll_mean_28[te].values):.1%}")

# 5) Gradient boosting trên đặc trưng
gb = HistGradientBoostingRegressor(max_iter=500, learning_rate=0.05, categorical_features=[0], random_state=0)
gb.fit(df.loc[tr, FEATS], df.sales[tr])
p_gb = gb.predict(df.loc[te, FEATS])
print(f"Gradient boosting          WAPE {wape(y_te, p_gb):.1%}")

# 6) LSTM PyTorch: nhìn 56 ngày (đã chuẩn hoá theo cửa hàng) + lịch của ngày cần dự báo
W, H = 56, 7
def windows(mask_target):
    X, C, Y, S = [], [], [], []
    for s, d in df.groupby("store"):
        sales = d.sales.values.astype("float32"); mu = sales[d.date.values < np.datetime64("2025-08-01")].mean()
        cal = np.stack([d.promo, d.dow / 6, d.days_to_tet.clip(0, 30) / 30, np.sin(2*np.pi*d.doy/365), np.cos(2*np.pi*d.doy/365)], 1).astype("float32")
        m = mask_target[d.index].values
        for t in range(W + H - 1, len(d)):
            if m[t]:
                X.append(sales[t - H - W + 1: t - H + 1] / mu); C.append(cal[t]); Y.append(sales[t] / mu); S.append(mu)
    return (torch.tensor(np.array(X)).unsqueeze(-1), torch.tensor(np.array(C)), torch.tensor(np.array(Y)).unsqueeze(1), np.array(S))

class LSTMForecaster(nn.Module):
    def __init__(self, n_cal=5, hidden=32):
        super().__init__()
        self.lstm = nn.LSTM(1, hidden, batch_first=True)
        self.head = nn.Sequential(nn.Linear(hidden + n_cal, 32), nn.ReLU(), nn.Linear(32, 1))
    def forward(self, x, cal):
        _, (h, _) = self.lstm(x)                      # h[-1]: tóm tắt 56 ngày
        return self.head(torch.cat([h[-1], cal], dim=1))

Xtr, Ctr, Ytr, _ = windows(tr); Xva, Cva, Yva, _ = windows(va); Xte, Cte, Yte, Ste = windows(te)
model = LSTMForecaster(); opt = torch.optim.Adam(model.parameters(), lr=3e-3); loss_fn = nn.L1Loss()
loader = torch.utils.data.DataLoader(torch.utils.data.TensorDataset(Xtr, Ctr, Ytr), batch_size=256, shuffle=True)
best, best_state = 1e9, None
for epoch in range(15):
    model.train()
    for xb, cb, yb in loader:
        opt.zero_grad(); loss_fn(model(xb, cb), yb).backward(); opt.step()
    model.eval()
    with torch.no_grad(): v = loss_fn(model(Xva, Cva), Yva).item()
    if v < best: best, best_state = v, {k: t.clone() for k, t in model.state_dict().items()}
model.load_state_dict(best_state)
with torch.no_grad(): p_lstm = model(Xte, Cte).squeeze(1).numpy() * Ste
print(f"LSTM PyTorch               WAPE {wape(Yte.squeeze(1).numpy() * Ste, p_lstm):.1%}")
