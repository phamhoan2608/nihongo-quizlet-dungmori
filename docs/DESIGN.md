# Thiết kế tính năng — Nihongo Quizlet

> Cập nhật lần cuối: 2026-06-21

---

## 1. Luồng học

```
Trang chủ → Chọn cấp độ (N5) → Danh sách bài → Chọn phần (A/B/C) → Học
```

### 1.1 Trang chủ (`/`)
- Hiển thị danh sách cấp độ (hiện có: N5)
- Mỗi cấp độ hiển thị tổng số thẻ, số bài
- Ô tìm kiếm toàn bộ từ vựng (`SearchBox`)
- Thông báo: tiến độ lưu trên trình duyệt, chưa đồng bộ tài khoản

### 1.2 Trang danh sách bài (`/n5`)
- Lưới các `LessonCard`, mỗi card hiển thị:
  - Số bài, số thẻ
  - Thanh tiến độ (% thuộc)
  - Số từ đã học / tổng
  - Badge **"New"** (màu đỏ) nếu chưa học từ nào

### 1.3 Màn hình chọn phần (`/n5/[lesson]`)
- Hiển thị các phần (A, B, C…) của bài dưới dạng card
- Mỗi card: tên phần, số thẻ, thanh tiến độ, "X/Y đã học · Z thuộc"
- Bắt buộc chọn phần trước khi vào học (không có chế độ "học cả bài")

### 1.4 Giao diện học
- Header: nút quay lại chọn phần, tên phần, số thẻ, toggle Tự phát âm, checkbox Chỉ từ vựng, nút Đặt lại
- Mode tabs: Lật thẻ / Trắc nghiệm / Nối cặp / Gõ đáp án / Nghe
- Nội dung học thay đổi theo mode

---

## 2. Chế độ học

### 2.1 Lật thẻ (Flashcard)
- Lật thẻ để xem nghĩa (click / Space)
- Nút **→** và Enter/ArrowRight: sang từ tiếp theo ngay (không cần lật trước)
- Nút **←** / ArrowLeft: từ trước
- Không có grading buttons — level không được tính từ chế độ này
- Level badge hiển thị trên thẻ (thông tin, không tương tác)
- Thẻ hiển thị: kana, kanji (nếu khác), romaji, ảnh minh họa (nếu có), nút phát âm

### 2.2 Trắc nghiệm (Quiz)
- 4 lựa chọn đáp án, chọn nghĩa đúng của từ
- Phím tắt: 1–4 chọn đáp án, Enter sang câu tiếp
- Tự phát âm: phát âm từ khi sang câu mới (nếu bật)
- **Tính level**: đúng → +1, sai → -1

### 2.3 Nối cặp (Match)
- Ghép từ tiếng Nhật với nghĩa tiếng Việt
- Chọn ngẫu nhiên ~6 cặp từ bộ thẻ
- **Tính level**: ghép đúng → +1

### 2.4 Gõ đáp án (Typing)
- Gõ reading (kana) hoặc nghĩa tiếng Việt
- Chấp nhận gần đúng (so sánh không phân biệt hoa thường, dấu câu)
- **Tính level**: đúng → +1, sai → -1

### 2.5 Nghe (Listen)
- Phát âm từ tự động, chọn nghĩa đúng trong 4 lựa chọn
- Ẩn chữ Nhật cho đến khi trả lời
- Nút phát lại (Space / R)
- Phím tắt: 1–4 chọn, Enter sang câu tiếp
- **Tính level**: đúng → +1, sai → -1

---

## 3. Hệ thống Level (SRS — Leitner Boxes)

| Box | Tên | Đạt được qua |
|-----|-----|-------------|
| 0 | Mới | Mặc định |
| 1 | Nhìn quen | Exercise |
| 2 | Đang ôn | Exercise |
| 3 | Nhớ khá | Exercise |
| 4 | Thuộc | Exercise |
| 5 | Thành thạo | Chỉ qua `markMastered()` (hiện tạm ẩn) |

- Flashcard **không** tính level
- Exercise modes (Quiz, Typing, Listen, Match) tính level, tối đa box 4
- Level hiển thị dưới dạng badge màu trên thẻ flashcard

---

## 4. Âm thanh (TTS)

- Nút phát âm (loa) có trên mỗi thẻ và trong các exercise mode
- Toggle "Tự phát âm": tự động phát khi sang từ/câu mới
- Engine: Google TTS proxy server-side (`/api/tts`) với params giống website Google Translate → giọng neural
- Fallback: Web Speech API (`speechSynthesis`)

---

## 5. Lưu tiến độ

- **SRS data** (`minna-srs-v1`): lưu box, interval, ease, reps, correct/wrong của từng card
- **Session position** (`minna-session`): lưu mode + thứ tự deck + vị trí card hiện tại theo từng bài-phần
  - Reload trang → tiếp tục đúng từ đang học, đúng thứ tự (deck order được lưu lần đầu và giữ nguyên)
  - Mỗi bài-phần có session riêng biệt
- **AutoPlay setting** (`minna-autoplay-v1`): lưu trạng thái bật/tắt tự phát âm
- Tất cả lưu trong `localStorage` của trình duyệt — không đồng bộ giữa thiết bị

---

## 6. Ảnh minh họa

- Nguồn: Pixabay (`previewURL` — `cdn.pixabay.com/photo/...`)
- Lưu trong `data/images.json`: `{ "card_id": "url" }`
- Hiển thị trên thẻ flashcard (front và back)
- Fetch bằng script `scripts/fetch-images.mjs`:
  - Tra nghĩa tiếng Anh qua Jisho.org (từ tiếng Nhật → Anh)
  - Fallback: MyMemory dịch tiếng Việt → Anh
  - Tìm ảnh trên Pixabay bằng từ tiếng Anh
  - API key lưu trong `.env.local`

---

## 7. Dữ liệu

- `data/n5.json`: 631 thẻ, bài 1–8
  ```json
  { "id": 531, "lesson": 8, "section": "A", "type": "vocab",
    "word": "箸", "reading": "はし", "pos": "N", "meaning": "đũa", "note": "" }
  ```
- `data/images.json`: map ID → Pixabay previewURL (~613 ảnh)
- Thêm bài mới: tạo `data/baiN.md` → chạy `/add-lesson`

---

## 8. Tìm kiếm

- `SearchBox` trên trang chủ và trang danh sách bài
- Tìm theo từ Nhật, kana, nghĩa tiếng Việt
- Hiển thị kết quả inline, click để xem bài học chứa từ đó

---

## Bugs đã sửa

| Bug | Mô tả | Fix |
|-----|-------|-----|
| Ảnh không load | Pixabay `webformatURL` bị hotlink protection | Dùng `previewURL` (cdn.pixabay.com) |
| TTS không chuẩn | `client=tw-ob` dùng engine cũ | Proxy server-side với params giống Google Translate website |
| Session position sai khi reload | `prioritizeCards()` shuffle lại mỗi lần → deck order thay đổi | Lưu deck order vào localStorage, restore đúng thứ tự |
| Ảnh bị 400 qua Next.js Image | URL chứa nested query params | Bỏ proxy, dùng thẳng cdn.pixabay.com |

---

## Tính năng dự kiến (chưa làm)

- Đồng bộ tài khoản (multi-device)
- Thêm N4, N3
- Thống kê học tập (streak, biểu đồ tiến độ)
