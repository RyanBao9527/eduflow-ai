import type {
  CourseSummary,
  DashboardMetric,
  ExportActivity,
} from "@/types/course";

export const dashboardMetrics: DashboardMetric[] = [
  {
    label: "课程总数",
    value: "8",
    change: "本周新增 2 门",
    tone: "blue",
  },
  {
    label: "已生成资源",
    value: "34",
    change: "教案、讲义与课件",
    tone: "green",
  },
  {
    label: "已就绪课程",
    value: "5",
    change: "完成率 62.5%",
    tone: "violet",
  },
  {
    label: "最近导出",
    value: "3",
    change: "过去 7 天",
    tone: "amber",
  },
];

export const recentCourses: CourseSummary[] = [
  {
    id: "course-fractions",
    title: "分数的初步认识",
    subject: "小学数学",
    audience: "三年级",
    lessonCount: 2,
    status: "ready",
    updatedAt: "今天 10:24",
    accent: "blue",
  },
  {
    id: "course-buoyancy",
    title: "浮力：从现象到规律",
    subject: "初中物理",
    audience: "初二",
    lessonCount: 1,
    status: "generating",
    updatedAt: "昨天 16:40",
    accent: "teal",
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
  },
];

export const recentExports: ExportActivity[] = [
  {
    id: "export-1",
    courseTitle: "分数的初步认识",
    resourceType: "教师教案 · Word",
    exportedAt: "12 分钟前",
  },
  {
    id: "export-2",
    courseTitle: "生成式 AI 办公效率",
    resourceType: "课程课件 · PPT",
    exportedAt: "昨天 17:08",
  },
  {
    id: "export-3",
    courseTitle: "Python for 循环闯关",
    resourceType: "学生练习 · Word",
    exportedAt: "7 月 14 日",
  },
];
