import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CURRENT_YEAR = new Date().getFullYear();

const footerLinkClass =
  "text-muted-foreground underline-offset-4 transition-all duration-300 hover:text-foreground hover:underline hover:scale-[1.02] inline-block";

export const SiteFooter = () => {
  return (
    <footer className="relative mt-12">
      <div className="dither-border absolute top-0 left-0 right-0" />
      <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-5 text-[11px] text-muted-foreground">
        <p>© {CURRENT_YEAR} Leander Riefel</p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Dialog>
            <DialogTrigger className={footerLinkClass}>Privacy Policy</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Privacy Policy</DialogTitle>
                <DialogDescription>
                  How this app handles your data when you look up Last.fm profiles.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 text-xs/relaxed text-muted-foreground">
                <p>
                  Scrobbling Away calls the Last.fm API directly from your browser. Your requests go
                  to Last.fm, not through our servers.
                </p>
                <p>
                  We do not store your listening data on a backend. Stats are saved in your browser
                  (IndexedDB) so you can reload them locally. We do not collect personal data beyond
                  what Last.fm already shows publicly for a username.
                </p>
                <p>
                  Hosting may keep standard request logs (for example IP address, timestamp, and
                  URL). We do not use those logs to build profiles or sell data.
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger className={footerLinkClass}>Imprint</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Imprint</DialogTitle>
                <DialogDescription>Legal notice and contact.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 text-xs/relaxed text-muted-foreground">
                <p>
                  <span className="text-foreground">Leander Timon Riefel</span>
                  <br />
                  Berlin, Germany
                </p>
                <p>
                  Email:{" "}
                  <a className={footerLinkClass} href="mailto:riefel.leander@gmail.com">
                    riefel.leander@gmail.com
                  </a>
                </p>
                <p>
                  For questions, issues, or feature requests, you can also reach out on{" "}
                  <a
                    className={footerLinkClass}
                    href="https://x.com/leanderriefel"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    X (@leanderriefel)
                  </a>{" "}
                  or open an issue on{" "}
                  <a
                    className={footerLinkClass}
                    href="https://github.com/leanderriefel/scrobbling-away"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </a>
                  .
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </nav>
      </div>
    </footer>
  );
};
