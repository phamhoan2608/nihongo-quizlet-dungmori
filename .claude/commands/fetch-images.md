# Fetch Images

Chạy script lấy ảnh từ Pixabay cho các từ chưa có ảnh trong `data/images.json`.

API key được đọc tự động từ `.env.local` (PIXABAY_API_KEY).

```bash
npm run fetch-images
```

Nếu muốn fetch lại tất cả từ đầu:

```bash
npm run fetch-images:reset
```

Script sẽ:
1. Đọc `data/n5.json` và tìm các card chưa có ảnh trong `data/images.json`
2. Tra nghĩa tiếng Anh qua Jisho.org (từ tiếng Nhật → tiếng Anh)
3. Fallback: dịch nghĩa tiếng Việt → tiếng Anh qua MyMemory API
4. Tìm ảnh trên Pixabay bằng từ tiếng Anh
5. Lưu `previewURL` (cdn.pixabay.com) vào `data/images.json`
6. Auto-save mỗi 20 từ để tránh mất dữ liệu khi bị ngắt
