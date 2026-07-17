import {
  clearCourseGeneration,
  loadCourseGeneration,
} from "@/features/course-generation/course-generation-storage";
import {
  clearCourseWizardDraft,
  hasMeaningfulDraftValues,
  loadCourseWizardDraft,
} from "@/features/course-wizard/draft-storage";
import {
  attachGenerationToProject,
  createDraftCourseProject,
  listCourseProjects,
} from "@/features/course-workspace/course-project-storage";

export function migrateLegacyCourseProject(
  localStorage: Storage,
  sessionStorage?: Storage,
) {
  const existing = listCourseProjects(localStorage);
  const legacyDraft = loadCourseWizardDraft(localStorage);
  if (!hasMeaningfulDraftValues(legacyDraft.values)) return null;
  const generation = sessionStorage ? loadCourseGeneration(sessionStorage) : null;

  const matchingProject = existing.find(
    (project) => project.title === legacyDraft.values.courseTitle?.trim(),
  );
  if (matchingProject) {
    let migrated = matchingProject;
    let sessionBlueprintMigrated = false;
    if (
      generation?.brief.courseTitle === matchingProject.title
      && !matchingProject.coursePlan
    ) {
      migrated = attachGenerationToProject(
        localStorage,
        matchingProject.id,
        generation.brief,
        generation.response,
      );
      sessionBlueprintMigrated = true;
    }
    clearCourseWizardDraft(localStorage);
    if (sessionBlueprintMigrated && sessionStorage) {
      clearCourseGeneration(sessionStorage);
    }
    return migrated;
  }

  const project = createDraftCourseProject(
    localStorage,
    legacyDraft.values,
    undefined,
    legacyDraft.currentStep,
  );
  let migrated = project;
  let sessionBlueprintMigrated = false;
  if (generation?.brief.courseTitle === project.title) {
    migrated = attachGenerationToProject(
      localStorage,
      project.id,
      generation.brief,
      generation.response,
    );
    sessionBlueprintMigrated = true;
  }

  clearCourseWizardDraft(localStorage);
  if (sessionBlueprintMigrated && sessionStorage) {
    clearCourseGeneration(sessionStorage);
  }
  return migrated;
}
