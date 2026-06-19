# Add Lesson

Thêm bài học mới vào `data/n5.json`.

## Quy trình

1. Đặt file dữ liệu nguồn vào `data/` (ví dụ `data/bai9.md`) theo format:

```markdown
## Phần A

| ID | Loại | Từ (Kanji/Kana) | Cách đọc (Kana) | Từ loại | Nghĩa (Tiếng Việt) | Ghi chú |
|---|---|---|---|---|---|---|
| 1 | Từ vựng | 箸 | はし | N | đũa |  |
| 2 | Cách diễn đạt | そうですか | そうですか |  | Vậy à? | ghi chú |
```

2. Yêu cầu Claude: **"thêm từ vựng cho bài X nhé"** — Claude sẽ:
   - Đọc file `.md`
   - Tự động gán IDs tiếp theo (last ID hiện tại: **631**)
   - Map `Từ vựng` → `"vocab"`, `Cách diễn đạt` → `"expression"`
   - Append vào `data/n5.json`

3. Sau đó chạy `/fetch-images` để lấy ảnh cho từ mới

## Lưu ý

- Last ID hiện tại: **631** (bài 8, 101 thẻ)
- Sections: A, B, C (theo bài học)
- Các từ có `（～を）` prefix: bỏ prefix, chỉ giữ động từ (VD: `使います`)
- Các từ có `（します）` suffix: bỏ suffix, chỉ giữ danh từ (VD: `計算`)
