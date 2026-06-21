# Update Design Doc

Cập nhật file `docs/DESIGN.md` để phản ánh đúng trạng thái hiện tại của app.

## Khi nào cần chạy

- Sau khi thêm tính năng mới
- Sau khi sửa bug quan trọng
- Sau khi thay đổi luồng UX

## Quy trình

1. Đọc `docs/DESIGN.md` hiện tại
2. Đọc các file liên quan đến thay đổi vừa thực hiện
3. Cập nhật đúng section trong DESIGN.md:
   - Thêm tính năng → thêm mục mô tả
   - Thay đổi UX/flow → cập nhật mô tả cũ
   - Sửa bug → thêm vào bảng "Bugs đã sửa"
   - Xóa tính năng → xóa mục tương ứng
4. Cập nhật dòng "Cập nhật lần cuối" ở đầu file với ngày hôm nay

## Lưu ý

- Viết ngắn gọn, từ người dùng hiểu được (không cần biết code)
- Không mô tả chi tiết implementation, chỉ mô tả behavior
- Giữ format bảng và heading nhất quán với file hiện tại
