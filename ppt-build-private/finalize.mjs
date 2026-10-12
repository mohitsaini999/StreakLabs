import path from 'node:path';
import { pathToFileURL } from 'node:url';
const skillDir = 'C:/Users/MY LENOVO/.codex/plugins/cache/openai-primary-runtime/presentations/26.1009.11318/skills/presentations';
const workspaceDir = 'C:/Users/MY LENOVO/OneDrive/Desktop/StreakLabs';
const candidatePath = path.join(workspaceDir, 'ppt-build-private', 'candidate.pptx');
const finalPath = path.join(workspaceDir, 'outputs', 'StreakLabs_Mini_Project_Report.pptx');
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, 'container_tools/artifact_tool_utils.mjs')).href);
const result = await finalizePresentation({
  explicitTotalSlideCount: 5,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: 'C:/Users/MY LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
  integrityValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit'],
  fontPolicy: { basis: 'reference', families: ['Times New Roman', 'Garamond', 'Calibri', 'Arial', 'TradeGothic'], referencePath: 'C:/Users/MY LENOVO/Downloads/MINI project  PPT format.pptx', referenceSha256: '7c12997cd4e1290e1f3571422d5a4493f367706ca82d595fea956c13f7d9f348' },
  verifyArtifactToolImport: true,
  receiptPath: path.join(workspaceDir, 'ppt-build-private', 'validation.json'),
});
console.log(JSON.stringify(result, null, 2));
