import type { CourseSummary, DashboardMetric, ExportActivity } from "@/types/course";

export const dashboardMetrics: DashboardMetric[] = [
  { label: "课程项目", value: "8", change: "Demo 数据", tone: "blue" },
  { label: "课程草稿", value: "2", change: "待完成", tone: "amber" },
  { label: "已生成", value: "4", change: "AI 蓝图", tone: "green" },
  { label: "已编辑", value: "2", change: "人工完善", tone: "violet" },
];

export const recentCourses: CourseSummary[] = [
  {
    id: "course-fractions",
    title: "分数的初步认识",
    subject: "小学数学",
    audience: "三年级",
    lessonCount: 2,
    status: "generated",
    updatedAt: "今天 10:24",
    accent: "blue",
    href: "/dashboard",
    actionLabel: "Demo 项目",
  },
  {
    id: "course-buoyancy",
    title: "浮力：从现象到规律",
    subject: "初中物理",
    audience: "初二",
    lessonCount: 6,
    status: "editing",
    updatedAt: "昨天 16:40",
    accent: "teal",
    href: "/dashboard",
    actionLabel: "Demo 项目",
  },
  {
    id: "course-python-loop",
    title: "Python for 循环闯关",
    subject: "编程启蒙",
    audience: "10–12 岁零基础",
    lessonCount: 2,
    status: "draft",
    updatedAt: "7 月 14 日",
    accent: "amber",
    href: "/dashboard",
    actionLabel: "Demo 项目",
  },
];

export const recentExports: ExportActivity[] = [
  { id: "export-1", courseTitle: "分数的初步认识", resourceType: "教师教案 · Word", exportedAt: "12 分钟前" },
  { id: "export-2", courseTitle: "生成式 AI 办公效率", resourceType: "课程课件 · PPT", exportedAt: "昨天 17:08" },
  { id: "export-3", courseTitle: "Python for 循环闯关", resourceType: "学生练习 · Word", exportedAt: "7 月 14 日" },
];

