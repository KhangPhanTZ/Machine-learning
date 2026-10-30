import random, re, torch, torch.nn as nn
random.seed(0); torch.manual_seed(0)

# 1) Dữ liệu mẫu: tin nhắn khách hàng tự sinh từ mẫu câu (thay bằng dữ liệu thật của bạn)
TEMPLATES = {
    "thanh_toan": ["em bị trừ tiền {x} lần cho một đơn", "thanh toán qua {pay} không được", "đã chuyển khoản mà đơn vẫn báo chưa thanh toán",
                   "sao em bị trừ tiền mà không có đơn", "mã giảm giá không áp dụng khi thanh toán {pay}", "hoàn tiền về {pay} mất bao lâu"],
    "giao_hang":  ["đơn của em {t} rồi chưa thấy giao", "shipper không gọi mà báo giao thất bại", "khi nào đơn {code} được giao vậy shop",
                   "giao hàng chậm quá, đặt {t} rồi", "em muốn đổi địa chỉ nhận hàng", "đơn hiển thị đã giao nhưng em chưa nhận được"],
    "doi_tra":    ["áo bị {loi} em muốn đổi size", "sản phẩm bị {loi} em muốn trả hàng", "làm sao để trả hàng và hoàn tiền",
                   "nhận hàng sai màu em muốn đổi", "hàng bị {loi} khi nhận, em gửi ảnh rồi", "em muốn đổi sang mẫu khác được không"],
    "tai_khoan":  ["em không đăng nhập được tài khoản", "quên mật khẩu mà không nhận được mã otp", "tài khoản em bị khoá",
                   "em muốn đổi số điện thoại trong tài khoản", "không nhận được email xác nhận", "làm sao để xoá tài khoản"],
    "khac":       ["shop có tuyển cộng tác viên không", "cửa hàng mở cửa mấy giờ", "shop có bán sỉ không ạ",
                   "cho em hỏi chương trình khuyến mãi tháng này", "shop ơi tư vấn giúp em size", "có mẫu này màu khác không"],
}
FILL = {"x": ["2", "hai", "3"], "pay": ["momo", "thẻ", "zalopay", "ngân hàng", "ví"], "t": ["3 ngày", "một tuần", "5 hôm", "hôm qua"],
        "code": ["SP123", "DH889", "A1002"], "loi": ["rách", "lỗi", "hỏng", "bẩn", "sai size"]}
NOISE = ["", "", " ạ", " shop ơi", " gấp giúp em", " với ạ", "!!", " ạ?"]
def make(tpl):
    s = re.sub(r"\{(\w+)\}", lambda m: random.choice(FILL[m.group(1)]), tpl) + random.choice(NOISE)
    return s if random.random() > 0.3 else s.replace("không", "ko").replace("được", "đc")
labels = list(TEMPLATES)
# Mẫu câu cuối của mỗi lớp được GIỮ RIÊNG: mô phỏng khách hàng nói theo cách mô hình chưa từng thấy
seen = [(make(random.choice(TEMPLATES[c][:-1])), i) for i, c in enumerate(labels) for _ in range(300)]
unseen = [(make(TEMPLATES[c][-1]), i) for i, c in enumerate(labels) for _ in range(40)]
random.shuffle(seen)
seen = [(t, l if random.random() > 0.05 else random.randrange(len(labels))) for t, l in seen]   # 5% nhãn gán nhầm
texts, y = [t for t, _ in seen], [l for _, l in seen]
n = len(texts); cut1, cut2 = int(0.7 * n), int(0.85 * n)
Xtr, Xva, Xte = texts[:cut1], texts[cut1:cut2], texts[cut2:]
ytr, yva, yte = y[:cut1], y[cut1:cut2], y[cut2:]
Xnew, ynew = [t for t, _ in unseen], [l for _, l in unseen]

# 2) Baseline: TF-IDF + logistic regression (chương 6)
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score
import warnings; warnings.filterwarnings("ignore")
vec = TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True)
clf = LogisticRegression(max_iter=2000, C=5).fit(vec.fit_transform(Xtr), ytr)
pred_lr = clf.predict(vec.transform(Xte))
print("TF-IDF + LogReg macro-F1  test:", round(f1_score(yte, pred_lr, average="macro"), 3),
      " cách nói mới:", round(f1_score(ynew, clf.predict(vec.transform(Xnew)), average="macro"), 3))

# 3) PyTorch: embedding túi từ (fastText-style) — EmbeddingBag + Linear
def tokenize(s):
    w = re.findall(r"\w+", s.lower())
    return w + [a + "_" + b for a, b in zip(w, w[1:])]           # thêm bigram
vocab = {"<unk>": 0}
for s in Xtr:
    for tok in tokenize(s):
        vocab.setdefault(tok, len(vocab))
def encode(batch):
    ids, offsets = [], [0]
    for s in batch:
        t = [vocab[tok] for tok in tokenize(s) if tok in vocab] or [0]   # bỏ từ lạ; câu toàn từ lạ → <unk>
        ids += t; offsets.append(offsets[-1] + len(t))
    return torch.tensor(ids), torch.tensor(offsets[:-1])

class BagOfEmbeddings(nn.Module):
    def __init__(self, vocab_size, dim, num_classes):
        super().__init__()
        self.emb = nn.EmbeddingBag(vocab_size, dim, mode="mean")    # trung bình vector các token
        self.fc = nn.Sequential(nn.Dropout(0.3), nn.Linear(dim, num_classes))
    def forward(self, ids, offsets):
        return self.fc(self.emb(ids, offsets))

model = BagOfEmbeddings(len(vocab), 64, len(labels))
opt = torch.optim.AdamW(model.parameters(), lr=5e-3, weight_decay=1e-4)
loss_fn = nn.CrossEntropyLoss()
for epoch in range(15):
    model.train()
    perm = torch.randperm(len(Xtr))
    for i in range(0, len(Xtr), 64):
        idx = perm[i:i + 64]
        ids, off = encode([Xtr[j] for j in idx])
        loss = loss_fn(model(ids, off), torch.tensor([ytr[j] for j in idx]))
        opt.zero_grad(); loss.backward(); opt.step()
model.eval()
with torch.no_grad():
    probs = torch.softmax(model(*encode(Xte)), dim=1)
pred_nn = probs.argmax(1).tolist()
with torch.no_grad():
    probs_new = torch.softmax(model(*encode(Xnew)), dim=1)
print("EmbeddingBag macro-F1     test:", round(f1_score(yte, pred_nn, average="macro"), 3),
      " cách nói mới:", round(f1_score(ynew, probs_new.argmax(1).tolist(), average="macro"), 3))
print(classification_report(ynew, probs_new.argmax(1).tolist(), target_names=labels, digits=2))

# 4) Định tuyến: tự động khi chắc chắn, còn lại chuyển nhân viên
conf = probs_new.max(1).values
auto = conf >= 0.8
acc_auto = (probs_new.argmax(1)[auto] == torch.tensor(ynew)[auto]).float().mean().item()
print(f"tự động xử lý {auto.float().mean().item():.0%} tin nhắn, đúng {acc_auto:.1%}; còn lại chuyển nhân viên")
with torch.no_grad():
    for s in ["shop ơi đơn em 1 tuần rồi chưa tới", "bị trừ tiền 2 lần ạ", "cho hỏi giờ mở cửa"]:
        p = torch.softmax(model(*encode([s])), 1)[0]
        print(s, "→", labels[p.argmax()], round(p.max().item(), 2))
