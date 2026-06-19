# CLAUDE.md — Quizlet JP Project

## Tổng quan

Ứng dụng flashcard học tiếng Nhật (Minna no Nihongo N5), xây dựng bằng **Next.js 14 App Router + TypeScript + Tailwind CSS**.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (custom theme trong `tailwind.config.ts`)
- **Data**: JSON tĩnh trong `data/`, không dùng database
- **TTS**: Google TTS proxy qua `/api/tts` server-side
- **Ảnh**: Pixabay previewURL (`cdn.pixabay.com/photo/...`) — public CDN, không cần proxy

## Cấu trúc thư mục

```
data/
  n5.json          # Toàn bộ flashcard (631 thẻ, bài 1–8)
  images.json      # Map card ID → Pixabay previewURL
  bai8.md          # Nguồn dữ liệu bài 8 (tham khảo)

lib/
  vocab.ts         # API lấy cards, merge images vào cards
  storage.ts       # SRS logic (Leitner boxes), lưu localStorage
  tts.ts           # Text-to-speech (Google TTS fallback → Web Speech)
  types.ts         # Type definitions (Card, Grade, Mode...)
  courses.ts       # Danh sách courses (hiện tại: n5)
  shuffle.ts       # Fisher-Yates shuffle

components/
  FlashcardMode.tsx  # Chế độ lật thẻ (SRS grading)
  QuizMode.tsx       # Trắc nghiệm 4 lựa chọn
  TypingMode.tsx     # Gõ đáp án
  ListenMode.tsx     # Nghe và chọn nghĩa
  MatchMode.tsx      # Nối cặp từ-nghĩa
  StudySession.tsx   # Container điều phối các mode
  Flashcard.tsx      # UI của 1 thẻ (front/back flip)
  SearchBox.tsx      # Tìm kiếm toàn bộ từ vựng

app/
  page.tsx           # Trang chủ (chọn cấp độ)
  [course]/page.tsx  # Danh sách bài học
  [course]/[lesson]/page.tsx  # Trang học
  api/tts/route.ts   # Proxy Google TTS server-side

scripts/
  fetch-images.mjs   # Script fetch ảnh từ Pixabay (đọc key từ .env.local)
```

## API Keys

**Pixabay API Key** được lưu trong `.env.local`:
```
PIXABAY_API_KEY=56307134-9bd83104d5104848d759b81df
```

Giới hạn miễn phí: 100 request/phút, 20.000 request/tháng.

## Cấu trúc dữ liệu

### n5.json — mỗi card:
```json
{
  "id": 531,
  "lesson": 8,
  "section": "A",
  "type": "vocab",        // "vocab" | "expression"
  "word": "箸",
  "reading": "はし",
  "pos": "N",             // N, V-I, V-II, V-III, A-い, A-な, Adv, ...
  "meaning": "đũa",
  "note": ""
}
```

### images.json:
```json
{ "531": "https://cdn.pixabay.com/photo/..." }
```

### Cách thêm bài mới (ví dụ bài 9):
1. Tạo file `data/bai9.md` theo format của `bai8.md`
2. Append vào `data/n5.json` với IDs tiếp theo (hiện tại last ID = 631)
3. Chạy `npm run fetch-images` để lấy ảnh cho từ mới

## Lệnh thường dùng

```bash
# Khởi động dev server
npm run dev

# Fetch ảnh cho từ mới (đọc key từ .env.local tự động)
npm run fetch-images

# Fetch lại tất cả từ đầu (xóa images.json cũ)
npm run fetch-images -- --reset

# Build production
npm run build
```

## SRS Logic (lib/storage.ts)

- **5 Leitner boxes**: box 0 = mới, box 5 = thuộc hẳn
- Flashcard mode: chỉ ảnh hưởng box 0–2
- Exercise modes (Quiz/Typing/Listen): ảnh hưởng box 0–4
- `markMastered()` → box 5, không xuất hiện lại
- Dữ liệu lưu trong `localStorage` của browser (không đồng bộ giữa thiết bị)

## Các mode học

| Mode | Component | Mô tả |
|------|-----------|-------|
| `flashcard` | FlashcardMode | Lật thẻ + SRS grading (1–4 + thuộc hẳn) |
| `quiz` | QuizMode | 4 lựa chọn, phím tắt 1–4 |
| `typing` | TypingMode | Gõ reading/nghĩa |
| `listen` | ListenMode | Nghe audio, chọn nghĩa |
| `match` | MatchMode | Nối cặp từ–nghĩa |

## TTS (Text-to-Speech)

- **Route**: `app/api/tts/route.ts` — proxy Google TTS server-side
- **Client**: `lib/tts.ts` — `speak(text)` function
- Dùng Google TTS với params giống website (`client=gtx&prev=input`) để ra giọng neural
- Fallback: Web Speech API (`speechSynthesis`)

## Quy tắc quan trọng

- **Không dùng proxy cho ảnh** — dùng thẳng `cdn.pixabay.com` previewURL (public CDN)
- **Không dùng `webformatURL`** (pixabay.com/get/...) — bị hotlink protection
- **Không dùng `next/image`** cho Pixabay previewURL — dùng `<img>` thường
- **Sleep trong script**: dùng `execSync('sleep 0.5')` không dùng `setTimeout` (vì execSync là synchronous)
- Tiếng giao tiếp với user: **Tiếng Việt**
- Comment trong code: **ngắn gọn**, chỉ khi thực sự cần
- Không tạo file markdown/docs mới trừ khi user yêu cầu

## Thêm course mới (ví dụ N4)

1. Tạo `data/n4.json` theo format tương tự n5.json
2. Trong `lib/vocab.ts`: uncomment dòng `// n4: n4raw`
3. Trong `lib/courses.ts`: thêm entry N4
