# Push lên Git

Hỏi user có muốn đẩy code lên git không, nếu có thì commit + push.

## Các bước thực hiện

1. Chạy `git status` và `git diff --stat` để xem các file đã thay đổi.
2. Hiển thị danh sách file thay đổi cho user thấy.
3. Hỏi user: **"Đẩy lên git không?"** (dùng AskUserQuestion tool với 2 lựa chọn: "Có, đẩy lên" và "Không, để sau").
4. Nếu user chọn **Có**:
   - `git add` các file liên quan (không dùng `git add -A` trừ khi thực sự cần)
   - Tạo commit message tiếng Việt ngắn gọn mô tả đúng những gì vừa làm
   - `git commit` rồi `git push`
   - Thông báo commit hash và link repo sau khi push xong
5. Nếu user chọn **Không**: kết thúc, không làm gì thêm.
