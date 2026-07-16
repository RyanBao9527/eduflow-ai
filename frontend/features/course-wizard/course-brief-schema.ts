import { z } from "zod";

const optionalText = (maximum: number, message: string) =>
  z
    .string()
    .trim()
    .max(maximum, message)
    .transform((value) => value || undefined)
    .optional();

const requiredNumber = (
  missingMessage: string,
  minimum: number,
  minimumMessage: string,
  maximum: number,
  maximumMessage: string,
) =>
  z
    .number({ error: missingMessage })
    .int("请输入整数")
    .min(minimum, minimumMessage)
    .max(maximum, maximumMessage)
    .optional()
    .refine((value) => value !== undefined, { message: missingMessage })
    .transform((value) => value as number);

export const requestedResourceSchema = z.enum([
  "lesson_plan",
  "teacher_script",
  "student_handout",
  "slides",
  "worksheet",
  "assessment",
  "course_plan",
]);

export const courseBriefSchema = z.object({
  courseTitle: z
    .string()
    .trim()
    .min(2, "课程名称至少需要 2 个字符")
    .max(80, "课程名称不能超过 80 个字符"),
  subject: z
    .string()
    .trim()
    .min(1, "请输入学科或领域")
    .max(50, "学科或领域不能超过 50 个字符"),
  topic: z
    .string()
    .trim()
    .min(2, "课程主题至少需要 2 个字符")
    .max(100, "课程主题不能超过 100 个字符"),
  description: optionalText(1000, "课程描述不能超过 1000 个字符"),
  teachingScenario: z
    .enum(["offline", "live", "recorded", "corporate", "self_study"])
    .optional()
    .refine((value) => value !== undefined, { message: "请选择教学场景" })
    .transform(
      (value) =>
        value as "offline" | "live" | "recorded" | "corporate" | "self_study",
    ),
  targetLearners: z
    .string()
    .trim()
    .min(2, "请描述目标学员")
    .max(200, "目标学员描述不能超过 200 个字符"),
  ageOrGrade: z
    .string()
    .trim()
    .min(1, "请输入年龄或年级")
    .max(50, "年龄或年级不能超过 50 个字符"),
  learnerLevel: z
    .string()
    .trim()
    .min(1, "请输入学员基础")
    .max(50, "学员基础不能超过 50 个字符"),
  classSize: z
    .number({ error: "班级人数必须是数字" })
    .int("班级人数必须是整数")
    .min(1, "班级人数至少为 1")
    .max(1000, "班级人数不能超过 1000")
    .optional(),
  lessonDurationMinutes: requiredNumber(
    "请输入单课时长",
    10,
    "单课时长不能少于 10 分钟",
    480,
    "单课时长不能超过 480 分钟",
  ),
  lessonCount: requiredNumber(
    "请输入课时数量",
    1,
    "至少需要 1 个课时",
    100,
    "课时数量不能超过 100",
  ),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .optional()
    .refine((value) => value !== undefined, { message: "请选择课程难度" })
    .transform((value) => value as "beginner" | "intermediate" | "advanced"),
  teachingStyles: z
    .array(z.string().trim().min(1).max(40, "单个教学风格不能超过 40 个字符"))
    .min(1, "至少选择一种教学风格")
    .max(5, "最多选择五种教学风格")
    .transform((values) => Array.from(new Set(values))),
  overallGoal: z
    .string()
    .trim()
    .min(5, "课程总体目标至少需要 5 个字符")
    .max(1000, "课程总体目标不能超过 1000 个字符"),
  requestedResources: z
    .array(requestedResourceSchema)
    .min(1, "至少选择一种课程资源")
    .transform((values) => Array.from(new Set(values))),
  extraRequirements: optionalText(1000, "额外要求不能超过 1000 个字符"),
});

export type CourseBriefFormValues = z.input<typeof courseBriefSchema>;
export type CourseBrief = z.output<typeof courseBriefSchema>;

export const DEFAULT_COURSE_BRIEF_VALUES: CourseBriefFormValues = {
  courseTitle: "",
  subject: "",
  topic: "",
  description: "",
  teachingScenario: undefined,
  targetLearners: "",
  ageOrGrade: "",
  learnerLevel: "",
  classSize: undefined,
  lessonDurationMinutes: undefined,
  lessonCount: undefined,
  difficulty: undefined,
  teachingStyles: [],
  overallGoal: "",
  requestedResources: [],
  extraRequirements: "",
};
