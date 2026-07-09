import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Seo } from "@/components/Seo";

export function NotFoundPage() {
  return (
    <>
      <Seo
        title="Page not found"
        description="The page you are looking for doesn't exist."
        path="/404"
        noindex
      />
      <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center sm:px-6">
        <p className="gradient-text text-7xl font-extrabold sm:text-8xl">404</p>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">This page wandered off</h1>
        <p className="mt-3 text-muted-foreground">
          The link may be broken or the page may have moved. Let's get you back on track.
        </p>
        <div className="mt-8 flex gap-3">
          <Link to="/" className={buttonVariants()}>
            Go home
          </Link>
          <Link to="/tools" className={buttonVariants({ variant: "outline" })}>
            Browse tools
          </Link>
        </div>
      </section>
    </>
  );
}
