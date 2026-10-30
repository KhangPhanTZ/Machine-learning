# Machine Learning Coursera (Stanford)

> 📖 **Đọc sách: [Sổ tay Machine Learning](https://khangphantz.github.io/Machine-learning/)**: sách web tiếng Việt viết từ các bài lab trong repo này và ghi chú Notion, có giải thích từng bước cho từng lab, ví dụ thực tiễn và demo tương tác.
>
> [![Đọc sách](https://img.shields.io/badge/%C4%90%E1%BB%8Dc%20s%C3%A1ch-S%E1%BB%95%20tay%20Machine%20Learning-1f6f78?style=for-the-badge)](https://khangphantz.github.io/Machine-learning/)

Repo này lưu trữ các bài tập, ghi chú và tài liệu từ khóa học [Machine Learning](https://www.coursera.org/learn/machine-learning) trên Coursera do Giáo sư [Andrew Ng](https://www.andrewng.org/) từ Đại học Stanford giảng dạy.

## 📝 Mô tả khóa học

Khóa học này cung cấp nền tảng rộng lớn về Machine Learning, Data Mining và Statistical Pattern Recognition. Các chủ đề bao gồm:
- Học có giám sát (Supervised Learning - Regression, Classification)
- Học không giám sát (Unsupervised Learning - Clustering, PCA)
- Các thuật toán tiên tiến (SVM, ANN, v.v.)
- Các kỹ thuật đánh giá và tối ưu mô hình
- Ứng dụng thực tế và case studies

## 📖 Sổ tay Machine Learning (web dạng sách)

Thư mục [`docs/`](docs/) chứa một cuốn sách web tiếng Việt được viết lại từ các bài lab trong repo:
18 chương + 3 phụ lục, có công thức (KaTeX), code từ các bài graded, phần **“Đi từng bước qua lab”**
và **“Ví dụ thực tiễn”** ở mỗi chương, 7 demo tương tác,
chế độ sáng/tối, tìm chương, đánh dấu tiến độ đọc và giao diện cho điện thoại.
Các chương còn có mục **“Từ ghi chú Notion”** tổng hợp phần chữ và code từ [ghi chú Notion của khoá học](https://app.notion.com/p/Machine-Learning-12f1ff87df828012b38fc41200db58a0).

| Phần | Chương |
|---|---|
| Mở đầu | 0. Lời mở đầu · 1. Machine Learning là gì? |
| I · Hồi quy & Phân loại (C1) | 2. Hồi quy tuyến tính · 3. Gradient Descent · 4. Nhiều biến & vectorization · 5. Feature scaling & engineering · 6. Logistic Regression · 7. Overfitting & Regularization |
| II · Thuật toán nâng cao (C2) | 8. Mạng nơ-ron · 9. Activation & Softmax · 10. Backprop & Adam · 11. Đánh giá mô hình · 12. Cây quyết định & ensemble |
| III · Không giám sát, gợi ý, RL (C3) | 13. K-means · 14. Phát hiện bất thường · 15. PCA · 16. Hệ gợi ý · 17. Deep Q-Learning |
| Phụ lục | A. Bảng công thức · B. Thuật ngữ Anh–Việt · C. Lộ trình học tiếp |

**Đọc trên máy:** mở `docs/index.html` bằng trình duyệt, hoặc chạy

```bash
cd docs && python -m http.server 8000   # rồi mở http://localhost:8000
```

**Link sách:** https://khangphantz.github.io/Machine-learning/ (GitHub Pages phục vụ thư mục `docs/` của nhánh `main`;
bật một lần trong Settings → Pages → *Deploy from a branch* → `main` / `/docs`).

**Thêm chương mới:** sao chép một file chương trong `docs/` làm khung, rồi khai báo nó trong mảng `PARTS`
ở đầu `docs/assets/book.js` — mục lục, thanh bên và nút chuyển chương tự cập nhật.
