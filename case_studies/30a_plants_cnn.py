# Case study 1 — phân loại 30 loại cây (dữ liệu C1M3) bằng CNN nhỏ, chạy trên CPU
import sys, time, copy, torch, torch.nn as nn, pandas as pd
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import transforms
from PIL import Image

ROOT = sys.argv[1]
torch.manual_seed(42)

class PlantsDataset(Dataset):                                    # chương 23
    def __init__(self, root_dir):
        self.root_dir = root_dir
        self.df = pd.read_csv(root_dir + "/df_labels.csv")
        with open(root_dir + "/classname.txt") as f:
            self.class_names = f.read().splitlines()
    def __len__(self):
        return len(self.df)
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        with Image.open(self.root_dir + "/" + row["image:FILE"]) as img:
            return img.convert("RGB"), int(row["category"])

class SubsetWithTransform(Dataset):
    def __init__(self, subset, transform):
        self.subset, self.transform = subset, transform
    def __len__(self):
        return len(self.subset)
    def __getitem__(self, i):
        img, y = self.subset[i]
        return self.transform(img), y

class Cached(Dataset):                                           # đọc ảnh 1 lần, giữ trong RAM (3000 ảnh nhỏ)
    def __init__(self, ds, size):
        self.items = [(img.resize((size, size)), y) for img, y in ds]
    def __len__(self):
        return len(self.items)
    def __getitem__(self, i):
        return self.items[i]

SIZE = 96
full = PlantsDataset(ROOT)
cached = Cached(full, SIZE)
mean, std = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]
main_tf = transforms.Compose([transforms.ToTensor(), transforms.Normalize(mean, std)])
aug_tf = transforms.Compose([transforms.RandomHorizontalFlip(), transforms.RandomVerticalFlip(),
                             transforms.RandomRotation(15), transforms.ColorJitter(0.2, 0.2, 0.2),
                             transforms.RandomResizedCrop(SIZE, scale=(0.7, 1.0)), main_tf])
n = len(cached); n_val = n_test = int(0.15 * n)
tr, va, te = random_split(cached, [n - n_val - n_test, n_val, n_test], generator=torch.Generator().manual_seed(42))
train_loader = DataLoader(SubsetWithTransform(tr, aug_tf), batch_size=64, shuffle=True)
val_loader = DataLoader(SubsetWithTransform(va, main_tf), batch_size=128)
test_loader = DataLoader(SubsetWithTransform(te, main_tf), batch_size=128)

def block(cin, cout):
    return nn.Sequential(nn.Conv2d(cin, cout, 3, padding=1), nn.BatchNorm2d(cout), nn.ReLU(), nn.MaxPool2d(2))
model = nn.Sequential(block(3, 32), block(32, 64), block(64, 128), block(128, 256),
                      nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Dropout(0.3), nn.Linear(256, 30))

def run_epoch(model, loader, loss_fn, optimizer=None):
    train = optimizer is not None
    model.train(train)
    tot, correct, cnt = 0.0, 0, 0
    with torch.set_grad_enabled(train):
        for xb, yb in loader:
            out = model(xb); loss = loss_fn(out, yb)
            if train:
                optimizer.zero_grad(); loss.backward(); optimizer.step()
            tot += loss.item() * len(yb); correct += (out.argmax(1) == yb).sum().item(); cnt += len(yb)
    return tot / cnt, correct / cnt

EPOCHS = int(sys.argv[2]) if len(sys.argv) > 2 else 25
loss_fn = nn.CrossEntropyLoss(label_smoothing=0.1)
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-3, weight_decay=1e-2)
sched = torch.optim.lr_scheduler.OneCycleLR(optimizer, max_lr=3e-3, total_steps=EPOCHS * len(train_loader))
best, best_state = 0, None
t0 = time.time()
for ep in range(EPOCHS):
    model.train()
    tl, ta, cnt = 0, 0, 0
    for xb, yb in train_loader:
        out = model(xb); loss = loss_fn(out, yb)
        optimizer.zero_grad(); loss.backward(); optimizer.step(); sched.step()
        tl += loss.item() * len(yb); ta += (out.argmax(1) == yb).sum().item(); cnt += len(yb)
    vl, va_acc = run_epoch(model, val_loader, loss_fn)
    if va_acc > best: best, best_state = va_acc, copy.deepcopy(model.state_dict())
    print(f"epoch {ep+1:2d} train {tl/cnt:.3f}/{ta/cnt:.3f} val {vl:.3f}/{va_acc:.3f}  {time.time()-t0:.0f}s", flush=True)
model.load_state_dict(best_state)
_, test_acc = run_epoch(model, test_loader, loss_fn)
print("best val acc", round(best, 3), "test acc", round(test_acc, 3))

# phân tích lỗi: accuracy từng lớp + cặp nhầm nhiều nhất
model.eval(); preds, labels = [], []
with torch.no_grad():
    for xb, yb in test_loader:
        preds.append(model(xb).argmax(1)); labels.append(yb)
preds, labels = torch.cat(preds), torch.cat(labels)
cm = torch.zeros(30, 30, dtype=torch.long)
for t, p in zip(labels, preds): cm[t, p] += 1
per_class = cm.diag() / cm.sum(1).clamp(min=1)
order = per_class.argsort()
names = full.class_names
print("kém nhất:", [(names[i], round(per_class[i].item(), 2)) for i in order[:5].tolist()])
print("tốt nhất:", [(names[i], round(per_class[i].item(), 2)) for i in order[-5:].tolist()])
off = cm.clone(); off.fill_diagonal_(0)
top = off.flatten().topk(5)
print("nhầm nhiều nhất:", [(names[i // 30], names[i % 30], v.item()) for v, i in zip(top.values, top.indices)])
