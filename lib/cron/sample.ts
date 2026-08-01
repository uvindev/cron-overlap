export const defaultStartDate = "2026-08-03";

export const riskyManifest = JSON.stringify(
  {
    jobs: [
      {
        name: "invoice-reminders",
        path: "/api/cron/invoices",
        schedule: "0 8 * * *",
        durationMinutes: 20,
        owner: "billing",
        protected: true,
      },
      {
        name: "crm-sync",
        path: "/api/cron/crm-sync",
        schedule: "0 8 * * *",
        durationMinutes: 45,
        owner: "growth",
        protected: true,
      },
      {
        name: "warehouse-rollup",
        path: "/api/cron/warehouse",
        schedule: "0 8 * * *",
        durationMinutes: 60,
        owner: "data",
        protected: false,
      },
      {
        name: "queue-poller",
        path: "/api/cron/poll",
        schedule: "*/2 * * * *",
        durationMinutes: 3,
        owner: "",
        protected: false,
      },
      {
        name: "invoice-retry",
        path: "/api/cron/invoices",
        schedule: "0 8 * * *",
        durationMinutes: 10,
        owner: "billing",
        protected: true,
      },
      {
        name: "broken-window",
        path: "api/cron/broken",
        schedule: "61 * * * *",
        durationMinutes: 5,
        owner: "platform",
        protected: true,
      },
    ],
  },
  null,
  2,
);

export const clearManifest = JSON.stringify(
  {
    jobs: [
      {
        name: "catalog-refresh",
        path: "/api/cron/catalog",
        schedule: "0 1 * * *",
        durationMinutes: 15,
        owner: "commerce",
        protected: true,
      },
      {
        name: "billing-digest",
        path: "/api/cron/billing",
        schedule: "0 3 * * *",
        durationMinutes: 20,
        owner: "billing",
        protected: true,
      },
      {
        name: "search-index",
        path: "/api/cron/search",
        schedule: "0 5 * * *",
        durationMinutes: 30,
        owner: "platform",
        protected: true,
      },
      {
        name: "weekly-retention",
        path: "/api/cron/retention",
        schedule: "30 6 * * SUN",
        durationMinutes: 20,
        owner: "analytics",
        protected: true,
      },
    ],
  },
  null,
  2,
);

export const vercelManifest = JSON.stringify(
  {
    crons: [
      { path: "/api/cron/cache", schedule: "0 * * * *" },
      { path: "/api/cron/digest", schedule: "0 8 * * *" },
    ],
  },
  null,
  2,
);
