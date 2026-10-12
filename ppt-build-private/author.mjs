import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, PresentationFile } from 'file:///C:/Users/MY%20LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';

const sourcePath = 'C:/Users/MY LENOVO/Downloads/MINI project  PPT format.pptx';
const workspace = 'C:/Users/MY LENOVO/OneDrive/Desktop/StreakLabs';
const buildDir = path.join(workspace, 'ppt-build-private');
const outputPath = path.join(workspace, 'outputs', 'StreakLabs_Mini_Project_Report.pptx');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
const deck = await PresentationFile.importPptx(await FileBlob.load(sourcePath));

const replace = (id, pairs) => {
  const shape = deck.resolve(id);
  for (const [before, after] of pairs) shape.text.replace(before, after);
  return shape;
};

// Cover: preserve the institute logo, department heading, and report format.
replace('sh/7qp4be9c', [['TITLE PAGE', 'StreakLabs: AI-Powered Learning Platform']]);
const names = replace('sh/547294r6', [['Student names - ', 'Student names - [Add team member names]']]);
names.position = { ...names.position, width: 550 };

// Idea and proposed solution.
replace('sh/dkvmpszm', [['IDEA TITLE', 'StreakLabs']]);
replace('sh/qx4nud0b', [
  ['Proposed Solution (Describe your Idea/Solution/Prototype)', 'The StreakLabs solution'],
  ['Detailed explanation of the proposed solution', 'Start with any topic or upload class notes to begin a guided lesson.'],
  ['How it addresses the problem', 'Ask follow-up questions with an AI tutor using the lesson or your notes.'],
  ['Innovation and uniqueness of the solution', 'Create roadmaps, mind maps, cheat sheets and practice; plan study and track active time.'],
]);

// Technical approach and learning flow.
replace('sh/1k3214v2', [
  ['Technologies to be used (e.g. programming languages, frameworks, hardware)', 'Frontend: React, JavaScript and Vite; backend: Node.js and Express REST API'],
  ['Methodology and process for implementation (Flow Charts/Images/ working prototype)', 'Data and sign-in: Supabase Auth and Postgres with Row Level Security. Flow: topic or notes → AI lesson → tutor questions; study sessions update the streak matrix.'],
]);

// Audience and expected benefits (potential outcomes, not measured claims).
const impact = replace('sh/sjad83id', [
  ['Potential impact on the target audience', 'Target users: students learning school, college or personal-interest topics.'],
  ['Benefits of the solution (social, economic, environmental, etc.)', 'Potential benefits: organized study materials, lessons based on personal notes, useful revision aids, a weekly plan and visible study consistency.'],
]);
impact.position = { ...impact.position, top: 220, height: 300 };
impact.text.fontSize = 30;

// The references slide lists official documentation for the technologies used.
const references = deck.resolve('sh/g7alsnu1');
references.text = [
  'Official documentation',
  'React — https://react.dev/learn',
  'Vite — https://vite.dev/guide/',
  'Express — https://expressjs.com/',
  'Supabase Auth — https://supabase.com/docs/guides/auth',
  'Supabase Row Level Security — https://supabase.com/docs/guides/database/postgres/row-level-security',
].join('\n');
references.position = { ...references.position, top: 190, width: 1120, height: 400 };
references.text.fontSize = 23;
references.text.insets = { left: 0, right: 0, top: 0, bottom: 0 };

for (const [i, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(path.join(buildDir, `final-slide-${String(i + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
}
const montage = await deck.export({ format: 'png', montage: true, scale: 0.5 });
await fs.writeFile(path.join(buildDir, 'final-montage.png'), new Uint8Array(await montage.arrayBuffer()));
const exportPptx = await PresentationFile.exportPptx(deck);
await exportPptx.save(outputPath);
const inspection = await deck.inspect({ select: '$.slides[*]', include: ['id','index','title','elements.id','elements.kind','elements.text'] });
await fs.writeFile(path.join(buildDir, 'final-content.ndjson'), inspection.ndjson, 'utf8');
console.log(`Wrote ${outputPath} (${deck.slides.items.length} slides)`);
