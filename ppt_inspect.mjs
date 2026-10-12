import { FileBlob, PresentationFile } from 'file:///C:/Users/MY%20LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const input = 'C:/Users/MY LENOVO/Downloads/MINI project  PPT format.pptx';
const deck = await PresentationFile.importPptx(await FileBlob.load(input));
console.log('slideCount', deck.slides.items.length);
const result = await deck.inspect({ select: '$.slides[*]', include: ['id','index','layout','title','elements.id','elements.kind','elements.text','elements.position','elements.style','notes.text'], });
console.log(result.ndjson);
for (const [i,slide] of deck.slides.items.entries()) {
  const png = await deck.export({slide, format:'png', scale:1});
  const fs = await import('node:fs/promises');
  await fs.writeFile(`ppt-build-private/source-${String(i+1).padStart(2,'0')}.png`, new Uint8Array(await png.arrayBuffer()));
}
const montage = await deck.export({ format:'png', montage:true, scale:0.5 });
const fs = await import('node:fs/promises');
await fs.writeFile('ppt-build-private/source-montage.png', new Uint8Array(await montage.arrayBuffer()));
