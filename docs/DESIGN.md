# Thiết kế tính năng — Nihongo Quizlet

> Cập nhật lần cuối: 2026-06-23

---

## 1. Luồng học

```
Trang chủ → Chọn cấp độ (N5) → Danh sách bài → Chọn phần (A/B/C) → Chọn chế độ → Học
```

### 1.1 Trang chủ (`/`)
- Hiển thị danh sách cấp độ (hiện có: N5)
- Mỗi cấp độ hiển thị tổng số thẻ, số bài
- Ô tìm kiếm toàn bộ từ vựng (`SearchBox`)
- **Quick-action bar** (`HomeClient`): streak 🔥, số thẻ hôm nay, nút "Ôn tập hôm nay" (nếu có từ đến hạn), nút "Tiếp tục" (bài/phần học gần nhất), link thống kê
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

### 1.4 Màn hình chọn chế độ
- Hiển thị sau khi chọn phần (lần đầu vào, hoặc khi chưa có session)
- Lưới 2–4 cột, mỗi ô: icon riêng (màu theo nhóm) + tên + mô tả ngắn
- 7 chế độ: Lật thẻ / Trắc nghiệm / Nối cặp / Gõ đáp án / Nghe / Chính tả / Kiểm tra
- Reload trang → khôi phục đúng phần + chế độ đang học (bỏ qua màn chọn)

### 1.5 Giao diện học
- **Header**: `← Phần X` (quay về section picker) · Dropdown chế độ (icon + tên + chevron) · số thẻ · toggle Tự phát âm · checkbox Chỉ từ vựng · Đặt lại
- **Dropdown chế độ**: danh sách 7 chế độ với icon, chế độ hiện tại có dấu ✓, bấm để chuyển ngay; bấm ngoài để đóng
- Không có tab bar — chế độ được chuyển hoàn toàn qua dropdown trong header
- Nội dung học thay đổi theo chế độ đang chọn

---

## 2. Chế độ học

### 2.1 Lật thẻ (Flashcard)
- Lật thẻ để xem nghĩa (click / Space)
- Nút **←** / ArrowLeft: từ trước
- Sau khi lật: hiển thị **"Chưa nhớ ✗"** (shu) và **"Nhớ rồi ✓"** (moss) thay cho nút "Tiếp theo"
  - "Nhớ rồi" → `grade("good", "flashcard")` rồi sang thẻ kế
  - "Chưa nhớ" → `grade("again", "flashcard")` rồi sang thẻ kế
  - Cả hai đều ghi `incrementDailyCount` + `recordStudyToday` (thông qua `grade()`)
- Level badge hiển thị trên thẻ (thông tin, không tương tác)
- Thẻ hiển thị: kana, kanji (nếu khác), romaji, ảnh minh họa (nếu có), nút phát âm

### 2.2 Trắc nghiệm (Quiz)
- 4 lựa chọn đáp án, chọn nghĩa đúng của từ
- **Smart distractors**: ưu tiên chọn từ cùng POS trước, fallback sang POS khác — tránh đáp án quá dễ loại
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
- **Hint**: nút "Gợi ý" hiện chữ đầu tiên của đáp án → bị tính sai ngay cả khi đáp án đúng
- **Tính level**: đúng (không dùng hint) → +1, sai hoặc dùng hint → -1

### 2.5 Nghe (Listen)
- Phát âm từ tự động, chọn nghĩa đúng trong 4 lựa chọn
- Ẩn chữ Nhật cho đến khi trả lời
- Nút phát lại (Space / R)
- Phím tắt: 1–4 chọn, Enter sang câu tiếp
- **Tính level**: đúng → +1, sai → -1

### 2.6 Chính tả (Spell)
- Phát âm từ tự động, gõ cách đọc kana
- Hiển thị nghĩa tiếng Việt làm gợi ý
- Ẩn chữ Nhật cho đến khi trả lời
- Nút phát lại (R sau khi trả lời)
- So sánh exact kana (hiragana/katakana)
- **Hint**: nút "Gợi ý" hiện kana đầu tiên → bị tính sai ngay cả khi đáp án đúng
- **Tính level**: đúng (không dùng hint) → +1, sai hoặc dùng hint → -1

### 2.7 Kiểm tra (Test)
- Xen kẽ 2 dạng câu hỏi:
  - Trắc nghiệm (câu lẻ): thấy chữ Nhật → chọn nghĩa tiếng Việt
  - Gõ kana (câu chẵn): thấy nghĩa tiếng Việt → gõ cách đọc kana
