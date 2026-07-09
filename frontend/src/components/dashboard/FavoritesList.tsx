import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getMyFavorites, removeFavorite, type Favorite } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, ExternalLink, Star } from "lucide-react";
import { getPlatformColor } from "./HistoryTable";

export default function FavoritesList() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyFavorites()
      .then((list) => {
        if (!cancelled) setFavorites(list);
      })
      .catch(() => {
        if (!cancelled) setFavorites([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleRemove = async (id: string) => {
    if (!user) return;
    await removeFavorite(id).catch(() => undefined);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  if (!user) return null;

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-bold">Favorited Media</h3>
        <p className="text-sm text-muted-foreground">Quick access to your saved files and bookmarks.</p>
      </div>

      {favorites.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border border-border/50 bg-card/40 p-12 text-center backdrop-blur-xl">
          <div className="mb-4 rounded-full bg-secondary p-4">
            <Star className="h-8 w-8 text-muted-foreground" />
          </div>
          <h4 className="text-base font-semibold">No favorites yet</h4>
          <p className="max-w-xs text-sm text-muted-foreground">
            Click the star icon next to items in your download history to save them here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((item) => (
            <Card
              key={item.id}
              className="flex flex-col overflow-hidden border border-border/50 bg-card/40 backdrop-blur-xl transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="relative aspect-video w-full bg-secondary">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-muted-foreground">
                    <Star className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute right-3 top-3">
                  <Badge className={`border shadow-lg ${getPlatformColor(item.platform)}`}>
                    {item.platform}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h4 className="line-clamp-2 text-sm font-semibold text-foreground/90 flex-1">
                  {item.title}
                </h4>

                <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                  <span className="text-[10px] text-muted-foreground">
                    Saved {new Date(item.addedAt).toLocaleDateString()}
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Remove favorite"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      title="Open link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
