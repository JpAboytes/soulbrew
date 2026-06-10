import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Renderiza el markdown que devuelve el asistente (tablas, negritas, listas, etc.)
// con estilos acordes a la paleta de Soulbrew.
const components = {
  h1: ({ children }) => <h1 className="text-lg font-bold text-[#2C1810] mt-3 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold text-[#2C1810] mt-3 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold text-[#2C1810] mt-2 mb-1 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-[#2C1810]">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#D4A853] font-medium underline">
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-gray-200" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[#D4A853] pl-3 italic text-gray-600 my-2">{children}</blockquote>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="bg-[#F5F0E8] text-[#5C3317] rounded px-1.5 py-0.5 text-[13px] font-mono">{children}</code>
    ) : (
      <code className="block bg-[#2C1810] text-[#FAFAF7] rounded-xl p-3 text-[13px] font-mono overflow-x-auto my-2">
        {children}
      </code>
    ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 rounded-xl border border-gray-200">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#F5F0E8]">{children}</thead>,
  th: ({ children }) => (
    <th className="text-left font-bold text-[#2C1810] px-3 py-2 border-b border-gray-200 whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-3 py-2 border-b border-gray-100 align-top">{children}</td>,
  tr: ({ children }) => <tr className="even:bg-gray-50/50">{children}</tr>,
}

export default function Markdown({ children }) {
  return (
    <div className="text-sm text-[#2C1810]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