- Phím tắt MC: 1–4 chọn, Enter tiếp theo
- Kết quả cuối: điểm + danh sách từ sai để ôn lại
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
- Exercise modes (Quiz, Typing, Listen, Match, Spell, Test) tính level, tối đa box 4
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
- **AutoPlay setting** (`minna-autoplay-v1`): lưu trạng thái bật/tắt tự phát âm (mặc định: tắt)
- **Streak** (`minna-streak-v1`): `{ streak: number, lastDate: "YYYY-MM-DD" }` — tự cộng mỗi ngày học
- **Daily count** (`minna-daily-v1`): `{ "YYYY-MM-DD": N }` — số thẻ graded mỗi ngày (dùng cho thống kê)
- **Last studied** (`minna-last-studied-v1`): `{ course, lesson, section }` — để hiển thị nút "Tiếp tục"
- **onlyVocab** (`minna-only-vocab-v1`): lưu bộ lọc "Chỉ từ vựng" giữa các phiên
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

## 9. Theme & Dark Mode

- **Hệ thống màu**: CSS custom properties (`--c-*`) với giá trị RGB dạng `R G B` (không có `rgb()`) để Tailwind opacity modifier hoạt động (`bg-moss/10`)
- **Light mode**: nền `#F4F4FB` (trắng ngả tím nhẹ), indigo `#4F52C8`, shu `#E04040`, moss `#1A9E68`
- **Dark / Night mode**: nền `#08081 4`, card `#12122A`, sub text `#ACA8D0` (đảm bảo contrast ≥ 5:1 kể cả khi dùng opacity `/60`)
- **Toggle**: nút pill "☽ Tối / ☀ Sáng" fixed bottom-right, hiện trên mọi trang
- **Lưu preference**: `localStorage` key `theme` = `"dark"` | `"light"`
- **Anti-flash**: inline script trong `<head>` chạy trước React hydrate, tránh trắng nháy
- **Flashcard back** (dark mode): dùng `bg-[#24246E]` thay vì indigo sáng để giữ contrast với chữ trắng

---

## Bugs đã sửa

| Bug | Mô tả | Fix |
|-----|-------|-----|
| Ảnh không load | Pixabay `webformatURL` bị hotlink protection | Dùng `previewURL` (cdn.pixabay.com) |
| TTS không chuẩn | `client=tw-ob` dùng engine cũ | Proxy server-side với params giống Google Translate website |
| Session position sai khi reload | `prioritizeCards()` shuffle lại mỗi lần → deck order thay đổi | Lưu deck order vào localStorage, restore đúng thứ tự |
| Ảnh bị 400 qua Next.js Image | URL chứa nested query params | Bỏ proxy, dùng thẳng cdn.pixabay.com |
| MatchMode timer drift khi chơi ván mới | `start` dùng `useState` không reset được | Đổi sang `useRef`, reset trong `newRound()` |
| Dark mode text contrast thấp | `--c-sub` quá tối, `sub/60` chỉ đạt 3.6:1 | Tăng `sub` lên `#ACA8D0`, `sub/60` đạt 5.2:1 |
| Flashcard không hỗ trợ self-assess | Không có grading → SRS không học được từ chế độ lật thẻ | Thêm "Nhớ rồi ✓" / "Chưa nhớ ✗" sau khi lật, gọi `grade()` |
| autoPlay mặc định bật | Phát âm tự động làm phiền khi mới vào | Đổi default `getAutoPlay()` thành `false` |
| onlyVocab không được lưu | Mỗi lần vào lại phải tick lại | Lưu vào `minna-only-vocab-v1` localStorage |

---

---

## 10. Ôn tập SRS (`/review`)

- `getDueCards(allCards)`: lọc card có `reps > 0`, `box > 0`, `due ≤ now`
- Component `ReviewSession`: chọn chế độ (Quiz / Gõ / Nghe / Chính tả) rồi học ngay
- Không có section picker — tất cả từ đến hạn từ mọi bài/phần được gom chung
- Nút "Ôn tập hôm nay (N từ)" hiển thị trên trang chủ khi `dueCount > 0`

---

## 11. Thống kê (`/stats`)

- **Summary cards**: thẻ hôm nay · streak · đã học / tổng · độ chính xác
- **Biểu đồ 7 ngày**: cột dọc per-day, dùng `minna-daily-v1`
- **Phân bổ mức nhớ**: thanh ngang cho mỗi box (0–5) vs tổng thẻ
- **Từ cần ôn thêm**: card có `reps ≥ 3` và `wrongRate` cao nhất, tối đa 20 từ

---

## Tính năng dự kiến (chưa làm)

- Đồng bộ tài khoản (multi-device)
- Thêm N4, N3
