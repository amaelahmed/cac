const fs = require('fs');

let listPage = fs.readFileSync('src/app/admin/knowledge/page.tsx', 'utf8');
listPage = listPage.replace(/href=\{\`\/admin\/knowledge\/\$\{obj\.id\}\`\}/g, "href={`/admin/knowledge/edit?id=${obj.id}`}");
listPage = listPage.replace(/href="\/admin\/knowledge\/new"/g, 'href="/admin/knowledge/edit?id=new"');
fs.writeFileSync('src/app/admin/knowledge/page.tsx', listPage);

let editPage = fs.readFileSync('src/app/admin/knowledge/edit/page.tsx', 'utf8');
editPage = editPage.replace(/export default function KnowledgeEditor\(\{ params \}: \{ params: \{ id: string \} \}\) \{/g, `
import { useSearchParams } from 'next/navigation';

export default function KnowledgeEditorWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <KnowledgeEditor />
    </Suspense>
  );
}

function KnowledgeEditor() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
`);
editPage = editPage.replace(/const isNew = params\.id === 'new';/g, "const isNew = idParam === 'new';");
editPage = editPage.replace(/fetch\(\`\/api\/admin\/knowledge-objects\?id=\$\{params\.id\}\`\)/g, "fetch(`/api/admin/knowledge-objects?id=${idParam}`)");
editPage = editPage.replace(/\}\}, \[isNew, params\.id\]\);/g, "}}, [isNew, idParam]);");
editPage = editPage.replace(/\{isNew \? 'Create Knowledge Object' : \`Edit Object: \$\{params\.id\}\`\}/g, "{isNew ? 'Create Knowledge Object' : `Edit Object: ${idParam}`}");
editPage = editPage.replace(/import \{ useEffect, useState \} from 'react';/, "import { useEffect, useState, Suspense } from 'react';");
fs.writeFileSync('src/app/admin/knowledge/edit/page.tsx', editPage);

