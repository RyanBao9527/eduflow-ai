export interface CourseRecommendation {
  id: string;
  title: string;
  subject: string;
  topic: string;
}

export interface CourseTitleSuggestion {
  id: string;
  title: string;
}

export type SubjectOrigin = "user" | "draft" | "default" | "unset";

export const COURSE_TOPIC_GROUPS = [
  { label: "热门方向", tags: ["Python编程", "人工智能应用"] },
  { label: "学科与技能", tags: ["少儿编程", "数据分析", "机器学习"] },
  { label: "企业培训", tags: ["企业培训"] },
] as const;

export const COURSE_TOPIC_TAGS = COURSE_TOPIC_GROUPS.flatMap((group) => group.tags);

interface CourseRecommendationInput {
  courseTitle?: string;
  subject?: string;
  topic?: string;
}

interface RecommendationRule {
  id: string;
  keywords: string[];
  recommendations: Omit<CourseRecommendation, "id">[];
}

const recommendationRules: RecommendationRule[] = [
  {
    id: "programming",
    keywords: ["python", "编程", "代码", "程序设计"],
    recommendations: [
      {
        title: "Python 少儿编程入门",
        subject: "编程教育",
        topic: "Python 基础语法与趣味项目",
      },
      {
        title: "Python 数据分析入门",
        subject: "数据分析",
        topic: "使用 Python 整理、分析与展示数据",
      },
      {
        title: "Python 自动化办公",
        subject: "职场技能",
        topic: "使用 Python 自动处理常见办公任务",
      },
    ],
  },
  {
    id: "ai-data",
    keywords: ["人工智能", "生成式ai", "ai", "数据分析", "数据"],
    recommendations: [
      {
        title: "生成式 AI 工具入门",
        subject: "人工智能",
        topic: "理解并应用生成式 AI 工具",
      },
      {
        title: "数据分析思维与实践",
        subject: "数据分析",
        topic: "从数据整理到结论表达",
      },
      {
        title: "AI 高效办公实践",
        subject: "职场技能",
        topic: "使用 AI 提升日常办公效率",
      },
    ],
  },
  {
    id: "math-science",
    keywords: ["数学", "科学", "物理", "化学"],
    recommendations: [
      {
        title: "数学思维入门",
        subject: "数学",
        topic: "通过生活问题建立数学思维",
      },
      {
        title: "科学探究实践课",
        subject: "科学",
        topic: "通过观察与实验完成科学探究",
      },
      {
        title: "问题解决能力训练",
        subject: "综合科学",
        topic: "运用科学方法分析并解决问题",
      },
    ],
  },
  {
    id: "corporate",
    keywords: ["企业培训", "管理", "沟通", "销售", "领导力"],
    recommendations: [
      {
        title: "职场沟通与协作",
        subject: "企业培训",
        topic: "提升跨团队沟通与协作效率",
      },
      {
        title: "新任管理者能力训练",
        subject: "管理培训",
        topic: "从个人贡献者转向团队管理者",
      },
      {
        title: "顾问式销售实战",
        subject: "销售培训",
        topic: "识别客户需求并设计解决方案",
      },
    ],
  },
];

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, "");
}

function getQuery(input: CourseRecommendationInput) {
  return input.topic?.trim() || input.subject?.trim() || input.courseTitle?.trim() || "";
}

function findRule(topic: string) {
  const normalizedTopic = normalize(topic);
  return recommendationRules.find((candidate) =>
    candidate.keywords.some((keyword) => normalizedTopic.includes(normalize(keyword))),
  );
}

export function getSubjectRecommendation(topic?: string, allowFallback = false) {
  const query = topic?.trim() ?? "";
  if (Array.from(query).length < 2) return undefined;

  return findRule(query)?.recommendations[0]?.subject ?? (allowFallback ? "综合课程" : undefined);
}

export function getCourseTitleSuggestions(topic?: string): CourseTitleSuggestion[] {
  const query = topic?.trim() ?? "";
  if (Array.from(query).length < 2) return [];

  const rule = findRule(query);
  if (rule) {
    return rule.recommendations.slice(0, 3).map((recommendation, index) => ({
      id: `${rule.id}-title-${index + 1}`,
      title: recommendation.title,
    }));
  }

  return [
    { id: "general-title-1", title: `${query}入门` },
    { id: "general-title-2", title: `${query}实践课` },
    { id: "general-title-3", title: `${query}训练营` },
  ];
}

export function getDefaultCourseDescription(topic?: string) {
  const query = topic?.trim() ?? "";
  if (!query) return "";

  return `围绕${query}设计的实践型课程，帮助学员循序渐进地掌握核心知识并完成基础应用。`;
}

export function getCourseRecommendations(
  input: CourseRecommendationInput,
): CourseRecommendation[] {
  const query = getQuery(input);
  if (Array.from(query).length < 2) return [];

  const rule = findRule(query);

  if (rule) {
    return rule.recommendations.slice(0, 3).map((recommendation, index) => ({
      ...recommendation,
      id: `${rule.id}-${index + 1}`,
    }));
  }

  const fallbackSubject = input.subject?.trim() || "综合课程";
  return [
    { title: `${query}入门`, topic: `${query}的核心概念与基础应用` },
    { title: `${query}实践课`, topic: `通过实践任务学习${query}` },
    { title: `${query}进阶应用`, topic: `${query}的综合应用与问题解决` },
  ].map((recommendation, index) => ({
    ...recommendation,
    id: `general-${index + 1}`,
    subject: fallbackSubject,
  }));
}
