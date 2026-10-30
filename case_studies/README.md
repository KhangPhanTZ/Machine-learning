# Case studies — code chạy được cho Phần V của sách

Code đầy đủ cho chương 30–31 của [Sổ tay Machine Learning & Deep Learning](https://khangphantz.github.io/Machine-learning/).
Mỗi file chạy độc lập trên CPU. Các con số in trong sách là kết quả chạy chính những file này
(có seed cố định; khác phiên bản thư viện có thể lệch nhẹ).

| File | Lĩnh vực | Nội dung | Chương |
|---|---|---|---|
| `30a_plants_cnn.py` | Nông nghiệp | CNN từ đầu cho 30 loại cây (3 000 ảnh thật), phân tích lỗi theo lớp | [30](https://khangphantz.github.io/Machine-learning/30-case-study-anh-van-ban.html) |
| `30b_medical_threshold_gradcam.py` | Y tế | Chọn ngưỡng theo độ nhạy mục tiêu, khoảng tin cậy bootstrap, đánh giá theo bệnh viện, Grad-CAM | 30 |
| `30c_text_intent.py` | CSKH | Phân loại tin nhắn tiếng Việt: TF-IDF + logistic vs EmbeddingBag PyTorch, định tuyến theo độ tự tin | 30 |
| `31a_fraud_detection.py` | Tài chính | Gian lận giao dịch: chia theo thời gian, PR-AUC, ngưỡng theo chi phí, precision@k | [31](https://khangphantz.github.io/Machine-learning/31-case-study-bang-chuoi.html) |
| `31b_demand_forecast.py` | Bán lẻ | Dự báo nhu cầu 7 ngày: baseline, gradient boosting với lag/lịch/Tết, LSTM | 31 |
| `31c_predictive_maintenance.py` | Sản xuất | Bảo trì dự đoán: đặc trưng cửa sổ, chia theo máy, autoencoder, ngưỡng theo ngân sách báo động | 31 |

## Cài đặt

```bash
pip install torch torchvision scikit-learn pandas
```

## Chạy

```bash
python 30b_medical_threshold_gradcam.py
python 30c_text_intent.py
python 31a_fraud_detection.py
python 31b_demand_forecast.py
python 31c_predictive_maintenance.py
```

`30a_plants_cnn.py` cần bộ ảnh trong repo [pytorch-for-deep-learning](https://github.com/KhangPhanTZ/pytorch-for-deep-learning)
(khoảng 15 phút trên CPU 4 nhân):

```bash
git clone https://github.com/KhangPhanTZ/pytorch-for-deep-learning
python 30a_plants_cnn.py pytorch-for-deep-learning/C1_intro_to_pytorch/M3_data_pipeline/assignment/plants_dataset 25
```

Trừ case nông nghiệp, dữ liệu đều được **mô phỏng** để chạy ngay không cần tải gì. Khi áp dụng thật,
thay phần sinh dữ liệu (`# 1)`) bằng dữ liệu của bạn và giữ nguyên các bước còn lại.
