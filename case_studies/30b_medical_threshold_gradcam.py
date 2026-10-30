import numpy as np, torch, torch.nn as nn, torchvision.models as models

def threshold_for_recall(y_true, scores, target_recall=0.95):
    """Ngưỡng cao nhất vẫn đạt recall mục tiêu trên VALIDATION."""
    pos = np.sort(scores[y_true == 1])
    k = int(np.floor((1 - target_recall) * len(pos)))      # được phép bỏ sót tối đa k ca dương
    return pos[k]

def sens_spec(y_true, scores, t):
    pred = scores >= t
    sens = (pred & (y_true == 1)).sum() / (y_true == 1).sum()      # độ nhạy = recall
    spec = (~pred & (y_true == 0)).sum() / (y_true == 0).sum()     # độ đặc hiệu
    return sens, spec

def bootstrap_ci(y_true, scores, t, n=1000, seed=0):
    """Khoảng tin cậy 95% của độ nhạy — tập test nhỏ thì con số dao động nhiều."""
    rng = np.random.default_rng(seed); vals = []
    for _ in range(n):
        i = rng.integers(0, len(y_true), len(y_true))
        if (y_true[i] == 1).sum() > 0:
            vals.append(sens_spec(y_true[i], scores[i], t)[0])
    return np.percentile(vals, [2.5, 97.5])

# Dữ liệu điểm số mô phỏng: 2 bệnh viện, bệnh viện B dùng máy chụp khác → điểm số lệch
rng = np.random.default_rng(42)
def site(n, prev, shift):
    y = (rng.random(n) < prev).astype(int)
    s = 1 / (1 + np.exp(-(rng.normal(0, 1, n) + 2.2 * y - 1.5 + shift)))
    return y, s
y_val, s_val = site(800, 0.2, 0.0)
yA, sA = site(600, 0.2, 0.0)          # bệnh viện A: cùng nguồn với dữ liệu huấn luyện
yB, sB = site(600, 0.2, -0.6)         # bệnh viện B: máy chụp khác
t = threshold_for_recall(y_val, s_val, 0.95)
print(f"ngưỡng = {t:.3f}")
for name, y, s in [("Bệnh viện A", yA, sA), ("Bệnh viện B", yB, sB)]:
    se, sp = sens_spec(y, s, t); lo, hi = bootstrap_ci(y, s, t)
    print(f"{name}: độ nhạy {se:.1%} (95% CI {lo:.1%}–{hi:.1%}), độ đặc hiệu {sp:.1%}")

# Grad-CAM: mô hình "nhìn" vào đâu?
def grad_cam(model, x, target_layer, class_idx=None):
    acts, grads = {}, {}
    def save_act(module, inp, out):
        acts["a"] = out                      # hook không được trả về giá trị
    def save_grad(module, grad_in, grad_out):
        grads["g"] = grad_out[0]
    h1 = target_layer.register_forward_hook(save_act)
    h2 = target_layer.register_full_backward_hook(save_grad)
    model.eval()
    out = model(x)
    idx = out.argmax(1).item() if class_idx is None else class_idx
    model.zero_grad(); out[0, idx].backward()
    h1.remove(); h2.remove()
    w = grads["g"].mean(dim=(2, 3), keepdim=True)                 # trọng số mỗi kênh = gradient trung bình
    cam = torch.relu((w * acts["a"]).sum(1)).squeeze(0).detach()   # [7, 7]
    cam = torch.nn.functional.interpolate(cam[None, None], size=x.shape[-2:], mode="bilinear")[0, 0]
    return (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)      # bản đồ nhiệt [224, 224] trong [0, 1]

model = models.resnet18(weights=None); model.fc = nn.Linear(512, 2)
heat = grad_cam(model, torch.randn(1, 3, 224, 224), model.layer4)
print("grad-cam", tuple(heat.shape), float(heat.min()), float(heat.max()))
