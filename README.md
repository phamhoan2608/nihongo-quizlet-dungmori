# Minna Flashcards (N5)

Web học từ vựng Minna no Nihongo (Bài 1–7) — flashcard kiểu Quizlet, **chạy frontend thuần** bằng Next.js. Không cần backend: dữ liệu nằm trong `data/vocab.json`, tiến độ lưu ở `localStorage`, phát âm dùng Web Speech API của trình duyệt.

## Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:3000

## Build & deploy (static, miễn phí)

```bash
npm run build
npm start
```

Deploy thẳng lên Vercel / Netlify / GitHub Pages đều được vì không có server logic.

## 4 chế độ học

- **Lật thẻ** — lật xem nghĩa, tự chấm `Chưa thuộc / Khó / Được / Dễ`. Có spaced-repetition (SM-2 rút gọn) quyết định lịch ôn; thẻ "chưa thuộc" được đẩy lại cuối bộ.
- **Trắc nghiệm** — chọn nghĩa đúng trong 4 đáp án.
- **Nối cặp** — game ghép từ ↔ nghĩa, tính thời gian và độ chính xác.
- **Gõ đáp án** — gõ nghĩa tiếng Việt, chấp nhận nhiều biến thể (tách theo dấu phẩy/gạch).

Lọc theo **Phần (A/B/C/D)** và tuỳ chọn **Chỉ từ vựng** (ẩn mẫu câu).

## Cấu trúc

```
app/
  page.tsx                 trang chủ — lưới bài + % thuộc
  study/[lesson]/page.tsx  phiên học của 1 bài
components/                Flashcard, các Mode, Seal (con dấu), Speaker...
lib/
  vocab.ts    nạp & nhóm dữ liệu
  storage.ts  SRS + localStorage
  tts.ts      phát âm tiếng Nhật
  types.ts    kiểu dữ liệu Card
data/vocab.json            nguồn dữ liệu (530 thẻ)
```

## Cập nhật từ vựng

Sửa/thêm vào `data/vocab.json`. Mỗi thẻ:

```json
{
  "id": 1,
  "lesson": 1,
  "section": "A",
  "type": "vocab",        // hoặc "expression"
  "word": "日本",
  "reading": "にほん",
  "pos": "N",
  "meaning": "Nhật Bản",
  "note": ""
}
```

`id` phải là số duy nhất (tiến độ SRS gắn theo `id`).

## Ý tưởng mở rộng

- Thêm Bài 8+ (chỉ cần nối thêm vào JSON).
- Chế độ ôn "đến hạn hôm nay" gom thẻ `due <= now` từ mọi bài.
- Export/Import tiến độ ra file JSON để mang sang máy khác.
- Đảo chiều thẻ (nghĩa → từ) cho phần luyện viết.
