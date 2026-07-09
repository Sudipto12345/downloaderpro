import { useState, useEffect } from "react";
import { adminGetDownloads, type AdminDownload } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { getPlatformColor, formatRelativeTime } from "../dashboard/HistoryTable";

export default function AdminDownloads() {
  const [downloads, setDownloads] = useState<AdminDownload[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    adminGetDownloads()
      .then(setDownloads)
      .catch(() => setDownloads([]));
  }, []);

  const filtered = downloads.filter((d) => {
    const email = (d.userEmail ?? "").toLowerCase();
    const title = d.title.toLowerCase();
    const platform = d.platform.toLowerCase();
    const q = search.toLowerCase();
    return title.includes(q) || platform.includes(q) || email.includes(q);
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handlePrevPage = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setPage((p) => Math.min(totalPages, p + 1));
  };

  return (
    <Card className="border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold">Download Logs</h3>
          <p className="text-sm text-muted-foreground">Historical records of downloads processed on DownloadHub Pro.</p>
        </div>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // reset to first page
            }}
            className="h-10 rounded-xl border border-input bg-secondary/30 pl-9 pr-4 text-sm focus:border-primary"
          />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground">
              <th className="pb-3 pr-4 font-semibold">Media File</th>
              <th className="pb-3 pr-4 font-semibold">User Account</th>
              <th className="pb-3 pr-4 font-semibold">Platform</th>
              <th className="pb-3 pr-4 font-semibold">Quality</th>
              <th className="pb-3 pr-4 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No downloads found matching search criteria.
                </td>
              </tr>
            ) : (
              paginated.map((item) => (
                <tr key={item.id} className="hover:bg-secondary/15">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-12 shrink-0 overflow-hidden rounded bg-secondary">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center">
                            <Download className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-foreground/90 line-clamp-1 max-w-xs sm:max-w-sm md:max-w-md">
                        {item.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-xs font-semibold text-muted-foreground">
                    {item.userEmail ?? "Unknown User"}
                  </td>
                  <td className="py-4 pr-4">
                    <Badge className={`border ${getPlatformColor(item.platform)}`}>
                      {item.platform}
                    </Badge>
                  </td>
                  <td className="py-4 pr-4">
                    <span className="font-mono text-xs text-muted-foreground">{item.quality}</span>
                  </td>
                  <td className="py-4 pr-4 text-muted-foreground">
                    {formatRelativeTime(item.date)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
          <span className="text-xs text-muted-foreground">
            Showing Page {page} of {totalPages} ({filtered.length} total logs)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={handlePrevPage}
              className="h-8 rounded-lg px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={handleNextPage}
              className="h-8 rounded-lg px-3"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
