/** Các nhóm khóa luyện thi hiển thị cho tài khoản chưa ghi danh. `name`, `duration`
 * và `fee` để null cho tới khi bộ phận đào tạo cung cấp thông tin thật — giao diện
 * sẽ hiện "Đang cập nhật" thay vì tự bịa tên khóa hay học phí. */
export interface CourseGoal {
  target: number;
  tag: string;
  desc: string;
  name: string | null;
  duration: string | null;
  fee: string | null;
}

export const COURSE_GOALS: CourseGoal[] = [
  { target: 50, tag: "Nền tảng", desc: "Phù hợp khi bạn mới bắt đầu với PTE.", name: null, duration: null, fee: null },
  { target: 65, tag: "Phổ biến", desc: "Phù hợp mục tiêu du học, định cư phổ biến.", name: null, duration: null, fee: null },
  { target: 79, tag: "Nâng cao", desc: "Phù hợp khi cần điểm cao cho hồ sơ cạnh tranh.", name: null, duration: null, fee: null },
];
