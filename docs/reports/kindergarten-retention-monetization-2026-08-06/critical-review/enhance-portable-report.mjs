import fs from 'node:fs';
import path from 'node:path';

const reportPath = path.join(process.cwd(), 'report.html');
const marker = 'data-where-kindergarten-portable-guard="true"';
const html = fs.readFileSync(reportPath, 'utf8');

if (!html.includes('</body>')) {
  throw new Error(`Portable report has no closing body tag: ${reportPath}`);
}

const withoutPreviousGuard = html.replace(
  /\n?<script data-where-kindergarten-portable-guard="true">[\s\S]*?<\/script>\n?/,
  '\n'
);

const guard = `
<script ${marker}>(() => {
  const unsupportedLabel = 'Explore chart';

  function disableUnsupportedExplore(root) {
    if (!(root instanceof Document || root instanceof Element)) return;
    for (const item of root.querySelectorAll('[role="menuitem"]')) {
      if (item.textContent.trim() !== unsupportedLabel) continue;
      item.dataset.portableUnsupportedAction = 'explore-chart';
      item.setAttribute('aria-hidden', 'true');
      item.hidden = true;
    }

    // Recover automatically if an older cached runtime opened the unsupported
    // full-screen dialog before this guard observed the menu item.
    for (const dialog of root.querySelectorAll('dialog.chart-explore-modal')) {
      if (dialog.open) dialog.close();
      dialog.remove();
    }
  }

  document.addEventListener('click', (event) => {
    const item = event.target instanceof Element
      ? event.target.closest('[role="menuitem"]')
      : null;
    if (!item || item.textContent.trim() !== unsupportedLabel) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    item.hidden = true;
  }, true);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) disableUnsupportedExplore(node);
      }
    }
  });

  disableUnsupportedExplore(document);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();</script>
`;

fs.writeFileSync(reportPath, withoutPreviousGuard.replace('</body>', `${guard}</body>`));
process.stdout.write(`${reportPath}\n`);
