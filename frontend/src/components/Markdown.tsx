import React from 'react';

interface MarkdownProps {
  content: string;
}

const renderInlineMarkdown = (text: string): React.ReactNode[] => {
  // Match bold text: **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const parseMarkdown = (text: string): React.ReactNode => {
  // Split by code blocks: ```language ... ```
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const language = match ? match[1] : '';
      const code = match ? match[2] : part.slice(3, -3);
      return (
        <pre key={index} className="bg-slate-950 p-3 rounded-xl border border-slate-800 my-3 overflow-x-auto text-[11px] font-mono text-indigo-300 relative">
          {language && (
            <div className="absolute top-1 right-2 text-[8px] uppercase font-bold text-slate-500 tracking-wider">
              {language}
            </div>
          )}
          <code className="block mt-2 whitespace-pre">{code}</code>
        </pre>
      );
    }

    const lines = part.split('\n');
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Table parsing
      if (line.startsWith('|')) {
        const cells = line
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

        if (line.replace(/[\s|-]/g, '') === '') {
          continue; // Separator line like |---|---|
        }

        if (!inTable) {
          inTable = true;
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        continue;
      }

      // Commit table if open
      if (inTable && !line.startsWith('|')) {
        inTable = false;
        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-3 border border-slate-800 rounded-xl">
            <table className="min-w-full divide-y divide-slate-800 text-[11px]">
              <thead className="bg-slate-900/60">
                <tr>
                  {tableHeaders.map((h, idx) => (
                    <th key={idx} className="px-3 py-2 text-left font-bold text-slate-300 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/20">
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-900/40">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-350 whitespace-pre-wrap">
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableHeaders = [];
        tableRows = [];
      }

      if (line === '') {
        continue;
      }

      // Headers
      if (line.startsWith('###')) {
        elements.push(
          <h4 key={`h3-${i}`} className="text-xs font-bold text-indigo-400 mt-4 mb-1.5 uppercase tracking-wide">
            {renderInlineMarkdown(line.slice(3).trim())}
          </h4>
        );
      } else if (line.startsWith('##')) {
        elements.push(
          <h3 key={`h2-${i}`} className="text-xs font-black text-slate-205 mt-4 mb-2 uppercase tracking-wide">
            {renderInlineMarkdown(line.slice(2).trim())}
          </h3>
        );
      } else if (line.startsWith('#')) {
        elements.push(
          <h2 key={`h1-${i}`} className="text-sm font-black text-white mt-5 mb-2.5 uppercase tracking-wider">
            {renderInlineMarkdown(line.slice(1).trim())}
          </h2>
        );
      }
      // Lists
      else if (line.startsWith('-') || line.startsWith('*')) {
        elements.push(
          <div key={`li-${i}`} className="flex items-start gap-2 my-1 text-xs leading-relaxed">
            <span className="text-indigo-500 mt-1 shrink-0">•</span>
            <span className="text-slate-300">{renderInlineMarkdown(line.slice(1).trim())}</span>
          </div>
        );
      }
      // Numbered lists
      else if (/^\d+\./.test(line)) {
        const dotIndex = line.indexOf('.');
        const num = line.slice(0, dotIndex);
        const textStr = line.slice(dotIndex + 1).trim();
        elements.push(
          <div key={`li-num-${i}`} className="flex items-start gap-2 my-1 text-xs leading-relaxed">
            <span className="text-indigo-400 font-mono font-bold shrink-0">{num}.</span>
            <span className="text-slate-300">{renderInlineMarkdown(textStr)}</span>
          </div>
        );
      }
      // Default paragraph
      else {
        elements.push(
          <p key={`p-${i}`} className="text-xs text-slate-300 leading-relaxed my-2">
            {renderInlineMarkdown(line)}
          </p>
        );
      }
    }

    if (inTable) {
      elements.push(
        <div key="table-final" className="overflow-x-auto my-3 border border-slate-800 rounded-xl">
          <table className="min-w-full divide-y divide-slate-800 text-[11px]">
            <thead className="bg-slate-900/60">
              <tr>
                {tableHeaders.map((h, idx) => (
                  <th key={idx} className="px-3 py-2 text-left font-bold text-slate-300 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/20">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-900/40">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-slate-350 whitespace-pre-wrap">
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return <div key={index}>{elements}</div>;
  });
};

const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  return <div className="space-y-1">{parseMarkdown(content)}</div>;
};

export default Markdown;
