
import React, { useState } from 'react';

interface MarkdownPreviewProps {
  markdown: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formattedMarkdown = markdown
    .replace(/^#\s(.+)/gm, '<h1 class="text-xl font-bold mb-2">$1</h1>')
    .replace(/^##\s(.+)/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^###\s(.+)/gm, '<h3 class="text-md font-semibold mt-3 mb-1">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-200 text-slate-800 rounded px-1 py-0.5 text-sm">$1</code>')
    .replace(/^\|(.+)\|$/gm, (match, content) => {
        const cells = content.split('|').map(c => c.trim());
        return `<tr>${cells.map(c => `<td class="border border-slate-300 px-4 py-2">${c}</td>`).join('')}</tr>`;
    })
    .replace(/<tr><td class="border border-slate-300 px-4 py-2">---<\/td>.+?<\/tr>/g, '') // remove header separator
    .replace(/(<tr>.+?<\/tr>)/g, '<tbody>$1</tbody>')
    .replace(/<\/tbody><tbody>/g, '')
    .replace(/(<tbody><tr>.+?<\/tr><\/tbody>)/, '<thead>$1</thead>')
    .replace(/<td>/g, '<th>')
    .replace(/<\/td>/g, '</th>')
    .replace(/<tbody><th>/g, '<tbody><td>')
    .replace(/<\/th><\/tr>/g, '</td></tr>')
    .replace(/<table/g, '<table class="w-full border-collapse text-sm"')
    .replace(/^(\w.+): (.+)/gm, '<p><span class="font-medium">$1:</span> $2</p>')
    .replace(/^(\*.+)/gm, '<li class="ml-4 list-disc">$1</li>');

  return (
    <div className="bg-slate-50 rounded-lg shadow mt-8">
      <div className="flex justify-between items-center p-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Markdown Preview</h3>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-green-500 disabled:cursor-not-allowed"
          disabled={copied}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-6 prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: formattedMarkdown.replace(/\|/g, '') }}>
      </div>
    </div>
  );
};
