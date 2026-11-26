 "use client";

import {
  ArrowUpRight,
  Bell,
  Building2,
  ChevronDown,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { openTaskNotification } from "./notification-actions";
import type { AdminIdentity } from "@/lib/admin/auth";
import { AdminNavigation } from "./admin-navigation";
import { AdminPageTitle } from "./admin-page-title";
import { InstallApp } from "@/app/components/install-app";

type AdminShellProps = {
  admin: AdminIdentity;
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    taskId: string | null;
    createdAt: Date;
  }>;
  children: ReactNode;
};

export function AdminShell({ admin, notifications, children }: AdminShellProps) {
  const displayName = admin.name || admin.email;

  return (
    <div className="mx-auto flex min-h-screen max-w-[100rem] bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-primary text-white md:flex">
        <a
          className="flex min-h-20 items-center gap-3 border-b border-white/10 px-6"
          href="/admin"
        >
          <span className="flex size-9 items-center justify-center rounded-sm bg-secondary">
            <Building2 aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </span>
          <span>
            <span className="block text-sm font-semibold">Global Tax Nepal</span>
            <span className="mt-0.5 block text-[0.68rem] uppercase tracking-[0.14em] text-white/60">
              Administration
            </span>
          </span>
        </a>
        <div className="admin-sidebar-scrollbar min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 py-5">
          <AdminNavigation admin={admin} />
        </div>
        <div className="border-t border-white/10 p-4 text-xs leading-5 text-white/55">
          Internal management workspace
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-surface">
          <div className="flex min-h-[4.75rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <details className="relative md:hidden">
                <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-sm border border-border px-3 text-sm font-medium text-primary focus-visible:outline">
                  <LayoutDashboard aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  <span>Menu</span>
                </summary>
                <div
                  className="absolute left-0 top-12 z-30 max-h-[75vh] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto bg-primary p-4 text-white"
                  onClick={(event) => {
                    if (
                      event.target instanceof Element &&
                      event.target.closest("a")
                    ) {
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                    }
                  }}
                >
                  <AdminNavigation admin={admin} />
                </div>
              </details>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-primary">
                  Global Tax Nepal
                </p>
                <p className="hidden text-xs text-text-secondary sm:block">
                  Administration
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {notifications.length > 0 && (
                <details className="relative">
                  <summary
                    aria-label={`${notifications.length} unread notifications`}
                    className="relative flex size-10 cursor-pointer list-none items-center justify-center rounded-sm border border-border text-primary focus-visible:outline"
                  >
                    <Bell aria-hidden="true" className="size-4" />
                    <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-error text-[0.65rem] font-bold text-white">
                      {notifications.length > 9 ? "9+" : notifications.length}
                    </span>
                  </summary>
                  <div className="absolute right-0 top-12 z-30 w-[min(22rem,calc(100vw-2rem))] border border-border bg-surface p-2">
                    {notifications.map((notification) => (
                      <article className="border-b border-border px-3 py-3 last:border-0" key={notification.id}>
                        <p className="text-sm font-semibold text-primary">{notification.title}</p>
                        <p className="mt-1 text-xs leading-5 text-text-secondary">{notification.body}</p>
                        {notification.taskId && (
                          <form action={openTaskNotification.bind(null, notification.id, notification.taskId)}>
                            <button className="mt-2 text-xs font-semibold text-secondary" type="submit">
                              View task
                            </button>
                          </form>
                        )}
                      </article>
                    ))}
                  </div>
                </details>
              )}
              <details className="relative">
                <summary
                  aria-label="Account menu"
                  className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-sm border border-border px-3 text-sm font-medium text-primary focus-visible:outline"
                >
                  <CircleUserRound
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.75}
                  />
                  <span className="hidden max-w-36 truncate sm:inline">
                    {displayName}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.75}
                  />
                </summary>
                <div className="absolute right-0 top-12 z-30 w-64 border border-border bg-surface p-4">
                  <p className="truncate text-sm font-medium text-primary">
                    {displayName}
                  </p>
                  <p className="mt-1 break-all text-xs text-text-secondary">
                    {admin.email}
                  </p>
                  <InstallApp />
                  <form action={logoutAdmin} className="mt-4 border-t border-border pt-3">
                    <button
                      className="flex min-h-9 w-full items-center gap-2 text-left text-sm font-medium text-primary transition-colors duration-200 ease-out hover:text-secondary"
                      type="submit"
                    >
                      <LogOut
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={1.75}
                      />
                      Sign out
                    </button>
                  </form>
                </div>
              </details>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-7 sm:px-6 sm:py-9 lg:px-9">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                Administration
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                <AdminPageTitle />
              </h1>
            </div>
            <a
              className="hidden items-center gap-1 text-sm font-medium text-secondary hover:text-primary sm:inline-flex"
              href="/"
              rel="noreferrer"
              target="_blank"
            >
              Public website
              <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </a>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
