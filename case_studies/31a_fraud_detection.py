import numpy as np, pandas as pd, torch, torch.nn as nn
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import average_precision_score, roc_auc_score
rng = np.random.default_rng(7); torch.manual_seed(7)

# 1) Dữ liệu giao dịch mô phỏng: 60 ngày, ~0.5% gian lận
N = 120_000
df = pd.DataFrame({
    "day": np.sort(rng.integers(0, 60, N)),
    "hour": rng.integers(0, 24, N),
    "amount": np.round(rng.lognormal(12.5, 1.0, N), -3),                  # VND
    "merchant_cat": rng.choice(["food", "fashion", "electronics", "travel", "topup", "games"], N,
                               p=[.35, .2, .1, .1, .15, .1]),
    "new_device": rng.random(N) < 0.05,
    "tx_last_24h": rng.poisson(2, N),
    "dist_from_home_km": rng.exponential(5, N),
})
risky = df.merchant_cat.isin(["electronics", "topup", "games"])
night = df.hour < 5
z = (-8.0 + 1.8 * df.new_device + 1.0 * night + 0.35 * df.tx_last_24h.clip(0, 8) + 0.8 * risky
     + 1.6 * (risky & (df.amount > 3e6)) + 2.2 * (df.new_device & night)          # tương tác: phi tuyến
     + 0.04 * df.dist_from_home_km.clip(0, 60) + 0.015 * df.day)                  # gian lận tăng dần theo thời gian
df["fraud"] = rng.random(N) < 1 / (1 + np.exp(-z))
print(f"tỉ lệ gian lận: {df.fraud.mean():.2%}")

# 2) Đặc trưng + chia THEO THỜI GIAN (không chia ngẫu nhiên)
X = pd.get_dummies(df.drop(columns=["fraud", "day"]), columns=["merchant_cat"]).astype("float32")
X["log_amount"] = np.log1p(df.amount); X["night"] = (df.hour < 5).astype("float32")
y = df.fraud.values.astype(int)
tr, va, te = (df.day < 40).values, ((df.day >= 40) & (df.day < 50)).values, (df.day >= 50).values
print("train/val/test:", tr.sum(), va.sum(), te.sum())

def report(name, p):
    print(f"{name:22s} ROC-AUC {roc_auc_score(y[te], p):.3f}   PR-AUC {average_precision_score(y[te], p):.3f}")

# 3) Ba mô hình
sc = StandardScaler().fit(X[tr])
lr = LogisticRegression(max_iter=2000, class_weight="balanced").fit(sc.transform(X[tr]), y[tr])
p_lr = lr.predict_proba(sc.transform(X[te]))[:, 1]; report("Logistic (balanced)", p_lr)
gb = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.05, max_depth=3, min_samples_leaf=200,
                                    l2_regularization=1.0, class_weight="balanced", random_state=0)
gb.fit(X[tr], y[tr]); p_gb = gb.predict_proba(X[te])[:, 1]; report("Gradient boosting", p_gb)

Xt = torch.tensor(sc.transform(X[tr]), dtype=torch.float32); yt = torch.tensor(y[tr], dtype=torch.float32).unsqueeze(1)
net = nn.Sequential(nn.Linear(Xt.shape[1], 64), nn.ReLU(), nn.Dropout(0.2), nn.Linear(64, 32), nn.ReLU(), nn.Linear(32, 1))
pos_weight = torch.tensor([(1 - y[tr].mean()) / y[tr].mean()])
loss_fn = nn.BCEWithLogitsLoss(pos_weight=pos_weight)                   # chương 27: dữ liệu lệch lớp
opt = torch.optim.AdamW(net.parameters(), lr=1e-3, weight_decay=1e-3)
loader = torch.utils.data.DataLoader(torch.utils.data.TensorDataset(Xt, yt), batch_size=512, shuffle=True)
for epoch in range(8):
    net.train()
    for xb, yb in loader:
        opt.zero_grad(); loss_fn(net(xb), yb).backward(); opt.step()
net.eval()
with torch.no_grad():
    p_nn = torch.sigmoid(net(torch.tensor(sc.transform(X[te]), dtype=torch.float32))).squeeze(1).numpy()
report("Mạng nơ-ron PyTorch", p_nn)

# 4) Chọn ngưỡng theo CHI PHÍ trên tập validation (dùng logistic: tốt nhất ở đây và dễ giải thích)
COST_FN, COST_FP = 3_000_000, 50_000          # bỏ lọt 1 vụ ≈ mất 3 triệu; chặn nhầm ≈ 50 nghìn (gọi xác minh, khách phiền)
p_va = lr.predict_proba(sc.transform(X[va]))[:, 1]
ths = np.quantile(p_va, np.linspace(0.5, 0.999, 300))          # thử nhiều ngưỡng
costs = [COST_FN * ((p_va < t) & (y[va] == 1)).sum() + COST_FP * ((p_va >= t) & (y[va] == 0)).sum() for t in ths]
t_best = ths[int(np.argmin(costs))]
flag = p_lr >= t_best
tp, fp, fn = (flag & (y[te] == 1)).sum(), (flag & (y[te] == 0)).sum(), (~flag & (y[te] == 1)).sum()
print(f"ngưỡng tối ưu chi phí = {t_best:.2f}: gắn cờ {flag.mean():.1%} giao dịch, bắt {tp}/{tp+fn} vụ (recall {tp/(tp+fn):.0%}), precision {tp/max(flag.sum(),1):.0%}")
cost_model = COST_FN * fn + COST_FP * fp; cost_none = COST_FN * (y[te] == 1).sum()
print(f"chi phí 10 ngày test: không mô hình {cost_none/1e6:,.0f} triệu → có mô hình {cost_model/1e6:,.0f} triệu")
# precision@k: đội điều tra chỉ kiểm tra được 50 giao dịch/ngày
k = 50 * 10
top = np.argsort(-p_lr)[:k]
print(f"precision@{k}: {y[te][top].mean():.0%}  (bắt {y[te][top].sum()}/{y[te].sum()} vụ khi chỉ xem {k/te.sum():.1%} giao dịch)")
# hệ số logistic: giải thích được cho bộ phận rủi ro
coef = pd.Series(lr.coef_[0], index=X.columns).sort_values(ascending=False)
print("yếu tố tăng rủi ro mạnh nhất:", ", ".join(f"{k} (+{v:.2f})" for k, v in coef.head(4).items()))
