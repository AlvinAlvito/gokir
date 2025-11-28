type Props = { embedUrl?: string };

const toEmbed = (u?: string | null) => {
  if (!u) return "";
  try {
    const url = new URL(u);
    if (url.hostname.includes("youtube.com")) {
      const vid = url.searchParams.get("v");
      if (vid) return `https://www.youtube.com/embed/${vid}`;
      // shorts format /shorts/{id}
      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/")[2];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    }
    if (url.hostname === "youtu.be" && url.pathname.length > 1) {
      return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    }
  } catch {
    /* ignore */
  }
  return u;
};

export default function OneIsToOne({ embedUrl }: Props) {
  const url = toEmbed(embedUrl) || "https://www.youtube.com/embed/IM_nrK0MH40";
  return (
    <div className="overflow-hidden rounded-lg aspect-square">
      <iframe
        src={url}
        title="YouTube video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      ></iframe>
    </div>
  );
}
