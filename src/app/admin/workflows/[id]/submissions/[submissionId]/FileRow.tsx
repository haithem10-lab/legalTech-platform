"use client";

function fileIcon(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf"))  return "📄";
  if (lower.endsWith(".docx")) return "📝";
  if (/\.(jpg|jpeg|png)$/i.test(lower)) return "🖼️";
  return "📎";
}

export function FileRow({ filePath }: { filePath: string }) {
  // filePath is either "/uploads/uuid.pdf" (local) or a legacy GCS path
  const filename = filePath.split("/").pop() ?? filePath;
  const icon     = fileIcon(filename);

  // Local uploads are public — open directly. Legacy GCS paths need the download API.
  async function openFile() {
    if (filePath.startsWith("/uploads/")) {
      window.open(filePath, "_blank");
      return;
    }
    // Fallback: legacy GCS signed-URL download
    const res = await fetch(`/api/admin/files/download?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) return;
    const { downloadUrl } = await res.json();
    window.open(downloadUrl, "_blank");
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "#F9F8F5", border: "1px solid #E4E0D6",
      borderRadius: 6, padding: "12px 16px",
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      <span className="font-mono"
        style={{ fontSize: 13, color: "#1C2127", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {filename}
      </span>
      <button onClick={openFile}
        className={`font-sans font-medium`}
        style={{
          fontSize: 12, padding: "4px 12px", borderRadius: 6, marginLeft: "auto",
          border: "1px solid #44645D", color: "#44645D",
          background: "transparent", cursor: "pointer", flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#EFF6F3"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
        Open →
      </button>
    </div>
  );
}
